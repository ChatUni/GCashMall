// Data fetching services - called outside useEffect
// Following Rule #5: Avoid calling APIs in useEffect

import { apiGet, apiPost, apiPostWithAuth } from '../utils/api'
import {
  featuredStoreActions,
  recommendationsStoreActions,
  newReleasesStoreActions,
  playerStoreActions,
  toastStoreActions,
  videoFeedStoreActions,
} from '../stores'
import { accountStoreActions } from '../stores/accountStore'
import type { Series, WatchHistoryItem, FavoriteItem, Genre, User } from '../types'
import { getStoredUser, isLoggedIn, clearAuthData, saveAuthData } from '../utils/api'

// Featured series
export const fetchFeaturedSeries = async () => {
  featuredStoreActions.setLoading(true)
  const data = await apiGet<Series>('featured')
  if (data.success && data.data) {
    featuredStoreActions.setSeries(data.data)
  }
  featuredStoreActions.setLoading(false)
}

// Recommendations
export const fetchRecommendations = async () => {
  recommendationsStoreActions.setLoading(true)
  const data = await apiGet<Series[]>('recommendations')
  if (data.success && data.data) {
    recommendationsStoreActions.setSeries(data.data)
  }
  recommendationsStoreActions.setLoading(false)
}

// New releases
export const fetchNewReleases = async () => {
  newReleasesStoreActions.setLoading(true)
  const data = await apiGet<Series[]>('newReleases')
  if (data.success && data.data) {
    newReleasesStoreActions.setSeries(data.data)
  }
  newReleasesStoreActions.setLoading(false)
}

// Video feed for TikTok-style home page
export const fetchVideoFeed = async (page: number = 1, limit: number = 5) => {
  videoFeedStoreActions.setLoading(true)
  try {
    // Use recommendations API for video feed (can be replaced with dedicated endpoint)
    const data = await apiGet<Series[]>('recommendations', { page, limit })
    if (data.success && data.data) {
      // Filter series that have videoId for preview
      const videosWithPreview = data.data.filter(series => series.videoId || (series.episodes && series.episodes.length > 0))
      
      if (page === 1) {
        videoFeedStoreActions.setVideos(videosWithPreview)
      } else {
        videoFeedStoreActions.appendVideos(videosWithPreview)
      }
      
      // Check if there are more videos to load
      videoFeedStoreActions.setHasMore(videosWithPreview.length >= limit)
      videoFeedStoreActions.setPage(page)
    } else {
      videoFeedStoreActions.setHasMore(false)
    }
  } catch (error) {
    console.error('Error fetching video feed:', error)
    videoFeedStoreActions.setHasMore(false)
  } finally {
    videoFeedStoreActions.setLoading(false)
  }
}

// Load more videos for infinite scroll
export const loadMoreVideos = async () => {
  const state = videoFeedStoreActions.getState()
  if (!state.loading && state.hasMore) {
    await fetchVideoFeed(state.page + 1)
  }
}

// Player data
export const fetchPlayerData = async (seriesId: string) => {
  playerStoreActions.setLoading(true)
  try {
    // Get series - episodes are embedded in the series.episodes field
    const seriesResponse = await apiGet<Series>('series', { id: seriesId })

    if (seriesResponse.success && seriesResponse.data) {
      playerStoreActions.setSeries(seriesResponse.data)
      
      // Use episodes from series.episodes field
      const episodes = seriesResponse.data.episodes || []
      
      if (episodes.length > 0) {
        // Sort episodes by episodeNumber
        const sortedEpisodes = [...episodes].sort(
          (a, b) => a.episodeNumber - b.episodeNumber,
        )
        playerStoreActions.setEpisodes(sortedEpisodes)
        playerStoreActions.setCurrentEpisode(sortedEpisodes[0])
      }
    }
  } catch (error) {
    console.error('Error fetching series data:', error)
  } finally {
    playerStoreActions.setLoading(false)
  }
}

// User data
export const fetchUserData = async () => {
  const [historyResponse, favoritesResponse] = await Promise.all([
    apiGet<WatchHistoryItem[]>('watchHistory'),
    apiGet<FavoriteItem[]>('favorites'),
  ])

  return {
    watchHistory: historyResponse.success && historyResponse.data ? historyResponse.data : [],
    favorites: favoritesResponse.success && favoritesResponse.data ? favoritesResponse.data : [],
  }
}

