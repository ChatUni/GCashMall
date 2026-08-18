// Netlify Background Function: runs Quick Create generation asynchronously (up to
// 15 minutes) in one of two modes, writing progress into a `productions` job doc.
//
//  • mode 'plan'    — runs Call 1 (Executive Producer) to get the 5-episode plan,
//                     then generates one cover per episode. Feeds step 5 (review).
//  • mode 'episode' — reuses the plan's Call-1 output, then runs Calls 2-6 for
//                     Episode 1. This job doc is the user's "Quick Create" entry in
//                     My Series (has title/cover/percent), resumable at step 6.
//
// Background functions respond 202 immediately and keep running; the client never
// reads this response — all results are persisted to the job document and polled.

import { get, save, update } from './utils/db.js'
import jwt from 'jsonwebtoken'
import { PIPELINE_CALL_KEYS, runOneCall } from './utils/pipeline.js'
import { runVideoGeneration } from './utils/videoJob.js'
import { triggerBackground } from './utils/trigger.js'
import { modelHasNativeAudio } from './utils/seedance.js'

const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }
  return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET).id
}

const updateJob = (jobId, fields) =>
  update('productions', { jobId }, { $set: { ...fields, updatedAt: new Date() } })

// Percent complete based on how many of the tracked steps (calls + video) are done
const percentOf = (progress) => {
  const steps = progress.calls || []
  const done = steps.filter((c) => c.status === 'done').length
  return steps.length ? Math.round((done / steps.length) * 100) : 0
}

const baseAcc = (body) => ({
  story: body.story,
  genre: body.genre,
  art_style: body.art_style,
  episode_length: body.episode_length,
  episode_length_seconds: body.episode_length,
  target_audience: body.target_audience || '',
})

