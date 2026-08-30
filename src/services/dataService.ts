// Data fetching services - called outside useEffect
// Following Rule #5: Avoid calling APIs in useEffect

import {
  apiGet,
  apiGetWithAuth,
  apiPost,
  apiPostWithAuth,
  apiDeleteWithAuth,
  getApiBaseUrl,
} from '../utils/api'
import { updateOgMeta } from '../utils/ogMeta'
import {
  featuredStoreActions,
  recommendationsStoreActions,
  newReleasesStoreActions,
  playerStoreActions,
  toastStoreActions,
  videoFeedStoreActions,
} from '../stores'
import { accountStoreActions } from '../stores/accountStore'
import type { Series, WatchHistoryItem, FavoriteItem, Genre, User, SystemSettings } from '../types'
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
    // Dedicated, paginated feed of series that contain a playable video
    const data = await apiGet<Series[]>('videoFeed', { page, limit })
    if (data.success && data.data) {
      const videos = data.data

      if (page === 1) {
        videoFeedStoreActions.setVideos(videos)
      } else {
        videoFeedStoreActions.appendVideos(videos)
      }

      // A full page means there are likely more videos to load
      videoFeedStoreActions.setHasMore(videos.length >= limit)
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

      // Update OG meta tags for social sharing
      updateOgMeta(
        seriesResponse.data.name,
        seriesResponse.data.description || '',
        seriesResponse.data.cover || '',
      )

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

// Fresh authenticated user (up-to-date permissions like allowUpload).
export const fetchMe = async (): Promise<User | null> => {
  const result = await apiGetWithAuth<User>('me')
  return result.success && result.data ? result.data : null
}

// Join the Creator Program → grants publish/upload permission; returns the updated user.
export const joinCreatorProgram = async (payload: {
  profile?: unknown
  payoutMethod?: string | null
}): Promise<User | null> => {
  const result = await apiPostWithAuth<User>(
    'joinCreatorProgram',
    payload as Record<string, unknown>,
  )
  return result.success && result.data ? result.data : null
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

// A single series as its OWNER sees it — including episodes still awaiting moderation.
// The public `series` read strips those, which would hide an uploader's own just-published
// episode from them (episode 1 is always pending immediately after publishing).
export const fetchSeriesForEdit = async (seriesId: string) => {
  const result = await apiGetWithAuth<Series>('seriesForEdit', { id: seriesId })
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

// ── Likes ──

interface LikesData {
  count: number
  isLiked: boolean
}

export const fetchLikes = async (seriesId: string): Promise<LikesData> => {
  const result = await apiGetWithAuth<LikesData>('likes', { seriesId })
  if (result.success && result.data) {
    return result.data
  }
  return { count: 0, isLiked: false }
}

export const likeSeries = async (seriesId: string): Promise<LikesData> => {
  const result = await apiPostWithAuth<LikesData>('likeSeries', { seriesId })
  if (result.success && result.data) {
    return result.data
  }
  return { count: 0, isLiked: true }
}

export const unlikeSeries = async (seriesId: string): Promise<LikesData> => {
  const result = await apiPostWithAuth<LikesData>('unlikeSeries', { seriesId })
  if (result.success && result.data) {
    return result.data
  }
  return { count: 0, isLiked: false }
}

// ── Star Ratings ──

interface RatingsData {
  average: number
  count: number
  userRating: number
}

export const fetchRatings = async (seriesId: string): Promise<RatingsData> => {
  const result = await apiGetWithAuth<RatingsData>('ratings', { seriesId })
  if (result.success && result.data) {
    return result.data
  }
  return { average: 0, count: 0, userRating: 0 }
}

export const rateSeries = async (seriesId: string, rating: number): Promise<RatingsData> => {
  const result = await apiPostWithAuth<RatingsData>('rateSeries', { seriesId, rating })
  if (result.success && result.data) {
    return result.data
  }
  return { average: 0, count: 0, userRating: rating }
}

// ── Shares ──

interface SharesData {
  count: number
}

export const fetchShares = async (seriesId: string): Promise<SharesData> => {
  const result = await apiGet<SharesData>('shares', { seriesId })
  if (result.success && result.data) {
    return result.data
  }
  return { count: 0 }
}

export const shareSeries = async (seriesId: string): Promise<SharesData> => {
  const result = await apiPost<SharesData>('shareSeries', { seriesId })
  if (result.success && result.data) {
    return result.data
  }
  return { count: 0 }
}

// ── Views ──

interface ViewsData {
  count: number
}

export const fetchViews = async (seriesId: string): Promise<ViewsData> => {
  const result = await apiGet<ViewsData>('views', { seriesId })
  if (result.success && result.data) {
    return result.data
  }
  return { count: 0 }
}

export const recordView = async (seriesId: string): Promise<ViewsData> => {
  const result = await apiPost<ViewsData>('recordView', { seriesId })
  if (result.success && result.data) {
    return result.data
  }
  return { count: 0 }
}

// ── Quick Create templates ──

export interface StarterTemplate {
  _id: string
  name: string
  cover: string
  prompt: string
  hook: string
  tags: string[]
  targetAudience: string
  order?: number
}

export const fetchTemplates = async (): Promise<StarterTemplate[]> => {
  const result = await apiGet<StarterTemplate[]>('templates')
  if (result.success && result.data) {
    return result.data
  }
  return []
}

// Extract a story prompt from an uploaded PDF/DOCX file (read by OpenAI on the server)
export const extractStory = async (file: string, filename: string): Promise<string> => {
  const result = await apiPost<{ text: string }>('extractStory', { file, filename })
  if (result.success && result.data) {
    return result.data.text
  }
  throw new Error(result.error || 'Failed to read the file')
}

// Expand a short idea into a full template-format story prompt + title (via OpenAI)
export const generateStoryPrompt = async (
  idea: string,
): Promise<{ title: string; text: string }> => {
  const result = await apiPost<{ title: string; text: string }>('generateStoryPrompt', { idea })
  if (result.success && result.data) {
    return { title: result.data.title || '', text: result.data.text }
  }
  throw new Error(result.error || 'Failed to generate a story')
}

// ── AI Production Pipeline (Quick Create) ──

export interface PipelinePrompt {
  _id: string
  key: string
  title: string
  order: number
  markdown: string
}

// Admin: load all 6 pipeline prompt documents
export const fetchPipelinePrompts = async (): Promise<PipelinePrompt[]> => {
  const result = await apiGetWithAuth<PipelinePrompt[]>('pipelinePrompts')
  if (result.success && result.data) return result.data
  throw new Error(result.error || 'Failed to load pipeline prompts')
}

// Admin: save one pipeline prompt's markdown; returns the updated list
export const savePipelinePrompt = async (
  key: string,
  markdown: string,
): Promise<PipelinePrompt[]> => {
  const result = await apiPostWithAuth<PipelinePrompt[]>('savePipelinePrompt', { key, markdown })
  if (result.success && result.data) return result.data
  throw new Error(result.error || 'Failed to save pipeline prompt')
}

// A production job's episode (as stored/returned by the pipeline-background function)
export interface ProductionEpisode {
  n: number
  title: string
  desc: string
  cover: string
}

// The production job document polled while (and after) generation runs
export interface ProductionJob {
  jobId?: string
  mode?: 'plan' | 'episode' | 'v1proposal' | 'v1produce'
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
  seriesId?: string // set once the production's Episode 1 has been published as a series
  seriesName?: string // the published series' name
  seriesCover?: string // the published series' cover
  title?: string
  cover?: string
  percent?: number
  progress?: {
    calls: { key: string; status: string }[]
    coverStatus: string
  }
  videoProgress?: { done: number; total: number; percent?: number }
  render?: { phase?: 'rendering' | 'composing' | 'done' | 'error'; total?: number } // async render state
  transcribeProgress?: { percent: number; task: string } // s1 subtitle step (0-100)
  transcribeError?: string
  calls?: Record<string, Record<string, unknown>>
  episodes?: ProductionEpisode[]
  videos?: {
    shot_id: string
    shot_number?: number | null
    url?: string
    audioUrl?: string
    narration?: string
    error?: string
    lastFrameUrl?: string
    coverUrl?: string
  }[]
  episodeVideo?: string
  randomFrames?: { id: string; urls: string[] }
  coverGen?: { id: string; url: string; error?: boolean }
  idea?: string
  ideaTitle?: string
  genre?: string | null
  artStyle?: string | null
  episodeLength?: number | null
  episodeBunnyVideoId?: string // s1 storage: the episode's Bunny video guid
  episode?: number // which episode this production represents (1-based)
  episodeGroup?: string // series-group key shared by all episodes of one series
  parentJobId?: string // the root (episode-1) production's jobId
  keyMoments?: string[] // key beats of the generated episode (from its shot list)
  // Quick Create V1 fields
  v?: number
  proposal?: V1Proposal | null
  editResult?: { id: string; status: string; error?: string }
  callsV1?: {
    episodeDirector?: { episodePlan?: { shots?: Array<Record<string, unknown>> } }
    [k: string]: unknown
  }
}

// Start the 6-call pipeline in the background function. Returns once the job is
// accepted (HTTP 202); progress is then read via fetchProductionStatus(jobId).
export const startProductionJob = async (
  jobId: string,
  input: Record<string, unknown>,
): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  const res = await fetch(`${base}/.netlify/functions/pipeline-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jobId, ...input }),
  })
  // Background functions respond 202 Accepted; anything outside 2xx is a real failure.
  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to start generation (${res.status})`)
  }
}

// (Re)start the video-generation background job for an existing production. Used to
// retry video generation when the video step failed (e.g. reopened from My Series).
export const startVideoJob = async (jobId: string): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  const res = await fetch(`${base}/.netlify/functions/pipeline-video-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jobId }),
  })
  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to start video generation (${res.status})`)
  }
}

