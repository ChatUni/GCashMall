// Upload moderation pipeline for creator-uploaded videos (already on Bunny). Runs:
//   1. transcribe the video (4 tasks: extract audio → whisper SRT → translate → upload)
//   2. moderate the transcript text (omni-moderation) — reject the upload if harmful
//   3. extract frames at random 5–15s intervals
//   4. moderate the frames (omni-moderation) — reject if harmful
//
// Frames are processed in BATCHES: we extract a small batch, moderate it (omni-moderation
// takes one image per request, so the batch's frames are checked concurrently), and stop
// at the first flagged batch. This is the balance point — extracting every frame up front
// wastes work when an early frame is already harmful, while checking one frame at a time
// serializes the round-trips. A rejected video is deleted from Bunny.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { get, update } from './db.js'
import { transcribeEpisode } from './transcribe.js'
import { moderateText, moderateImages } from './moderation.js'
import { ts, mark, timing, summarize, fmtMs } from './jobTiming.js'
import { extractFrameAt, probeDuration } from './ffmpeg.js'
import {
  waitForBunnyReady,
  bunnyHlsUrl,
  bunnyReferer,
  getBunnyVideo,
} from './bunny.js'

// A verdict closes out one video's moderation, so it is where the breakdown belongs: how
// long it took, and how much of that was spent waiting on someone else's API rather than
// using the CPU. The idle share is the number that says whether WORKER_CONCURRENCY can rise.
const logVerdict = (log, verdict) => {
  const t = timing()
  log(verdict)
  if (!t) return
  log(`  ${summarize(t)}`)
  const phases = t.phases.filter((x) => x.ms > 0)
  if (phases.length) log(`  phases: ${phases.map((x) => `${x.name} ${fmtMs(x.ms)}`).join(' · ')}`)
}

// Frames extracted + moderated per round (checked concurrently). Small enough to reject
// early, large enough to amortize round-trips across parallel requests.
const BATCH_SIZE = 5

// A claim on a video's moderation is held by setting phase 'working'. If the process holding
// it dies, nothing clears that — and every later attempt sees 'working', assumes a peer is on
// it, and returns. The video is then stranded for good. Treat a claim older than this as
// abandoned and take it over. Longer than any real scan, so a slow-but-alive one is safe.
const WORKING_STALE_MS = 20 * 60 * 1000

// How many times to retry a failed transcription before accepting the episode has no
// subtitles. Transient network failures are common; a video with no usable audio is not,
// and retrying it forever would be its own problem.
const MAX_TRANSCRIBE_ATTEMPTS = 3

const setMod = (videoId, fields) =>
  update(
    'videoModeration',
    { videoId },
    { $set: { ...fields, updatedAt: new Date() } },
    { upsert: true },
  )

// Frame timestamps at random 5–15s intervals across the video's duration.
const frameTimestamps = (duration) => {
  const ts = []
  if (!duration || duration < 1) return ts
  let t = 1 + Math.random() * 4 // first frame 1–5s in
  while (t < duration) {
    ts.push(Math.round(t * 10) / 10)
    t += 5 + Math.random() * 10 // then every 5–15s
  }
  return ts
}

const readFrameDataUrl = (file) =>
  `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`

