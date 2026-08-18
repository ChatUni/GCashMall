// System settings store - admin-configurable global app settings
// Shared by the Account settings page (admin editing) and the Player (preview length).

import { createStore } from 'solid-js/store'
import type { SystemSettings } from '../types'
import { fetchSystemSettings, saveSystemSettings } from '../services/dataService'

// Default trial/preview length in seconds, used as a fallback before settings load
export const TIME_LIMIT = 3

interface SystemSettingsState extends SystemSettings {
  loaded: boolean
  saving: boolean
}

const getInitialState = (): SystemSettingsState => ({
  previewLength: TIME_LIMIT,
  creatorShare: 50,
  episodeCost: 0.1,
  nextEpisodeCost: 0.99,
  welcomeCredit: 100,
  chatModel: 'gpt-5-mini',
  imageModel: 'gpt-image-1-mini',
  seedanceModel: 'doubao-seedance-2-0-mini-260615',
  loaded: false,
  saving: false,
})

const [state, setState] = createStore<SystemSettingsState>(getInitialState())

export const systemSettingsStore = state

// Selectable options (must match the backend's allowed values and the spec)
export const PREVIEW_LENGTH_OPTIONS = [3, 5, 10, 20, 30]
export const CREATOR_SHARE_OPTIONS = [25, 30, 40, 50, 60, 75]
export const EPISODE_COST_OPTIONS = [0.1, 0.2, 0.3, 0.5, 0.75, 1]
export const NEXT_EPISODE_COST_OPTIONS = [0.49, 0.99, 1.49, 1.99, 2.99]
export const WELCOME_CREDIT_OPTIONS = [0, 5, 10, 20, 50, 100]
// Model options (must match the server's modelConfig option lists)
export const CHAT_MODEL_OPTIONS = ['gpt-5-mini', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4o']
export const IMAGE_MODEL_OPTIONS = ['gpt-image-1-mini', 'gpt-image-1']
export const SEEDANCE_MODEL_OPTIONS = [
  'doubao-seedance-2-0-mini-260615',
  'doubao-seedance-2-0-260128',
  'doubao-seedance-1-0-pro-250528',
]

// Preview length (seconds) for the player trial, falling back to TIME_LIMIT
export const getPreviewLength = (): number => state.previewLength || TIME_LIMIT
// GUSD cost to generate a follow-up episode
export const getNextEpisodeCost = (): number => state.nextEpisodeCost ?? 0.99

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
      previewLength: changes.previewLength ?? state.previewLength,
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
