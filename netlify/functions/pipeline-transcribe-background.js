// Netlify Background Function: backfill subtitles for a finished s1 episode that has no
// subtitle track yet (e.g. produced before the Transcribe step existed). Downloads the
// episode's Bunny mp4, then runs extract-audio → whisper → translate → upload-captions.
// Runs as its own job (separate 15-minute budget), triggered directly from the client
// when it opens such an episode.

import jwt from 'jsonwebtoken'
import { get, update } from './utils/db.js'
import { runTranscribeBackfill } from './utils/audioJob.js'
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

    await runTranscribeBackfill(jobId, userId)
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-transcribe-background error:', error)
    if (jobId) {
      try {
        const docs = await get('productions', { jobId }, {}, {}, 1)
        const progress = docs?.[0]?.progress || { calls: [] }
        const step = (progress.calls || []).find(
          (c) => c.key === 'transcribe' && c.status === 'running',
        )
        if (step) step.status = 'error'
        // Subtitles are best-effort — never change the production's overall status.
        await update(
          'productions',
          { jobId },
          { $set: { progress, transcribeError: String(error.message || error), updatedAt: new Date() } },
        )
      } catch (e) {
        console.error('Failed to mark transcribe backfill errored:', e.message)
      }
    }
    return { statusCode: 500 }
  }
}
