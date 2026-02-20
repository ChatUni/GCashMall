// Genre page data service - fetches genres and series, updates genreStore
// Following Rule #7: Avoid calling APIs in createEffect, use data service pattern

import { apiGet } from '../utils/api'
import { genreStore, genreStoreActions } from '../stores/genreStore'
import type { Series, Genre } from '../types'

// ======================
// Data fetching
// ======================

export const fetchGenres = async () => {
  const result = await apiGet<Genre[]>('genres')
  if (result.success && result.data) {
    genreStoreActions.setGenres(result.data)
  }
}

export const fetchSeriesByGenre = async () => {
  const currentGenre = genreStore.activeGenre
  const currentGenres = genreStore.genres

  genreStoreActions.setLoading(true)

  const params = buildSeriesParams(currentGenre, currentGenres)
  const result = await apiGet<Series[]>('series', params)

  if (result.success && result.data) {
    genreStoreActions.setSeries(result.data)
  }

  genreStoreActions.setLoading(false)
}

// ======================
// Navigation helpers
// ======================

export const navigateToGenre = (
  genreName: string,
  navigate: (path: string) => void,
) => {
  if (genreName === 'all') {
    navigate('/genre')
  } else {
    navigate(`/genre?category=${encodeURIComponent(genreName)}`)
  }
  genreStoreActions.setShowMobileDropdown(false)
  genreStoreActions.setShowFilterModal(false)
}

export const syncActiveGenreFromUrl = (category: string | undefined) => {
  genreStoreActions.setActiveGenre(category || 'all')
}

// ======================
// Helpers
// ======================

const buildSeriesParams = (
  activeGenre: string,
  genres: Genre[],
): Record<string, string | number> | undefined => {
  if (activeGenre === 'all') return undefined

  const matchingGenre = genres.find((g) => g.name === activeGenre)
  if (matchingGenre) {
    return { genreId: matchingGenre._id }
  }

  return undefined
}
