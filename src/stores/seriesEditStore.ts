// SeriesEdit page store - extracted state management
// Following Rule #3: States shared by 2+ components must be defined outside the component tree

import { useSyncExternalStore } from 'react'
import type { Genre } from '../types'

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

export interface EpisodeFormData {
  id?: string
  episodeNumber: number
  title: string
  videoId: string
  videoPreview?: string
  videoFile?: File | null
  isNew?: boolean
  isDeleted?: boolean
}

export interface SeriesFormData {
  name: string
  description: string
  genreIds: string[]
  cover: string
  episodes: EpisodeFormData[]
  shelved: boolean
}

export interface UploadProgress {
  show: boolean
  message: string
  current: number
  total: number
}

interface SeriesEditState {
  formData: SeriesFormData
  genres: Genre[]
  imageFile: File | null
  originalCover: string
  originalEpisodes: EpisodeFormData[]
  loading: boolean
  saving: boolean
  error: string | null
  success: string | null
  uploadProgress: UploadProgress
}

const initialFormData: SeriesFormData = {
  name: '',
  description: '',
  genreIds: [],
  cover: '',
  episodes: [],
  shelved: true,
}

const initialState: SeriesEditState = {
  formData: initialFormData,
  genres: [],
  imageFile: null,
  originalCover: '',
  originalEpisodes: [],
  loading: false,
  saving: false,
  error: null,
  success: null,
  uploadProgress: {
    show: false,
    message: '',
    current: 0,
    total: 0,
  },
}

const seriesEditStore = createStore<SeriesEditState>(initialState)

export const useSeriesEditStore = () => {
  const state = useSyncExternalStore(seriesEditStore.subscribe, seriesEditStore.getState)
  return state
}

export const seriesEditStoreActions = {
  // Form data
  setFormData: (formData: SeriesFormData) =>
    seriesEditStore.setState((prev) => ({ ...prev, formData })),
  updateFormField: <K extends keyof SeriesFormData>(field: K, value: SeriesFormData[K]) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
    })),

  // Name
  setName: (name: string) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, name },
    })),

  // Description
  setDescription: (description: string) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, description },
    })),

  // Genres
  setGenreIds: (genreIds: string[]) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, genreIds },
    })),
  setGenres: (genres: Genre[]) =>
    seriesEditStore.setState((prev) => ({ ...prev, genres })),

  // Cover
  setCover: (cover: string) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, cover },
    })),
  setImageFile: (imageFile: File | null) =>
    seriesEditStore.setState((prev) => ({ ...prev, imageFile })),
  setOriginalCover: (originalCover: string) =>
    seriesEditStore.setState((prev) => ({ ...prev, originalCover })),
  
  // Shelved
  setShelved: (shelved: boolean) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, shelved },
    })),

  // Episodes
  setEpisodes: (episodes: EpisodeFormData[]) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, episodes },
    })),
  updateEpisode: (index: number, updates: Partial<EpisodeFormData>) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        episodes: prev.formData.episodes.map((ep, i) =>
          i === index ? { ...ep, ...updates } : ep,
        ),
      },
    })),
  addEpisode: (episode: EpisodeFormData) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        episodes: [...prev.formData.episodes, episode],
      },
    })),
  markEpisodeDeleted: (index: number) =>
    seriesEditStore.setState((prev) => {
      const episode = prev.formData.episodes[index]
      let newEpisodes: EpisodeFormData[]

      if (episode.isNew) {
        newEpisodes = prev.formData.episodes.filter((_, i) => i !== index)
      } else {
        newEpisodes = prev.formData.episodes.map((ep, i) =>
          i === index ? { ...ep, isDeleted: true } : ep,
        )
      }

      // Renumber episodes
      let number = 1
      newEpisodes = newEpisodes.map((ep) => {
        if (ep.isDeleted) return ep
        return { ...ep, episodeNumber: number++ }
      })

      return {
        ...prev,
        formData: { ...prev.formData, episodes: newEpisodes },
      }
    }),
  setOriginalEpisodes: (originalEpisodes: EpisodeFormData[]) =>
    seriesEditStore.setState((prev) => ({ ...prev, originalEpisodes })),

  // Loading states
  setLoading: (loading: boolean) =>
    seriesEditStore.setState((prev) => ({ ...prev, loading })),
  setSaving: (saving: boolean) =>
    seriesEditStore.setState((prev) => ({ ...prev, saving })),

  // Messages
  setError: (error: string | null) =>
    seriesEditStore.setState((prev) => ({ ...prev, error })),
  setSuccess: (success: string | null) =>
    seriesEditStore.setState((prev) => ({ ...prev, success })),

  // Upload progress
  setUploadProgress: (uploadProgress: UploadProgress) =>
    seriesEditStore.setState((prev) => ({ ...prev, uploadProgress })),
  updateUploadProgress: (updates: Partial<UploadProgress>) =>
    seriesEditStore.setState((prev) => ({
      ...prev,
      uploadProgress: { ...prev.uploadProgress, ...updates },
    })),

  // Reset
  reset: () => seriesEditStore.setState(initialState),

  getState: seriesEditStore.getState,
}

// Helper function to create a new episode with default title
export const createNewEpisode = (episodeNumber: number): EpisodeFormData => ({
  episodeNumber,
  title: `EP ${String(episodeNumber).padStart(2, '0')}`,
  videoId: '',
  videoPreview: undefined,
  videoFile: null,
  isNew: true,
  isDeleted: false,
})

// Get active (non-deleted) episodes
export const getActiveEpisodes = (episodes: EpisodeFormData[]): EpisodeFormData[] => {
  return episodes.filter((ep) => !ep.isDeleted)
}

// Check if add episode should be disabled
export const isAddEpisodeDisabled = (episodes: EpisodeFormData[]): boolean => {
  const activeEpisodes = getActiveEpisodes(episodes)
  if (activeEpisodes.length === 0) return false
  const lastEpisode = activeEpisodes[activeEpisodes.length - 1]
  return !lastEpisode.videoId && !lastEpisode.videoFile
}
