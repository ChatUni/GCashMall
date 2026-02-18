// Centralized state management using SolidJS stores
// Following Rule #7: States shared by 2+ components must be defined outside the component tree

import { createStore } from 'solid-js/store'
import type { User, Series, Episode } from '../types'

// Re-export User type for convenience
export type { User }

// User store
interface UserState {
  user: User | null
  isLoggedIn: boolean
  loading: boolean
}

const [userState, setUserState] = createStore<UserState>({
  user: null,
  isLoggedIn: false,
  loading: true,
})

export const userStore = userState

export const userStoreActions = {
  setUser: (user: User | null) => setUserState({ user, isLoggedIn: !!user }),
  setLoading: (loading: boolean) => setUserState({ loading }),
  logout: () => setUserState({ user: null, isLoggedIn: false, loading: false }),
  getState: () => userState,
}

// Featured series store
interface FeaturedState {
  series: Series | null
  loading: boolean
}

const [featuredState, setFeaturedState] = createStore<FeaturedState>({
  series: null,
  loading: true,
})

export const featuredStore = featuredState

export const featuredStoreActions = {
  setSeries: (series: Series | null) => setFeaturedState({ series }),
  setLoading: (loading: boolean) => setFeaturedState({ loading }),
  getState: () => featuredState,
}

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
  showPurchaseDialog: boolean
  purchaseLoading: boolean
}

const [playerState, setPlayerState] = createStore<PlayerState>({
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
  episodeRange: [1, 40] as [number, number],
  hoveredEpisodeId: null,
  showPurchaseDialog: false,
  purchaseLoading: false,
})

export const playerStore = playerState

export const playerStoreActions = {
  setSeries: (series: Series | null) => setPlayerState({ series }),
  setEpisodes: (episodes: Episode[]) => setPlayerState({ episodes }),
  setCurrentEpisode: (currentEpisode: Episode | null) => setPlayerState({ currentEpisode }),
  setLoading: (loading: boolean) => setPlayerState({ loading }),
  setIsPlaying: (isPlaying: boolean) => setPlayerState({ isPlaying }),
  setShowControls: (showControls: boolean) => setPlayerState({ showControls }),
  setCurrentTime: (currentTime: number) => setPlayerState({ currentTime }),
  setDuration: (duration: number) => setPlayerState({ duration }),
  setVolume: (volume: number) => setPlayerState({ volume }),
  setPlaybackSpeed: (playbackSpeed: number) => setPlayerState({ playbackSpeed }),
  setShowSpeedSelector: (showSpeedSelector: boolean) => setPlayerState({ showSpeedSelector }),
  setSelectedLanguage: (selectedLanguage: string) => setPlayerState({ selectedLanguage }),
  setEpisodeRange: (episodeRange: [number, number]) => setPlayerState({ episodeRange }),
  setHoveredEpisodeId: (hoveredEpisodeId: string | null) => setPlayerState({ hoveredEpisodeId }),
  setShowPurchaseDialog: (showPurchaseDialog: boolean) => setPlayerState({ showPurchaseDialog }),
  setPurchaseLoading: (purchaseLoading: boolean) => setPlayerState({ purchaseLoading }),
  reset: () => setPlayerState({
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
    episodeRange: [1, 40] as [number, number],
    hoveredEpisodeId: null,
    showPurchaseDialog: false,
    purchaseLoading: false,
  }),
  getState: () => playerState,
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

// Video Feed store (for TikTok-style home page)
interface VideoFeedState {
  videos: Series[]
  currentIndex: number
  loading: boolean
  hasMore: boolean
  page: number
  isMuted: boolean
}

const [videoFeedState, setVideoFeedState] = createStore<VideoFeedState>({
  videos: [],
  currentIndex: 0,
  loading: true,
  hasMore: true,
  page: 1,
  isMuted: true,
})

export const videoFeedStore = videoFeedState

export const videoFeedStoreActions = {
  setVideos: (videos: Series[]) => setVideoFeedState({ videos }),
  appendVideos: (videos: Series[]) => setVideoFeedState('videos', (prev) => [...prev, ...videos]),
  setCurrentIndex: (currentIndex: number) => setVideoFeedState({ currentIndex }),
  setLoading: (loading: boolean) => setVideoFeedState({ loading }),
  setHasMore: (hasMore: boolean) => setVideoFeedState({ hasMore }),
  setPage: (page: number) => setVideoFeedState({ page }),
  setIsMuted: (isMuted: boolean) => setVideoFeedState({ isMuted }),
  toggleMute: () => setVideoFeedState('isMuted', (prev) => !prev),
  reset: () => setVideoFeedState({
    videos: [],
    currentIndex: 0,
    loading: true,
    hasMore: true,
    page: 1,
    isMuted: true,
  }),
  getState: () => videoFeedState,
}

// Export getters for external access
export const getPlayerStore = () => playerState
export const getUserStore = () => userState
