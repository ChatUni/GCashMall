// Player utility functions - extracted business logic
// Following Rule #7: React components should be pure - separate business logic from components

import type { Episode } from '../types'

export const playbackSpeeds = [0.25, 0.5, 1.0, 1.25, 1.5, 2.0, 3.0]

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

export const findEpisodeById = (episodes: Episode[], episodeId: string): Episode | undefined => {
  return episodes.find((ep) => ep._id === episodeId)
}

export const buildEpisodeTitle = (seriesName: string, episodeNumber: number): string => {
  return `${seriesName} - EP ${episodeNumber.toString().padStart(2, '0')}`
}

export const getIframeUrl = (libraryId: string, videoId: string): string => {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&loop=false&muted=false&preload=true`
}
