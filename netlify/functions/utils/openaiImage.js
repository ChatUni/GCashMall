// Generate an image with OpenAI and store it in Cloudinary; return the URL. Shared by
// episode-cover generation and character reference-sheet generation. The model comes from
// the admin settings (default gpt-image-1-mini — ~80% cheaper than the deprecated gpt-image-1,
// which retires 2026-10-23); the OPENAI_IMAGE_MODEL env var is ignored.
import { uploadImage } from './cloudinaryUtil.js'
import { getImageModel } from './modelConfig.js'

export const generateImage = async (prompt, folder = 'GCash/quick create/images') => {
  const model = await getImageModel()
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
  if (!res.ok) {
    throw new Error(`OpenAI image error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('No image was returned')
  // Cloudinary's upload accepts a data URI directly.
  return uploadImage(`data:image/png;base64,${b64}`, folder)
}
