// Shared runner for the video-generation phase. Reads the RIE output already saved
// on a production doc, renders each shot via Seedance, and writes the results +
// progress back to the same doc. Used by the dedicated pipeline-video-background
// function (and as an inline fallback if the hand-off trigger ever fails).
//
// Frame chaining (Phase 1): to make the episode feel continuous instead of a set of
// unrelated clips, each shot is seeded with the LAST frame of the previous shot in the
// same scene (Seedance image-to-video). Shots are grouped into scenes by location;
// within a scene they render serially (shot N needs shot N-1's frame), but different
// scenes render in parallel so wall-clock stays bounded by the longest scene (the
// 15-min background-function budget can't fit all shots end-to-end serially).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { get, update } from './db.js'
import { generateVideo } from './seedance.js'
import { extractLastFrame, extractCoverFrame, extractFrameAt, probeDuration } from './ffmpeg.js'
import { uploadImage } from './cloudinaryUtil.js'
import { ensureCharacterRefs, refImagesForShot } from './characterRefs.js'
import { isS1, createBunnyVideo, fetchBunnyVideoFromUrl } from './bunny.js'

const updateJob = (jobId, fields) =>
  update('productions', { jobId }, { $set: { ...fields, updatedAt: new Date() } })

const percentOf = (progress) => {
  const steps = progress.calls || []
  const done = steps.filter((c) => c.status === 'done').length
  return steps.length ? Math.round((done / steps.length) * 100) : 0
}

// Frame chaining is on by default; set SEEDANCE_FRAME_CHAIN=false to fall back to the
// old parallel, independent-per-shot rendering.
const frameChainEnabled = () => process.env.SEEDANCE_FRAME_CHAIN !== 'false'

