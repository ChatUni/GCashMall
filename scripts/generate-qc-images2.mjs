// Generates the additional Quick Create images (genres, art styles, episode
// lengths, episode plan) with OpenAI (gpt-image-1). Saves raw PNGs to
// src/assets/quick-create/_raw/ ; a separate step resizes them to webp.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const rawDir = path.join(root, 'src/assets/quick-create/_raw')
fs.mkdirSync(rawDir, { recursive: true })

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
const SIZE = '1536x1024'
const QUALITY = 'medium'
const noText = 'no text, no words, no letters, no watermark, no UI'

const jobs = [
  // Genres
  { file: 'genre-action.png', prompt: `Anime scene for the ACTION genre: a dynamic hero mid-battle with energy effects and dramatic motion, vibrant. ${noText}` },
  { file: 'genre-romance.png', prompt: `Anime scene for the ROMANCE genre: a tender couple at sunset in soft warm light, emotional, pastel colors. ${noText}` },
  { file: 'genre-comedy.png', prompt: `Anime scene for the COMEDY genre: cheerful funny characters with playful expressions, bright and lighthearted. ${noText}` },
  { file: 'genre-fantasy.png', prompt: `Anime scene for the FANTASY genre: a magical world with a dragon and a young hero, epic and colorful. ${noText}` },
  { file: 'genre-horror.png', prompt: `Anime scene for the HORROR genre: a dark eerie atmosphere with a mysterious shadowy figure, moody and suspenseful. ${noText}` },
  { file: 'genre-sciFi.png', prompt: `Anime scene for the SCI-FI genre: a futuristic city with advanced technology and neon lights, cinematic. ${noText}` },
  // Art styles (landscape samples)
  { file: 'style-modernAnime.png', prompt: `Modern anime art style sample: a cool protagonist in a city, clean lines, vivid contemporary colors. ${noText}` },
  { file: 'style-ghibli.png', prompt: `Studio Ghibli inspired art style sample: a soft painterly nature landscape with a character, warm and dreamy. ${noText}` },
  { file: 'style-shonen.png', prompt: `Shonen anime art style sample: a bold energetic warrior ready for action, dynamic, intense colors. ${noText}` },
  { file: 'style-shojo.png', prompt: `Shojo anime art style sample: an elegant emotional girl with sparkles and flowers, delicate pastel palette. ${noText}` },
  { file: 'style-cyberpunk.png', prompt: `Cyberpunk anime art style sample: a neon-lit futuristic urban scene with a character, high-tech edge. ${noText}` },
  { file: 'style-chibi.png', prompt: `Chibi anime art style sample: adorable simplified small characters, cute and fun, bright colors. ${noText}` },
  // Episode lengths
  { file: 'length-30.png', prompt: `Anime landscape: a hero on a cliff overlooking a vast fantasy valley with distant dragons, epic wide shot, vibrant. ${noText}` },
  { file: 'length-60.png', prompt: `Anime landscape at sunset: a lone figure before a grand fantasy castle with dragons in the sky, epic cinematic, warm tones. ${noText}` },
  // Step 5 episode plan (Dragon Academy themed)
  { file: 'ep-1.png', prompt: `Anime scene: a glowing dragon egg inside a magical academy hall, sense of wonder, soft light. ${noText}` },
  { file: 'ep-2.png', prompt: `Anime scene: a young rider on a flying dragon soaring above the clouds, exhilarating, bright sky. ${noText}` },
  { file: 'ep-3.png', prompt: `Anime scene: two rival young mages facing off with glowing magic, tense and dramatic. ${noText}` },
  { file: 'ep-4.png', prompt: `Anime scene: explorers entering an ancient mystical temple ruin, mysterious and atmospheric. ${noText}` },
  { file: 'ep-5.png', prompt: `Anime scene: an epic final battle against a great dragon, climactic, intense dramatic colors. ${noText}` },
]

const generate = async (job) => {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: job.prompt, size: SIZE, quality: QUALITY, n: 1 }),
  })
  if (!res.ok) throw new Error(`${job.file}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  fs.writeFileSync(path.join(rawDir, job.file), Buffer.from(data.data[0].b64_json, 'base64'))
  console.log('✓', job.file)
}

const POOL = 3
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
