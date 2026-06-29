// Generates the Quick Create wizard thumbnails with OpenAI (gpt-image-1)
// and writes them into src/assets/quick-create/, overwriting the mockup crops.
//
// Usage: node scripts/generate-qc-images.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'src/assets/quick-create')

// Load OPENAI_* from .env (this script runs standalone, no auto-loading)
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

const LANDSCAPE = '1536x1024'
const SQUARE = '1024x1024'
const QUALITY = 'medium'

const noText = 'no text, no words, no letters, no watermark, no UI'

const jobs = [
  // Popular ideas (landscape)
  { file: 'idea-isekai.png', size: LANDSCAPE, prompt: `Anime key visual of an isekai adventure: a young hero arriving in a vast fantasy world with floating islands and glowing magic, dynamic, vibrant colors, cinematic lighting. ${noText}` },
  { file: 'idea-highSchoolRomance.png', size: LANDSCAPE, prompt: `Anime key visual of a sweet high school romance: two students under blooming cherry blossom trees, warm sunset light, gentle pastel colors. ${noText}` },
  { file: 'idea-fantasyHero.png', size: LANDSCAPE, prompt: `Anime key visual of a fantasy hero standing on a cliff holding a glowing sword, epic mountains and dramatic sky, vivid colors, cinematic. ${noText}` },
  { file: 'idea-dragonAcademy.png', size: LANDSCAPE, prompt: `Anime key visual of a dragon academy: a young student beside a majestic dragon at a magical castle school, dramatic atmosphere, rich colors. ${noText}` },
  { file: 'idea-sciFiMecha.png', size: LANDSCAPE, prompt: `Anime key visual of a sci-fi mecha story: a pilot in front of a towering giant robot in a futuristic city with neon glow, dynamic. ${noText}` },
  { file: 'idea-cuteAnimal.png', size: LANDSCAPE, prompt: `Anime key visual of a cute animal companion story: an adorable fluffy mascot creature in a cheerful sunny meadow, kawaii, bright pastel colors. ${noText}` },
  // Art styles (square)
  { file: 'style-modernAnime.png', size: SQUARE, prompt: `Portrait of a cool anime protagonist in modern anime art style, clean sharp lines, vivid saturated colors, studio quality. ${noText}` },
  { file: 'style-ghibli.png', size: SQUARE, prompt: `A whimsical girl in a lush green nature landscape, Studio Ghibli inspired art style, soft painterly look, warm and dreamy. ${noText}` },
  { file: 'style-shojo.png', size: SQUARE, prompt: `An elegant girl surrounded by sparkles and flowers, shojo manga art style, delicate pastel pink palette, romantic and dreamy. ${noText}` },
  { file: 'style-cyberpunk.png', size: SQUARE, prompt: `A character in a neon-lit cyberpunk city at night with glowing accents, moody anime art style, vivid neon colors. ${noText}` },
  { file: 'style-watercolor.png', size: SQUARE, prompt: `A serene anime character portrait in a soft watercolor painting art style, gentle washes of color, dreamy. ${noText}` },
  { file: 'style-chibi.png', size: SQUARE, prompt: `A cute chibi anime character with a big head and small body, kawaii sticker art style, bright cheerful colors, simple background. ${noText}` },
  // Review preview (landscape)
  { file: 'review.png', size: LANDSCAPE, prompt: `Anime key visual hero portrait: a determined young protagonist standing in a lush vibrant fantasy landscape, cinematic lighting, epic and colorful. ${noText}` },
]

const generate = async (job) => {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: job.prompt, size: job.size, quality: QUALITY, n: 1 }),
  })
  if (!res.ok) throw new Error(`${job.file}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const b64 = data.data[0].b64_json
  fs.writeFileSync(path.join(outDir, job.file), Buffer.from(b64, 'base64'))
  console.log('✓', job.file)
}

// Run with a small concurrency pool to avoid rate limits
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
