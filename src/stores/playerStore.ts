// Extended player store actions - business logic for the Player page
// This module combines the base player store from index.ts with player page UI state

import { useSyncExternalStore } from 'react'
import type { Episode, User, FavoriteUserItem, WatchListItem } from '../types'
import {
  addToWatchList,
  addToFavorites,
  removeFromFavorites,
  purchaseEpisode,
  isEpisodePurchased,
  showToast,
  fetchPlayerData,
  fetchRecommendations,
  fetchNewReleases,
} from '../services/dataService'
import { isLoggedIn } from '../utils/api'
import { findEpisodeByNumber, filterEpisodesByRange, getEpisodeRanges } from '../utils/playerHelpers'
import { playerStoreActions as basePlayerStoreActions, loginModalStoreActions, getPlayerStore, getUserStore } from './index'

// Constants
export const HIDE_FAVORITE_MODAL_KEY = 'hideFavoriteModal'
export const EPISODE_PRICE = 0.1
export const EPISODE_COST = 1
// Trial time limit in seconds - users can watch this much before purchase is required
// To change the trial duration, update this value and the corresponding value in specs/pages/player.md
export const TIME_LIMIT = 3

// Module-level tracking variables
let currentLoadedSeriesId: string | null = null
let watchListUpdatedForSeriesId: string | null = null

// Player.js type definitions for Bunny Stream Playback Control API
export interface TimeUpdateData {
  seconds: number
  duration: number
}

export interface PlayerJsPlayer {
  on(event: 'ready', callback: () => void): void
  on(event: 'timeupdate', callback: (data: TimeUpdateData) => void): void
  on(event: 'seeked', callback: () => void): void
  on(event: string, callback: (data?: unknown) => void): void
  pause(): void
  play(): void
  getCurrentTime(callback: (time: number) => void): void
  setCurrentTime(time: number): void
}

export interface PlayerJsConstructor {
  Player: new (iframe: HTMLIFrameElement) => PlayerJsPlayer
}

export interface WindowWithPlayerJs extends Window {
  playerjs?: PlayerJsConstructor
}

// Player page UI state
interface PlayerPageState {
  // Series tracking
  currentSeriesId: string | null
  watchListUpdatedForSeriesId: string | null
  recommendationsFetched: boolean
  newReleasesFetched: boolean
  // Purchase popup
  showPurchasePopup: boolean
  isPurchasing: boolean
  // Result modal
  showResultModal: boolean
  resultModalType: 'success' | 'error'
  resultModalMessage: string
  // Favorite modal
  showFavoriteModal: boolean
  favoriteModalDontShowAgain: boolean
  pendingFavoriteAction: 'add' | 'remove' | null
  // Episode list (phone only)
  showEpisodeList: boolean
  // Description expansion (phone only)
  isDescriptionExpanded: boolean
  // Description truncation
  showExpandButton: boolean
}

const initialState: PlayerPageState = {
  currentSeriesId: null,
  watchListUpdatedForSeriesId: null,
  recommendationsFetched: false,
  newReleasesFetched: false,
  showPurchasePopup: false,
  isPurchasing: false,
  showResultModal: false,
  resultModalType: 'success',
  resultModalMessage: '',
  showFavoriteModal: false,
  favoriteModalDontShowAgain: false,
  pendingFavoriteAction: null,
  showEpisodeList: true,
  isDescriptionExpanded: false,
  showExpandButton: false,
}

let state = { ...initialState }
const listeners = new Set<() => void>()

