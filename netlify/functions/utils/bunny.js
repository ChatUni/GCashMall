// Bunny Stream helpers for the "s1" storage flow (all Quick Create videos stored on
// Bunny). Self-contained (reads env directly) so the background jobs can use it without
// importing handlers.js. Config:
//   VITE_BUNNY_LIBRARY_ID  (required) — Bunny Stream library id
//   BUNNY_API_KEY          (required) — library API key
//   BUNNY_PULL_ZONE        — CDN pull-zone host (default: the project's zone)
//   VITE_VIDEO_STORAGE     — 's0' (Cloudinary, default) | 's1' (Bunny-only)

import fs from 'node:fs'

const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '')

const LIBRARY_ID = clean(process.env.VITE_BUNNY_LIBRARY_ID)
const API_KEY = clean(process.env.BUNNY_API_KEY)
const PULL_ZONE = clean(process.env.BUNNY_PULL_ZONE) || 'vz-4ecde8c7-5c4.b-cdn.net'

// Which storage flow is active. 's1' = every video (shots + episode) lives on Bunny.
export const storageFlow = () => (clean(process.env.VITE_VIDEO_STORAGE) === 's1' ? 's1' : 's0')
export const isS1 = () => storageFlow() === 's1'

// Playback / asset URLs derived from a Bunny video guid.
export const bunnyEmbedUrl = (videoId) =>
  `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}`
export const bunnyHlsUrl = (videoId) => `https://${PULL_ZONE}/${videoId}/playlist.m3u8`
export const bunnyThumbnailUrl = (videoId) => `https://${PULL_ZONE}/${videoId}/thumbnail.jpg`
export const bunnyMp4Url = (videoId, res = 720) => `https://${PULL_ZONE}/${videoId}/play_${res}p.mp4`

const authHeaders = (extra = {}) => ({ Accept: 'application/json', AccessKey: API_KEY, ...extra })

// Create an empty Bunny video object; returns its guid.
export const createBunnyVideo = async (title) => {
  if (!LIBRARY_ID || !API_KEY) throw new Error('Bunny is not configured (VITE_BUNNY_LIBRARY_ID / BUNNY_API_KEY)')
  const res = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ title: title || 'Untitled' }),
  })
  if (!res.ok) throw new Error(`Bunny create failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).guid
}

// Tell Bunny to ingest a video from a public URL (used for shots, whose mp4 is a public
// Seedance URL). Async on Bunny's side.
export const fetchBunnyVideoFromUrl = async (videoId, url) => {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}/fetch`,
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ url }),
    },
  )
  if (!res.ok) throw new Error(`Bunny fetch failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

// Upload a local file's bytes directly into a Bunny video (used for the stitched episode,
// which is a local temp file — no public URL to fetch from).
export const uploadFileToBunny = async (videoId, filePath) => {
  const body = fs.readFileSync(filePath)
  const res = await fetch(
    `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`,
    { method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/octet-stream' }), body },
  )
  if (!res.ok) throw new Error(`Bunny upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

// Set a custom thumbnail (from a public image URL) on a Bunny video.
export const setBunnyThumbnail = async (videoId, thumbnailUrl) => {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}/thumbnail?thumbnailUrl=${encodeURIComponent(thumbnailUrl)}`,
    { method: 'POST', headers: authHeaders() },
  )
  if (!res.ok) throw new Error(`Bunny thumbnail failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

// Create a Bunny video from a local file in one call; returns the guid.
export const uploadEpisodeToBunny = async (title, filePath) => {
  const videoId = await createBunnyVideo(title)
  await uploadFileToBunny(videoId, filePath)
  return videoId
}
