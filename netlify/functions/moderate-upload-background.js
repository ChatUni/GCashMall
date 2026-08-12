// Netlify Background Function: moderates a creator-uploaded video (transcribe + text
// moderation + batched frame moderation). Runs as its own job (separate 15-minute budget),
// triggered directly from the client after the video finishes uploading to Bunny. Writes
// its result to the `videoModeration` collection, polled via ?type=moderationStatus.

import jwt from 'jsonwebtoken'
import { update } from './utils/db.js'
import { runUploadModeration } from './utils/moderateUpload.js'

const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }
  return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET).id
}

export const handler = async (event) => {
  let videoId
  try {
    const body = JSON.parse(event.body || '{}')
    videoId = body.videoId
    if (!videoId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    await runUploadModeration(videoId, userId)
    return { statusCode: 200 }
  } catch (error) {
    console.error('moderate-upload-background error:', error)
    if (videoId) {
      try {
        // On an unexpected error, fail closed: mark the upload rejected so it isn't
        // published unmoderated.
        await update(
          'videoModeration',
          { videoId },
          {
            $set: {
              status: 'rejected',
              reason: 'moderation_error',
              error: String(error.message || error),
              stage: 'done',
              progress: 100,
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        )
      } catch (e) {
        console.error('Failed to mark moderation errored:', e.message)
      }
    }
    return { statusCode: 500 }
  }
}