const emitChange = () => {
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => state

// Store hook for player page UI state
export const usePlayerPageStore = () => useSyncExternalStore(subscribe, getSnapshot)

// Re-export usePlayerStore from index.ts
export { usePlayerStore } from './index'

// ======================
// Derived state helpers (pure functions)
// ======================

export const checkSeriesFavorited = (seriesId: string | undefined): boolean => {
  const userState = getUserStore()
  if (!seriesId || !userState.user?.favorites || userState.user.favorites.length === 0) return false
  return userState.user.favorites.some((item: FavoriteUserItem) => String(item.seriesId) === String(seriesId))
}

export const checkIsSeriesOwner = (): boolean => {
  const playerState = getPlayerStore()
  const userState = getUserStore()
  const uploaderId = playerState.series?.uploaderId
  const userId = userState.user?._id
  if (!uploaderId || !userId) return false
  return String(uploaderId) === String(userId)
}

export const checkEpisodePurchased = (episodeId: string, episodeNumber: number): boolean => {
  const playerState = getPlayerStore()
  const userState = getUserStore()
  const seriesId = playerState.series?._id
  if (!seriesId) return false
  if (checkIsSeriesOwner()) return true
  return isEpisodePurchased(seriesId, episodeId, userState.user?.purchases, episodeNumber)
}

export const isCurrentEpisodePurchased = (): boolean => {
  const playerState = getPlayerStore()
  const episode = playerState.currentEpisode
  if (!episode) return false
  return checkEpisodePurchased(episode._id, episode.episodeNumber)
}

export const getFilteredEpisodes = (): Episode[] => {
  const playerState = getPlayerStore()
  return filterEpisodesByRange(playerState.episodes, playerState.episodeRange)
}

export const getEpisodeRangeOptions = (): [number, number][] => {
  const playerState = getPlayerStore()
  return getEpisodeRanges(playerState.episodes.length)
}

// ======================
// Helper functions (pure logic)
// ======================

const shouldShowFavoriteModal = (): boolean => {
  return localStorage.getItem(HIDE_FAVORITE_MODAL_KEY) !== 'true'
}

const saveFavoriteModalPreference = (dontShowAgain: boolean) => {
  if (dontShowAgain) {
    localStorage.setItem(HIDE_FAVORITE_MODAL_KEY, 'true')
  }
}

interface PurchaseHistoryItem {
  seriesId: string
  episodeNumber: number
}

const findLastWatchedEpisode = (
  seriesId: string,
  watchList: WatchListItem[] | undefined,
  episodes: Episode[],
): Episode | null => {
  if (!watchList || watchList.length === 0) return null

  const watchListItem = watchList.find((item) => String(item.seriesId) === String(seriesId))
  if (watchListItem) {
    return findEpisodeByNumber(episodes, watchListItem.episodeNumber) || null
  }
  return null
}

const hasUserPurchasedEpisode = (
  seriesId: string,
  episodeNumber: number,
  purchaseHistory: PurchaseHistoryItem[] | undefined,
): boolean => {
  if (!purchaseHistory || purchaseHistory.length === 0) return false
  return purchaseHistory.some(
    (p) =>
      String(p.seriesId) === String(seriesId) &&
      p.episodeNumber === episodeNumber,
  )
}

const isUserSeriesOwner = (
  seriesUploaderId: string | undefined,
  userId: string | null | undefined,
): boolean => {
  if (!seriesUploaderId || !userId) return false
  return String(seriesUploaderId) === String(userId)
}

// ======================
// Player.js integration for trial limit enforcement
// ======================

interface PlayerJsState {
  player: PlayerJsPlayer | null
  isPurchasedRef: { current: boolean }
  dialogShownRef: { current: boolean }
  cleanup: () => void
}

const playerInstances = new Map<string, PlayerJsState>()

/**
 * Initialize Player.js for a Bunny Stream iframe with trial limit enforcement.
 * This function handles:
 * - Loading the Player.js script if not already loaded
 * - Creating the Player.js instance
 * - Listening for time updates
 * - Enforcing trial time limit for unpurchased episodes
 *
 * @param iframeRef - Ref to the iframe element
 * @param videoId - The video ID for tracking
 * @param isPurchased - Whether the current episode is purchased
 * @param onTimeLimitReached - Callback when user hits the trial limit
 * @returns Cleanup function to call on unmount/episode change
 */
export const initializePlayerJsWithTrialLimit = (
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  videoId: string | undefined,
  isPurchased: boolean,
  onTimeLimitReached: () => void,
): (() => void) => {
  if (!videoId || !iframeRef.current) {
    return () => {}
  }

  const isPurchasedRef = { current: isPurchased }
  const dialogShownRef = { current: false }

  const initPlayer = () => {
    const windowWithPlayerJs = window as WindowWithPlayerJs
    if (!windowWithPlayerJs.playerjs || !iframeRef.current) return

    try {
      const player = new windowWithPlayerJs.playerjs.Player(iframeRef.current)

      const playerState: PlayerJsState = {
        player,
        isPurchasedRef,
        dialogShownRef,
        cleanup: () => {
          playerInstances.delete(videoId)
        },
      }
      playerInstances.set(videoId, playerState)

      player.on('ready', () => {
        player.on('timeupdate', (data) => {
          if (!data || typeof (data as TimeUpdateData).seconds !== 'number') return
          const currentSeconds = (data as TimeUpdateData).seconds

          // Enforce trial time limit if episode is not purchased
          // Use ref to get current purchased status (not stale closure value)
          if (!isPurchasedRef.current && currentSeconds >= TIME_LIMIT) {
            player.pause()
            player.setCurrentTime(TIME_LIMIT - 0.1) // Set slightly before limit to prevent immediate re-trigger
            if (!dialogShownRef.current) {
              dialogShownRef.current = true
              onTimeLimitReached()
              // Reset the flag after a short delay to allow showing again if needed
              setTimeout(() => {
                dialogShownRef.current = false
              }, 500)
            }
          }
        })
      })
    } catch (error) {
      console.error('Failed to initialize Player.js:', error)
    }
  }

  // Load Player.js script if not already loaded
  const windowWithPlayerJs = window as WindowWithPlayerJs
  if (windowWithPlayerJs.playerjs) {
    initPlayer()
  } else {
    const script = document.createElement('script')
    script.src = 'https://cdn.embed.ly/player-0.1.0.min.js'
    script.onload = initPlayer
    document.head.appendChild(script)
  }

  return () => {
    const playerState = playerInstances.get(videoId)
    if (playerState) {
      playerState.cleanup()
    }
  }
}

/**
 * Update the purchased status for a Player.js instance.
 * Call this when the purchase status changes (e.g., after successful purchase or user login/logout).
 *
 * @param videoId - The video ID
 * @param isPurchased - The new purchased status
 */
export const updatePlayerJsPurchaseStatus = (videoId: string | undefined, isPurchased: boolean): void => {
  if (!videoId) return

  const playerState = playerInstances.get(videoId)
  if (playerState) {
    const wasUnpurchased = !playerState.isPurchasedRef.current
    playerState.isPurchasedRef.current = isPurchased

    // If user logged out (isPurchased changed from true to false),
    // enforce time limit immediately by pausing and seeking to start
    if (!isPurchased && !wasUnpurchased && playerState.player) {
      try {
        playerState.player.pause()
        playerState.player.setCurrentTime(0)
      } catch {
        // Player might not be ready
      }
    }
  }
}

/**
 * Handle time limit reached - show login dialog if not logged in, otherwise show purchase popup
 */
export const handleTimeLimitReached = (setShowPurchasePopup: (show: boolean) => void): void => {
  if (!isLoggedIn()) {
    loginModalStoreActions.open()
    return
  }
  setShowPurchasePopup(true)
}

// ======================
// Native video control handlers
// ======================

export const handlePlayPause = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isPlaying: boolean,
) => {
  if (!videoRef.current) return
  if (isPlaying) {
    videoRef.current.pause()
  } else {
    videoRef.current.play()
  }
  basePlayerStoreActions.setIsPlaying(!isPlaying)
}

