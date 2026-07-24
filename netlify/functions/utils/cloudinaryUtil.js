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
