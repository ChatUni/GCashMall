// Generates the Creator Program hero illustration with a TRANSPARENT background (so it
// blends into the hero card in both light and dark mode), converts to alpha WebP, and
// uploads to Cloudinary as GCash/creator/hero-creator.
// Usage: node scripts/generate-creator-hero.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
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
const API_KEY = env.OPENAI_API_KEY
if (!API_KEY) throw new Error('OPENAI_API_KEY not found in .env')
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_KEY,
  api_secret: env.CLOUDINARY_SECRET,
})

const prompt =
  'A cheerful anime creator boy with black spiky hair wearing a dark hoodie with a glowing ' +
  'purple "G" logo, smiling with an inspired expression while working on a laptop and holding ' +
  'a stylus. Around him float film-strip frames with a play button, sparkles, and shiny purple ' +
  'GUSD coins stacked beside the laptop. Modern high-quality anime illustration, vibrant purple ' +
  'and indigo accents, soft cinematic lighting. Single character composition, centered. ' +
  'Completely transparent background (no scene, no ground, no backdrop). No text, no words, no watermark.'

const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    model: env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt,
    size: '1024x1024',
    quality: 'medium',
    background: 'transparent',
    n: 1,
  }),
})
if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`)
const b64 = (await res.json()).data[0].b64_json

// Trim transparent margins so the character fills the frame, then alpha-WebP.
const outPath = path.join(root, 'hero-creator.webp')
await sharp(Buffer.from(b64, 'base64'))
  .trim()
  .webp({ quality: 88, alphaQuality: 100 })
  .toFile(outPath)

const up = await cloudinary.uploader.upload(outPath, {
  public_id: 'GCash/creator/hero-creator',
  resource_type: 'image',
  overwrite: true,
  invalidate: true,
  use_filename: false,
  unique_filename: false,
})
fs.unlinkSync(outPath)
console.log('✓ uploaded:', up.secure_url)
process.exit(0)