// (Re)start the audio/composition background job for an existing production. Used to
// continue audio+composition when reopening a production before those steps finished.
export const startAudioJob = async (jobId: string): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  const res = await fetch(`${base}/.netlify/functions/pipeline-audio-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jobId }),
  })
  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to start audio generation (${res.status})`)
  }
}

// Backfill missing shot cover thumbnails for an existing production (older jobs that
// rendered before covers were saved). Fire-and-forget background job.
export const startCoverBackfill = async (jobId: string): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  const res = await fetch(`${base}/.netlify/functions/pipeline-covers-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jobId }),
  })
  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to start cover backfill (${res.status})`)
  }
}

// Upload a cover image (data URL) to Cloudinary; returns the hosted URL
export const uploadCoverImage = async (dataUrl: string): Promise<string> => {
  const result = await apiPostWithAuth<{ url: string }>('uploadImage', {
    image: dataUrl,
    folder: 'GCash/quick create/covers',
  })
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to upload image')
  }
  return result.data.url
}

// AI Generate: start series-cover generation in the background (image generation is too
// slow for a sync request). Result lands on the job as coverGen = { id: reqId, url }.
export const startCoverGen = async (
  jobId: string,
  reqId: string,
  payload: { name: string; description: string; genres: string[]; artStyle: string },
): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  const res = await fetch(`${base}/.netlify/functions/pipeline-cover-gen-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jobId, reqId, ...payload }),
  })
  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to start cover generation (${res.status})`)
  }
}

