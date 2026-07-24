// Netlify Background Function: generates a series cover image (OpenAI) from the series
// context and uploads it to Cloudinary. Image generation is too slow for a synchronous
// API call, so the client triggers this and polls the job for the result, written as
// coverGen = { id: reqId, url } (or { id, error: true } on failure).

import jwt from 'jsonwebtoken'
import { update } from './utils/db.js'
import { generateImage } from './utils/openaiImage.js'

const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }
  return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET).id
}

const buildPrompt = ({ name, description, genres, artStyle }) =>
  [
    `Anime series poster / key visual cover art for "${(name || '').trim() || 'an anime series'}".`,
    description ? `Premise: ${String(description).trim()}.` : '',
    Array.isArray(genres) && genres.length ? `Genre: ${genres.filter(Boolean).join(', ')}.` : '',
    `Art style: ${(artStyle || '').trim() || 'modern cinematic anime'}.`,
    'Dramatic cinematic lighting, vibrant colors, highly detailed, eye-catching poster composition, no text, no watermark, no logos.',
  ]
    .filter(Boolean)
    .join(' ')

export const handler = async (event) => {
  let jobId
  let reqId
  try {
    const body = JSON.parse(event.body || '{}')
    jobId = body.jobId
    reqId = body.reqId
    if (!jobId || !reqId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    getUserId(authHeader)

    const url = await generateImage(buildPrompt(body), 'GCash/quick create/covers')
    await update(
      'productions',
      { jobId },
      { $set: { coverGen: { id: reqId, url }, updatedAt: new Date() } },
    )
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-cover-gen-background error:', error)
    if (jobId && reqId) {
      try {
        await update(
          'productions',
          { jobId },
          { $set: { coverGen: { id: reqId, url: '', error: true }, updatedAt: new Date() } },
        )
      } catch (e) {
        console.error('Failed to mark cover-gen errored:', e.message)
      }
    }
    return { statusCode: 500 }
  }
}
