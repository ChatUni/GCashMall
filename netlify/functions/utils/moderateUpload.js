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
import { extractFrameAt, probeDuration } from './ffmpeg.js'
import {
  waitForBunnyReady,
  bunnyHlsUrl,
  bunnyReferer,
  getBunnyVideo,
  deleteBunnyVideo,
} from './bunny.js'

// Frames extracted + moderated per round (checked concurrently). Small enough to reject
// early, large enough to amortize round-trips across parallel requests.
const BATCH_SIZE = 5

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
const moderateFramesInBatches = async (videoId, src, referer, timestamps, onProgress) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganime-mod-'))
  try {
    for (let i = 0; i < timestamps.length; i += BATCH_SIZE) {
      const batch = timestamps.slice(i, i + BATCH_SIZE)
      const images = []
      for (let j = 0; j < batch.length; j++) {
        const out = path.join(tmp, `f${i + j}.jpg`)
        try {
          await extractFrameAt({ videoPath: src, seconds: batch[j], outPath: out, referer })
          images.push(readFrameDataUrl(out))
        } catch {
          /* skip a frame we couldn't extract */
        }
      }
      const result = await moderateImages(images)
      if (result.flagged) return result.categories
      await onProgress(Math.min(i + BATCH_SIZE, timestamps.length), timestamps.length)
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
// subtitles still run.
const moderationEnabled = () => process.env.MODERATION_ENABLED !== 'false'

export const runUploadModeration = async (videoId, userId) => {
  if (!videoId) throw new Error('videoId is required')
  const log = (m) => console.log(`[moderate ${videoId}] ${m}`)

  const reject = async (reason, categories) => {
    log(`REJECTED: ${reason} [${(categories || []).join(', ')}]`)
    await deleteBunnyVideo(videoId).catch((e) => console.error('delete after reject failed:', e.message))
    await setMod(videoId, { status: 'rejected', reason, categories, stage: 'done', progress: 100 })
    return { status: 'rejected', reason, categories }
  }

  await setMod(videoId, {
    videoId,
    userId: userId || null,
    status: 'processing',
    stage: 'transcribe',
    progress: 5,
    reason: '',
    categories: [],
    createdAt: new Date(),
  })

  await waitForBunnyReady(videoId).catch(() => {})
  const src = bunnyHlsUrl(videoId)
  const referer = bunnyReferer()

  // 1. Transcribe (also uploads subtitle tracks to the video). Transcription failure is
  //    non-fatal — we still moderate the frames — but leaves no transcript to check.
  let transcript = ''
  try {
    log('transcribe')
    const r = await transcribeEpisode({
      videoPath: src,
      videoId,
      referer,
      onProgress: (p) => setMod(videoId, { progress: 5 + Math.round((p / 100) * 30) }),
    })
    transcript = r.text || ''
  } catch (e) {
    console.error(`[moderate ${videoId}] transcribe failed:`, e.message)
  }

  // 2–4. Content moderation (text + frames). Skipped entirely when MODERATION_ENABLED=false.
  if (moderationEnabled()) {
    // 2. Moderate the transcript text.
    log('moderate text')
    await setMod(videoId, { stage: 'moderateText', progress: 40 })
    const textResult = await moderateText(transcript)
    if (textResult.flagged) return reject('harmful_text', textResult.categories)

    // 3 + 4. Extract frames at random 5–15s intervals and moderate them in batches.
    log('moderate frames')
    await setMod(videoId, { stage: 'moderateFrames', progress: 45 })
    const info = await getBunnyVideo(videoId).catch(() => null)
    let duration = Number(info?.length) || 0
    if (!duration) duration = await probeDuration({ videoPath: src }).catch(() => 0)
    const timestamps = frameTimestamps(duration)
    const flaggedCats = await moderateFramesInBatches(
      videoId,
      src,
      referer,
      timestamps,
      (done, total) =>
        setMod(videoId, { progress: Math.min(95, 45 + Math.round((done / Math.max(1, total)) * 50)) }),
    )
    if (flaggedCats) return reject('harmful_frame', flaggedCats)
  } else {
    log('moderation disabled (MODERATION_ENABLED=false) — auto-approving')
  }

  // Passed every check (or moderation disabled).
  log('APPROVED')
  await setMod(videoId, { status: 'approved', stage: 'done', progress: 100 })
  return { status: 'approved' }
}

// Read a moderation record (for status polling).
export const getModeration = async (videoId) => {
  const docs = await get('videoModeration', { videoId }, {}, {}, 1)
  return docs && docs.length ? docs[0] : null
}
