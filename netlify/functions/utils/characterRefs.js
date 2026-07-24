// Phase 2 — canonical character reference images. Once per production we render a
// clean reference sheet for each main character (from the Character Designer output)
// and cache the URLs on the job. Each shot is then seeded with the reference images of
// the characters it features, so a character looks the same across shots and scenes —
// especially on the first shot of a scene, where frame chaining has no previous frame.

import { generateImage } from './openaiImage.js'

// On by default; SEEDANCE_REFERENCE_IMAGES=false disables character reference seeding.
export const referenceImagesEnabled = () => process.env.SEEDANCE_REFERENCE_IMAGES !== 'false'

const arr = (v) => (Array.isArray(v) ? v : [])
const csv = (v) => arr(v).filter(Boolean).join(', ')

// Compose a reference-sheet image prompt from a character blueprint entry.
const buildRefPrompt = (c, artStyle) => {
  const a = c.appearance || {}
  const cos = c.costume || {}
  const hair = a.hair || {}
  const eyes = a.eyes || {}
  return [
    `Character reference sheet, ${artStyle || 'modern cinematic anime'} style.`,
    `Full-body front view of ${c.name}${c.age ? `, a ${c.age}-year-old` : ''} ${c.gender || ''} ${c.species || ''}.`.replace(/\s{2,}/g, ' '),
    hair.color || hair.style ? `Hair: ${[hair.color, hair.style].filter(Boolean).join(' ')}.` : '',
    eyes.color || eyes.shape ? `Eyes: ${[eyes.color, eyes.shape].filter(Boolean).join(' ')}.` : '',
    a.skin_tone ? `Skin tone: ${a.skin_tone}.` : '',
    a.face ? `Face: ${a.face}.` : '',
    csv(a.distinctive_features) ? `Distinctive features: ${csv(a.distinctive_features)}.` : '',
    cos.primary_outfit
      ? `Wearing ${cos.primary_outfit}${csv(cos.colors) ? ` in ${csv(cos.colors)}` : ''}${cos.materials ? `, ${cos.materials}` : ''}.`
      : '',
    csv(cos.accessories) ? `Accessories: ${csv(cos.accessories)}.` : '',
    cos.footwear ? `Footwear: ${cos.footwear}.` : '',
    'Neutral standing pose, plain light-gray studio background, soft even lighting, clean line art, single character, full body visible, high detail, consistent character design.',
  ]
    .filter(Boolean)
    .join(' ')
}

// Generate (once) a reference image per main character. Cached on the job under
// characterRefs = { [charId]: { name, url } }. persist(fields) writes to the job doc.
export const ensureCharacterRefs = async (doc, persist) => {
  if (!referenceImagesEnabled()) return {}
  if (doc.characterRefs && Object.keys(doc.characterRefs).length) return doc.characterRefs

  const chars = doc.calls?.characterDesigner?.character_blueprint || []
  const artStyle = doc.calls?.characterDesigner?.art_style || doc.artStyle || ''
  if (chars.length === 0) return {}

  const entries = await Promise.all(
    chars.map(async (c) => {
      if (!c || !c.id) return null
      try {
        const url = await generateImage(buildRefPrompt(c, artStyle), 'GCash/quick create/characters')
        return [c.id, { name: c.name || c.id, url }]
      } catch (error) {
        console.error(`Character ref failed for ${c.id}:`, error.message)
        return null
      }
    }),
  )
  const refs = Object.fromEntries(entries.filter(Boolean))
  await persist({ characterRefs: refs })
  return refs
}

// Map a shot's character list (names or ids) to their reference image URLs. Returns []
// when the shot lists no characters (nothing to anchor).
export const refImagesForShot = (shotCharacters, charRefs) => {
  if (!charRefs) return []
  const wanted = arr(shotCharacters).map((x) =>
    String(typeof x === 'object' && x ? x.id || x.name || '' : x)
      .trim()
      .toLowerCase(),
  )
  if (wanted.length === 0) return []
  const urls = []
  for (const [id, ref] of Object.entries(charRefs)) {
    if ((wanted.includes(id.toLowerCase()) || wanted.includes((ref.name || '').toLowerCase())) && ref.url) {
      urls.push(ref.url)
    }
  }
  return urls
}
