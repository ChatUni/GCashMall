// Player utility functions - extracted business logic
// Following Rule #7: React components should be pure - separate business logic from components

import type { Episode } from '../types'

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
  return window.location.href
}

export const getShareText = (seriesName: string, episodeNumber?: number): string => {
  if (episodeNumber) {
    return `Check out ${seriesName} - EP ${episodeNumber.toString().padStart(2, '0')}!`
  }
  return `Check out ${seriesName}!`
}

export const openShareWindow = (url: string): void => {
  window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer')
}

export const shareFacebook = (shareUrl: string): void => {
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