// Check login status
export const checkLoginStatus = async (): Promise<boolean> => {
  if (isLoggedIn()) {
    const storedUser = getStoredUser()
    if (storedUser) {
      accountStoreActions.setUser(storedUser)
      accountStoreActions.setLoading(false)
      return true
    }
  }

  try {
    const response = await apiGet<User>('user')
    if (response.success && response.data) {
      accountStoreActions.setUser(response.data)
      accountStoreActions.setLoading(false)
      return true
    }
  } catch {
    // User not logged in
  }

  accountStoreActions.setLoading(false)
  return false
}

// Logout
export const logout = () => {
  clearAuthData()
  accountStoreActions.reset()
}

// Series list
export const fetchSeriesList = async (params?: { genre?: string; search?: string }) => {
  const data = await apiGet<Series[]>('seriesList', params)
  return data.success && data.data ? data.data : []
}

// Single series
export const fetchSeries = async (seriesId: string) => {
  const result = await apiGet<Series>('series', { id: seriesId })
  return result.success && result.data ? result.data : null
}

// Genres
export const fetchGenres = async () => {
  const result = await apiGet<Genre[]>('genres')
  return result.success && result.data ? result.data : []
}

// Add to watch list (used by Player page)
export const addToWatchList = async (seriesId: string, episodeNumber: number) => {
  const result = await apiPostWithAuth<User>('addToWatchList', {
    seriesId,
    episodeNumber,
  })
  if (result.success && result.data) {
    // Save to local storage
    const token = localStorage.getItem('gcashmall_token')
    if (token) {
      saveAuthData(token, result.data)
    }
    // Update user store (delegates to accountStore - single source of truth)
    accountStoreActions.setUser(result.data)
  }
  return result
}

// Favorites operations
export const addToFavorites = async (seriesId: string) => {
  const result = await apiPostWithAuth<User>('addToFavorites', { seriesId })
  if (result.success && result.data) {
    const token = localStorage.getItem('gcashmall_token')
    if (token) {
      saveAuthData(token, result.data)
    }
    accountStoreActions.setUser(result.data)
  }
  return result
}

export const removeFromFavorites = async (seriesId: string) => {
  const result = await apiPostWithAuth<User>('removeFromFavorites', { seriesId })
  if (result.success && result.data) {
    const token = localStorage.getItem('gcashmall_token')
    if (token) {
      saveAuthData(token, result.data)
    }
    accountStoreActions.setUser(result.data)
  }
  return result
}

// Purchase episode
interface PurchaseEpisodeResponse {
  message: string
  balance: number
  purchasedEpisode: {
    seriesId: string
    episodeNumber: number
  }
}

export const purchaseEpisodeSimple = async (seriesId: string, episodeNumber: number) => {
  const result = await apiPostWithAuth<PurchaseEpisodeResponse>('purchaseEpisode', {
    seriesId,
    episodeNumber,
  })
  if (result.success && result.data) {
    // Update user balance and purchaseHistory in local storage and stores
    const token = localStorage.getItem('gcashmall_token')
    const storedUser = getStoredUser()
    if (token && storedUser) {
      const updatedUser = {
        ...storedUser,
        balance: result.data.balance,
        purchaseHistory: [
          ...(storedUser.purchaseHistory || []),
          {
            seriesId,
            episodeNumber,
            purchasedAt: new Date().toISOString(),
          },
        ],
      }
      saveAuthData(token, updatedUser)
      accountStoreActions.setUser(updatedUser)
      // Also update the separate balance field in accountStore (used by WalletSection)
      accountStoreActions.setBalance(result.data.balance)
    }
  }
  return result
}

// Top up
export const topUp = async (amount: number) => {
  await apiPost('topUp', { amount })
  return amount
}

// Profile operations
interface ProfileUpdateData {
  nickname: string
  email: string
  phone: string
  sex: string | null
  dob: string | null
}

export const updateProfile = async (data: ProfileUpdateData) => {
  const response = await apiPostWithAuth<User>('updateProfile', {
    nickname: data.nickname,
    email: data.email,
    phone: data.phone,
    sex: data.sex,
    dob: data.dob,
  })
  if (response.success && response.data) {
    const token = localStorage.getItem('gcashmall_token')
    if (token) {
      saveAuthData(token, response.data)
    }
    accountStoreActions.setUser(response.data)
    return { success: true, data: response.data }
  }
  return { success: false, error: response.error }
}