// AI Suggest: generate a series or episode description from the current context
export const suggestDescription = async (payload: {
  type: 'series' | 'episode'
  seriesName: string
  episodeTitle?: string
  currentDesc: string
  genres: string[]
}): Promise<string> => {
  const result = await apiPost<{ description: string }>('suggestDescription', payload)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate description')
  }
  return result.data.description
}

// Publish a Quick Create production's Episode 1 as a series (creates the series +
// uploads the video to Bunny on first publish; updates the series on later publishes).
export interface PublishEpisodeResult {
  seriesId: string
  created: boolean
}
export const publishQuickCreateEpisode = async (payload: {
  jobId: string
  episode?: number
  name: string
  description: string
  cover: string
  tags: string[]
  episodeTitle: string
  episodeDescription: string
  thumbnail: string
}): Promise<PublishEpisodeResult> => {
  const result = await apiPostWithAuth<PublishEpisodeResult>('publishQuickCreateEpisode', payload)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to publish episode')
  }
  return result.data
}

// Extract random frames from the episode video for the "Random Frame" thumbnail picker.
// Fire-and-forget; the result lands on the job as randomFrames = { id: reqId, urls }.
export const startRandomFrames = async (jobId: string, reqId: string): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  const res = await fetch(`${base}/.netlify/functions/pipeline-random-frames-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jobId, reqId }),
  })
  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to start random-frame extraction (${res.status})`)
  }
}

