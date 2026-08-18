// Shared Cloudinary upload helpers (configured once from env).
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

export const uploadImage = async (filePath, folder = 'GCash/quick create/frames') => {
  const up = await cloudinary.uploader.upload(filePath, { folder })
  return up.secure_url
}

export const uploadVideo = async (filePath, folder = 'GCash/quick create/episode') => {
  const up = await cloudinary.uploader.upload(filePath, { resource_type: 'video', folder })
  return up.secure_url
}

// Delete a Cloudinary asset by its secure URL. Parses the resource type and public_id out
// of the URL (…/res.cloudinary.com/<cloud>/<image|video|raw>/upload/v<n>/<public_id>.<ext>).
// Returns { skipped: true } for non-Cloudinary URLs so callers can pass any URL safely.
export const deleteByUrl = async (url) => {
  if (!url || typeof url !== 'string') return { skipped: true }
  const m = url.match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/)
  if (!m) return { skipped: true }
  const resourceType = m[1]
  const publicId = decodeURIComponent(m[2]).replace(/\.[^/.]+$/, '')
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true })
}
