// Centralized state management using external stores
// Following Rule #7: States shared by 2+ components must be defined outside the component tree

import { useSyncExternalStore } from 'react'
import type { User, Series, Episode } from '../types'

// Re-export User type for convenience
export type { User }

// Generic store factory
type Listener = () => void

const createStore = <T>(initialState: T) => {
  let state = initialState
  const listeners = new Set<Listener>()

  const getState = () => state

  const setState = (newState: T | ((prev: T) => T)) => {
    state = typeof newState === 'function' ? (newState as (prev: T) => T)(state) : newState
    listeners.forEach((listener) => listener())
  }

  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return { getState, setState, subscribe }
}

// User store
interface UserState {
  user: User | null
  isLoggedIn: boolean
  loading: boolean
}

const userStore = createStore<UserState>({
  user: null,
  isLoggedIn: false,
  loading: true,
})

export const useUserStore = () => {
  const state = useSyncExternalStore(userStore.subscribe, userStore.getState)
  return {
    ...state,
    setUser: (user: User | null) => userStore.setState((prev) => ({ ...prev, user, isLoggedIn: !!user })),
    setLoading: (loading: boolean) => userStore.setState((prev) => ({ ...prev, loading })),
    logout: () => userStore.setState({ user: null, isLoggedIn: false, loading: false }),
  }
}

export const userStoreActions = {
  setUser: (user: User | null) => userStore.setState((prev) => ({ ...prev, user, isLoggedIn: !!user })),
  setLoading: (loading: boolean) => userStore.setState((prev) => ({ ...prev, loading })),
  logout: () => userStore.setState({ user: null, isLoggedIn: false, loading: false }),
  getState: userStore.getState,
}

// Featured series store
interface FeaturedState {
  series: Series | null
  loading: boolean
}

const featuredStore = createStore<FeaturedState>({
  series: null,
  loading: true,
})

export const useFeaturedStore = () => {
  const state = useSyncExternalStore(featuredStore.subscribe, featuredStore.getState)
  return {
    ...state,
    setSeries: (series: Series | null) => featuredStore.setState((prev) => ({ ...prev, series })),
    setLoading: (loading: boolean) => featuredStore.setState((prev) => ({ ...prev, loading })),
  }
}

export const featuredStoreActions = {
  setSeries: (series: Series | null) => featuredStore.setState((prev) => ({ ...prev, series })),
  setLoading: (loading: boolean) => featuredStore.setState((prev) => ({ ...prev, loading })),
  getState: featuredStore.getState,
}

// Recommendations store
interface RecommendationsState {
  series: Series[]
  loading: boolean
}

const recommendationsStore = createStore<RecommendationsState>({
  series: [],
  loading: true,
})

export const useRecommendationsStore = () => {
  const state = useSyncExternalStore(recommendationsStore.subscribe, recommendationsStore.getState)
  return {
    ...state,
    setSeries: (series: Series[]) => recommendationsStore.setState((prev) => ({ ...prev, series })),
    setLoading: (loading: boolean) => recommendationsStore.setState((prev) => ({ ...prev, loading })),
  }
}

export const recommendationsStoreActions = {
  setSeries: (series: Series[]) => recommendationsStore.setState((prev) => ({ ...prev, series })),
  setLoading: (loading: boolean) => recommendationsStore.setState((prev) => ({ ...prev, loading })),
  getState: recommendationsStore.getState,
}

// New releases store
interface NewReleasesState {
  series: Series[]
  loading: boolean
}

const newReleasesStore = createStore<NewReleasesState>({
  series: [],
  loading: true,
})

export const useNewReleasesStore = () => {
  const state = useSyncExternalStore(newReleasesStore.subscribe, newReleasesStore.getState)
  return {
    ...state,
    setSeries: (series: Series[]) => newReleasesStore.setState((prev) => ({ ...prev, series })),
    setLoading: (loading: boolean) => newReleasesStore.setState((prev) => ({ ...prev, loading })),
  }
}

export const newReleasesStoreActions = {
  setSeries: (series: Series[]) => newReleasesStore.setState((prev) => ({ ...prev, series })),
  setLoading: (loading: boolean) => newReleasesStore.setState((prev) => ({ ...prev, loading })),
  getState: newReleasesStore.getState,
}

