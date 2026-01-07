// SeriesEdit service - business logic extracted from SeriesEdit page
// Following Rule #7: React components should be pure - separate business logic from components

import { apiGet, apiPostWithAuth } from '../utils/api'
import { seriesEditStoreActions, type EpisodeFormData, createNewEpisode } from '../stores/seriesEditStore'
import type { Series, Genre, Episode } from '../types'

// Initialize series edit form
export const initializeSeriesEdit = async (id: string | undefined, isEditMode: boolean) => {
  await fetchGenres()
  if (isEditMode && id) {
    await fetchSeries(id)
  } else {
    addInitialEpisode()
  }
}

// Fetch genres
export const fetchGenres = async () => {
  try {
    const result = await apiGet<Genre[]>('genres')
    if (result.success && result.data) {
      seriesEditStoreActions.setGenres(result.data)
    }
  } catch (err) {
    console.error('Failed to fetch genres:', err)
  }
}

// Fetch series for editing
export const fetchSeries = async (seriesId: string) => {
  seriesEditStoreActions.setLoading(true)
  try {
    const result = await apiGet<Series>('series', { id: seriesId })
    if (result.success && result.data) {
      const series = result.data
      const episodes = mapEpisodesToFormData(series.episodes || [])
      
      seriesEditStoreActions.setFormData({
        name: series.name,
        description: series.description,
        genreIds: series.genre ? series.genre.map((g: Genre) => g._id) : [],
        cover: series.cover,
        episodes: episodes,
      })
      seriesEditStoreActions.setOriginalCover(series.cover)
      seriesEditStoreActions.setOriginalEpisodes(episodes.map((ep) => ({ ...ep })))

      if (episodes.length === 0) {
        addInitialEpisode()
      }
    }
  } catch {
    seriesEditStoreActions.setError('Failed to load series')
  } finally {
    seriesEditStoreActions.setLoading(false)
  }
}

// Map episodes from API to form data
const mapEpisodesToFormData = (episodes: Episode[]): EpisodeFormData[] => {
  return episodes.map((ep) => ({
    id: ep._id,
    episodeNumber: ep.episodeNumber,
    title: ep.title,
    videoId: ep.videoId || '',
    videoPreview: undefined,
    videoFile: null,
    isNew: false,
    isDeleted: false,
  }))
}

// Add initial episode
const addInitialEpisode = () => {
  seriesEditStoreActions.addEpisode(createNewEpisode(1))
}

// Save series
export const saveSeries = async (
  id: string | undefined,
  t: Record<string, string>,
  onSuccess: () => void,
) => {
  const confirmed = window.confirm(t.confirmSave)
  if (!confirmed) return

  seriesEditStoreActions.setSaving(true)
  seriesEditStoreActions.setError(null)
  seriesEditStoreActions.setSuccess(null)

  try {
    const state = seriesEditStoreActions.getState()
    let coverUrl = state.formData.cover

    if (state.imageFile) {
      coverUrl = await handleCoverUpload(state.imageFile, state.originalCover, state.formData.cover)
    }

    const episodesData = await handleEpisodeListChanges(t)

    const seriesData = {
      _id: id || undefined,
      name: state.formData.name,
      description: state.formData.description,
      cover: coverUrl,
      genre: state.formData.genreIds,
      episodes: episodesData.map((ep) => ({
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        videoId: ep.videoId,
      })),
    }

    const result = await apiPostWithAuth('saveSeries', seriesData)
    if (!result.success) {
      throw new Error(result.error || 'Failed to save series')
    }
    seriesEditStoreActions.setSuccess(t.saveSuccess)
    setTimeout(onSuccess, 1500)
  } catch (err) {
    seriesEditStoreActions.setError(err instanceof Error ? err.message : t.saveError)
  } finally {
    seriesEditStoreActions.setSaving(false)
    seriesEditStoreActions.setUploadProgress({ show: false, message: '', current: 0, total: 0 })
  }
}

// Handle cover image upload
const handleCoverUpload = async (
  imageFile: File,
  originalCover: string,
  currentCover: string,
): Promise<string> => {
  if (originalCover && originalCover !== currentCover) {
    await deleteExistingCover(originalCover)
  }

  return await uploadNewCover(imageFile)
}