// Poll a production job's status/result
export const fetchProductionStatus = async (jobId: string): Promise<ProductionJob> => {
  const result = await apiGetWithAuth<ProductionJob>('productionStatus', { jobId })
  if (result.success && result.data) return result.data
  throw new Error(result.error || 'Failed to check generation status')
}

// Drive one step of the async (poll-first) video render. Fired alongside the progress poll
// while the job is in the 'rendering' phase; a no-op server-side otherwise. Best-effort.
export const advanceProduction = async (
  jobId: string,
): Promise<{ phase?: string; done?: number; total?: number } | null> => {
  const result = await apiPostWithAuth<{ phase?: string; done?: number; total?: number }>(
    'advanceProduction',
    { jobId },
  )
  return result.success ? result.data || null : null
}

// Charge for + unlock generation of episode N from a production. Idempotent (free retry
// once unlocked). Returns the episode-N production jobId to generate.
export interface StartNextEpisodeResult {
  jobId: string
  charged: boolean
  balance?: number
  alreadyUnlocked?: boolean
}
export const startNextEpisode = async (
  jobId: string,
  episode: number,
): Promise<{ success: boolean; data?: StartNextEpisodeResult; error?: string }> => {
  return apiPostWithAuth<StartNextEpisodeResult>('startNextEpisode', { jobId, episode })
}

// Delete a Quick Create production (the job doc). Does not delete a published series.
export const deleteProduction = async (jobId: string): Promise<void> => {
  const result = await apiDeleteWithAuth<{ deleted: boolean }>('production', { jobId })
  if (!result.success) throw new Error(result.error || 'Failed to delete production')
}

// List the logged-in user's Quick Create productions (for the My Series group)
export const fetchMyProductions = async (): Promise<ProductionJob[]> => {
  const result = await apiGetWithAuth<ProductionJob[]>('myProductions')
  if (result.success && result.data) return result.data
  return []
}

// ══════════════════════════════════════════════════════════════════════════
// Quick Create V1
// ══════════════════════════════════════════════════════════════════════════

export interface V1Character {
  name: string
  role: string
  personality?: string
  background?: string
  importance?: string
}
export interface V1RoadmapEpisode {
  episode: number
  title: string
  summary: string
  keyMoments?: string[]
  goal?: string
  endingCliffhanger?: string
}
export interface V1Proposal {
  proposal?: { version?: number; status?: string }
  project?: { title?: string; language?: string }
  creatorVision?: { originalIdea?: string }
  creativeDirection?: {
    storySoul?: string
    logline?: string
    genre?: string
    genres?: string[]
    theme?: string
    tone?: string
    targetAudience?: string
    visualDirection?: string
    storytellingDirection?: string
  }
  productionPlan?: {
    episodeLengthSeconds?: number
    episodeCount?: number
    estimatedShotsPerEpisode?: number
    productionDifficulty?: string
  }
  world?: { summary?: string; setting?: string; rules?: string }
  mainCharacters?: V1Character[]
  seasonOverview?: { overallArc?: string; creatorPromise?: string; finale?: string }
  seasonRoadmap?: V1RoadmapEpisode[]
  episode1Plan?: {
    title?: string
    summary?: string
    openingHook?: string
    mainConflict?: string
    endingHook?: string
    requiredCharacters?: string[]
  }
  creatorNotes?: string[]
}

