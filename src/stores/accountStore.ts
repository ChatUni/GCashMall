// Account page store - extracted state management
// Following Rule #3: States shared by 2+ components must be defined outside the component tree

import { useSyncExternalStore } from 'react'
import type { FavoriteItem, User } from '../types'

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

export type AccountTab = 'overview' | 'watchHistory' | 'favorites' | 'settings' | 'wallet'

export interface ProfileFormState {
  nickname: string
  email: string
  phoneNumber: string
  gender: string
  birthday: string
}

export interface ProfileErrorsState {
  emailError: string
  phoneError: string
  birthdayError: string
}

export interface PasswordFormState {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface PasswordErrorsState {
  currentPasswordError: string
  newPasswordError: string
  confirmPasswordError: string
}

interface AccountState {
  activeTab: AccountTab
  user: User | null
  isLoggedIn: boolean
  loading: boolean
  favorites: FavoriteItem[]
  
  // Profile form
  profileForm: ProfileFormState
  profileErrors: ProfileErrorsState
  profileSaving: boolean
  originalProfile: ProfileFormState
  
  // Password form
  passwordForm: PasswordFormState
  passwordErrors: PasswordErrorsState
  passwordChanging: boolean
  
  // Avatar
  avatarError: string
  avatarUploading: boolean
  
  // Settings
  playbackSpeed: string
  autoplay: boolean
  notifications: boolean
  
  // Wallet
  balance: number
  showTopUpPopup: boolean
  selectedTopUpAmount: number | null
  
  // UI
  showLoginModal: boolean
}

const initialProfileForm: ProfileFormState = {
  nickname: '',
  email: '',
  phoneNumber: '',
  gender: 'not_specified',
  birthday: '',
}

const initialProfileErrors: ProfileErrorsState = {
  emailError: '',
  phoneError: '',
  birthdayError: '',
}

const initialPasswordForm: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const initialPasswordErrors: PasswordErrorsState = {
  currentPasswordError: '',
  newPasswordError: '',
  confirmPasswordError: '',
}

const initialState: AccountState = {
  activeTab: 'overview',
  user: null,
  isLoggedIn: false,
  loading: true,
  favorites: [],
  
  profileForm: initialProfileForm,
  profileErrors: initialProfileErrors,
  profileSaving: false,
  originalProfile: initialProfileForm,
  
  passwordForm: initialPasswordForm,
  passwordErrors: initialPasswordErrors,
  passwordChanging: false,
  
  avatarError: '',
  avatarUploading: false,
  
  playbackSpeed: '1x',
  autoplay: true,
  notifications: true,
  
  balance: 0,
  showTopUpPopup: false,
  selectedTopUpAmount: null,
  
  showLoginModal: false,
}

const accountStore = createStore<AccountState>(initialState)

export const useAccountStore = () => {
  const state = useSyncExternalStore(accountStore.subscribe, accountStore.getState)
  return state
}

export const accountStoreActions = {
  // Tab
  setActiveTab: (activeTab: AccountTab) => 
    accountStore.setState((prev) => ({ ...prev, activeTab })),
  
  // User/Auth
  setUser: (user: User | null) => 
    accountStore.setState((prev) => ({ ...prev, user, isLoggedIn: !!user })),
  setLoading: (loading: boolean) => 
    accountStore.setState((prev) => ({ ...prev, loading })),
  setShowLoginModal: (showLoginModal: boolean) => 
    accountStore.setState((prev) => ({ ...prev, showLoginModal })),
  
  // Data
  setFavorites: (favorites: FavoriteItem[]) =>
    accountStore.setState((prev) => ({ ...prev, favorites })),
  removeFavoriteItem: (itemId: string) =>
    accountStore.setState((prev) => ({
      ...prev,
      favorites: prev.favorites.filter((item) => item._id !== itemId),
    })),
  
  // Profile form
  setProfileForm: (profileForm: ProfileFormState) => 
    accountStore.setState((prev) => ({ ...prev, profileForm })),
  updateProfileField: <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) =>
    accountStore.setState((prev) => ({
      ...prev,
      profileForm: { ...prev.profileForm, [field]: value },
    })),
  setProfileErrors: (profileErrors: ProfileErrorsState) => 
    accountStore.setState((prev) => ({ ...prev, profileErrors })),
  updateProfileError: <K extends keyof ProfileErrorsState>(field: K, value: string) =>
    accountStore.setState((prev) => ({
      ...prev,
      profileErrors: { ...prev.profileErrors, [field]: value },
    })),
  setProfileSaving: (profileSaving: boolean) =>
    accountStore.setState((prev) => ({ ...prev, profileSaving })),
  setOriginalProfile: (originalProfile: ProfileFormState) => 
    accountStore.setState((prev) => ({ ...prev, originalProfile })),
  resetProfileForm: () =>
    accountStore.setState((prev) => ({
      ...prev,
      profileForm: prev.originalProfile,
      profileErrors: initialProfileErrors,
    })),
  
