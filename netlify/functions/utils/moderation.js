// OpenAI omni-moderation-latest wrappers — one model handles both text and images.
// Returns { flagged, categories } where categories lists the tripped category names.

const MODERATION_URL = 'https://api.openai.com/v1/moderations'

const callModeration = async (input) => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')
  const res = await fetch(MODERATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'omni-moderation-latest', input }),
  })
  if (!res.ok)
    throw new Error(`Moderation error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return data.results || []
}

// Union of every category flagged across all results in the batch.
const flaggedCategories = (results) => {
  const set = new Set()
  for (const r of results || []) {
    if (!r?.flagged) continue
    for (const [cat, on] of Object.entries(r.categories || {})) if (on) set.add(cat)
  }
  return [...set]
}

const summarize = (results) => ({
  flagged: (results || []).some((r) => r?.flagged),
  categories: flaggedCategories(results),
})

// Moderate a block of text (e.g. the episode's transcript).
export const moderateText = async (text) => {
  const clean = String(text || '').trim()
  if (!clean) return { flagged: false, categories: [] }
  // omni-moderation accepts long text; cap to keep the request reasonable.
  return summarize(await callModeration([{ type: 'text', text: clean.slice(0, 40000) }]))
}

// Moderate a batch of images. `images` are base64 data URLs (or public URLs). The
// omni-moderation endpoint accepts only ONE image per request, so we fire the batch as
// CONCURRENT single-image requests and aggregate — parallelism keeps it fast while the
// caller still extracts + checks in bounded batches and can reject early.
export const moderateImages = async (images) => {
  const list = (images || []).filter(Boolean)
  if (list.length === 0) return { flagged: false, categories: [] }
  const results = await Promise.all(
    list.map((url) => callModeration([{ type: 'image_url', image_url: { url } }])),
  )
  return summarize(results.flat())
}
