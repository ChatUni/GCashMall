// Player utility functions - extracted business logic
// Following Rule #7: React components should be pure - separate business logic from components

import type { Episode } from '../types'
import { isCordova, PRODUCTION_ORIGIN, openSystemBrowser } from './cordova'

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

export const getEpisodeThumbnailUrl = (episode: Episode, isHovered: boolean): string => {
  if (episode.videoId) {
    const baseUrl = 'https://vz-918d4e7e-1fb.b-cdn.net'
    return isHovered
      ? `${baseUrl}/${episode.videoId}/preview.webp`
      : `${baseUrl}/${episode.videoId}/thumbnail.jpg`
  }
  return episode.thumbnail || ''
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
  const origin = isCordova() ? PRODUCTION_ORIGIN : window.location.origin
  return `${origin}/player/${seriesId}`
}

export const getShareText = (seriesName: string, episodeNumber?: number): string => {
  if (episodeNumber) {
    return `Check out ${seriesName} - EP ${episodeNumber.toString().padStart(2, '0')}!`
  }
  return `Check out ${seriesName}!`
}

export const openShareWindow = (url: string): void => {
  // Cordova: open in the system browser (Safari / native app) so the user can
  // return to GAnime via the app switcher. window.open('_blank') is hijacked by
  // cordova-plugin-inappbrowser into an embedded WebView that traps the user on
  // the share page (no working back button). Web keeps the sized popup window.
  if (isCordova()) return openSystemBrowser(url)
  window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer')
}

export const shareFacebook = (shareUrl: string): void => {
  // The native FB app hijacks facebook.com universal links (and ignores
  // sharer.php), while FB blocks its site inside embedded WebViews. To share to
  // Facebook in the actual web browser, open a redirect page on our own domain in
  // Safari (_system); its JS redirect to sharer.php stays in Safari because JS
  // redirects don't trigger universal links. Web opens sharer.php in a popup.
  if (isCordova()) {
    openSystemBrowser(`${PRODUCTION_ORIGIN}/fb-share.html?u=${encodeURIComponent(shareUrl)}`)
    return
  }
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
  openShareWindow(url)
}

export const shareTwitter = (shareUrl: string, text: string): void => {
  const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
  openShareWindow(url)
}

export const sharePinterest = (shareUrl: string, text: string): void => {
  const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(text)}`
  openShareWindow(url)
}

export const shareWhatsApp = (shareUrl: string, text: string): void => {
  const url = `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`
  openShareWindow(url)
}