// ── Plan mode: Call 1 + episode covers ──
const runPlan = async (jobId, userId, body) => {
  const progress = {
    calls: [{ key: 'executiveProducer', status: 'pending' }],
    coverStatus: 'pending',
  }
  await save('productions', {
    jobId,
    userId,
    mode: 'plan',
    status: 'running',
    error: '',
    progress,
    idea: body.story || '',
    ideaTitle: body.ideaTitle || '',
    genre: body.genre ?? null,
    artStyle: body.art_style ?? null,
    episodeLength: body.episode_length ?? null,
    calls: {},
    episodes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  progress.calls[0].status = 'running'
  await updateJob(jobId, { progress })

  const call1 = await runOneCall('executiveProducer', baseAcc(body))
  progress.calls[0].status = 'done'

  const seriesTitle = body.ideaTitle || call1?.series_blueprint?.title || 'Untitled Series'
  const plan = Array.isArray(call1.episode_plan) ? call1.episode_plan : []
  const episodes = plan.slice(0, 5).map((ep, idx) => ({
    n: typeof ep.episode === 'number' ? ep.episode : idx + 1,
    title: ep.title || `Episode ${idx + 1}`,
    desc: ep.summary || ep.hook || '',
    cover: '',
  }))

  progress.coverStatus = 'running'
  await updateJob(jobId, {
    progress,
    calls: { executiveProducer: call1 },
    episodes,
    ideaTitle: seriesTitle,
  })

  // Reuse the story cover for every episode — no AI cover generation at the plan stage.
  for (const ep of episodes) ep.cover = body.storyCover || ''
  progress.coverStatus = 'done'

  await updateJob(jobId, { progress, episodes, status: 'done', percent: 100 })
}

// ── Episode mode: reuse Call 1, run Calls 2-6 (this is the My Series entry) ──
const runEpisode = async (jobId, userId, body) => {
  const call1 = body.call1 && typeof body.call1 === 'object' ? body.call1 : {}
  const providedEpisodes = Array.isArray(body.episodes) ? body.episodes : []
  const seriesTitle = body.ideaTitle || call1?.series_blueprint?.title || 'Untitled Series'
  const cover = providedEpisodes[0]?.cover || ''

  const nativeAudio = await modelHasNativeAudio()
  const progress = {
    // The 7 LLM calls, plus the video-generation and audio/composition steps
    calls: [
      ...PIPELINE_CALL_KEYS.map((key, i) => ({ key, status: i === 0 ? 'done' : 'pending' })),
      { key: 'videoGeneration', status: 'pending' },
      // Seedance 2.0 already includes audio, so there's no separate audio step
      ...(nativeAudio ? [] : [{ key: 'audioGeneration', status: 'pending' }]),
      { key: 'composition', status: 'pending' },
    ],
    coverStatus: 'done',
  }
  const fields = {
    userId,
    mode: 'episode',
    status: 'running',
    error: '',
    title: seriesTitle,
    cover,
    percent: percentOf(progress),
    progress,
    idea: body.story || '',
    ideaTitle: seriesTitle,
    genre: body.genre ?? null,
    artStyle: body.art_style ?? null,
    episodeLength: body.episode_length ?? null,
    calls: { executiveProducer: call1 },
    episodes: providedEpisodes,
  }

  // Reuse the plan-phase document (same jobId): transition it from mode 'plan'
  // to 'episode' so we keep ONE production doc instead of creating a second one.
  const existing = await get('productions', { jobId }, {}, {}, 1)
  if (existing && existing.length > 0) {
    await updateJob(jobId, fields)
  } else {
    await save('productions', { jobId, ...fields, createdAt: new Date() })
  }

  const acc = { ...baseAcc(body), ...call1 }
  const callsRaw = { executiveProducer: call1 }

  // Run calls 2-6 (index 1..5); Call 1 was reused from the plan phase.
  for (let i = 1; i < PIPELINE_CALL_KEYS.length; i++) {
    progress.calls[i].status = 'running'
    await updateJob(jobId, { progress, percent: percentOf(progress) })

    const output = await runOneCall(PIPELINE_CALL_KEYS[i], acc)
    callsRaw[PIPELINE_CALL_KEYS[i]] = output
    Object.assign(acc, output)

    progress.calls[i].status = 'done'
    await updateJob(jobId, { progress, calls: callsRaw, percent: percentOf(progress) })
  }

  // The 7 calls are done. Hand video generation off to its own background job so it
  // runs on a separate 15-minute budget (status stays 'running' until videos finish).
  await updateJob(jobId, { percent: percentOf(progress) })
}

// Trigger the dedicated video-generation background function (fire-and-forget). If
// the hand-off can't be reached, fall back to running it inline, then hand off to the
// audio job (or finalize as done if that also fails).
const triggerVideoJob = async (jobId, authHeader) => {
  try {
    await triggerBackground('pipeline-video-background', jobId, authHeader)
  } catch (error) {
    console.error('Video hand-off failed, running inline:', error.message)
    await runVideoGeneration(jobId)
    try {
      await triggerBackground('pipeline-audio-background', jobId, authHeader)
    } catch (e) {
      console.error('Audio hand-off failed after inline video:', e.message)
      await updateJob(jobId, { status: 'done', percent: 100 })
    }
  }
}

export const handler = async (event) => {
  let jobId
  try {
    const body = JSON.parse(event.body || '{}')
    jobId = body.jobId
    if (!jobId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    if (body.mode === 'plan') {
      await runPlan(jobId, userId, body)
    } else {
      await runEpisode(jobId, userId, body)
      await triggerVideoJob(jobId, authHeader)
    }
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-background error:', error)
    if (jobId) {
      try {
        const docs = await get('productions', { jobId }, {}, {}, 1)
        const progress = docs?.[0]?.progress || { calls: [], coverStatus: 'pending' }
        const running = (progress.calls || []).find((c) => c.status === 'running')
        if (running) running.status = 'error'
        await updateJob(jobId, {
          status: 'error',
          error: String(error.message || error),
          progress,
        })
      } catch (e) {
        console.error('Failed to mark job errored:', e.message)
      }
    }
    return { statusCode: 500 }
  }
}
