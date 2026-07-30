// Uploads the Quick Create V1 imagery (src/assets/quick-create-v1/*.webp) to Cloudinary
// under the "GCash/quick create v1" folder with stable public ids, so the app can serve
// them from the CDN instead of bundling them (mirrors the v0 "GCash/quick create" set).
// Delivery URL: https://res.cloudinary.com/daqc8bim3/image/upload/GCash/quick%20create%20v1/<name>.webp
// Usage: node scripts/upload-qc-v1-cloudinary.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { v2 as cloudinary } from 'cloudinary'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env'), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
)
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_KEY,
  api_secret: env.CLOUDINARY_SECRET,
})

const FOLDER = 'GCash/quick create v1'
const dir = path.join(root, 'src/assets/quick-create-v1')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webp'))
if (files.length === 0) throw new Error(`No .webp files in ${dir}`)

for (const file of files) {
  const name = file.replace(/\.webp$/, '')
  try {
    const res = await cloudinary.uploader.upload(path.join(dir, file), {
      public_id: `${FOLDER}/${name}`,
      resource_type: 'image',
      overwrite: true,
      invalidate: true,
      use_filename: false,
      unique_filename: false,
    })
    console.log('✓', name, '→', res.secure_url)
  } catch (e) {
    console.error('✗', name, e.message)
  }
}
console.log('Done.')
process.exit(0)
