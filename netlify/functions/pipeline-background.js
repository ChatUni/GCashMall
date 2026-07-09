// Netlify Background Function: runs the full 6-call Quick Create production pipeline
// (plus per-episode cover generation) asynchronously, up to 15 minutes. It writes
// incremental progress into a `productions` job document keyed by jobId; the client
// polls the `productionStatus` API endpoint to render progress and, when done, the
// review step.
//
// Background functions return 202 immediately and keep running; the client never
// reads this function's response — all results are persisted to the job document.

import { get, save, update } from './utils/db.js'
import jwt from 'jsonwebtoken'
import { PIPELINE_CALL_KEYS, runOneCall, generateCover } from './utils/pipeline.js'

const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }
  return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET).id
}

const updateJob = (jobId, fields) =>
  update('productions', { jobId }, { $set: { ...fields, updatedAt: new Date() } })

export const handler = async (event) => {
  let jobId
  try {
    const body = JSON.parse(event.body || '{}')
    jobId = body.jobId
    if (!jobId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    const progress = {
      calls: PIPELINE_CALL_KEYS.map((key) => ({ key, status: 'pending' })),
      coverStatus: 'pending',
    }

    // Create the job document (status running) so the client's poll can find it
    await save('productions', {
      jobId,
      userId,
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

    // Run the 6 calls sequentially; each call's output feeds the next.
    const acc = {
      story: body.story,
      genre: body.genre,
      art_style: body.art_style,
      episode_length: body.episode_length,
      episode_length_seconds: body.episode_length,
      target_audience: body.target_audience || '',
    }
    const callsRaw = {}
    for (let i = 0; i < PIPELINE_CALL_KEYS.length; i++) {
      progress.calls[i].status = 'running'
      await updateJob(jobId, { progress })

      const output = await runOneCall(PIPELINE_CALL_KEYS[i], acc)
      callsRaw[PIPELINE_CALL_KEYS[i]] = output
      Object.assign(acc, output)

      progress.calls[i].status = 'done'
      await updateJob(jobId, { progress, calls: callsRaw })
    }

    // Build the 5-episode list from the Executive Producer's plan (Call 1)
    const exec = callsRaw.executiveProducer || {}
    const seriesTitle = body.ideaTitle || exec?.series_blueprint?.title || 'Untitled Series'
    const plan = Array.isArray(exec.episode_plan) ? exec.episode_plan : []
    const episodes = plan.slice(0, 5).map((ep, idx) => ({
      n: typeof ep.episode === 'number' ? ep.episode : idx + 1,
      title: ep.title || `Episode ${idx + 1}`,
      desc: ep.summary || ep.hook || '',
      cover: '',
    }))

    progress.coverStatus = 'running'
    await updateJob(jobId, { progress, episodes, ideaTitle: seriesTitle })

    // Generate an AI cover per episode (in parallel; a failed cover stays empty)
    await Promise.all(
      episodes.map(async (ep, idx) => {
        const prompt = `Anime key visual cover art for the series "${seriesTitle}", Episode ${ep.n}: "${ep.title}". ${ep.desc} Art style: ${body.art_style || 'modern anime'}. Cinematic lighting, vibrant colors, highly detailed, portrait poster composition, no text, no watermark.`
        try {
          episodes[idx].cover = await generateCover(prompt)
        } catch (error) {
          console.error(`Cover ${ep.n} failed:`, error.message)
        }
      }),
    )
    progress.coverStatus = 'done'

    await updateJob(jobId, { progress, episodes, status: 'done' })
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
