// Centralized state management using SolidJS stores
// Following Rule #7: States shared by 2+ components must be defined outside the component tree

import { createStore } from 'solid-js/store'
import type { Series } from '../types'

// Re-export stores from dedicated modules
export { playerStore, playerStoreActions } from './playerStore'
export { featuredStore, featuredStoreActions, videoFeedStore, videoFeedStoreActions } from './homeStore'
export { genreStore, genreStoreActions, activeGenreName, seriesCount } from './genreStore'

// Recommendations store
interface RecommendationsState {
  series: Series[]
  loading: boolean
}

const [recommendationsState, setRecommendationsState] = createStore<RecommendationsState>({
  series: [],
  loading: true,
})

export const recommendationsStore = recommendationsState

export const recommendationsStoreActions = {
  setSeries: (series: Series[]) => setRecommendationsState({ series }),
  setLoading: (loading: boolean) => setRecommendationsState({ loading }),
  getState: () => recommendationsState,
}

// New releases store
interface NewReleasesState {
  series: Series[]
  loading: boolean
}

const [newReleasesState, setNewReleasesState] = createStore<NewReleasesState>({
  series: [],
  loading: true,
})

export const newReleasesStore = newReleasesState

export const newReleasesStoreActions = {
  setSeries: (series: Series[]) => setNewReleasesState({ series }),
  setLoading: (loading: boolean) => setNewReleasesState({ loading }),
  getState: () => newReleasesState,
}

// Login modal store
interface LoginModalState {
  isOpen: boolean
  redirectPath: string | null
}

const [loginModalState, setLoginModalState] = createStore<LoginModalState>({
  isOpen: false,
  redirectPath: null,
})

export const loginModalStore = loginModalState

export const loginModalStoreActions = {
  open: (redirectPath?: string) => setLoginModalState({ isOpen: true, redirectPath: redirectPath || null }),
  close: () => setLoginModalState({ isOpen: false, redirectPath: null }),
  getState: () => loginModalState,
}

// Toast notification store
interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
  isVisible: boolean
}

const [toastState, setToastState] = createStore<ToastState>({
  message: '',
  type: 'info',
  isVisible: false,
})

export const toastStore = toastState

export const toastStoreActions = {
  show: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastState({ message, type, isVisible: true })
    setTimeout(() => setToastState({ isVisible: false }), 3000)
  },
  hide: () => setToastState({ isVisible: false }),
  getState: () => toastState,
}
