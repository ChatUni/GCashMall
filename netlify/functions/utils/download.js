// Fetching a rendered asset to a local file.
//
// Shot videos come back as OpenRouter URLs that can point at OpenRouter's own API, which
// requires our bearer token — an unauthenticated fetch gets a 401. A provider CDN URL must
// NOT receive the token, so videoFetchHeaders decides per URL.
//
// Shared by every job that pulls a rendered shot down (render → Bunny, audio mux,
// composition): each having its own copy is how the audio job ended up 401ing on shots the
// video job could fetch perfectly well.

import fs from 'fs'
import { videoFetchHeaders } from './seedance.js'

export const downloadTo = async (url, dest) => {
  if (!url) throw new Error('download: no url')
  const res = await fetch(url, { headers: videoFetchHeaders(url) })
  if (!res.ok) throw new Error(`download failed (${res.status})`)
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}
