// Genre page store - shared by Genre (desktop) and PhoneGenre (phone)
// Following Rule #7: States shared by 2+ components must be defined outside the component tree

import { createStore } from 'solid-js/store'
import { createMemo } from 'solid-js'
import { t } from './languageStore'
import type { Series, Genre } from '../types'

// ======================
// State
// ======================

interface GenreState {
  genres: Genre[]
  series: Series[]
  loading: boolean
  activeGenre: string
  // Free-text search from the TopBar; the Genre page doubles as the search-results page.
  searchQuery: string
  showMobileDropdown: boolean
  showFilterModal: boolean
}

const getInitialState = (): GenreState => ({
  genres: [],
  series: [],
  loading: true,
  activeGenre: 'all',
  searchQuery: '',
  showMobileDropdown: false,
  showFilterModal: false,
})

const [genreState, setGenreState] = createStore<GenreState>(getInitialState())

export const genreStore = genreState

// ======================
// Derived state
// ======================

export const activeGenreName = createMemo((): string => {
  if (genreState.searchQuery) {
    return t().series.searchResults.replace('{query}', genreState.searchQuery)
  }
  return genreState.activeGenre === 'all' ? t().series.allGenres : genreState.activeGenre
})

export const seriesCount = createMemo((): string =>
  t().series.resultsCount.replace('{count}', String(genreState.series.length)),
)

// ======================
// Actions
// ======================

export const genreStoreActions = {
  setGenres: (genres: Genre[]) => setGenreState({ genres }),
  setSeries: (series: Series[]) => setGenreState({ series }),
  setLoading: (loading: boolean) => setGenreState({ loading }),
  setActiveGenre: (activeGenre: string) => setGenreState({ activeGenre }),
  setSearchQuery: (searchQuery: string) => setGenreState({ searchQuery }),
  setShowMobileDropdown: (show: boolean) => setGenreState({ showMobileDropdown: show }),
  toggleMobileDropdown: () =>
    setGenreState('showMobileDropdown', (prev) => !prev),
  setShowFilterModal: (show: boolean) => setGenreState({ showFilterModal: show }),
  reset: () => setGenreState(getInitialState()),
  getState: () => genreState,
}