const deleteExistingCover = async (url: string) => {
  try {
    await apiPostWithAuth('deleteImage', { url })
  } catch (err) {
    console.error('Failed to delete existing cover:', err)
  }
}

const uploadNewCover = async (imageFile: File): Promise<string> => {
  const imageBase64 = await fileToDataUrl(imageFile)

  const result = await apiPostWithAuth<{ url: string }>('uploadImage', {
    image: imageBase64,
    folder: 'GCash',
  })
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to upload image')
  }

  return result.data.url
}

// Handle episode list changes (deletions and uploads)
const handleEpisodeListChanges = async (t: Record<string, string>): Promise<EpisodeFormData[]> => {
  const state = seriesEditStoreActions.getState()
  const episodes = state.formData.episodes

  const episodesToDelete = episodes.filter((ep) => ep.isDeleted && ep.videoId && !ep.isNew)
  const episodesToUpload = episodes.filter((ep) => !ep.isDeleted && ep.videoFile)

  const totalOperations = episodesToDelete.length + episodesToUpload.length
  let currentOperation = 0

  if (totalOperations > 0) {
    seriesEditStoreActions.setUploadProgress({
      show: true,
      message: t.deletingVideos || 'Deleting videos...',
      current: 0,
      total: totalOperations,
    })
  }

  // Delete videos
  for (const episode of episodesToDelete) {
    await deleteEpisodeVideo(episode)
    currentOperation++
    seriesEditStoreActions.updateUploadProgress({ current: currentOperation })
  }

  // Upload videos
  if (episodesToUpload.length > 0) {
    seriesEditStoreActions.updateUploadProgress({
      message: t.uploadingVideos || 'Uploading videos...',
    })
  }

  const updatedEpisodes = [...episodes]
  for (const episode of episodesToUpload) {
    const index = updatedEpisodes.findIndex((ep) => ep === episode)
    if (index !== -1 && episode.videoFile) {
      const videoId = await uploadEpisodeVideo(episode)
      updatedEpisodes[index] = { ...updatedEpisodes[index], videoId }
    }
    currentOperation++
    seriesEditStoreActions.updateUploadProgress({ current: currentOperation })
  }

  return updatedEpisodes.filter((ep) => !ep.isDeleted)
}

const deleteEpisodeVideo = async (episode: EpisodeFormData) => {
  if (!episode.videoId) return
  try {
    await apiPostWithAuth('deleteVideo', { videoId: episode.videoId })
  } catch (err) {
    console.error('Failed to delete video:', err)
  }
}

const uploadEpisodeVideo = async (episode: EpisodeFormData): Promise<string> => {
  if (!episode.videoFile) throw new Error('No video file to upload')

  // Step 1: Create video entry and get upload URL
  const createResult = await apiPostWithAuth<{
    videoId: string
    uploadUrl: string
    accessKey: string
  }>('uploadVideo', {
    title: episode.title || `Episode ${episode.episodeNumber}`,
  })

  if (!createResult.success || !createResult.data) {
    throw new Error(createResult.error || 'Failed to create video')
  }

  const { videoId, uploadUrl, accessKey } = createResult.data

  // Step 2: Upload video directly to Bunny.net
  await uploadVideoDirectly(episode.videoFile, uploadUrl, accessKey)

  return videoId
}

const uploadVideoDirectly = async (
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

// Helper: file to data URL
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

// Handle image change
export const handleImageChange = (file: File | null, previewUrl: string | null) => {
  seriesEditStoreActions.setImageFile(file)
  if (previewUrl) {
    seriesEditStoreActions.setCover(previewUrl)
  }
}

// Handle episode title change
export const handleEpisodeTitleChange = (index: number, title: string) => {
  seriesEditStoreActions.updateEpisode(index, { title })
}

// Handle episode video change
export const handleEpisodeVideoChange = (
  index: number,
  file: File | null,
  previewUrl: string | null,
) => {
  seriesEditStoreActions.updateEpisode(index, {
    videoFile: file,
    videoPreview: previewUrl || undefined,
  })
}

// Handle add episode
export const handleAddEpisode = () => {
  const state = seriesEditStoreActions.getState()
  const activeEpisodes = state.formData.episodes.filter((ep) => !ep.isDeleted)
  const newEpisodeNumber = activeEpisodes.length + 1
  seriesEditStoreActions.addEpisode(createNewEpisode(newEpisodeNumber))
}