export const handleTimeUpdate = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isPurchased: boolean,
  onTimeLimitReached: () => void,
) => {
  if (!videoRef.current) return
  const currentTime = videoRef.current.currentTime
  basePlayerStoreActions.setCurrentTime(currentTime)

  if (!isPurchased && currentTime >= TIME_LIMIT) {
    videoRef.current.pause()
    basePlayerStoreActions.setIsPlaying(false)
    onTimeLimitReached()
  }
}

export const handleLoadedMetadata = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  if (!videoRef.current) return
  basePlayerStoreActions.setDuration(videoRef.current.duration)
}

export const handleProgressChange = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  time: number,
  isPurchased: boolean,
  onTimeLimitReached: () => void,
) => {
  if (!videoRef.current) return

  if (!isPurchased && time >= TIME_LIMIT) {
    videoRef.current.currentTime = TIME_LIMIT
    videoRef.current.pause()
    basePlayerStoreActions.setCurrentTime(TIME_LIMIT)
    basePlayerStoreActions.setIsPlaying(false)
    onTimeLimitReached()
    return
  }
  videoRef.current.currentTime = time
  basePlayerStoreActions.setCurrentTime(time)
}

export const handleVolumeToggle = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  currentVolume: number,
) => {
  if (!videoRef.current) return
  const newVolume = currentVolume === 0 ? 1 : 0
  videoRef.current.volume = newVolume
  basePlayerStoreActions.setVolume(newVolume)
}