// Player store
interface PlayerState {
  series: Series | null
  episodes: Episode[]
  currentEpisode: Episode | null
  loading: boolean
  isPlaying: boolean
  showControls: boolean
  currentTime: number
  duration: number
  volume: number
  playbackSpeed: number
  showSpeedSelector: boolean
  selectedLanguage: string
  episodeRange: [number, number]
  hoveredEpisodeId: string | null
}

const playerStore = createStore<PlayerState>({
  series: null,
  episodes: [],
  currentEpisode: null,
  loading: true,
  isPlaying: false,
  showControls: true,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackSpeed: 1,
  showSpeedSelector: false,
  selectedLanguage: 'English',
  episodeRange: [1, 40],
  hoveredEpisodeId: null,
})

export const usePlayerStore = () => {
  const state = useSyncExternalStore(playerStore.subscribe, playerStore.getState)
  return state
}

export const playerStoreActions = {
  setSeries: (series: Series | null) => playerStore.setState((prev) => ({ ...prev, series })),
  setEpisodes: (episodes: Episode[]) => playerStore.setState((prev) => ({ ...prev, episodes })),
  setCurrentEpisode: (currentEpisode: Episode | null) => playerStore.setState((prev) => ({ ...prev, currentEpisode })),
  setLoading: (loading: boolean) => playerStore.setState((prev) => ({ ...prev, loading })),
  setIsPlaying: (isPlaying: boolean) => playerStore.setState((prev) => ({ ...prev, isPlaying })),
  setShowControls: (showControls: boolean) => playerStore.setState((prev) => ({ ...prev, showControls })),
  setCurrentTime: (currentTime: number) => playerStore.setState((prev) => ({ ...prev, currentTime })),
  setDuration: (duration: number) => playerStore.setState((prev) => ({ ...prev, duration })),
  setVolume: (volume: number) => playerStore.setState((prev) => ({ ...prev, volume })),
  setPlaybackSpeed: (playbackSpeed: number) => playerStore.setState((prev) => ({ ...prev, playbackSpeed })),
  setShowSpeedSelector: (showSpeedSelector: boolean) => playerStore.setState((prev) => ({ ...prev, showSpeedSelector })),
  setSelectedLanguage: (selectedLanguage: string) => playerStore.setState((prev) => ({ ...prev, selectedLanguage })),
  setEpisodeRange: (episodeRange: [number, number]) => playerStore.setState((prev) => ({ ...prev, episodeRange })),
  setHoveredEpisodeId: (hoveredEpisodeId: string | null) => playerStore.setState((prev) => ({ ...prev, hoveredEpisodeId })),
  reset: () => playerStore.setState({
    series: null,
    episodes: [],
    currentEpisode: null,
    loading: true,
    isPlaying: false,
    showControls: true,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackSpeed: 1,
    showSpeedSelector: false,
    selectedLanguage: 'English',
    episodeRange: [1, 40],
    hoveredEpisodeId: null,
  }),
  getState: playerStore.getState,
}

// Login modal store
interface LoginModalState {
  isOpen: boolean
  redirectPath: string | null
}

const loginModalStore = createStore<LoginModalState>({
  isOpen: false,
  redirectPath: null,
})

export const useLoginModalStore = () => {
  const state = useSyncExternalStore(loginModalStore.subscribe, loginModalStore.getState)
  return state
}

export const loginModalStoreActions = {
  open: (redirectPath?: string) => loginModalStore.setState({ isOpen: true, redirectPath: redirectPath || null }),
  close: () => loginModalStore.setState({ isOpen: false, redirectPath: null }),
  getState: loginModalStore.getState,
}

// Toast notification store
interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
  isVisible: boolean
}

const toastStore = createStore<ToastState>({
  message: '',
  type: 'info',
  isVisible: false,
})

export const useToastStore = () => {
  const state = useSyncExternalStore(toastStore.subscribe, toastStore.getState)
  return state
}

export const toastStoreActions = {
  show: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    toastStore.setState({ message, type, isVisible: true })
    setTimeout(() => toastStore.setState((prev) => ({ ...prev, isVisible: false })), 3000)
  },
  hide: () => toastStore.setState((prev) => ({ ...prev, isVisible: false })),
  getState: toastStore.getState,
}
