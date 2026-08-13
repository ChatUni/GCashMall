// Quick Create V1 — Call 6 (Episode Renderer) adapter.
//
// The renderer performs no creative work: it translates the immutable Episode Production
// Package (Call 5) + Visual Asset Package (Call 4A) + Character Bible (Call 2) into the
// SAME internal render structures the v0 pipeline already knows how to execute, so v1
// reuses v0's Seedance rendering, frame chaining, character-reference seeding, and
// composition end-to-end (videoJob.js + audioJob.js) with no changes.
//
// It writes three v0-shaped structures onto the production doc's `calls`:
//   • calls.renderingEngine.rendering_plan.provider_requests  → per-shot Seedance request
//   • calls.promptCompiler...shot_prompts                     → scene grouping + characters
//   • calls.characterDesigner.character_blueprint + art_style → canonical character refs
//
// Subtitles are NOT burned into the video — they're delivered as external caption tracks
// by the transcribe step. Dialogue is still passed to the video model as audio-only (so
// native-audio models can voice it), with an explicit instruction not to render any text.

const arr = (v) => (Array.isArray(v) ? v : [])
const str = (v) => (typeof v === 'string' ? v.trim() : '')
const csv = (v) => arr(v).filter(Boolean).join(', ')

// Spoken dialogue as voice-only context (no on-screen captions — subtitles are external).
const spokenDialogue = (dialogueLines) => {
  const spoken = dialogueLines.filter(Boolean).join(' ')
  return spoken
    ? `Spoken dialogue (voice audio only — do NOT display any on-screen text, subtitles, or captions): "${spoken}"`
    : ''
}

// Compose one shot's text-to-video prompt from the package + visual + audio specs.
const buildShotPrompt = (shot, vShot, artDirection, dialogueLines) => {
  const style = str(artDirection.style)
  const parts = [
    style ? `${style} anime style.` : 'Cinematic anime style.',
    str(shot.visual?.masterKeyframePrompt) || str(vShot?.masterKeyframe?.imagePrompt),
    str(shot.visual?.camera) || str(vShot?.camera),
    str(shot.visual?.characterMotion) || str(vShot?.characterMotion),
    csv(artDirection.colorPalette) ? `Color palette: ${csv(artDirection.colorPalette)}.` : '',
    str(artDirection.lighting) ? `Lighting: ${artDirection.lighting}.` : '',
    spokenDialogue(dialogueLines),
  ]
  return parts.filter(Boolean).join(' ').replace(/\s{2,}/g, ' ')
}

// Map a v1 Character Bible entry to the v0 character_blueprint shape that
// characterRefs.js (ensureCharacterRefs / buildRefPrompt) expects.
const mapCharacter = (c) => {
  const vi = c.visual?.visualIdentity || {}
  const outfit = c.visual?.defaultOutfit || {}
  return {
    id: c.id || c.name,
    name: c.name || c.id,
    appearance: {
      hair: { color: str(vi.hairColor), style: str(vi.hairStyle) },
      eyes: { color: str(vi.eyeColor), shape: '' },
      skin_tone: '',
      face: str(vi.faceShape),
      distinctive_features: arr(c.visual?.signatureFeatures),
    },
    costume: {
      primary_outfit: [outfit.top, outfit.bottom, outfit.outerwear].filter(Boolean).join(', '),
      colors: arr(vi.primaryColors),
      accessories: arr(outfit.accessories),
      footwear: str(outfit.footwear),
    },
  }
}

// Build the three v0 render structures from the v1 pipeline outputs stored on the doc.
export const buildV1RenderStructures = (callsV1, proposal) => {
  const epp = callsV1.episodeProducer?.episodeProductionPackage || {}
  const vap = callsV1.visualAssetDirector?.visualAssetPackage || {}
  const characters = arr(callsV1.characterDirector?.characters)
  const artDirection = vap.artDirection || {}

  const vShotByNum = new Map(arr(vap.shots).map((s) => [s.shot, s]))
  const shots = arr(epp.shots)
    .slice()
    .sort((a, b) => (a.shot ?? 0) - (b.shot ?? 0))

  const provider_requests = []
  const shot_prompts = []

  shots.forEach((shot, idx) => {
    const n = typeof shot.shot === 'number' ? shot.shot : idx + 1
    const shotId = `shot-${n}`
    const vShot = vShotByNum.get(shot.shot)
    const dialogueLines = arr(shot.audio?.dialogue).map((d) => str(d?.line))
    const location = str(shot.location) || str(vShot?.location) || ''
    const characters = arr(shot.audio?.dialogue)
      .map((d) => str(d?.character))
      .filter(Boolean)

    provider_requests.push({
      shot_id: shotId,
      shot_number: n,
      scene_id: location ? `loc:${location.toLowerCase()}` : '',
      prompt: buildShotPrompt(shot, vShot, artDirection, dialogueLines),
      duration_seconds: shot.durationSeconds || shot.expectedDurationSeconds || 7,
      aspect_ratio: '16:9',
      resolution: '480p',
    })

    shot_prompts.push({
      shot_id: shotId,
      shot_number: n,
      scene_id: location ? `loc:${location.toLowerCase()}` : '',
      location,
      characters,
    })
  })

  return {
    renderingEngine: { rendering_plan: { provider_requests } },
    promptCompiler: { universal_production_prompt_package: { shot_prompts } },
    characterDesigner: {
      art_style: str(proposal?.creativeDirection?.visualDirection) || 'modern cinematic anime',
      character_blueprint: characters.map(mapCharacter),
    },
  }
}
