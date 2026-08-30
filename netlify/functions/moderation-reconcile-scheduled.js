// Scheduled backstop for the poll-first upload-moderation state machine. Every minute it
// re-invokes moderate-upload-background for any video still working through the pipeline
// (phase awaiting_encode/working) — covering: the moderation-off subtitle pass (the client
// already got 'approved' and stopped polling), missed client polls, and crashed 'working'
// steps. runUploadModeration is idempotent + bounded, so this is safe alongside client polls.
import { get, update } from './utils/db.js'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from './utils/jwt.js'

export const config = { schedule: '* * * * *' } // every minute

const STALE_MS = 8 * 60 * 1000 // a 'working' step older than this is treated as crashed

export const handler = async () => {
  try {
    const base = (
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      process.env.VITE_PROD_SERVER ||
      'http://localhost:8888'
    ).replace(/\/+$/, '')

    const docs = await get(
      'videoModeration',
      { phase: { $in: ['awaiting_encode', 'working'] } },
      { videoId: 1, userId: 1, phase: 1, updatedAt: 1 },
      { updatedAt: 1 },
      10,
    )

    for (const d of docs) {
      // Recover a crashed 'working' step so it can be re-claimed.
      if (d.phase === 'working' && d.updatedAt && Date.now() - new Date(d.updatedAt).getTime() > STALE_MS) {
        await update('videoModeration', { videoId: d.videoId }, { $set: { phase: 'awaiting_encode' } })
      }
      const token = jwt.sign({ id: String(d.userId || '') }, getJwtSecret(), { expiresIn: '1h' })
      try {
        await fetch(`${base}/.netlify/functions/moderate-upload-background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ videoId: d.videoId }),
        })
      } catch (e) {
        console.error(`[moderation-reconcile] ${d.videoId}:`, e.message)
      }
    }
    return { statusCode: 200 }
  } catch (error) {
    console.error('moderation-reconcile error:', error.message)
    return { statusCode: 500 }
  }
}