export const handleSpeedChange = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  speed: number,
) => {
  if (!videoRef.current) return
  videoRef.current.playbackRate = speed
  basePlayerStoreActions.setPlaybackSpeed(speed)
  basePlayerStoreActions.setShowSpeedSelector(false)
}

export const handleFullscreen = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  if (!videoRef.current) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    videoRef.current.requestFullscreen()
  }
}

export const showControlsTemporarily = (
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) => {
  const playerState = getPlayerStore()
  basePlayerStoreActions.setShowControls(true)
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current)
  }
  timeoutRef.current = setTimeout(() => {
    if (playerState.isPlaying) {
      basePlayerStoreActions.setShowControls(false)
    }
  }, 3000)
}

export const hideControlsIfPlaying = () => {
  const playerState = getPlayerStore()
  if (playerState.isPlaying) {
    basePlayerStoreActions.setShowControls(false)
  }
}

// ======================
// Player Page Store Actions
// ======================

export const playerPageStoreActions = {
  // Initialize player data for a series
  initialize: (seriesId: string, fetchRecommendationsData = false) => {
    if (state.currentSeriesId !== seriesId) {
      state = {
        ...initialState,
        currentSeriesId: seriesId,
        recommendationsFetched: state.recommendationsFetched,
        newReleasesFetched: state.newReleasesFetched,
      }
      basePlayerStoreActions.reset()
      fetchPlayerData(seriesId)
      emitChange()
    }
    if (fetchRecommendationsData) {
      if (!state.recommendationsFetched) {
        state = { ...state, recommendationsFetched: true }
        fetchRecommendations()
        emitChange()
      }
      if (!state.newReleasesFetched) {
        state = { ...state, newReleasesFetched: true }
        fetchNewReleases()
        emitChange()
      }
    }
  },

  // Handle episode selection from URL or watch list
  selectEpisodeFromUrlOrWatchList: (episodeNumberFromUrl: string | null) => {
    const playerState = getPlayerStore()
    const userState = getUserStore()
    const seriesId = state.currentSeriesId

    if (playerState.episodes.length === 0 || playerState.loading || !seriesId) return

    if (episodeNumberFromUrl) {
      const episodeNum = parseInt(episodeNumberFromUrl, 10)
      if (!playerState.currentEpisode || playerState.currentEpisode.episodeNumber !== episodeNum) {
        const episode = findEpisodeByNumber(playerState.episodes, episodeNum)
        if (episode) {
          basePlayerStoreActions.setCurrentEpisode(episode)
        }
      }
    } else if (!playerState.currentEpisode) {
      const watchList = userState.user?.watchList
      let lastWatchedEpisode: Episode | null = null
      if (watchList && watchList.length > 0) {
        const watchListItem = watchList.find((item: WatchListItem) => String(item.seriesId) === String(seriesId))
        if (watchListItem) {
          lastWatchedEpisode = findEpisodeByNumber(playerState.episodes, watchListItem.episodeNumber) || null
        }
      }
      if (lastWatchedEpisode) {
        basePlayerStoreActions.setCurrentEpisode(lastWatchedEpisode)
      } else if (playerState.episodes.length > 0) {
        basePlayerStoreActions.setCurrentEpisode(playerState.episodes[0])
      }
    }

    if (
      state.watchListUpdatedForSeriesId !== seriesId &&
      playerState.currentEpisode &&
      isLoggedIn()
    ) {
      state = { ...state, watchListUpdatedForSeriesId: seriesId }
      emitChange()
      playerPageStoreActions.updateWatchList(seriesId, playerState.currentEpisode.episodeNumber)
    }
  },

  // Update watch list
  updateWatchList: async (seriesId: string, episodeNumber: number) => {
    if (!isLoggedIn()) return
    try {
      await addToWatchList(seriesId, episodeNumber)
    } catch (error) {
      console.error('Failed to update watch list:', error)
    }
  },

  // Handle episode click
  handleEpisodeClick: (episode: Episode, navigate: (path: string, options?: { replace: boolean }) => void) => {
    const seriesId = state.currentSeriesId
    basePlayerStoreActions.setCurrentEpisode(episode)
    if (seriesId) {
      navigate(`/player/${seriesId}?episode=${episode.episodeNumber}`, { replace: true })
      playerPageStoreActions.updateWatchList(seriesId, episode.episodeNumber)
    }
  },

  // Handle time limit reached
  handleTimeLimitReached: () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }
    state = { ...state, showPurchasePopup: true }
    emitChange()
  },

  // Purchase popup
  showPurchasePopup: () => {
    state = { ...state, showPurchasePopup: true }
    emitChange()
  },
  hidePurchasePopup: () => {
    state = { ...state, showPurchasePopup: false }
    emitChange()
  },
  setIsPurchasing: (isPurchasing: boolean) => {
    state = { ...state, isPurchasing }
    emitChange()
  },

  // Handle unlock button click
  handleUnlockClick: () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }
    state = { ...state, showPurchasePopup: true }
    emitChange()
  },

  // Handle purchase confirmation
  handlePurchaseConfirm: async (t: { player: { insufficientBalance: string; purchaseSuccess: string; purchaseFailed: string } }) => {
    const playerState = getPlayerStore()
    const userState = getUserStore()
    const seriesId = state.currentSeriesId
    const episode = playerState.currentEpisode

    if (!seriesId || !episode) return

    const userBalance = userState.user?.balance || 0
    if (userBalance < EPISODE_PRICE) {
      state = {
        ...state,
        showPurchasePopup: false,
        showResultModal: true,
        resultModalType: 'error',
        resultModalMessage: t.player.insufficientBalance,
      }
      emitChange()
      return
    }

    state = { ...state, isPurchasing: true }
    emitChange()

    try {
      const result = await purchaseEpisode(seriesId, episode._id, episode.episodeNumber, EPISODE_PRICE)
      state = {
        ...state,
        showPurchasePopup: false,
        isPurchasing: false,
        showResultModal: true,
        resultModalType: result.success ? 'success' : 'error',
        resultModalMessage: result.success ? t.player.purchaseSuccess : (result.error || t.player.purchaseFailed),
      }
      emitChange()
    } catch (error) {
      console.error('Failed to purchase episode:', error)
      state = {
        ...state,
        showPurchasePopup: false,
        isPurchasing: false,
        showResultModal: true,
        resultModalType: 'error',
        resultModalMessage: t.player.purchaseFailed,
      }
      emitChange()
    }
  },

  // Result modal
  showResultModalSuccess: (message: string) => {
    state = {
      ...state,
      showResultModal: true,
      resultModalType: 'success',
      resultModalMessage: message,
    }
    emitChange()
  },
  showResultModalError: (message: string) => {
    state = {
      ...state,
      showResultModal: true,
      resultModalType: 'error',
      resultModalMessage: message,
    }
    emitChange()
  },
  hideResultModal: () => {
    state = { ...state, showResultModal: false }
    emitChange()
  },

  // Handle result modal close with navigation
  handleResultModalClose: (navigate: (path: string) => void) => {
    if (state.resultModalType === 'error' && state.resultModalMessage.includes('balance')) {
      navigate('/account?tab=wallet')
    }
    state = { ...state, showResultModal: false }
    emitChange()
  },

  // Favorite modal
  showFavoriteModal: (action: 'add' | 'remove') => {
    state = {
      ...state,
      showFavoriteModal: true,
      pendingFavoriteAction: action,
      favoriteModalDontShowAgain: false,
    }
    emitChange()
  },
  hideFavoriteModal: () => {
    state = {
      ...state,
      showFavoriteModal: false,
      pendingFavoriteAction: null,
    }
    emitChange()
  },
  setFavoriteModalDontShowAgain: (value: boolean) => {
    state = { ...state, favoriteModalDontShowAgain: value }
    emitChange()
  },

  // Handle favorite toggle
  handleFavoriteToggle: async () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }

    const seriesId = state.currentSeriesId
    if (!seriesId) return

    const isFavorited = checkSeriesFavorited(seriesId)
    const willAdd = !isFavorited

    if (!shouldShowFavoriteModal()) {
      try {
        if (willAdd) {
          await addToFavorites(seriesId)
        } else {
          await removeFromFavorites(seriesId)
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error)
      }
      return
    }

    state = {
      ...state,
      showFavoriteModal: true,
      pendingFavoriteAction: willAdd ? 'add' : 'remove',
      favoriteModalDontShowAgain: false,
    }
    emitChange()
  },

  // Handle favorite confirmation
  handleFavoriteConfirm: async () => {
    const seriesId = state.currentSeriesId
    if (!seriesId || !state.pendingFavoriteAction) return

    saveFavoriteModalPreference(state.favoriteModalDontShowAgain)

    const isFavorited = checkSeriesFavorited(seriesId)
    try {
      if (!isFavorited) {
        await addToFavorites(seriesId)
      } else {
        await removeFromFavorites(seriesId)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }

    state = {
      ...state,
      showFavoriteModal: false,
      pendingFavoriteAction: null,
    }
    emitChange()
  },

  // Episode list toggle
  toggleEpisodeList: () => {
    state = { ...state, showEpisodeList: !state.showEpisodeList }
    emitChange()
  },
  setShowEpisodeList: (show: boolean) => {
    state = { ...state, showEpisodeList: show }
    emitChange()
  },

  // Description expansion
  toggleDescription: () => {
    state = { ...state, isDescriptionExpanded: !state.isDescriptionExpanded }
    emitChange()
  },
  setDescriptionExpanded: (expanded: boolean) => {
    state = { ...state, isDescriptionExpanded: expanded }
    emitChange()
  },
  setShowExpandButton: (show: boolean) => {
    state = { ...state, showExpandButton: show }
    emitChange()
  },

  // Reset all state
  reset: () => {
    state = { ...initialState }
    emitChange()
  },
}

