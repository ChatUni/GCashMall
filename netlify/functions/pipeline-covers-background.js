// Netlify Background Function: backfills missing shot cover thumbnails for an already-
// generated production (older jobs rendered before covers were saved). Triggered by the
// client when step 6 loads a production whose shots lack coverUrl. Runs as its own job
// (separate 15-minute budget) so it can download + frame-extract each shot.

import jwt from 'jsonwebtoken'
import { backfillShotCovers } from './utils/videoJob.js'

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
    const jobId = body.jobId
    if (!jobId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    await backfillShotCovers(jobId, userId)
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-covers-background error:', error)
    return { statusCode: 500 }
  }
}
