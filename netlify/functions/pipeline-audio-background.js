// Netlify Background Function: generates narration (TTS), muxes it (+ optional BGM)
// onto each rendered shot video, and stitches the shots into one episode video with
// sound. Runs as its own job (separate 15-minute budget), triggered by the video job
// after the (silent) shots finish.

import jwt from 'jsonwebtoken'
import { get, update } from './utils/db.js'
import { runAudioComposition } from './utils/audioJob.js'

const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }
  return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET).id
}

export const handler = async (event) => {
  let jobId
  try {
    const body = JSON.parse(event.body || '{}')
    jobId = body.jobId
    if (!jobId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    await runAudioComposition(jobId, userId)
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-audio-background error:', error)
    if (jobId) {
      try {
        const docs = await get('productions', { jobId }, {}, {}, 1)
        const progress = docs?.[0]?.progress || { calls: [] }
        const step = (progress.calls || []).find(
          (c) => c.key === 'composition' && c.status === 'running',
        ) || (progress.calls || []).find((c) => c.key === 'audioGeneration' && c.status === 'running')
        if (step) step.status = 'error'
        // Videos rendered; audio failed — still mark the production done.
        await update(
          'productions',
          { jobId },
          { $set: { status: 'done', progress, audioError: String(error.message || error), updatedAt: new Date() } },
        )
      } catch (e) {
        console.error('Failed to mark audio job errored:', e.message)
      }
    }
    return { statusCode: 500 }
  }
}
