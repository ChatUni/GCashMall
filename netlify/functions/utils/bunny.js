// Bunny Stream helpers for the "s1" storage flow (all Quick Create videos stored on
// Bunny). Self-contained (reads env directly) so the background jobs can use it without
// importing handlers.js. Config:
//   VITE_BUNNY_LIBRARY_ID  (required) — Bunny Stream library id
//   BUNNY_API_KEY          (required) — library API key
//   BUNNY_PULL_ZONE        — CDN pull-zone host (default: the project's zone)
//   VITE_VIDEO_STORAGE     — 's0' (Cloudinary, default) | 's1' (Bunny-only)

import fs from 'node:fs'
import crypto from 'node:crypto'

const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '')

const LIBRARY_ID = clean(process.env.VITE_BUNNY_LIBRARY_ID)
const API_KEY = clean(process.env.BUNNY_API_KEY)
// CDN pull-zone host for the Stream library. Prefer the env var; the fallback must match
// the CURRENT library (VITE_BUNNY_LIBRARY_ID) or direct CDN URLs hit a "domain not
// configured" page. Find it in the embed player or Stream → library → CDN Hostname.
const PULL_ZONE = clean(process.env.BUNNY_PULL_ZONE) || 'vz-918d4e7e-1fb.b-cdn.net'
// CDN "URL Token Authentication" key (Stream library → Security). Only needed if CDN
// token auth is enabled; harmless otherwise.
const TOKEN_KEY = clean(process.env.BUNNY_TOKEN_KEY)
// Referer sent on server-side CDN reads so they satisfy the library's "Block direct url
// file access" (allowed-referrers) protection. Must match one of the allowed referrers.
const REFERER = clean(process.env.BUNNY_REFERER)
export const bunnyReferer = () =>
  REFERER || clean(process.env.VITE_PROD_SERVER) || 'https://ganime.io'

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

export const hasBunnyToken = () => !!TOKEN_KEY

// Sign a Bunny CDN URL for direct server-side access when the pull zone has Token
// Authentication enabled (otherwise the CDN returns 403). Uses Bunny's per-file token
// scheme: token = urlsafe-base64( SHA256(securityKey + path + expires) ). Correct for a
// single-file fetch (e.g. an mp4) — no HLS sub-requests to authorize. Returns the plain
// URL if no BUNNY_TOKEN_KEY is configured (caller will then get a 403).
export const signBunnyUrl = (videoId, file, ttlSec = 60 * 60) => {
  const urlPath = `/${videoId}/${file}`
  const base = `https://${PULL_ZONE}${urlPath}`
  if (!TOKEN_KEY) return base
  const expires = Math.floor(Date.now() / 1000) + ttlSec
  const token = crypto
    .createHash('sha256')
    .update(TOKEN_KEY + urlPath + expires)
    .digest('base64')
    .replace(/\n/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return `${base}?token=${token}&expires=${expires}`
}

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

// Delete a Bunny video (used to reject an upload that fails moderation).
export const deleteBunnyVideo = async (videoId) => {
  if (!videoId) return
  const res = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok && res.status !== 404)
    throw new Error(`Bunny delete failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

// Fetch a Bunny video's metadata (includes `status` and `encodeProgress`).
export const getBunnyVideo = async (videoId) => {
  const res = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  return res.json()
}

// Poll until Bunny finishes encoding the video (so it's actually playable) or it errors /
// times out. Bunny status: 4 = Finished, 5 = Error, 6 = UploadFailed. Returns true if
// finished, false on error/timeout (caller proceeds either way).
export const waitForBunnyReady = async (videoId, { timeoutMs = 6 * 60 * 1000, intervalMs = 4000 } = {}) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const v = await getBunnyVideo(videoId).catch(() => null)
    const status = v?.status
    if (status === 4) return true
    if (status === 5 || status === 6) return false
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

// Set a custom thumbnail (from a public image URL) on a Bunny video.
export const setBunnyThumbnail = async (videoId, thumbnailUrl) => {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}/thumbnail?thumbnailUrl=${encodeURIComponent(thumbnailUrl)}`,
    { method: 'POST', headers: authHeaders() },
  )
  if (!res.ok) throw new Error(`Bunny thumbnail failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

// Attach a subtitle track (SRT/VTT text) to a Bunny video. `srclang` is the caption
// language code (e.g. 'en', 'zh'), `label` is what the player shows in the CC menu.
// Bunny stores one caption per language; re-uploading the same srclang replaces it.
export const uploadBunnyCaption = async (videoId, srclang, label, captionsText) => {
  if (!LIBRARY_ID || !API_KEY) throw new Error('Bunny is not configured')
  if (!videoId) throw new Error('videoId is required')
  if (!srclang) throw new Error('srclang is required')
  if (!captionsText) throw new Error('captionsText is required')
  const res = await fetch(
    `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}/captions/${srclang}`,
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        srclang,
        label: label || srclang,
        captionsFile: Buffer.from(captionsText, 'utf8').toString('base64'),
      }),
    },
  )
  if (!res.ok)
    throw new Error(`Bunny caption failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

// Create a Bunny video from a local file in one call; returns the guid.
export const uploadEpisodeToBunny = async (title, filePath) => {
  const videoId = await createBunnyVideo(title)
  await uploadFileToBunny(videoId, filePath)
  return videoId
}
