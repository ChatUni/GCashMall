// System settings store - admin-configurable global app settings
// Shared by the Account settings page (admin editing) and the Player (free-episode gate).

import { createStore } from 'solid-js/store'
import type { SystemSettings } from '../types'
import { fetchSystemSettings, saveSystemSettings } from '../services/dataService'

// Episodes free at the start of every series, used as a fallback before settings load
export const DEFAULT_FREE_EPISODES = 5

interface SystemSettingsState extends SystemSettings {
  loaded: boolean
  saving: boolean
}

const getInitialState = (): SystemSettingsState => ({
  freeEpisodes: DEFAULT_FREE_EPISODES,
  creatorShare: 50,
  episodeCost: 10,
  nextEpisodeCost: 99,
  welcomeCredit: 10000,
  chatModel: 'gpt-5-mini',
  imageModel: 'gpt-image-1-mini',
  seedanceModel: 'doubao-seedance-2-0-mini-260615',
  loaded: false,
  saving: false,
})

const [state, setState] = createStore<SystemSettingsState>(getInitialState())

export const systemSettingsStore = state

// Selectable options (must match the backend's allowed values and the spec)
export const FREE_EPISODES_OPTIONS = [0, 1, 3, 5, 10]
export const CREATOR_SHARE_OPTIONS = [25, 30, 40, 50, 60, 75]
export const EPISODE_COST_OPTIONS = [10, 20, 30, 50, 75, 100]
export const NEXT_EPISODE_COST_OPTIONS = [49, 99, 149, 199, 299]
export const WELCOME_CREDIT_OPTIONS = [0, 500, 1000, 2000, 5000, 10000]
// Model options (must match the server's modelConfig option lists)
export const CHAT_MODEL_OPTIONS = ['gpt-5-mini', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4o']
export const IMAGE_MODEL_OPTIONS = ['gpt-image-1-mini', 'gpt-image-1']
export const SEEDANCE_MODEL_OPTIONS = [
  'doubao-seedance-2-0-mini-260615',
  'doubao-seedance-2-0-260128',
  'doubao-seedance-1-0-pro-250528',
]

// How many episodes are free at the start of every series
export const getFreeEpisodeCount = (): number => state.freeEpisodes ?? DEFAULT_FREE_EPISODES

// An episode is free when it is among the first `freeEpisodes` of its series. Replaces the
// old n-second preview: locked episodes don't play at all, free ones play in full.
// Mirrored server-side by isEpisodeFree in netlify/functions/utils/handlers.js.
export const isEpisodeFree = (episodeNumber: number): boolean =>
  episodeNumber <= getFreeEpisodeCount()
// GUSD cost to generate a follow-up episode
export const getNextEpisodeCost = (): number => state.nextEpisodeCost ?? 99

export const systemSettingsStoreActions = {
  load: async () => {
    try {
      const data = await fetchSystemSettings()
      setState({ ...data, loaded: true })
    } catch (error) {
      console.error('Failed to load system settings:', error)
    }
  },

  // Admin only - save a single changed setting (merged with current values)
  save: async (changes: Partial<SystemSettings>) => {
    const next: SystemSettings = {
      freeEpisodes: changes.freeEpisodes ?? state.freeEpisodes,
      creatorShare: changes.creatorShare ?? state.creatorShare,
      episodeCost: changes.episodeCost ?? state.episodeCost,
      nextEpisodeCost: changes.nextEpisodeCost ?? state.nextEpisodeCost,
      welcomeCredit: changes.welcomeCredit ?? state.welcomeCredit,
      chatModel: changes.chatModel ?? state.chatModel,
      imageModel: changes.imageModel ?? state.imageModel,
      seedanceModel: changes.seedanceModel ?? state.seedanceModel,
    }
    setState({ saving: true })
    try {
      const saved = await saveSystemSettings(next)
      setState({ ...saved })
    } catch (error) {
      console.error('Failed to save system settings:', error)
    } finally {
      setState({ saving: false })
    }
  },
}