// ======================
// Extended Player Store Actions (adds to base actions from index.ts)
// ======================

export const playerStoreActions = {
  // Re-export all base actions
  ...basePlayerStoreActions,

  // Initialize player data for a series
  initializePlayerData: (seriesId: string) => {
    if (currentLoadedSeriesId !== seriesId) {
      currentLoadedSeriesId = seriesId
      watchListUpdatedForSeriesId = null
      basePlayerStoreActions.reset()
      fetchPlayerData(seriesId)
    }
  },

  // Check if user can watch episode without restriction
  canWatchEpisodeUnrestricted: (
    seriesId: string,
    seriesUploaderId: string | undefined,
    episodeNumber: number,
    user: User | null,
  ): boolean => {
    if (!user || !user._id) return false
    if (isUserSeriesOwner(seriesUploaderId, user._id)) return true
    return hasUserPurchasedEpisode(seriesId, episodeNumber, user.purchaseHistory)
  },

  // Determine and set which episode to display
  determineCurrentEpisode: (
    seriesId: string,
    episodeNumberFromUrl: string | null,
    user: User | null,
  ) => {
    const currentState = basePlayerStoreActions.getState()
    if (currentState.episodes.length === 0 || currentState.loading) return

    // If URL has episode parameter, use it
    if (
      episodeNumberFromUrl &&
      (!currentState.currentEpisode || currentState.currentEpisode.episodeNumber !== parseInt(episodeNumberFromUrl, 10))
    ) {
      const episode = findEpisodeByNumber(currentState.episodes, parseInt(episodeNumberFromUrl, 10))
      if (episode) {
        basePlayerStoreActions.setCurrentEpisode(episode)
        return
      }
    }

    // Otherwise, if no current episode set, find from watch list or use first episode
    if (!currentState.currentEpisode) {
      const lastWatchedEpisode = findLastWatchedEpisode(seriesId, user?.watchList, currentState.episodes)
      if (lastWatchedEpisode) {
        basePlayerStoreActions.setCurrentEpisode(lastWatchedEpisode)
      } else if (currentState.episodes.length > 0) {
        basePlayerStoreActions.setCurrentEpisode(currentState.episodes[0])
      }
    }
  },

  // Update watch list on load or episode change
  updateWatchListOnLoad: async (seriesId: string, episodeNumber: number) => {
    if (!isLoggedIn()) return
    if (watchListUpdatedForSeriesId === seriesId) return

    watchListUpdatedForSeriesId = seriesId
    try {
      await addToWatchList(seriesId, episodeNumber)
    } catch (error) {
      console.error('Failed to update watch list:', error)
    }
  },

  // Handle episode selection
  selectEpisode: (episode: Episode, seriesId: string) => {
    // Reset purchase dialog when switching episodes - user should watch until limit before being prompted
    basePlayerStoreActions.setShowPurchaseDialog(false)
    basePlayerStoreActions.setCurrentEpisode(episode)
    if (isLoggedIn()) {
      addToWatchList(seriesId, episode.episodeNumber).catch((error) => {
        console.error('Failed to update watch list:', error)
      })
    }
  },

  // Check if series is favorited
  isSeriesFavorited: (seriesId: string, user: User | null): boolean => {
    if (!user?.favorites || user.favorites.length === 0) return false
    return user.favorites.some((item) => String(item.seriesId) === String(seriesId))
  },

  // Toggle favorite status
  toggleFavorite: async (seriesId: string, user: User | null) => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }

    try {
      if (playerStoreActions.isSeriesFavorited(seriesId, user)) {
        await removeFromFavorites(seriesId)
      } else {
        await addToFavorites(seriesId)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  },

  // Handle purchase action
  // Returns true if purchase was successful, false otherwise
  handlePurchase: async (
    seriesId: string,
    user: User | null,
    t: { player?: { purchaseDialog?: { insufficientBalance?: string; purchaseSuccess?: string; purchaseFailed?: string } } },
    navigate: (path: string) => void,
  ): Promise<boolean> => {
    const currentState = basePlayerStoreActions.getState()

    // If not logged in, show login modal
    if (!isLoggedIn()) {
      basePlayerStoreActions.setShowPurchaseDialog(false)
      loginModalStoreActions.open()
      return false
    }

    if (!currentState.currentEpisode) return false

    // Check if user has enough balance
    const userBalance = user?.balance || 0
    if (userBalance < EPISODE_COST) {
      showToast(
        t.player?.purchaseDialog?.insufficientBalance ||
          "You don't have enough GCash, please top up first",
        'error',
      )
      basePlayerStoreActions.setShowPurchaseDialog(false)
      navigate('/account?tab=wallet')
      return false
    }

    // Attempt to purchase
    basePlayerStoreActions.setPurchaseLoading(true)
    try {
      const episodeId = (currentState.currentEpisode as { _id?: string })?._id || ''
      const result = await purchaseEpisode(seriesId, episodeId, currentState.currentEpisode.episodeNumber)
      if (result.success) {
        showToast(
          t.player?.purchaseDialog?.purchaseSuccess || 'Episode purchased successfully',
          'success',
        )
        basePlayerStoreActions.setShowPurchaseDialog(false)
        return true
      } else {
        showToast(
          result.error || t.player?.purchaseDialog?.purchaseFailed || 'Failed to purchase episode',
          'error',
        )
        return false
      }
    } catch (error) {
      console.error('Purchase error:', error)
      showToast(
        t.player?.purchaseDialog?.purchaseFailed || 'Failed to purchase episode',
        'error',
      )
      return false
    } finally {
      basePlayerStoreActions.setPurchaseLoading(false)
    }
  },

  // Cancel purchase dialog
  cancelPurchase: () => {
    basePlayerStoreActions.setShowPurchaseDialog(false)
  },

  // Handle video control events for native video element (extended versions)
  handlePlayPauseExtended: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const currentState = basePlayerStoreActions.getState()
    if (videoRef.current) {
      if (currentState.isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      basePlayerStoreActions.setIsPlaying(!currentState.isPlaying)
    }
  },

  handleTimeUpdateExtended: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    if (videoRef.current) {
      basePlayerStoreActions.setCurrentTime(videoRef.current.currentTime)
    }
  },

  handleLoadedMetadataExtended: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    if (videoRef.current) {
      basePlayerStoreActions.setDuration(videoRef.current.duration)
    }
  },

  handleProgressChangeExtended: (videoRef: React.RefObject<HTMLVideoElement | null>, time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      basePlayerStoreActions.setCurrentTime(time)
    }
  },

  handleVolumeToggleExtended: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const currentState = basePlayerStoreActions.getState()
    if (videoRef.current) {
      const newVolume = currentState.volume === 0 ? 1 : 0
      videoRef.current.volume = newVolume
      basePlayerStoreActions.setVolume(newVolume)
    }
  },

  handleSpeedChangeExtended: (videoRef: React.RefObject<HTMLVideoElement | null>, speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      basePlayerStoreActions.setPlaybackSpeed(speed)
      basePlayerStoreActions.setShowSpeedSelector(false)
    }
  },

  handleFullscreenExtended: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  },

  // Handle controls visibility
  showControlsTemporarilyExtended: (timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    const currentState = basePlayerStoreActions.getState()
    basePlayerStoreActions.setShowControls(true)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      if (currentState.isPlaying) {
        basePlayerStoreActions.setShowControls(false)
      }
    }, 3000)
  },

  hideControlsIfPlayingExtended: () => {
    const currentState = basePlayerStoreActions.getState()
    if (currentState.isPlaying) {
      basePlayerStoreActions.setShowControls(false)
    }
  },
}