// Moderate frames batch-by-batch; returns the first flagged batch's categories, or null.
const moderateFramesInBatches = async (videoId, src, referer, timestamps, onProgress, log = () => {}) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganime-mod-'))
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
  log(`sampling ${timestamps.length} frame(s) at ${timestamps.map(mmss).join(', ')}`)
  try {
    for (let i = 0; i < timestamps.length; i += BATCH_SIZE) {
      const batch = timestamps.slice(i, i + BATCH_SIZE)
      const images = []
      const taken = []
      for (let j = 0; j < batch.length; j++) {
        const out = path.join(tmp, `f${i + j}.jpg`)
        try {
          await extractFrameAt({ videoPath: src, seconds: batch[j], outPath: out, referer })
          images.push(readFrameDataUrl(out))
          taken.push(mmss(batch[j]))
        } catch {
          // A frame we could not extract is skipped rather than failing the batch, but say
          // so — silently checking fewer frames than intended is a weaker check than it looks.
          log(`  could not extract the frame at ${mmss(batch[j])} — skipped`)
        }
      }
      const done = Math.min(i + BATCH_SIZE, timestamps.length)

      // Zero frames checked is NOT a pass.
      //
      // moderateImages([]) answers "not flagged", which is true of an empty set and useless
      // as a verdict. If every extraction in a batch failed — no network to Bunny, a bad
      // referer, ffmpeg missing — the frame check silently becomes a no-op and the video is
      // approved unlooked-at. Treat it as a failure of the check, not a pass of the content.
      if (images.length === 0) {
        throw new Error(
          `could not extract any of the ${batch.length} frame(s) at ${batch.map(mmss).join(', ')} — ` +
            `the frame check cannot pass on no evidence`,
        )
      }
      const result = await moderateImages(images)
      // Name the offending frame(s). Without this the log says a batch was flagged and the
      // reviewer has five timestamps and no way to tell which one to look at.
      const culprits = (result.flaggedIndexes || []).map((k) => taken[k]).filter(Boolean)
      log(
        `  ${done}/${timestamps.length} checked [${taken.join(' ')}] -> ` +
          (result.flagged
            ? `FLAGGED ${(result.categories || []).join(', ')} at ${culprits.join(', ') || 'unknown frame'}`
            : 'clean'),
      )
      if (result.flagged) return { categories: result.categories, at: culprits }
      await onProgress(done, timestamps.length)
    }
    return null
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

// Content moderation is on by default; set MODERATION_ENABLED=false in the env to turn it
// off. When off, uploads are auto-approved (no OpenAI text/frame checks) — transcription /
// subtitles still run, which is the whole reason this can be turned off per call as well as
// per environment: a verified creator's upload needs the subtitles but not the checks.
const moderationEnabled = () => process.env.MODERATION_ENABLED !== 'false'

// An approval recorded WITHOUT running the checks — because moderation was switched off, or
// because the uploader is verified. It is a record of "we did not look", not of "this is
// fine", and it must not satisfy a later request that does want to look.
//
// Records written before `checked` existed are judged by their reason: those two reasons are
// the only ways an approval could be reached without a scan, so anything else was scanned.
const UNCHECKED_REASONS = new Set(['moderation_disabled', 'verified_uploader'])
const wasChecked = (doc) =>
  doc?.checked === true || (doc?.checked === undefined && !UNCHECKED_REASONS.has(doc?.reason))

// Upload moderation, without a blocking idle-poll on Bunny's encoder. Two shapes:
//   • Moderation OFF — approve the upload instantly (client's gate), then transcribe subtitles
//     in THIS same background invocation. Self-contained, so it does NOT depend on the
//     scheduled reconciler firing. Idempotent via an atomic 'working' claim.
//   • Moderation ON — poll-first, re-entrant: each call checks Bunny readiness once and exits
//     if still encoding; the client's status poll re-invokes it until ready, then one
//     invocation claims the work and runs transcribe + moderation.
// Phases: awaiting_encode → working → done.
export const runUploadModeration = async (videoId, userId, { checks, readyTimeoutMs } = {}) => {
  if (!videoId) throw new Error('videoId is required')
  const short = String(videoId).slice(0, 8)
  // The caller may override the environment: a verified creator's video still needs
  // transcribing for subtitles, but not checking.
  const runChecks = checks === undefined ? moderationEnabled() : !!checks
  // Timestamped, and each phase is marked so the summary can show where the time went.
  const log = (m) => console.log(`${ts()} [moderate ${short}] ${m}`)
  const phase = (m) => {
    mark(m)
    log(m)
  }

  // A rejection does NOT delete the video.
  //
  // It used to, and that made the whole thing circular: the creator could only appeal by
  // re-uploading the file the scanner had just destroyed, and re-uploading triggered another
  // scan that destroyed it again. Keeping the video means an automated verdict is reviewable
  // — a person can watch the actual footage that was flagged, and the creator can ask for
  // that with one click instead of an upload. It is never public in the meantime: the episode
  // stays outside the approved run.
  const reject = async (reason, categories, at = []) => {
    logVerdict(log, `REJECTED: ${reason} [${(categories || []).join(', ')}]${at.length ? ` at ${at.join(', ')}` : ''}`)
    await setMod(videoId, { status: 'rejected', reason, categories, flaggedAt: at, phase: 'done', stage: 'done', progress: 100 })
    return { status: 'rejected', reason, categories, flaggedAt: at }
  }

  // ── Checks OFF: approve instantly + generate subtitles here (no scheduler dependency) ──
  if (!runChecks) {
    const existing = await getModeration(videoId)
    if (existing && (existing.phase === 'working' || existing.phase === 'done')) {
      return { phase: existing.phase }
    }
    if (!existing) {
      await setMod(videoId, {
        videoId,
        userId: userId || null,
        status: 'approved',
        phase: 'awaiting_encode',
        stage: 'done',
        progress: 100,
        reason: checks === false ? 'verified_uploader' : 'moderation_disabled',
        checked: false,
        categories: [],
        createdAt: new Date(),
      })
    }
    // Atomic claim so repeated client triggers don't double-transcribe.
    const existingDoc = await getModeration(videoId)
    const claim = await update(
      'videoModeration',
      {
        videoId,
        // A stale claim from a process that died is taken over, not waited on forever.
        $or: [
        // A record written before `phase` existed has none. It is not claimed by anyone, so
        // it must be claimable — otherwise it matches neither the early return nor the claim
        // and the video is stuck forever, reported as "still encoding" while Bunny has long
        // since finished it.
        { phase: { $in: [null, undefined] } },
        { phase: { $exists: false } },
        { phase: 'awaiting_encode' },
        { phase: 'working', updatedAt: { $lt: new Date(Date.now() - WORKING_STALE_MS) } },
        ],
      },
      { $set: { phase: 'working', updatedAt: new Date() } },
    )
    if (!claim.matchedCount) return { working: true }
    log(`checks off (${checks === false ? 'verified uploader' : 'moderation disabled'}) — approved; generating subtitles`)

    // Honour the readiness result. Ignoring it meant transcribing a playlist that 404s,
    // swallowing the error, and then marking the record `done` — a success log for a video
    // that was never processed. Worse, the claim above had already moved the phase to
    // 'working', which no later attempt can claim, so the episode was stuck there for good.
    // Backfill passes a short timeout: if Bunny has not finished this video yet, that is a
    // reason to come back later, not to hold a worker slot for six minutes over subtitles
    // nobody is waiting on. A decision, by contrast, is worth waiting for.
    const ready = await waitForBunnyReady(videoId, readyTimeoutMs ? { timeoutMs: readyTimeoutMs } : {})
    if (!ready) {
      log('bunny has not finished encoding — releasing the claim so this can be retried')
      await setMod(videoId, { phase: 'awaiting_encode' })
      return { waiting: true }
    }

    try {
      await transcribeEpisode({ videoPath: bunnyHlsUrl(videoId), videoId, referer: bunnyReferer() })
    } catch (e) {
      // Do NOT mark this done. Marking done is what tells every later pass there is nothing
      // left to do, so swallowing the error here costs the episode its subtitles for good —
      // and the usual cause is a dropped connection that would succeed on the next attempt.
      const attempts = Number(existingDoc?.transcribeAttempts || 0) + 1
      const detail = e.cause?.code || e.cause?.message || ''
      console.error(
        `${ts()} [moderate ${short}] subtitle transcription failed (attempt ${attempts}/${MAX_TRANSCRIBE_ATTEMPTS}): ` +
          `${e.message}${detail ? ` — ${detail}` : ''}`,
      )
      if (attempts < MAX_TRANSCRIBE_ATTEMPTS) {
        await setMod(videoId, { phase: 'awaiting_encode', transcribeAttempts: attempts })
        return { retryTranscribe: true }
      }
      // Out of attempts: stop retrying, but record that this episode has no subtitles rather
      // than leaving it indistinguishable from one that was transcribed successfully.
      log(`giving up on subtitles after ${attempts} attempts`)
      await setMod(videoId, { phase: 'done', transcribeAttempts: attempts, transcribeFailed: e.message })
      return { status: 'approved' }
    }
    await setMod(videoId, { phase: 'done', transcribeAttempts: 0, transcribeFailed: '' })
    return { status: 'approved' }
  }

  // ── Checks ON: poll-first, re-entrant ──
  let doc = await getModeration(videoId)
  if (!doc) {
    await setMod(videoId, {
      videoId,
      userId: userId || null,
      status: 'processing',
      phase: 'awaiting_encode',
      stage: 'encoding',
      progress: 5,
      reason: '',
      categories: [],
      checked: true,
      createdAt: new Date(),
    })
    doc = { phase: 'awaiting_encode' }
  }
  // A finished record that was never actually checked is re-opened rather than trusted.
  // Without this, every video uploaded while moderation was off stays permanently exempt:
  // the cached "approved" short-circuits the scan even once checking is switched back on.
  if (doc.phase === 'done' && !wasChecked(doc)) {
    log(`previously approved without checks (${doc.reason || 'unknown'}) — re-opening for a real scan`)
    await setMod(videoId, {
      status: 'processing',
      phase: 'awaiting_encode',
      stage: 'encoding',
      progress: 5,
      reason: '',
      categories: [],
      checked: true,
    })
    doc = { phase: 'awaiting_encode' }
  }
  if (doc.phase === 'working') {
    const age = Date.now() - new Date(doc.updatedAt || doc.createdAt || 0).getTime()
    if (age < WORKING_STALE_MS) return { phase: 'working' } // a peer is genuinely working on it
    log(`a previous attempt claimed this ${Math.round(age / 60000)} min ago and never finished — taking it over`)
    await setMod(videoId, { phase: 'awaiting_encode' })
    doc = { ...doc, phase: 'awaiting_encode' }
  }
  if (doc.phase === 'done') return { phase: doc.phase }

  // Check Bunny readiness ONCE (4 = Finished, 5/6 = error). Still encoding → exit; the client's
  // status poll re-invokes this. No idle loop.
  const info = await getBunnyVideo(videoId).catch(() => null)
  if (info?.status !== 4) {
    if (info?.status === 5 || info?.status === 6) {
      log(`bunny encode failed (status ${info.status})`)
      await setMod(videoId, { status: 'rejected', reason: 'encode_failed', phase: 'done', stage: 'done', progress: 100 })
    }
    return { waiting: true }
  }

  // Bunny is ready → atomically claim the work so only one invocation transcribes/moderates.
  const claim = await update(
    'videoModeration',
    {
      videoId,
      $or: [
        // A record written before `phase` existed has none. It is not claimed by anyone, so
        // it must be claimable — otherwise it matches neither the early return nor the claim
        // and the video is stuck forever, reported as "still encoding" while Bunny has long
        // since finished it.
        { phase: { $in: [null, undefined] } },
        { phase: { $exists: false } },
        { phase: 'awaiting_encode' },
        { phase: 'working', updatedAt: { $lt: new Date(Date.now() - WORKING_STALE_MS) } },
      ],
    },
    { $set: { phase: 'working', updatedAt: new Date() } },
  )
  if (!claim.matchedCount) return { working: true }

  // Anything that throws from here on must give the claim back. A transient failure — one
  // dropped connection to OpenAI or Bunny — would otherwise leave the video claimed and
  // therefore untouchable until the stale window expires twenty minutes later, turning a
  // blip into a long outage for that episode.
  try {
    return await runChecksOn({ videoId, userId, log, phase, reject, info, doc, short })
  } catch (error) {
    log(`scan failed (${error.message}) — releasing the claim so it can be retried`)
    await setMod(videoId, { status: 'processing', phase: 'awaiting_encode' }).catch(() => {})
    throw error
  }
}

// The scan itself, once the video is claimed and known to be ready.
const runChecksOn = async ({ videoId, userId, log, phase, reject, info, doc, short }) => {
  void userId
  const src = bunnyHlsUrl(videoId)
  const referer = bunnyReferer()

  // Transcribe, unless we already have the transcript.
  //
  // Transcription is the slow, expensive half of a scan — a minute of video costs a download,
  // an ffmpeg audio extraction and a Whisper round-trip — and its output does not change when
  // a verdict is re-examined. A re-scan is about re-judging the content, not re-deriving it,
  // so the stored transcript is reused and the subtitles already on Bunny are left alone.
  let transcript = doc?.transcript || ''
  if (transcript) {
    log(`reusing the stored transcript (${transcript.length} chars) — not re-transcribing`)
  } else {
    try {
      phase('transcribe')
      await setMod(videoId, { stage: 'transcribe', progress: 25 })
      const r = await transcribeEpisode({ videoPath: src, videoId, referer })
      transcript = r.text || ''
      // Kept so a later re-scan does not pay for this again.
      if (transcript) await setMod(videoId, { transcript })
    } catch (e) {
      console.error(`${ts()} [moderate ${short}] transcribe failed:`, e.message)
    }
  }

  // Moderate the transcript text.
  phase('moderate text')
  await setMod(videoId, { stage: 'moderateText', progress: 55 })
  const textResult = await moderateText(transcript)
  if (textResult.flagged) return reject('harmful_text', textResult.categories)

  // Extract frames at random 5–15s intervals and moderate them in batches.
  phase('moderate frames')
  await setMod(videoId, { stage: 'moderateFrames', progress: 65 })
  let duration = Number(info?.length) || 0
  if (!duration) duration = await probeDuration({ videoPath: src }).catch(() => 0)
  const timestamps = frameTimestamps(duration)
  const flaggedCats = await moderateFramesInBatches(
    videoId,
    src,
    referer,
    timestamps,
    (done, total) =>
      setMod(videoId, { progress: Math.min(95, 65 + Math.round((done / Math.max(1, total)) * 30)) }),
    log,
  )
  if (flaggedCats) {
    // Carry the timestamp into the verdict so the uploader is told where to look.
    return reject('harmful_frame', flaggedCats.categories, flaggedCats.at)
  }

  logVerdict(log, 'APPROVED')
  await setMod(videoId, { status: 'approved', phase: 'done', stage: 'done', progress: 100 })
  return { status: 'approved' }
}

// Read a moderation record (for status polling).
export const getModeration = async (videoId) => {
  const docs = await get('videoModeration', { videoId }, {}, {}, 1)
  return docs && docs.length ? docs[0] : null
}
