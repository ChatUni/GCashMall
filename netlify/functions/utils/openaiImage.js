// Generate an image with OpenAI (gpt-image-1) and store it in Cloudinary; return the URL.
// Shared by episode-cover generation and character reference-sheet generation.
import { uploadImage } from './cloudinaryUtil.js'

export const generateImage = async (prompt, folder = 'GCash/quick create/images') => {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI image error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('No image was returned')
  // Cloudinary's upload accepts a data URI directly.
  return uploadImage(`data:image/png;base64,${b64}`, folder)
}
