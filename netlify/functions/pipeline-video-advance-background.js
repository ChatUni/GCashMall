// Background driver for one step of the poll-first async video render. Triggered by the
// client's advanceProduction poll (and reachable to the scheduled reconciler's logic).
// Runs advanceVideoGeneration, which is bounded (≈one completed shot per call) and guarded
// by a doc-level advisory lock, so overlapping triggers are cheap no-ops. Kept as its own
// function so the ffmpeg dependency stays out of the main `api` bundle.
import jwt from 'jsonwebtoken'
import { advanceVideoGeneration } from './utils/videoJob.js'

const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Authentication required')
  return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET).id
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const jobId = body.jobId
    if (!jobId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    await advanceVideoGeneration(jobId, userId, authHeader)
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-video-advance-background error:', error.message)
    return { statusCode: 500 }
  }
}