// Active video-storage flow: 's0' (Cloudinary, default) | 's1' (Bunny-only). Shared with
// the server via the same VITE_VIDEO_STORAGE env var.
export const videoStorage = (): 's0' | 's1' =>
  import.meta.env.VITE_VIDEO_STORAGE === 's1' ? 's1' : 's0'

// PUBLIC shared-episode info for the /watch/:jobId share page (no auth).
export interface SharedEpisode {
  title: string
  cover: string
  videoId: string
  embedUrl: string
  mp4Url: string
  seriesId: string
}
export const fetchSharedEpisode = async (jobId: string): Promise<SharedEpisode | null> => {
  const result = await apiGet<SharedEpisode>('sharedEpisode', { jobId })
  if (result.success && result.data) return result.data
  return null
}

// Start a Quick Create V1 background job. mode: 'proposal' | 'edit' | 'produce'.
// Responds 202; progress/results are read via fetchProductionStatus(jobId).
export const startV1Job = async (
  jobId: string,
  body: Record<string, unknown>,
): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  const res = await fetch(`${base}/.netlify/functions/pipeline-v1-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jobId, ...body }),
  })
  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to start generation (${res.status})`)
  }
}

// Backfill subtitles for a finished s1 episode that has none yet. Responds 202; progress
// is read via fetchProductionStatus(jobId) like any other production job. Best-effort —
// callers can ignore failures.
export const startTranscribeBackfill = async (jobId: string): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  await fetch(`${base}/.netlify/functions/pipeline-transcribe-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jobId }),
  }).catch(() => {})
}

// ── Feedback ──

export const submitFeedback = async (
  feedback: string,
): Promise<{ success: boolean; error?: string }> => {
  const result = await apiPost<unknown>('submitFeedback', { feedback })
  return { success: result.success, error: result.error }
}

// ── System Settings ──

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  freeEpisodes: 5,
  creatorShare: 50,
  episodeCost: 10,
  nextEpisodeCost: 99,
}

export const fetchSystemSettings = async (): Promise<SystemSettings> => {
  const result = await apiGet<SystemSettings>('settings')
  if (result.success && result.data) {
    return result.data
  }
  return { ...DEFAULT_SYSTEM_SETTINGS }
}

// Admin only - persists the global system settings and returns the saved values
export const saveSystemSettings = async (
  settings: SystemSettings,
): Promise<SystemSettings> => {
  const result = await apiPostWithAuth<SystemSettings>('saveSettings', { ...settings })
  if (result.success && result.data) {
    return result.data
  }
  throw new Error(result.error || 'Failed to save settings')
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

// Kick off content moderation for a freshly-uploaded video (transcribe + text/frame
// checks). Responds 202; poll fetchModerationStatus until it's approved or rejected.
export const startUploadModeration = async (videoId: string): Promise<void> => {
  const base = getApiBaseUrl()
  const token = localStorage.getItem('gcashmall_token')
  await fetch(`${base}/.netlify/functions/moderate-upload-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ videoId }),
  })
}

export interface ModerationStatus {
  status: 'pending' | 'processing' | 'approved' | 'rejected'
  stage?: string
  progress?: number
  reason?: string
  categories?: string[]
}
export const fetchModerationStatus = async (videoId: string): Promise<ModerationStatus> => {
  const result = await apiGetWithAuth<ModerationStatus>('moderationStatus', { videoId })
  if (result.success && result.data) return result.data
  return { status: 'processing', progress: 0 }
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
