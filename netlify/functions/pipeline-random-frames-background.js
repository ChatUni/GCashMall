// Netlify Background Function: extracts a few random frames from a production's episode
// video (via ffmpeg) for the "Random Frame" thumbnail picker. Triggered by the client
// on demand; result is written to the job (randomFrames = { id, urls }) which the client
// polls for. Runs as its own job so it can download + frame-extract.

import jwt from 'jsonwebtoken'
import { extractRandomFrames } from './utils/videoJob.js'

const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }
  return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET).id
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { jobId, reqId } = body
    if (!jobId || !reqId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    await extractRandomFrames(jobId, userId, reqId, 3)
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-random-frames-background error:', error)
    return { statusCode: 500 }
  }
}