  // Password form
  setPasswordForm: (passwordForm: PasswordFormState) => 
    accountStore.setState((prev) => ({ ...prev, passwordForm })),
  updatePasswordField: <K extends keyof PasswordFormState>(field: K, value: string) =>
    accountStore.setState((prev) => ({
      ...prev,
      passwordForm: { ...prev.passwordForm, [field]: value },
    })),
  setPasswordErrors: (passwordErrors: PasswordErrorsState) => 
    accountStore.setState((prev) => ({ ...prev, passwordErrors })),
  updatePasswordError: <K extends keyof PasswordErrorsState>(field: K, value: string) =>
    accountStore.setState((prev) => ({
      ...prev,
      passwordErrors: { ...prev.passwordErrors, [field]: value },
    })),
  setPasswordChanging: (passwordChanging: boolean) => 
    accountStore.setState((prev) => ({ ...prev, passwordChanging })),
  clearPasswordForm: () =>
    accountStore.setState((prev) => ({
      ...prev,
      passwordForm: initialPasswordForm,
      passwordErrors: initialPasswordErrors,
    })),
  
  // Avatar
  setAvatarError: (avatarError: string) => 
    accountStore.setState((prev) => ({ ...prev, avatarError })),
  setAvatarUploading: (avatarUploading: boolean) => 
    accountStore.setState((prev) => ({ ...prev, avatarUploading })),
  
  // Settings
  setPlaybackSpeed: (playbackSpeed: string) => 
    accountStore.setState((prev) => ({ ...prev, playbackSpeed })),
  setAutoplay: (autoplay: boolean) => 
    accountStore.setState((prev) => ({ ...prev, autoplay })),
  setNotifications: (notifications: boolean) => 
    accountStore.setState((prev) => ({ ...prev, notifications })),
  
  // Wallet
  setBalance: (balance: number) => 
    accountStore.setState((prev) => ({ ...prev, balance })),
  addBalance: (amount: number) =>
    accountStore.setState((prev) => ({ ...prev, balance: prev.balance + amount })),
  setShowTopUpPopup: (showTopUpPopup: boolean) => 
    accountStore.setState((prev) => ({ ...prev, showTopUpPopup })),
  setSelectedTopUpAmount: (selectedTopUpAmount: number | null) => 
    accountStore.setState((prev) => ({ ...prev, selectedTopUpAmount })),
  
  // Initialize user data
  initializeUserData: (user: User) => {
    const profileData: ProfileFormState = {
      nickname: user.nickname || '',
      email: user.email || '',
      phoneNumber: user.phone || '',
      gender: user.sex || 'not_specified',
      birthday: user.dob || '',
    }
    accountStore.setState((prev) => ({
      ...prev,
      user,
      isLoggedIn: true,
      loading: false,
      profileForm: profileData,
      originalProfile: profileData,
      balance: user.balance || 0,
    }))
  },
  
  // Reset
  reset: () => accountStore.setState(initialState),
  
  getState: accountStore.getState,
}

// Nav items config
export const navItems: { key: AccountTab; icon: string }[] = [
  { key: 'overview', icon: '👤' },
  { key: 'watchHistory', icon: '📺' },
  { key: 'favorites', icon: '❤️' },
  { key: 'settings', icon: '⚙️' },
  { key: 'wallet', icon: '💰' },
]

export const topUpAmounts = [5, 10, 20, 50, 100, 200]
