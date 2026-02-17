import { playerPageStoreActions } from '../stores/playerStore'
import { loginModalStoreActions } from '../stores'
import { addToFavorites, removeFromFavorites, purchaseEpisode, isEpisodePurchased } from './dataService'
import { isLoggedIn } from '../utils/api'
import type { Episode, FavoriteUserItem, PurchaseItem } from '../types'

// Constants
export const HIDE_FAVORITE_MODAL_KEY = 'hideFavoriteModal'
export const EPISODE_PRICE = 0.1
export const TIME_LIMIT = 3

// Validation functions
const validateSeriesId = (seriesId: string | undefined): seriesId is string => {
  if (!seriesId) {
    console.error('Series ID is required')
    return false
  }
  return true
}

const validateEpisode = (episode: Episode | null): episode is Episode => {
  if (!episode) {
    console.error('Episode is required')
    return false
  }
  return true
}

const validateLoggedIn = (): boolean => {
  if (!isLoggedIn()) {
    loginModalStoreActions.open()
    return false
  }
  return true
}

// Check if series is favorited
export const checkSeriesFavorited = (
  seriesId: string | undefined,
  favorites: FavoriteUserItem[] | undefined,
): boolean => {
  if (!seriesId || !favorites || favorites.length === 0) return false
  return favorites.some((item) => String(item.seriesId) === String(seriesId))
}

// Check if user is the series owner
export const checkIsSeriesOwner = (
  uploaderId: string | undefined,
  userId: string | null | undefined,
): boolean => {
  if (!uploaderId || !userId) return false
  return String(uploaderId) === String(userId)
}

// Check if episode is purchased (or user is owner)
export const checkEpisodePurchased = (
  seriesId: string | undefined,
  episodeId: string,
  episodeNumber: number,
  purchases: PurchaseItem[] | undefined,
  isOwner: boolean,
): boolean => {
  if (!seriesId) return false
  if (isOwner) return true
  return isEpisodePurchased(seriesId, episodeId, purchases, episodeNumber)
}

// Check if favorite modal should be shown
export const shouldShowFavoriteModal = (): boolean => {
  return localStorage.getItem(HIDE_FAVORITE_MODAL_KEY) !== 'true'
}

// Save favorite modal preference
export const saveFavoriteModalPreference = (dontShowAgain: boolean) => {
  if (dontShowAgain) {
    localStorage.setItem(HIDE_FAVORITE_MODAL_KEY, 'true')
  }
}

// Handle favorite toggle click
export const handleFavoriteToggle = async (
  seriesId: string | undefined,
  isFavorited: boolean,
) => {
  if (!validateLoggedIn()) return
  if (!validateSeriesId(seriesId)) return

  const willAdd = !isFavorited

  if (!shouldShowFavoriteModal()) {
    await performFavoriteAction(seriesId, willAdd)
    return
  }

  playerPageStoreActions.showFavoriteModal(willAdd ? 'add' : 'remove')
}

// Perform favorite action (add/remove)
export const performFavoriteAction = async (
  seriesId: string,
  isAdd: boolean,
): Promise<boolean> => {
  try {
    if (isAdd) {
      await addToFavorites(seriesId)
    } else {
      await removeFromFavorites(seriesId)
    }
    return true
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
    return false
  }
}

// Handle favorite confirmation from modal
export const handleFavoriteConfirm = async (
  seriesId: string | undefined,
  isFavorited: boolean,
  dontShowAgain: boolean,
) => {
  if (!validateSeriesId(seriesId)) return

  saveFavoriteModalPreference(dontShowAgain)
  await performFavoriteAction(seriesId, !isFavorited)
  playerPageStoreActions.hideFavoriteModal()
}

// Handle unlock button click
export const handleUnlockClick = () => {
  if (!validateLoggedIn()) return
  playerPageStoreActions.showPurchasePopup()
}

// Handle time limit reached
export const handleTimeLimitReached = () => {
  if (!validateLoggedIn()) return
  playerPageStoreActions.showPurchasePopup()
}

// Handle purchase confirmation
export const handlePurchaseConfirm = async (
  seriesId: string | undefined,
  episode: Episode | null,
  userBalance: number,
  t: { player: { insufficientBalance: string; purchaseSuccess: string; purchaseFailed: string } },
): Promise<void> => {
  if (!validateSeriesId(seriesId)) return
  if (!validateEpisode(episode)) return

  if (userBalance < EPISODE_PRICE) {
    playerPageStoreActions.hidePurchasePopup()
    playerPageStoreActions.showResultModalError(t.player.insufficientBalance)
    return
  }

  playerPageStoreActions.setIsPurchasing(true)

  try {
    const result = await purchaseEpisode(
      seriesId,
      episode._id,
      episode.episodeNumber,
      EPISODE_PRICE,
    )

    playerPageStoreActions.hidePurchasePopup()

    if (result.success) {
      playerPageStoreActions.showResultModalSuccess(t.player.purchaseSuccess)
    } else {
      playerPageStoreActions.showResultModalError(result.error || t.player.purchaseFailed)
    }
  } catch (error) {
    console.error('Failed to purchase episode:', error)
    playerPageStoreActions.hidePurchasePopup()
    playerPageStoreActions.showResultModalError(t.player.purchaseFailed)
  } finally {
    playerPageStoreActions.setIsPurchasing(false)
  }
}

// Handle result modal close with navigation
export const handleResultModalClose = (
  resultModalType: 'success' | 'error',
  resultModalMessage: string,
  navigate: (path: string) => void,
) => {
  playerPageStoreActions.hideResultModal()
  if (resultModalType === 'error' && resultModalMessage.includes('balance')) {
    navigate('/account?tab=wallet')
  }
}
