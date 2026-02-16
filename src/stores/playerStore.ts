// Extended player store actions - business logic for the Player page
// This module adds high-level actions to the base player store from index.ts

import type { Episode, User } from '../types'
import { addToWatchList, addToFavorites, removeFromFavorites, purchaseEpisode, showToast, fetchPlayerData } from '../services/dataService'
import { isLoggedIn } from '../utils/api'
import { findEpisodeByNumber } from '../utils/playerHelpers'
import { playerStoreActions as basePlayerStoreActions, loginModalStoreActions } from './index'

// Constants
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

// Helper functions (pure logic)

interface WatchListItem {
  seriesId: string
  episodeNumber: number
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

// Extended player store actions (adds to base actions from index.ts)
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
    const state = basePlayerStoreActions.getState()
    if (state.episodes.length === 0 || state.loading) return

    // If URL has episode parameter, use it
    if (
      episodeNumberFromUrl &&
      (!state.currentEpisode || state.currentEpisode.episodeNumber !== parseInt(episodeNumberFromUrl, 10))
    ) {
      const episode = findEpisodeByNumber(state.episodes, parseInt(episodeNumberFromUrl, 10))
      if (episode) {
        basePlayerStoreActions.setCurrentEpisode(episode)
        return
      }
    }

    // Otherwise, if no current episode set, find from watch list or use first episode
    if (!state.currentEpisode) {
      const lastWatchedEpisode = findLastWatchedEpisode(seriesId, user?.watchList, state.episodes)
      if (lastWatchedEpisode) {
        basePlayerStoreActions.setCurrentEpisode(lastWatchedEpisode)
      } else if (state.episodes.length > 0) {
        basePlayerStoreActions.setCurrentEpisode(state.episodes[0])
      }
    }
  },

  // Update watch list on load or episode change
  updateWatchList: async (seriesId: string, episodeNumber: number) => {
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
    const state = basePlayerStoreActions.getState()

    // If not logged in, show login modal
    if (!isLoggedIn()) {
      basePlayerStoreActions.setShowPurchaseDialog(false)
      loginModalStoreActions.open()
      return false
    }

    if (!state.currentEpisode) return false

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
      const episodeId = (state.currentEpisode as { _id?: string })?._id || ''
      const result = await purchaseEpisode(seriesId, episodeId, state.currentEpisode.episodeNumber)
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

  // Handle video control events for native video element
  handlePlayPause: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const state = basePlayerStoreActions.getState()
    if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      basePlayerStoreActions.setIsPlaying(!state.isPlaying)
    }
  },

  handleTimeUpdate: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    if (videoRef.current) {
      basePlayerStoreActions.setCurrentTime(videoRef.current.currentTime)
    }
  },

  handleLoadedMetadata: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    if (videoRef.current) {
      basePlayerStoreActions.setDuration(videoRef.current.duration)
    }
  },

  handleProgressChange: (videoRef: React.RefObject<HTMLVideoElement | null>, time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      basePlayerStoreActions.setCurrentTime(time)
    }
  },

  handleVolumeToggle: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const state = basePlayerStoreActions.getState()
    if (videoRef.current) {
      const newVolume = state.volume === 0 ? 1 : 0
      videoRef.current.volume = newVolume
      basePlayerStoreActions.setVolume(newVolume)
    }
  },

  handleSpeedChange: (videoRef: React.RefObject<HTMLVideoElement | null>, speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      basePlayerStoreActions.setPlaybackSpeed(speed)
      basePlayerStoreActions.setShowSpeedSelector(false)
    }
  },

  handleFullscreen: (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  },

  // Handle controls visibility
  showControlsTemporarily: (timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    const state = basePlayerStoreActions.getState()
    basePlayerStoreActions.setShowControls(true)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      if (state.isPlaying) {
        basePlayerStoreActions.setShowControls(false)
      }
    }, 3000)
  },

  hideControlsIfPlaying: () => {
    const state = basePlayerStoreActions.getState()
    if (state.isPlaying) {
      basePlayerStoreActions.setShowControls(false)
    }
  },
}

// Re-export usePlayerStore from index.ts
export { usePlayerStore } from './index'

// ======================
// Trial Limit / Player.js Integration
// ======================

// State tracking for Player.js instances
interface PlayerJsState {
  player: PlayerJsPlayer | null
  isPurchasedRef: { current: boolean }
  dialogShownRef: { current: boolean }
  cleanup: () => void
}

// Map to track player instances by videoId
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

  // Create refs to track current state
  const isPurchasedRef = { current: isPurchased }
  const dialogShownRef = { current: false }

  const initPlayer = () => {
    const windowWithPlayerJs = window as WindowWithPlayerJs
    if (!windowWithPlayerJs.playerjs || !iframeRef.current) return

    try {
      const player = new windowWithPlayerJs.playerjs.Player(iframeRef.current)

      // Store the instance
      const state: PlayerJsState = {
        player,
        isPurchasedRef,
        dialogShownRef,
        cleanup: () => {
          playerInstances.delete(videoId)
        },
      }
      playerInstances.set(videoId, state)

      player.on('ready', () => {
        // Listen for time updates
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

  // Return cleanup function
  return () => {
    const state = playerInstances.get(videoId)
    if (state) {
      state.cleanup()
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
  
  const state = playerInstances.get(videoId)
  if (state) {
    const wasUnpurchased = !state.isPurchasedRef.current
    state.isPurchasedRef.current = isPurchased
    
    // If user logged out (isPurchased changed from true to false),
    // enforce time limit immediately by pausing and seeking to start
    if (!isPurchased && !wasUnpurchased && state.player) {
      try {
        state.player.pause()
        state.player.setCurrentTime(0)
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
