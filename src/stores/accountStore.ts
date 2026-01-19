// Account page store - extracted state management
// Following Rule #3: States shared by 2+ components must be defined outside the component tree

import { useSyncExternalStore } from 'react'
import type { FavoriteItem, PurchaseItem, Series, User } from '../types'

type Listener = () => void

// Transaction types
export type TransactionType = 'topup' | 'withdraw'
export type TransactionStatus = 'success' | 'failed' | 'processing'

export interface Transaction {
  id: string
  referenceId: string
  type: TransactionType
  amount: number
  status: TransactionStatus
  createdAt: Date
}

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

export type AccountTab = 'overview' | 'watchHistory' | 'favorites' | 'settings' | 'wallet' | 'myPurchases' | 'mySeries'

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
  
  // My Purchases
  myPurchases: PurchaseItem[]
  myPurchasesLoading: boolean
  
  // My Series
  mySeries: Series[]
  mySeriesLoading: boolean
  editingSeries: Series | null
  editingSeriesId: string | null  // 'new' for adding, series._id for editing, null for list view
  
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
  walletTab: 'topup' | 'withdraw'
  showTopUpPopup: boolean
  selectedTopUpAmount: number | null
  showWithdrawPopup: boolean
  selectedWithdrawAmount: number | null
  withdrawing: boolean
  transactions: Transaction[]
  
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
  
  // My Purchases
  myPurchases: [],
  myPurchasesLoading: false,
  
  // My Series
  mySeries: [],
  mySeriesLoading: false,
  editingSeries: null,
  editingSeriesId: null,
  
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
  walletTab: 'topup',
  showTopUpPopup: false,
  selectedTopUpAmount: null,
  showWithdrawPopup: false,
  selectedWithdrawAmount: null,
  withdrawing: false,
  transactions: [],
  
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
  
  // My Purchases
  setMyPurchases: (myPurchases: PurchaseItem[]) =>
    accountStore.setState((prev) => ({ ...prev, myPurchases })),
  setMyPurchasesLoading: (myPurchasesLoading: boolean) =>
    accountStore.setState((prev) => ({ ...prev, myPurchasesLoading })),
  
  // My Series
  setMySeries: (mySeries: Series[]) =>
    accountStore.setState((prev) => ({ ...prev, mySeries })),
  setMySeriesLoading: (mySeriesLoading: boolean) =>
    accountStore.setState((prev) => ({ ...prev, mySeriesLoading })),
  setEditingSeries: (editingSeries: Series | null) =>
    accountStore.setState((prev) => ({ ...prev, editingSeries })),
  setEditingSeriesId: (editingSeriesId: string | null) =>
    accountStore.setState((prev) => ({ ...prev, editingSeriesId })),
  updateSeriesInList: (updatedSeries: Series) =>
    accountStore.setState((prev) => ({
      ...prev,
      mySeries: prev.mySeries.map((s) =>
        s._id === updatedSeries._id ? updatedSeries : s,
      ),
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
  subtractBalance: (amount: number) =>
    accountStore.setState((prev) => ({ ...prev, balance: prev.balance - amount })),
  setWalletTab: (walletTab: 'topup' | 'withdraw') =>
    accountStore.setState((prev) => ({ ...prev, walletTab })),
  setShowTopUpPopup: (showTopUpPopup: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showTopUpPopup })),
  setSelectedTopUpAmount: (selectedTopUpAmount: number | null) =>
    accountStore.setState((prev) => ({ ...prev, selectedTopUpAmount })),
  setShowWithdrawPopup: (showWithdrawPopup: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showWithdrawPopup })),
  setSelectedWithdrawAmount: (selectedWithdrawAmount: number | null) =>
    accountStore.setState((prev) => ({ ...prev, selectedWithdrawAmount })),
  setWithdrawing: (withdrawing: boolean) =>
    accountStore.setState((prev) => ({ ...prev, withdrawing })),
  
  // Transactions
  setTransactions: (transactions: Transaction[]) =>
    accountStore.setState((prev) => ({ ...prev, transactions })),
  addTransaction: (transaction: Transaction) =>
    accountStore.setState((prev) => ({
      ...prev,
      transactions: [transaction, ...prev.transactions],
    })),
  updateTransactionStatus: (id: string, status: TransactionStatus) =>
    accountStore.setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === id ? { ...t, status } : t,
      ),
    })),
  
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
  { key: 'myPurchases', icon: '🛒' },
  { key: 'mySeries', icon: '🎬' },
]

export const walletAmounts = [10, 20, 50, 100, 200, 500]

// Helper function to generate reference ID
export const generateReferenceId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `GC${timestamp}${random}`
}

// Helper function to generate transaction ID
export const generateTransactionId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
