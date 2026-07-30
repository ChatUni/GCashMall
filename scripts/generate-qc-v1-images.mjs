// Generates the Quick Create V1 imagery with OpenAI (gpt-image-1) into
// src/assets/quick-create-v1/ (bundled by Vite, referenced via import.meta.glob).
//   • 10 Popular Idea cards (landscape)   → idea-<id>.webp
//   • 1 hero banner/avatar (portrait)     → banner-hero.webp
//   • 7 production-progress icons (square) → prog-<id>.webp
// Output is written straight to .webp (via sharp) to match the *.webp glob.
// Usage:
//   node scripts/generate-qc-v1-images.mjs          # everything
//   node scripts/generate-qc-v1-images.mjs ideas    # only the Popular Idea cards
//   node scripts/generate-qc-v1-images.mjs banner   # only the hero banner
//   node scripts/generate-qc-v1-images.mjs prog     # only the progress icons
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { v2 as cloudinary } from 'cloudinary'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'src/assets/quick-create-v1')
fs.mkdirSync(outDir, { recursive: true })

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env'), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
)
const API_KEY = env.OPENAI_API_KEY
const MODEL = env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
if (!API_KEY) throw new Error('OPENAI_API_KEY not found in .env')

// Assets are served from Cloudinary (GCash/quick create v1); upload each after writing.
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_KEY,
  api_secret: env.CLOUDINARY_SECRET,
})
const CLOUDINARY_FOLDER = 'GCash/quick create v1'

const PORTRAIT = '1024x1536'
const LANDSCAPE = '1536x1024'
const SQUARE = '1024x1024'
const QUALITY = 'medium'
const WEBP_QUALITY = 82
const noText = 'no text, no words, no letters, no watermark, no UI elements'

const ideas = [
  ['schoolMysteryClub', 'four high school students standing together in a school hallway, one holding a mysterious clue, intriguing mysterious mood, cool blue tones'],
  ['reincarnatedHero', 'a young man reborn as a powerful dark hero in another fantasy world, glowing purple magical energy swirling around him, epic'],
  ['ghostRoommate', 'a translucent cute ghost girl floating next to a surprised teenage boy in a cozy apartment, soft pale blue glow, slightly spooky but charming'],
  ['childhoodFriends', 'a teenage boy and girl who are childhood friends at golden sunset, warm nostalgic emotional atmosphere, orange sky'],
  ['aiGirlfriend', 'a beautiful android girl with soft glowing cybernetic details and gentle eyes, futuristic pastel lighting, emotional and elegant'],
  ['dragonAcademy', 'a young rider standing beside a massive majestic dragon at a fantasy castle academy, dramatic cinematic atmosphere, fiery glow'],
  ['magicSchool', 'a determined boy in a wizard academy uniform holding a spellbook in a grand magical castle, sparkling arcane light, purple and gold'],
  ['sportsUnderdog', 'an energetic teenage athlete sprinting across a bright green sports field under a blue sky, dynamic motion, uplifting'],
  ['idolBand', 'five cute anime idol girls performing on a glowing concert stage with colorful spotlights and confetti, vibrant and lively'],
  ['spaceAdventure', 'a group of teens in an astronaut adventure exploring space near a planet and stars, epic cosmic vista, deep blue and purple'],
]

const progItems = [
  ['storyWorld', 'a glowing open storybook with a fantasy world map, floating islands and ideas, purple and blue magical glow, minimal icon style'],
  ['characters', 'two anime character design reference portraits side by side, clean character sheet look, soft studio background'],
  ['screenplay', 'an anime screenplay script page with elegant handwriting and a fountain pen, warm focused lighting, minimal'],
  ['storyboards', 'a storyboard panel grid with rough anime scene sketches, pencil sketch style, creative workspace'],
  ['keyVisuals', 'a vivid finished anime key visual of a rainy neon city street at night, cinematic, rich colors'],
  ['audio', 'a glowing sound waveform and music notes floating, audio studio vibe, purple and cyan neon on dark background, minimal'],
  ['finalRender', 'a shining film clapperboard and play button rendering a finished anime episode, celebratory glow, purple gradient, minimal'],
]

const ideaJobs = ideas.map(([id, p]) => ({
  group: 'ideas',
  file: `idea-${id}.webp`,
  size: LANDSCAPE,
  prompt: `Horizontal (landscape) anime key visual, wide 3:2 composition: ${p}. High quality modern anime art style, cinematic lighting, vibrant. ${noText}`,
}))
const bannerJob = {
  group: 'banner',
  file: 'banner-hero.webp',
  size: PORTRAIT,
  prompt: `A cheerful anime girl creator with long purple hair wearing a dark hoodie, smiling and pointing one finger upward with an inspired expression, surrounded by floating film reels and sparkles, magical purple glow, transparent-feeling dark background, modern anime art style, mascot hero portrait. ${noText}`,
}
const progJobs = progItems.map(([id, p]) => ({
  group: 'prog',
  file: `prog-${id}.webp`,
  size: SQUARE,
  prompt: `Small square thumbnail illustration: ${p}. Anime production concept, clean, ${noText}`,
}))

const allJobs = [...ideaJobs, bannerJob, ...progJobs]
// Optional filter arg: ideas | banner | prog (default: everything)
const only = process.argv[2]
const jobs = only ? allJobs.filter((j) => j.group === only) : allJobs
if (jobs.length === 0) throw new Error(`No jobs for filter "${only}" (use ideas | banner | prog)`)

const generate = async (job) => {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: job.prompt, size: job.size, quality: QUALITY, n: 1 }),
  })
  if (!res.ok) throw new Error(`${job.file}: ${res.status} ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const b64 = data.data[0].b64_json
  // OpenAI returns PNG; convert to .webp locally, then publish to Cloudinary.
  const outPath = path.join(outDir, job.file)
  await sharp(Buffer.from(b64, 'base64')).webp({ quality: WEBP_QUALITY }).toFile(outPath)
  await cloudinary.uploader.upload(outPath, {
    public_id: `${CLOUDINARY_FOLDER}/${job.file.replace(/\.webp$/, '')}`,
    resource_type: 'image',
    overwrite: true,
    invalidate: true,
    use_filename: false,
    unique_filename: false,
  })
  console.log('✓', job.file, '→ cloudinary')
}

const POOL = 4
let i = 0
const worker = async () => {
  while (i < jobs.length) {
    const job = jobs[i++]
    try {
      await generate(job)
    } catch (e) {
      console.error('✗', e.message)
    }
  }
}
await Promise.all(Array.from({ length: POOL }, worker))
console.log('Done.')