// Password change
export const updatePassword = async (oldPassword: string, newPassword: string) => {
  const response = await apiPostWithAuth<User>('updatePassword', {
    oldPassword,
    newPassword,
  })
  return response
}

// Avatar operations
export const uploadAvatar = async (base64Image: string) => {
  const uploadResponse = await apiPost<{ url: string; public_id: string }>(
    'uploadImage',
    { image: base64Image, folder: 'avatars' },
  )

  if (!uploadResponse.success || !uploadResponse.data) {
    return { success: false, error: uploadResponse.error || 'Failed to upload image' }
  }

  const updateResponse = await apiPostWithAuth<User>('updateProfilePicture', {
    photoUrl: uploadResponse.data.url,
  })

  if (updateResponse.success && updateResponse.data) {
    const token = localStorage.getItem('gcashmall_token')
    if (token) {
      saveAuthData(token, updateResponse.data)
    }
    accountStoreActions.setUser(updateResponse.data)
    return { success: true, data: updateResponse.data }
  }

  return { success: false, error: updateResponse.error || 'Failed to update avatar' }
}

export const removeAvatar = async () => {
  await apiPost('removeAvatar', {})
  const state = accountStoreActions.getState()
  if (state.user) {
    accountStoreActions.setUser({ ...state.user, avatar: null })
  }
}

// Image upload
export const uploadImage = async (base64Image: string, folder: string = 'GCash') => {
  const result = await apiPost<{ url: string }>('uploadImage', {
    image: base64Image,
    folder,
  })
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to upload image')
  }
  return result.data.url
}

// Delete image
export const deleteImage = async (url: string) => {
  try {
    await apiPost('deleteImage', { url })
  } catch (err) {
    console.error('Failed to delete image:', err)
  }
}

// Video upload
export const createVideoUpload = async (title: string) => {
  const result = await apiPost<{
    videoId: string
    uploadUrl: string
    accessKey: string
  }>('uploadVideo', { title })

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create video')
  }

  return result.data
}

export const uploadVideoDirectly = async (
  file: File,
  uploadUrl: string,
  accessKey: string,
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/octet-stream',
      AccessKey: accessKey,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload video: ${response.statusText}`)
  }
}

export const deleteVideo = async (videoId: string) => {
  try {
    await apiPost('deleteVideo', { videoId })
  } catch (err) {
    console.error('Failed to delete video:', err)
  }
}

// Save series
export const saveSeries = async (seriesData: Record<string, unknown>) => {
  const result = await apiPost('saveSeries', seriesData)
  if (!result.success) {
    throw new Error(result.error || 'Failed to save series')
  }
  return result
}

// Purchase episode
export const purchaseEpisode = async (
  seriesId: string,
  episodeId: string,
  episodeNumber: number,
  price: number = 0.1,
) => {
  const result = await apiPostWithAuth<User>('addPurchase', {
    seriesId,
    episodeId,
    episodeNumber,
    price,
  })
  if (result.success && result.data) {
    const token = localStorage.getItem('gcashmall_token')
    if (token) {
      saveAuthData(token, result.data)
    }
    accountStoreActions.setUser(result.data)
    // Also update myPurchases in accountStore if purchases exist in user data
    if (result.data.purchases) {
      accountStoreActions.setMyPurchases(result.data.purchases)
    }
    // Update balance in accountStore
    if (result.data.balance !== undefined) {
      accountStoreActions.setBalance(result.data.balance)
    }
  }
  return result
}

// Check if episode is purchased
export const isEpisodePurchased = (
  seriesId: string,
  episodeId: string,
  purchases?: { seriesId: string; episodeId: string; episodeNumber?: number }[],
  episodeNumber?: number,
): boolean => {
  if (!purchases || purchases.length === 0) return false
  return purchases.some(
    (p) => {
      const seriesMatch = String(p.seriesId) === String(seriesId)
      if (!seriesMatch) return false
      // Check by episodeId first, then by episodeNumber as fallback
      const episodeIdMatch = String(p.episodeId) === String(episodeId)
      const episodeNumberMatch = episodeNumber !== undefined && p.episodeNumber === episodeNumber
      return episodeIdMatch || episodeNumberMatch
    },
  )
}

// Show toast helper
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  toastStoreActions.show(message, type)
}
