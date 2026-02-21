// TopBar store - SolidJS store
// Following Rule #7: States shared by 2+ components must be defined outside the component tree

import { createStore } from 'solid-js/store'
import { createMemo } from 'solid-js'
import type { SearchSuggestion, User, WatchListItem } from '../types'

interface TopBarState {
  searchQuery: string
  showSuggestions: boolean
  suggestions: SearchSuggestion[]
  highlightedIndex: number
  showLanguageDropdown: boolean
  showHistoryPopover: boolean
  showLoginModal: boolean
  isLoggedIn: boolean
  currentUser: User | null
}

const getInitialState = (): TopBarState => ({
  searchQuery: '',
  showSuggestions: false,
  suggestions: [],
  highlightedIndex: -1,
  showLanguageDropdown: false,
  showHistoryPopover: false,
  showLoginModal: false,
  isLoggedIn: false,
  currentUser: null,
})

const [topBarState, setTopBarState] = createStore<TopBarState>(getInitialState())

export const topBarStore = topBarState

// Derived state
export const watchHistory = createMemo((): WatchListItem[] => {
  const user = topBarState.currentUser
  if (!user?.watchList) return []
  return [...user.watchList]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5)
})

export const topBarStoreActions = {
  // Search
  setSearchQuery: (searchQuery: string) => setTopBarState({ searchQuery }),
  setShowSuggestions: (showSuggestions: boolean) =>
    setTopBarState({ showSuggestions }),
  setSuggestions: (suggestions: SearchSuggestion[]) =>
    setTopBarState({ suggestions }),
  setHighlightedIndex: (highlightedIndex: number) =>
    setTopBarState({ highlightedIndex }),
  moveHighlightDown: () =>
    setTopBarState('highlightedIndex', (prev) =>
      Math.min(prev + 1, topBarState.suggestions.length - 1),
    ),
  moveHighlightUp: () =>
    setTopBarState('highlightedIndex', (prev) => Math.max(prev - 1, -1)),

  // Language
  setShowLanguageDropdown: (showLanguageDropdown: boolean) =>
    setTopBarState({ showLanguageDropdown }),
  toggleLanguageDropdown: () =>
    setTopBarState('showLanguageDropdown', (prev) => !prev),

  // History
  setShowHistoryPopover: (showHistoryPopover: boolean) =>
    setTopBarState({ showHistoryPopover }),

  // Login modal
  setShowLoginModal: (showLoginModal: boolean) =>
    setTopBarState({ showLoginModal }),

  // Auth state
  setIsLoggedIn: (isLoggedIn: boolean) => setTopBarState({ isLoggedIn }),
  setCurrentUser: (currentUser: User | null) =>
    setTopBarState({ currentUser }),
  syncAuthState: (isLoggedIn: boolean, user: User | null) =>
    setTopBarState({ isLoggedIn, currentUser: user }),

  // Reset
  reset: () => setTopBarState(getInitialState()),
  getState: () => topBarState,
}
