// Generate an image with OpenAI and store it in Cloudinary; return the URL. Shared by
// episode-cover generation and character reference-sheet generation. The model comes from
// the admin settings (default gpt-image-1-mini — ~80% cheaper than the deprecated gpt-image-1,
// which retires 2026-10-23); the OPENAI_IMAGE_MODEL env var is ignored.
import { uploadImage } from './cloudinaryUtil.js'
import { getImageModel } from './modelConfig.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Statuses worth another attempt: rate limits and OpenAI-side blips. 503 in particular
// comes back as "Unable to verify model access right now. Please retry." — a single one of
// those used to lose a character reference for the whole episode.
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 4

export const generateImage = async (prompt, folder = 'GCash/quick create/images') => {
  const model = await getImageModel()
  let lastError = ''

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size: '1024x1024',
        n: 1,
      }),
    })

    if (res.ok) return finishImage(res, folder)

    lastError = `OpenAI image error (${res.status}): ${(await res.text()).slice(0, 300)}`
    // A 4xx that isn't a rate limit is our fault — retrying just burns time.
    if (!RETRYABLE.has(res.status) || attempt === MAX_ATTEMPTS) throw new Error(lastError)
    // Exponential backoff with jitter, so parallel character refs don't retry in lockstep.
    const backoff = 800 * 2 ** (attempt - 1) + Math.floor(Math.random() * 400)
    console.warn(`[generateImage] attempt ${attempt} failed (${res.status}), retrying in ${backoff}ms`)
    await sleep(backoff)
  }
  throw new Error(lastError)
}

const finishImage = async (res, folder) => {
  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('No image was returned')
  // Cloudinary's upload accepts a data URI directly.
  return uploadImage(`data:image/png;base64,${b64}`, folder)
}
