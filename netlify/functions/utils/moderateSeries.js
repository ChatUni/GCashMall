// The auto-moderation pipeline for a whole series: the series' own text, then every episode
// still awaiting review.
//
// This lives in the shared utils — not in the worker — precisely so that the serverless and
// server runtimes execute the SAME code. The only thing that differs between them is how a
// verdict is reported, which is injected:
//
//   server      → an HMAC-signed HTTP callback to the API (the worker has no DB write path
//                 of its own for review decisions)
//   serverless  → a direct in-process call, since it is already inside the API
//
// Anything that cannot produce a verdict — a checker that errors, an episode that times out
// — leaves the item PENDING for a human. A creator's upload is never rejected because one of
// our own API calls failed.

import { ObjectId } from 'mongodb'
import { get, connectDB } from './db.js'
import { runUploadModeration, getModeration } from './moderateUpload.js'
import { moderateText } from './moderation.js'
import { ts, withTiming, timing, summarize, fmtMs } from './jobTiming.js'

const EPISODE_TIMEOUT_MS = Number(process.env.MODERATION_EPISODE_TIMEOUT_MS) || 30 * 60 * 1000
const POLL_MS = 5000
// How long to keep re-entering the pipeline for a video Bunny has not finished encoding
// before leaving it for a later job rather than holding a worker slot on it.
const NOT_READY_GIVE_UP_MS = 10 * 60 * 1000
// How many already-decided episodes to process for subtitles in one run. Small, because each
// can cost a Bunny wait plus a full transcription, and none of it is what the run is for.
const SUBTITLE_BACKFILL_PER_RUN = Number(process.env.SUBTITLE_BACKFILL_PER_RUN) || 3
// Backfill only glances at Bunny. Waiting minutes for a video whose subtitles nobody is
// blocked on is what stops the worker reaching the next real decision.
const BACKFILL_READY_TIMEOUT_MS = 5000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// `report` receives one verdict at a time; `heartbeat` (optional) keeps a long run's lease
// alive. Returns a summary of what was decided.
// `skipChecks` (a verified creator) still runs the pipeline — every episode is transcribed
// for subtitles, which is not a moderation concern and used to ride on this same trigger —
// but nothing is checked and everything is approved.
export const moderateSeriesContent = async (
  { jobId, seriesId, userId, skipChecks = false },
  { report, heartbeat, deadline } = {},
) => {
  const docs = await get('series', { _id: new ObjectId(String(seriesId)) }, {}, {}, 1)
  if (!docs || docs.length === 0) throw new Error(`series ${seriesId} not found`)
  const series = docs[0]

  // Every log line in this function is prefixed with it, including the earliest ones, so it
  // is declared at the top. Declared lower down it is a TDZ error, which failed every job
  // before any work ran.
  const tag = `[${series.name || String(seriesId).slice(0, 8)}]`

  // Parked by its uploader or an admin: reviewing content nobody intends to publish spends
  // money to fill a queue. Checked here as well as in the sweep, because a series can be
  // hidden after its job was queued.
  //
  // `shelvedByUploader`, not the derived `shelved` — the latter is true for everything
  // awaiting review, which is what awaiting review means.
  if (series.shelvedByUploader) {
    console.log(`${ts()} ${tag} shelved by its uploader — skipping review`)
    return { decided: [], incomplete: false, remaining: 0, waitingOnEncode: 0, skipped: 'shelved' }
  }

  // Only what is awaiting review. An item already approved — a generated episode, or one a
  // human has passed — is not re-judged: re-emitting a verdict on it could overturn a
  // decision that has already been made, and would attribute someone else's approval to the
  // scanner.
  // Two different questions, and conflating them is what broke a verified creator's upload:
  //
  //   PROCESS  — every episode that has a video needs running through the pipeline, because
  //              that is what produces its subtitles. Transcription is not a moderation
  //              concern and does not care whether the episode is already approved.
  //   DECIDE   — only an episode still awaiting review gets a verdict. Re-judging an
  //              approved one could overturn a decision already made.
  //
  // A verified creator's episodes arrive approved, so filtering the work list by "pending"
  // meant they were never transcribed and their video sat unprocessed forever.
  const isPending = (doc) => (doc?.moderation?.status || 'pending') === 'pending'

  // An episode with no video is not scannable and must not be approved for it: "nothing to
  // check" is not "fit to publish". Left pending rather than rejected — it is unfinished,
  // not wrong, and a rejection would email the uploader about work they never submitted.
  const skipped = (series.episodes || []).filter((ep) => isPending(ep) && !ep.videoId)

  // Ordering matters as much as membership here.
  //
  // Episodes awaiting a DECISION come first: that is what someone is waiting on, and a
  // verdict must not queue behind unrelated work. Everything else with a video follows,
  // needing only subtitles.
  //
  // And the subtitle tail is CAPPED. A 60-episode series can have dozens of episodes that
  // never finished processing; touching them all in one run means dozens of six-minute Bunny
  // waits and full transcriptions, so a single new episode's review turns into hours and
  // holds a worker slot the whole time. The remainder is left for the next run, which the
  // job defers to rather than closing.
  const withVideo = (series.episodes || [])
    .filter((ep) => ep.videoId)
    .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber))
  // An episode the creator has appealed is waiting on a person. Judging it again here would
  // produce the same automated verdict they are disputing — and delete their re-upload.
  const appealed = withVideo.filter((ep) => ep.moderation?.reviewRequest)
  const decidable = withVideo.filter((ep) => isPending(ep) && !ep.moderation?.reviewRequest)
  if (appealed.length) {
    console.log(
      `${ts()} ${tag} skipping ${appealed.length} episode(s) awaiting human review: ` +
        appealed.map((e) => `ep${e.episodeNumber}`).join(', '),
    )
  }

  // Which already-decided episodes actually still need subtitle work. An episode whose
  // videoModeration record is `done` needs nothing: including it wastes a slot in the budget
  // and, worse, the budget then never reaches the episodes that DO need work — the run takes
  // the same first three no-op episodes every time and defers forever.
  const finished = await completedVideoIds(withVideo.map((ep) => ep.videoId))
  const subtitlesOnly = withVideo.filter(
    (ep) => !isPending(ep) && !ep.moderation?.reviewRequest && !finished.has(ep.videoId),
  )
  const subtitleBudget = subtitlesOnly.slice(0, SUBTITLE_BACKFILL_PER_RUN)
  const subtitlesDeferred = subtitlesOnly.length - subtitleBudget.length

  const toProcess = [...decidable, ...subtitleBudget]
  const seriesTextPending = isPending(series)
  console.log(
    `${ts()} ${tag} ${decidable.length} to decide` +
      (decidable.length ? ` (${decidable.map((e) => `ep${e.episodeNumber}`).join(', ')})` : '') +
      `, ${subtitleBudget.length} for subtitles${subtitlesDeferred ? `, ${subtitlesDeferred} deferred` : ''}`,
  )

  const total = toProcess.length + (seriesTextPending ? 1 : 0)
  if (skipped.length) {
    console.log(
      `${ts()} ${tag} ${skipped.length} episode(s) have no video — ` +
        `left pending: ${skipped.map((e) => e.episodeNumber).join(', ')}`,
    )
  }
  if (total === 0) return { decided: [], incomplete: false, remaining: 0, waitingOnEncode: 0 }
  let done = 0
  const decided = []
  let waitingOnEncode = 0

  // Names, not just numbers: a log that says "episode 60" tells you nothing when three
  // series are being worked through.
  const titleOf = (n) => {
    const ep = (series.episodes || []).find((e) => Number(e.episodeNumber) === Number(n))
    return ep?.title ? ` "${ep.title}"` : ''
  }
  const label = (n) => (n === null ? 'series text' : `episode ${n}${titleOf(n)}`)
  const emit = async (episodeNumber, verdict, reason, startedAt) => {
    done += 1
    decided.push({ episodeNumber, verdict })
    // Progress is logged as well as reported, so the worker's own log shows the run advancing
    // rather than going quiet for the length of a scan.
    console.log(
      `${ts()} ${tag} ${done}/${total} ${label(episodeNumber)} -> ${verdict}` +
        (startedAt ? ` in ${fmtMs(Date.now() - startedAt)}` : '') +
        (reason ? ` (${reason})` : ''),
    )
    await report({ jobId, seriesId: String(seriesId), episodeNumber, verdict, reason, episodesDone: done, episodesTotal: total })
  }

  if (seriesTextPending) {
    const at = Date.now()
    const text = skipChecks ? { flagged: false, reason: '' } : await moderateSeriesText(series)
    await emit(null, text.flagged ? 'rejected' : 'approved', text.reason, at)
  }

  for (const ep of toProcess) {
    // Out of budget (a serverless runtime nearing its limit): stop cleanly and leave the
    // rest pending rather than dying mid-episode.
    if (deadline && Date.now() > deadline) {
      return { decided, incomplete: true, remaining: total - done, waitingOnEncode }
    }
    await heartbeat?.()
    const at = Date.now()
    // Each episode gets its own timing context, so one slow episode is visible on its own
    // rather than averaged into the job.
    // Checks run only for an episode still awaiting a decision. An episode that is already
    // approved is passed through purely for its subtitles: re-scanning it would re-judge a
    // decision already made — and could overturn it — which is the one thing this pipeline
    // must never do. It is also why a series of 61 approved episodes must not become 61
    // scans because one new episode needs reviewing.
    const needsVerdict = isPending(ep)
    const v = await withTiming(`episode ${ep.episodeNumber}`, () =>
      moderateEpisodeVideo(ep, userId, skipChecks || !needsVerdict, needsVerdict),
    )
    if (v.waiting) waitingOnEncode += 1
    if (needsVerdict) {
      await emit(Number(ep.episodeNumber), v.approved ? 'approved' : 'rejected', v.reason, at)
    } else {
      // Already decided — it was run only for its subtitles. Say which actually happened:
      // a video still encoding leaves the pipeline waiting, and reporting that as "processed"
      // is how a six-minute wait on a broken upload read like a success.
      done += 1
      console.log(
        `${ts()} ${tag} ${done}/${total} ${label(ep.episodeNumber)}` +
          ` ${v.waiting ? `not ready for processing (${v.reason || 'unknown'}) — will retry` : 'processed for subtitles'}` +
          ` in ${fmtMs(Date.now() - at)} (already ${ep.moderation?.status})`,
      )
    }
  }
  const t = timing()
  if (t) console.log(`${ts()} ${tag} all ${total} item(s) decided — ${summarize(t)}`)
  if (subtitlesDeferred > 0) {
    console.log(
      `${ts()} ${tag} ${subtitlesDeferred} episode(s) still need subtitles — left for a later run`,
    )
  }
  return { decided, incomplete: false, remaining: subtitlesDeferred, waitingOnEncode, subtitlesDeferred }
}

