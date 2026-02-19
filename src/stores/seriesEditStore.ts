// SeriesEdit page store - SolidJS store
// Following Rule #3: States shared by 2+ components must be defined outside the component tree

import { createStore } from 'solid-js/store'
import type { Genre } from '../types'

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

const getInitialState = (): SeriesEditState => ({
  formData: { ...initialFormData, genreIds: [], episodes: [] },
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
})

const [seriesEditState, setSeriesEditState] = createStore<SeriesEditState>(getInitialState())

export const seriesEditStore = seriesEditState

export const seriesEditStoreActions = {
  // Form data
  setFormData: (formData: SeriesFormData) =>
    setSeriesEditState({ formData }),
  updateFormField: <K extends keyof SeriesFormData>(field: K, value: SeriesFormData[K]) =>
    setSeriesEditState('formData', { [field]: value } as Partial<SeriesFormData>),

  // Name
  setName: (name: string) =>
    setSeriesEditState('formData', { name }),

  // Description
  setDescription: (description: string) =>
    setSeriesEditState('formData', { description }),

  // Genres
  setGenreIds: (genreIds: string[]) =>
    setSeriesEditState('formData', { genreIds }),
  setGenres: (genres: Genre[]) =>
    setSeriesEditState({ genres }),

  // Cover
  setCover: (cover: string) =>
    setSeriesEditState('formData', { cover }),
  setImageFile: (imageFile: File | null) =>
    setSeriesEditState({ imageFile }),
  setOriginalCover: (originalCover: string) =>
    setSeriesEditState({ originalCover }),
  
  // Shelved
  setShelved: (shelved: boolean) =>
    setSeriesEditState('formData', { shelved }),

  // Episodes
  setEpisodes: (episodes: EpisodeFormData[]) =>
    setSeriesEditState('formData', { episodes }),
  updateEpisode: (index: number, updates: Partial<EpisodeFormData>) =>
    setSeriesEditState('formData', 'episodes', index, updates),
  addEpisode: (episode: EpisodeFormData) =>
    setSeriesEditState('formData', 'episodes', (prev) => [...prev, episode]),
  markEpisodeDeleted: (index: number) => {
    const episode = seriesEditState.formData.episodes[index]
    let newEpisodes: EpisodeFormData[]

    if (episode.isNew) {
      newEpisodes = seriesEditState.formData.episodes.filter((_, i) => i !== index)
    } else {
      newEpisodes = seriesEditState.formData.episodes.map((ep, i) =>
        i === index ? { ...ep, isDeleted: true } : ep,
      )
    }

    // Renumber episodes
    let number = 1
    newEpisodes = newEpisodes.map((ep) => {
      if (ep.isDeleted) return ep
      return { ...ep, episodeNumber: number++ }
    })

    setSeriesEditState('formData', { episodes: newEpisodes })
  },
  setOriginalEpisodes: (originalEpisodes: EpisodeFormData[]) =>
    setSeriesEditState({ originalEpisodes }),

  // Loading states
  setLoading: (loading: boolean) =>
    setSeriesEditState({ loading }),
  setSaving: (saving: boolean) =>
    setSeriesEditState({ saving }),

  // Messages
  setError: (error: string | null) =>
    setSeriesEditState({ error }),
  setSuccess: (success: string | null) =>
    setSeriesEditState({ success }),

  // Upload progress
  setUploadProgress: (uploadProgress: UploadProgress) =>
    setSeriesEditState({ uploadProgress }),
  updateUploadProgress: (updates: Partial<UploadProgress>) =>
    setSeriesEditState('uploadProgress', updates),

  // Reset
  reset: () => setSeriesEditState(getInitialState()),

  getState: () => seriesEditState,
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
