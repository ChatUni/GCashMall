// Genre page data service - fetches genres and series, updates genreStore
// Following Rule #7: Avoid calling APIs in createEffect, use data service pattern

import { apiGet } from '../utils/api'
import { genreStore, genreStoreActions } from '../stores/genreStore'
import type { Series, Genre } from '../types'

// ======================
// Data fetching
// ======================

export const fetchGenres = async () => {
  // used=true → only genres backed by a series with episodes, so no genre in the
  // sidebar can produce an empty results list when clicked.
  const result = await apiGet<Genre[]>('genres', { used: 'true' })
  if (result.success && result.data) {
    genreStoreActions.setGenres(result.data)
  }
}

export const fetchSeriesByGenre = async () => {
  const currentGenre = genreStore.activeGenre
  const currentGenres = genreStore.genres
  const currentSearch = genreStore.searchQuery

  genreStoreActions.setLoading(true)

  const params = buildSeriesParams(currentGenre, currentGenres, currentSearch)
  const result = await apiGet<Series[]>('series', params)

  if (result.success && result.data) {
    genreStoreActions.setSeries(result.data)
  }

  genreStoreActions.setLoading(false)
}

// ======================
// Navigation helpers
// ======================

// Picking a genre also leaves any search-results view (the two filters are alternatives,
// not cumulative), so the search term is dropped from the URL.
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

// The Genre page is also the search-results page: /genre?search=<query>.
export const buildSearchUrl = (query: string): string =>
  `/genre?search=${encodeURIComponent(query)}`

export const syncGenreFromUrl = (
  category: string | undefined,
  search: string | undefined,
) => {
  genreStoreActions.setActiveGenre(category || 'all')
  genreStoreActions.setSearchQuery((search || '').trim())
}

// ======================
// Helpers
// ======================

const buildSeriesParams = (
  activeGenre: string,
  genres: Genre[],
  search: string,
): Record<string, string | number> | undefined => {
  const params: Record<string, string | number> = {}

  if (search) params.search = search

  if (activeGenre !== 'all') {
    const matchingGenre = genres.find((g) => g.name === activeGenre)
    if (matchingGenre) params.genreId = matchingGenre._id
  }

  return Object.keys(params).length > 0 ? params : undefined
}