// videoIds whose moderation pipeline has already run to completion.
const completedVideoIds = async (videoIds) => {
  const ids = videoIds.filter(Boolean)
  if (ids.length === 0) return new Set()
  const db = await connectDB()
  const done = await db
    .collection('videoModeration')
    .find({ videoId: { $in: ids }, phase: 'done' }, { projection: { videoId: 1 } })
    .toArray()
  return new Set(done.map((d) => d.videoId))
}

const moderateSeriesText = async (series) => {
  const text = [series.name, series.description].filter(Boolean).join('\n')
  if (!text.trim()) return { flagged: false, reason: '' }
  try {
    const res = await moderateText(text)
    return {
      flagged: !!res?.flagged,
      reason: res?.flagged ? `Series text flagged: ${(res.categories || []).join(', ')}` : '',
    }
  } catch (error) {
    console.error(`series text moderation failed, leaving it for review: ${error.message}`)
    return { flagged: false, reason: '' }
  }
}

// runUploadModeration is poll-first and re-entrant: it was written for a runtime that has to
// exit and be re-invoked while Bunny encodes. Driving it to completion in one process is
// exactly the freedom a long-lived server buys, and is harmless in a function too (it simply
// may not finish before the budget runs out, which `deadline` above handles).
const moderateEpisodeVideo = async (ep, userId, skipChecks, needsVerdict = true) => {
  // Videoless episodes never reach here — they are filtered out above rather than approved.
  if (!ep.videoId) throw new Error(`episode ${ep.episodeNumber} has no video`)
  const startedAt = Date.now()
  // A decision may take as long as it needs; backfill gets one pass and then moves on.
  const until = startedAt + (needsVerdict ? EPISODE_TIMEOUT_MS : BACKFILL_READY_TIMEOUT_MS * 2)

  while (Date.now() < until) {
    try {
      await runUploadModeration(ep.videoId, userId, {
        checks: !skipChecks,
        // Subtitle backfill gives up on an unready video immediately; a decision waits.
        ...(needsVerdict ? {} : { readyTimeoutMs: BACKFILL_READY_TIMEOUT_MS }),
      })
    } catch (error) {
      console.error(`moderation step failed for ${ep.videoId}: ${error.message}`)
    }
    const rec = await getModeration(ep.videoId)
    // Released back to awaiting_encode: the video is not ready yet, so stop rather than spin.
    if (rec?.phase === 'awaiting_encode' && Date.now() - startedAt > NOT_READY_GIVE_UP_MS) {
      return { approved: true, reason: '', waiting: true }
    }
    if (rec?.status === 'approved' && rec?.phase === 'done') return { approved: true, reason: '' }
    if (rec?.status === 'rejected') {
      const where = (rec.flaggedAt || []).length ? ` (at ${rec.flaggedAt.join(', ')})` : ''
      const what = (rec.categories || []).length ? `: ${rec.categories.join(', ')}` : ''
      return { approved: false, reason: `Failed the automated content check${what}${where}` }
    }
    await sleep(POLL_MS)
  }
  // Out of budget. For backfill that is not a failure — subtitles nobody is waiting on can
  // wait for the next run, and throwing here would fail the WHOLE job over an episode that
  // is not what the run was for. Only a decision that cannot be reached is an error.
  if (!needsVerdict) {
    // Say why, rather than assuming encoding. A backfill pass that gets nowhere is usually
    // Bunny still working, but it can equally be a record the claim could not take.
    const rec = await getModeration(ep.videoId)
    return {
      approved: true,
      waiting: true,
      reason: rec?.phase === 'awaiting_encode' ? 'bunny not ready' : `record phase=${rec?.phase ?? 'missing'}`,
    }
  }
  throw new Error(
    `episode ${ep.episodeNumber} timed out after ${Math.round(EPISODE_TIMEOUT_MS / 60000)} minutes`,
  )
}
