// Player utility functions - extracted business logic
// Following Rule #7: React components should be pure - separate business logic from components

import type { Episode } from '../types'
import { isCordova, PRODUCTION_ORIGIN, getWebOrigin, openSystemBrowser, getSocialSharing } from './cordova'
import { getApiBaseUrl } from './api'

export const playbackSpeeds = [0.25, 0.5, 1.0, 1.25, 1.5, 2.0, 3.0]

export const formatLikeCount = (count: number): string => {
  if (count < 1000) return String(count)
  if (count < 1_000_000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
}

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// URL for a Bunny Stream asset (thumbnail/preview) for a given video id. The Stream library has
// hotlink protection ("Block direct URL file access"), which the Cordova app can't satisfy — it
// runs on a custom scheme (app://localhost) that WebKit won't send as a Referer, so direct CDN
// requests 403. In the app we therefore route through our /bunny-thumb proxy, which adds a valid
// Referer server-side. On the web the browser sends the site Referer, so we hit the CDN directly.
export const getBunnyAssetUrl = (videoId: string, file: string): string => {
  if (isCordova()) return `${getApiBaseUrl()}/.netlify/functions/bunny-thumb?v=${videoId}&file=${file}`
  return `https://vz-918d4e7e-1fb.b-cdn.net/${videoId}/${file}`
}

export const getEpisodeThumbnailUrl = (episode: Episode, isHovered: boolean): string => {
  // Hover shows Bunny's animated preview when available.
  if (isHovered && episode.videoId) return getBunnyAssetUrl(episode.videoId, 'preview.webp')
  // A custom thumbnail (e.g. chosen at publish time) wins over Bunny's auto-generated one.
  if (episode.thumbnail) return episode.thumbnail
  if (episode.videoId) return getBunnyAssetUrl(episode.videoId, 'thumbnail.jpg')
  return ''
}

export const getEpisodeRanges = (episodesLength: number): [number, number][] => {
  const ranges: [number, number][] = []
  const rangeSize = 40
  for (let i = 0; i < episodesLength; i += rangeSize) {
    ranges.push([i + 1, Math.min(i + rangeSize, episodesLength)])
  }
  return ranges
}

export const filterEpisodesByRange = (
  episodes: Episode[],
  range: [number, number],
): Episode[] => {
  return episodes.filter(
    (ep) => ep.episodeNumber >= range[0] && ep.episodeNumber <= range[1],
  )
}

export const findEpisodeByNumber = (episodes: Episode[], episodeNumber: number): Episode | undefined => {
  return episodes.find((ep) => ep.episodeNumber === episodeNumber)
}

export const buildEpisodeTitle = (seriesName: string, episodeNumber: number): string => {
  return `${seriesName} - EP ${episodeNumber.toString().padStart(2, '0')}`
}

export const getIframeUrl = (libraryId: string, videoId: string, autoplay = true): string => {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=${autoplay}&loop=false&muted=false&preload=true`
}

// ── Share Utilities ──

export const getShareUrl = (): string => {
  // Web uses path routing, so location.href is already a public, shareable URL.
  // Cordova uses HashRouter under app://localhost (not shareable), so rebuild the
  // equivalent public web URL: app://localhost/index.html#/player/<id> -> <site>/player/<id>
  if (!isCordova()) return window.location.href
  const route = window.location.hash.replace(/^#/, '') || '/'
  return `${PRODUCTION_ORIGIN}${route}`
}

// Public, shareable URL for a series' player page. In Cordova the app origin is
// app://localhost (not shareable), so fall back to the public site origin.
export const getPlayerShareUrl = (seriesId: string): string => {
  return `${getWebOrigin()}/player/${seriesId}`
}

export const getShareText = (seriesName: string, episodeNumber?: number): string => {
  if (episodeNumber) {
    return `Check out ${seriesName} - EP ${episodeNumber.toString().padStart(2, '0')}!`
  }
  return `Check out ${seriesName}!`
}

export const openShareWindow = (url: string): void => {
  // Cordova: open in the system browser (Safari / native app) so the user can
  // return to Ganime via the app switcher. window.open('_blank') is hijacked by
  // cordova-plugin-inappbrowser into an embedded WebView that traps the user on
  // the share page (no working back button). Web keeps the sized popup window.
  if (isCordova()) return openSystemBrowser(url)
  window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer')
}

// Facebook (web only). On the Cordova app this button is replaced by the native
// share sheet (shareNative): Facebook offers no web/URL way to share a link with
// a preview into its iOS app — sharer.php is ignored by the app, its site is
// blocked in embedded WebViews, and the universal link hijacks Safari redirects.
export const shareFacebook = (shareUrl: string): void => {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
  openShareWindow(url)
}

// Native OS share sheet, used on Cordova in place of a Facebook button. The user
// picks any target; Facebook's share extension builds the link preview from the
// page's OG tags. Falls back to the Facebook web sharer if unavailable.
export const shareNative = (shareUrl: string, text: string): void => {
  if (navigator.share) {
    navigator.share({ text, url: shareUrl }).catch(() => {})
    return
  }
  shareFacebook(shareUrl)
}

export const shareTwitter = (shareUrl: string, text: string): void => {
  const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
  openShareWindow(url)
}

// Instagram has no web URL to prefill a post, so on the Cordova app we hand
// Instagram the series poster image via the native share sheet (the user picks
// feed/story and writes their own caption). On web there's no Instagram app, so
// fall back to opening the Instagram site.
export const shareInstagram = (imageUrl: string): void => {
  const socialSharing = getSocialSharing()
  if (socialSharing) {
    socialSharing.shareViaInstagram('', imageUrl || null)
    return
  }
  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
}

export const shareWhatsApp = (shareUrl: string, text: string): void => {
  const url = `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`
  openShareWindow(url)
}

export const shareReddit = (shareUrl: string, text: string): void => {
  const url = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`
  openShareWindow(url)
}

// Email (web only) — opens the user's mail client via mailto. Not a popup window,
// so it doesn't go through openShareWindow.
export const shareEmail = (shareUrl: string, text: string): void => {
  const subject = encodeURIComponent(text)
  const body = encodeURIComponent(`${text}\n\n${shareUrl}`)
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}

// Copy text to the clipboard. Uses the async Clipboard API when available (secure
// contexts) and falls back to a hidden textarea + execCommand otherwise (e.g. the
// Cordova app:// origin, older WebViews). Returns whether the copy succeeded.
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
