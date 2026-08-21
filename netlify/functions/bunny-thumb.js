// Image proxy for Bunny Stream thumbnails/previews.
//
// The Stream library has "Block direct URL file access" (hotlink protection) enabled, so the
// CDN returns 403 for any request WITHOUT an allowed Referer. A normal web browser sends
// Referer: https://ganime.io and loads them fine — but the Cordova app is served from a custom
// scheme origin (app://localhost) and WebKit does NOT expose that as a Referer on cross-origin
// image loads, so every thumbnail 403s and the client falls back to the series cover (all
// episodes look identical). This proxy fetches the asset server-side WITH a valid Referer (and
// CDN token, if configured) and streams it back, so the app can load per-episode thumbnails.

import { bunnyReferer, signBunnyUrl } from './utils/bunny.js'

const ALLOWED_FILES = new Set(['thumbnail.jpg', 'preview.webp'])
const VIDEO_ID_RE = /^[a-f0-9-]{36}$/i

const jsonError = (statusCode, error) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error }),
})

const validateParams = (params) => {
  const videoId = (params.v || '').trim()
  const file = (params.file || 'thumbnail.jpg').trim()
  if (!VIDEO_ID_RE.test(videoId)) return { error: 'invalid or missing v (video id)' }
  if (!ALLOWED_FILES.has(file)) return { error: 'invalid file (thumbnail.jpg | preview.webp)' }
  return { videoId, file }
}

const fetchBunnyAsset = async (videoId, file) => {
  const url = signBunnyUrl(videoId, file)
  const res = await fetch(url, { headers: { Referer: bunnyReferer() } })
  if (!res.ok) return { ok: false, status: res.status }
  const body = Buffer.from(await res.arrayBuffer()).toString('base64')
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return { ok: true, body, contentType }
}

export const handler = async (event) => {
  const { videoId, file, error } = validateParams(event.queryStringParameters || {})
  if (error) return jsonError(400, error)

  try {
    const asset = await fetchBunnyAsset(videoId, file)
    if (!asset.ok) return jsonError(asset.status === 404 ? 404 : 502, `bunny returned ${asset.status}`)
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': asset.contentType,
        // Thumbnails never change for a given video id → cache hard in the browser and at the
        // Netlify edge (durable) so this function is invoked at most once per asset.
        'Cache-Control': 'public, max-age=604800, immutable',
        'Netlify-CDN-Cache-Control': 'public, max-age=604800, durable',
      },
      body: asset.body,
    }
  } catch (e) {
    console.error('[bunny-thumb] proxy failed:', e.message)
    return jsonError(502, 'proxy failed')
  }
}