const downloadTo = async (url, dest) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed (${res.status})`)
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

// Download a rendered shot once and extract the requested frames, uploading each.
// Returns { coverUrl?, lastUrl? }. cover = a static thumbnail for the shot; last = the
// final frame used to seed the next shot (frame chaining). Failures are swallowed.
const captureFrames = async (videoUrl, tag, { cover, last }) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganime-frame-'))
  const out = {}
  try {
    const vPath = path.join(tmp, 'shot.mp4')
    await downloadTo(videoUrl, vPath)
    if (cover) {
      const cPath = path.join(tmp, 'cover.jpg')
      await extractCoverFrame({ videoPath: vPath, outPath: cPath })
      out.coverUrl = await uploadImage(cPath, 'GCash/quick create/shot-covers')
    }
    if (last) {
      const lPath = path.join(tmp, 'last.jpg')
      await extractLastFrame({ videoPath: vPath, outPath: lPath })
      out.lastUrl = await uploadImage(lPath)
    }
  } catch (error) {
    console.error(`Frame capture failed for ${tag}:`, error.message)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  return out
}

// Group shots into scenes so frame chaining resets at cuts. Consecutive shots that
// share a scene key belong to one scene; a change starts a new scene. keyOf(req)
// returns a normalized key ('' = ungroupable → its own scene).
const groupIntoScenes = (requests, keyOf) => {
  const scenes = []
  let current = null
  let currentKey = null
  for (const req of requests) {
    const key = keyOf(req)
    if (current && key && key === currentKey) {
      current.push(req)
    } else {
      current = [req]
      currentKey = key
      scenes.push(current)
    }
  }
  return scenes
}

// Generate a video for every shot in the production's RIE output and persist them.
export const runVideoGeneration = async (jobId, userId) => {
  const docs = await get('productions', { jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) throw new Error('production not found')
  const doc = docs[0]
  if (userId && String(doc.userId) !== String(userId)) {
    throw new Error('not authorized for this production')
  }

  const progress = doc.progress || { calls: [], coverStatus: 'done' }
  let vIdx = (progress.calls || []).findIndex((c) => c.key === 'videoGeneration')
  if (vIdx < 0) {
    progress.calls = [...(progress.calls || []), { key: 'videoGeneration', status: 'pending' }]
    vIdx = progress.calls.length - 1
  }

  const requests = [...(doc.calls?.renderingEngine?.rendering_plan?.provider_requests || [])].sort(
    (a, b) => (a.shot_number ?? 0) - (b.shot_number ?? 0),
  )
  progress.calls[vIdx].status = 'running'

  // Per-shot scene / location / character list (from the prompt compiler): scene_id
  // (falling back to location) drives scene grouping for chaining; characters drive
  // reference-image seeding.
  const shotPrompts =
    doc.calls?.promptCompiler?.universal_production_prompt_package?.shot_prompts || []
  const sceneById = new Map(shotPrompts.map((s) => [s.shot_id, s.scene_id]))
  const locationById = new Map(shotPrompts.map((s) => [s.shot_id, s.location]))
  const charsById = new Map(shotPrompts.map((s) => [s.shot_id, s.characters]))

  // Prefer the explicit scene_id (from the storyboard, carried by Calls 6/7), whether
  // it arrives on the provider request or the prompt-compiler shot. Fall back to the
  // location string for older jobs that predate scene_id.
  const sceneKeyOf = (req) => {
    const scene = req.scene_id ?? sceneById.get(req.shot_id)
    if (scene !== undefined && scene !== null && String(scene).trim() !== '') {
      return `s:${String(scene).trim().toLowerCase()}`
    }
    const loc = (locationById.get(req.shot_id) || '').trim().toLowerCase()
    return loc ? `l:${loc}` : ''
  }

  // Phase 2: canonical character reference images (generated once, cached on the job).
  const charRefs = await ensureCharacterRefs(doc, (fields) => updateJob(jobId, fields))

  // Keep shots that already rendered successfully; only (re)generate the rest.
  const kept = new Map((doc.videos || []).filter((v) => v && v.url).map((v) => [v.shot_id, v]))

  const total = requests.length
  const indexOf = new Map(requests.map((req, i) => [req.shot_id, i]))
  const shotPct = new Array(total).fill(0) // per-shot progress 0–100
  const results = []
  let completed = 0
  let lastWrite = 0

  const avgPct = () => Math.round(shotPct.reduce((a, b) => a + b, 0) / (total || 1))
  // Throttled, fire-and-forget write of the averaged progress (mid-render updates)
  const pushProgress = () => {
    const now = Date.now()
    if (now - lastWrite < 3000) return
    lastWrite = now
    updateJob(jobId, { videoProgress: { percent: avgPct(), done: completed, total } }).catch(() => {})
  }

  const persist = async () => {
    const sorted = [...results].sort((a, b) => (a.shot_number ?? 0) - (b.shot_number ?? 0))
    await updateJob(jobId, {
      videos: sorted,
      videoProgress: { percent: avgPct(), done: completed, total },
    })
  }

  await updateJob(jobId, {
    status: 'running',
    progress,
    percent: percentOf(progress),
    videoProgress: { percent: 0, done: 0, total },
  })

  const chain = frameChainEnabled()

  // Render one scene's shots serially, seeding each with the previous shot's last frame.
  const renderScene = async (scene) => {
    let prevFrameUrl = null
    for (const req of scene) {
      const i = indexOf.get(req.shot_id)
      const cached = kept.get(req.shot_id)
      let video

      if (cached) {
        video = cached
        shotPct[i] = 100
      } else {
        const firstFrameUrl = chain ? prevFrameUrl : undefined
        // Frame chaining already carries identity within a scene, so only seed reference
        // images when there's no start frame (the opening shot of a scene).
        const referenceImages = firstFrameUrl
          ? undefined
          : refImagesForShot(charsById.get(req.shot_id), charRefs)
        try {
          const { url } = await generateVideo(req, {
            firstFrameUrl,
            referenceImages,
            onProgress: (p) => {
              shotPct[i] = p
              pushProgress()
            },
          })
          video = { shot_id: req.shot_id, shot_number: req.shot_number ?? null, url }
        } catch (error) {
          console.error(`Video ${req.shot_id} failed:`, error.message)
          video = {
            shot_id: req.shot_id,
            shot_number: req.shot_number ?? null,
            error: String(error.message || error),
          }
          shotPct[i] = 100 // count a failed shot as "done" for the bar
        }
      }

      // Save a cover thumbnail for this shot (once), and capture its last frame to seed
      // the next shot in the scene — both from a single download.
      const chainable = chain && req !== scene[scene.length - 1]
      const needCover = !!video.url && !video.coverUrl
      const needLast = chainable && !!video.url && !video.lastFrameUrl
      if (needCover || needLast) {
        const frames = await captureFrames(video.url, req.shot_id, {
          cover: needCover,
          last: needLast,
        })
        if (frames.coverUrl) video.coverUrl = frames.coverUrl
        if (frames.lastUrl) video.lastFrameUrl = frames.lastUrl
      }
      prevFrameUrl = chainable ? video.lastFrameUrl || null : null

      // s1 storage: persist each shot durably on Bunny (Seedance URLs expire). Bunny
      // ingests from the shot's public Seedance URL. Best-effort — a failure doesn't
      // block the episode (the concat still uses the raw url below).
      if (isS1() && video.url && !video.bunnyVideoId) {
        try {
          const bvid = await createBunnyVideo(`${jobId}-${req.shot_id}`)
          await fetchBunnyVideoFromUrl(bvid, video.url)
          video.bunnyVideoId = bvid
        } catch (error) {
          console.error(`Bunny shot upload ${req.shot_id} failed:`, error.message)
        }
      }

      completed++
      results.push(video)
      await persist()
    }
  }

  const scenes = chain ? groupIntoScenes(requests, sceneKeyOf) : requests.map((r) => [r])
  // Scenes are independent → render them in parallel; shots within a scene are serial.
  await Promise.all(scenes.map((scene) => renderScene(scene)))

  results.sort((a, b) => (a.shot_number ?? 0) - (b.shot_number ?? 0))

  // Video is done, but leave overall status 'running' — the audio/composition step
  // runs next and is what finalizes the production as 'done'.
  progress.calls[vIdx].status = 'done'
  await updateJob(jobId, { progress, videos: results, percent: percentOf(progress) })
}

// Backfill missing shot cover thumbnails for an already-generated production (older
// jobs rendered before covers were saved). Safe to call repeatedly — only shots with a
// video but no coverUrl are processed, and each cover is persisted as it completes so
// the client can pick them up incrementally.
export const backfillShotCovers = async (jobId, userId) => {
  const docs = await get('productions', { jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) throw new Error('production not found')
  const doc = docs[0]
  if (userId && String(doc.userId) !== String(userId)) {
    throw new Error('not authorized for this production')
  }

  const videos = doc.videos || []
  for (const v of videos) {
    // Prefer the composed (Cloudinary) url — the raw provider url may have expired.
    const src = v.audioUrl || v.url
    if (!src || v.coverUrl) continue
    const { coverUrl } = await captureFrames(src, v.shot_id, { cover: true })
    if (coverUrl) {
      v.coverUrl = coverUrl
      await updateJob(jobId, { videos })
    }
  }
}

// Extract `count` random frames from the episode video (fallback: the first shot) and
// upload them, for the "Random Frame" thumbnail picker. Result is written to the job as
// randomFrames = { id: reqId, urls } so the client can match its request.
export const extractRandomFrames = async (jobId, userId, reqId, count = 3) => {
  const docs = await get('productions', { jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) throw new Error('production not found')
  const doc = docs[0]
  if (userId && String(doc.userId) !== String(userId)) {
    throw new Error('not authorized for this production')
  }

  const firstShot = (doc.videos || []).find((v) => v.audioUrl || v.url)
  const src = doc.episodeVideo || firstShot?.audioUrl || firstShot?.url
  if (!src) throw new Error('no video to sample frames from')

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganime-rand-'))
  const urls = []
  try {
    const vPath = path.join(tmp, 'video.mp4')
    await downloadTo(src, vPath)

    let dur = await probeDuration({ videoPath: vPath })
    if (!dur || dur < 1) dur = doc.episodeLength && doc.episodeLength > 1 ? doc.episodeLength : 30
    const lo = 0.3
    const hi = Math.max(lo + 0.1, dur - 0.3)
    const times = Array.from({ length: count }, () => lo + Math.random() * (hi - lo)).sort(
      (a, b) => a - b,
    )

    for (let i = 0; i < times.length; i++) {
      const fPath = path.join(tmp, `frame${i}.jpg`)
      try {
        await extractFrameAt({ videoPath: vPath, seconds: times[i], outPath: fPath })
        urls.push(await uploadImage(fPath, 'GCash/quick create/random-frames'))
      } catch (error) {
        console.error(`Random frame ${i} failed:`, error.message)
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  await updateJob(jobId, { randomFrames: { id: reqId, urls } })
}
