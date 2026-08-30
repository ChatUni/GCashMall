// Netlify Background Function: renders the episode's shot videos via Seedance.
// Runs as its OWN job (separate 15-minute budget) so it never competes with the
// LLM-call episode job. Triggered server-to-server by pipeline-background after the
// 7 calls finish, so it keeps running even if the user leaves the page.

import jwt from 'jsonwebtoken'
import { get, update } from './utils/db.js'
import { runVideoGeneration, submitVideoGeneration } from './utils/videoJob.js'
import { triggerBackground } from './utils/trigger.js'
import { getJwtSecret } from './utils/jwt.js'


const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }
  return jwt.verify(authHeader.replace('Bearer ', ''), getJwtSecret()).id
}

export const handler = async (event) => {
  let jobId
  try {
    const body = JSON.parse(event.body || '{}')
    jobId = body.jobId
    if (!jobId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    if (process.env.SEEDANCE_ASYNC === 'true') {
      // Async path: create the Seedance tasks and exit immediately. advanceVideoGeneration
      // (driven by the client poll + the scheduled reconciler) processes completions and
      // triggers the audio/composition job itself when every shot is terminal — so this
      // function no longer idles while Seedance renders.
      await submitVideoGeneration(jobId, userId)
      return { statusCode: 200 }
    }

    await runVideoGeneration(jobId, userId)

    // Hand off to the audio/composition job (its own budget). If it can't be
    // reached, finalize the production as done (videos rendered, just no audio).
    try {
      await triggerBackground('pipeline-audio-background', jobId, authHeader)
    } catch (error) {
      console.error('Audio hand-off failed:', error.message)
      await update('productions', { jobId }, { $set: { status: 'done', updatedAt: new Date() } })
    }
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-video-background error:', error)
    if (jobId) {
      try {
        const docs = await get('productions', { jobId }, {}, {}, 1)
        const progress = docs?.[0]?.progress || { calls: [] }
        const step = (progress.calls || []).find((c) => c.key === 'videoGeneration')
        if (step) step.status = 'error'
        // Calls succeeded; mark the production done even though videos failed.
        await update(
          'productions',
          { jobId },
          { $set: { status: 'done', progress, videoError: String(error.message || error), updatedAt: new Date() } },
        )
      } catch (e) {
        console.error('Failed to mark video job errored:', e.message)
      }
    }
    return { statusCode: 500 }
  }
}
