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

// Combined transaction type for display (includes purchases)
export type CombinedTransactionType = 'topup' | 'withdraw' | 'purchase'

export interface CombinedTransaction {
  id: string
  type: CombinedTransactionType
  amount: number
  status: string
  referenceId: string
  createdAt: Date
  purchase?: PurchaseItem
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

export type AccountTab = 'overview' | 'watchHistory' | 'favorites' | 'settings' | 'wallet' | 'myPurchases' | 'mySeries' | 'about' | 'contact'
export type TransactionFilter = 'all' | 'topup' | 'withdraw' | 'purchase'

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
  
  // Initialization tracking flags (moved from component-level variables)
  accountInitialized: boolean
  userDataFetched: boolean
  myPurchasesFetched: boolean
  mySeriesFetched: boolean
  lastProcessedCode: string | null
  
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
  transactionFilter: TransactionFilter
  showCustomAmountPopup: boolean
  customAmountInput: string
  
  // Confirmation modals (shared by phone and desktop)
  showClearHistoryModal: boolean
  showDeleteHistoryItemModal: boolean
  pendingDeleteHistorySeriesId: string | null
  pendingDeleteHistorySeriesName: string
  
  showClearFavoritesModal: boolean
  showDeleteFavoriteItemModal: boolean
  pendingDeleteFavoriteSeriesId: string | null
  pendingDeleteFavoriteSeriesName: string
  
  showShelveModal: boolean
  pendingShelveSeriesId: string | null
  pendingShelveSeries: Series | null
  
  showUnshelveModal: boolean
  pendingUnshelveSeriesId: string | null
  pendingUnshelveSeries: Series | null
  
  showDeleteSeriesModal: boolean
  pendingDeleteSeriesId: string | null
  pendingDeleteSeries: Series | null
  
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
  
  // Initialization tracking flags
  accountInitialized: false,
  userDataFetched: false,
  myPurchasesFetched: false,
  mySeriesFetched: false,
  lastProcessedCode: null,
  
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
  transactionFilter: 'all',
  showCustomAmountPopup: false,
  customAmountInput: '',
  
  // Confirmation modals
  showClearHistoryModal: false,
  showDeleteHistoryItemModal: false,
  pendingDeleteHistorySeriesId: null,
  pendingDeleteHistorySeriesName: '',
  
  showClearFavoritesModal: false,
  showDeleteFavoriteItemModal: false,
  pendingDeleteFavoriteSeriesId: null,
  pendingDeleteFavoriteSeriesName: '',
  
  showShelveModal: false,
  pendingShelveSeriesId: null,
  pendingShelveSeries: null,
  
  showUnshelveModal: false,
  pendingUnshelveSeriesId: null,
  pendingUnshelveSeries: null,
  
  showDeleteSeriesModal: false,
  pendingDeleteSeriesId: null,
  pendingDeleteSeries: null,
  
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
  removeSeriesFromList: (seriesId: string) =>
    accountStore.setState((prev) => ({
      ...prev,
      mySeries: prev.mySeries.filter((s) => s._id !== seriesId),
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
  setTransactionFilter: (transactionFilter: TransactionFilter) =>
    accountStore.setState((prev) => ({ ...prev, transactionFilter })),
  setShowCustomAmountPopup: (showCustomAmountPopup: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showCustomAmountPopup })),
  setCustomAmountInput: (customAmountInput: string) =>
    accountStore.setState((prev) => ({ ...prev, customAmountInput })),
  
  // Initialization tracking
  setAccountInitialized: (accountInitialized: boolean) =>
    accountStore.setState((prev) => ({ ...prev, accountInitialized })),
  setUserDataFetched: (userDataFetched: boolean) =>
    accountStore.setState((prev) => ({ ...prev, userDataFetched })),
  setMyPurchasesFetched: (myPurchasesFetched: boolean) =>
    accountStore.setState((prev) => ({ ...prev, myPurchasesFetched })),
  setMySeriesFetched: (mySeriesFetched: boolean) =>
    accountStore.setState((prev) => ({ ...prev, mySeriesFetched })),
  setLastProcessedCode: (lastProcessedCode: string | null) =>
    accountStore.setState((prev) => ({ ...prev, lastProcessedCode })),
  resetInitializationFlags: () =>
    accountStore.setState((prev) => ({
      ...prev,
      accountInitialized: false,
      userDataFetched: false,
      myPurchasesFetched: false,
      mySeriesFetched: false,
    })),
  
  // Watch History modals
  setShowClearHistoryModal: (showClearHistoryModal: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showClearHistoryModal })),
  setShowDeleteHistoryItemModal: (showDeleteHistoryItemModal: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showDeleteHistoryItemModal })),
  setPendingDeleteHistoryItem: (seriesId: string | null, seriesName: string = '') =>
    accountStore.setState((prev) => ({
      ...prev,
      pendingDeleteHistorySeriesId: seriesId,
      pendingDeleteHistorySeriesName: seriesName,
    })),
  
  // Favorites modals
  setShowClearFavoritesModal: (showClearFavoritesModal: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showClearFavoritesModal })),
  setShowDeleteFavoriteItemModal: (showDeleteFavoriteItemModal: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showDeleteFavoriteItemModal })),
  setPendingDeleteFavoriteItem: (seriesId: string | null, seriesName: string = '') =>
    accountStore.setState((prev) => ({
      ...prev,
      pendingDeleteFavoriteSeriesId: seriesId,
      pendingDeleteFavoriteSeriesName: seriesName,
    })),
  
  // Series shelve/unshelve modals
  setShowShelveModal: (showShelveModal: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showShelveModal })),
  setPendingShelve: (seriesId: string | null, series: Series | null = null) =>
    accountStore.setState((prev) => ({
      ...prev,
      pendingShelveSeriesId: seriesId,
      pendingShelveSeries: series,
    })),
  setShowUnshelveModal: (showUnshelveModal: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showUnshelveModal })),
  setPendingUnshelve: (seriesId: string | null, series: Series | null = null) =>
    accountStore.setState((prev) => ({
      ...prev,
      pendingUnshelveSeriesId: seriesId,
      pendingUnshelveSeries: series,
    })),
  
  // Series delete modal
  setShowDeleteSeriesModal: (showDeleteSeriesModal: boolean) =>
    accountStore.setState((prev) => ({ ...prev, showDeleteSeriesModal })),
  setPendingDeleteSeries: (seriesId: string | null, series: Series | null = null) =>
    accountStore.setState((prev) => ({
      ...prev,
      pendingDeleteSeriesId: seriesId,
      pendingDeleteSeries: series,
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
    // Convert transactions from user data (dates may be strings from JSON)
    const transactions: Transaction[] = (user.transactions || []).map((t: Transaction | { id: string; referenceId: string; type: TransactionType; amount: number; status: TransactionStatus; createdAt: string | Date }) => ({
      id: t.id,
      referenceId: t.referenceId,
      type: t.type,
      amount: t.amount,
      status: t.status,
      createdAt: typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt,
    }))
    accountStore.setState((prev) => ({
      ...prev,
      user,
      isLoggedIn: true,
      loading: false,
      showLoginModal: false, // Close login modal on successful login
      profileForm: profileData,
      originalProfile: profileData,
      balance: user.balance || 0,
      transactions,
      myPurchases: user.purchases || [],
    }))
  },
  
  // Reset
  reset: () => accountStore.setState(initialState),
  
  getState: accountStore.getState,
}

// Nav items config for desktop (without about/contact - those are separate pages)
export const navItems: { key: AccountTab; icon: string }[] = [
  { key: 'overview', icon: '👤' },
  { key: 'watchHistory', icon: '📺' },
  { key: 'favorites', icon: '❤️' },
  { key: 'myPurchases', icon: '🛒' },
  { key: 'mySeries', icon: '🎬' },
  { key: 'wallet', icon: '💰' },
  { key: 'settings', icon: '⚙️' },
]

// Nav items config for phone (includes about/contact as tabs)
export const phoneNavItems: { key: AccountTab; icon: string }[] = [
  { key: 'overview', icon: '👤' },
  { key: 'watchHistory', icon: '📺' },
  { key: 'favorites', icon: '❤️' },
  { key: 'myPurchases', icon: '🛒' },
  { key: 'mySeries', icon: '🎬' },
  { key: 'wallet', icon: '💰' },
  { key: 'settings', icon: '⚙️' },
  { key: 'about', icon: 'ℹ️' },
  { key: 'contact', icon: '✉️' },
]

export const walletAmounts = [1, 5, 10, 20, 50, 100, 200, 500]

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

// ===== Derived State / Selectors =====
// These compute derived values from the store state

// Get sorted watch history items (most recent first by updatedAt)
export const getSortedWatchHistoryItems = (items: { seriesId: string; episodeNumber: number; addedAt: Date; updatedAt: Date }[]) => {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

// Get sorted favorites items (most recent first by addedAt)
export const getSortedFavoritesItems = <T extends { addedAt: Date }>(items: T[]) => {
  return [...items].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  )
}

// Combine transactions and purchases into a single list for display
export const getCombinedTransactions = (
  transactions: Transaction[],
  purchases: PurchaseItem[],
): CombinedTransaction[] => {
  const combined: CombinedTransaction[] = [
    ...transactions.map((t) => ({
      id: t.id,
      type: t.type as CombinedTransactionType,
      amount: t.amount,
      status: t.status,
      referenceId: t.referenceId,
      createdAt: t.createdAt,
    })),
    ...purchases.map((p) => ({
      id: p._id,
      type: 'purchase' as const,
      amount: p.price,
      status: p.status || 'success',
      referenceId: p.referenceId || '-',
      createdAt: new Date(p.purchasedAt),
      purchase: p,
    })),
  ]
  return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// Filter transactions based on selected filter
export const getFilteredTransactions = (
  transactions: CombinedTransaction[],
  filter: TransactionFilter,
): CombinedTransaction[] => {
  if (filter === 'all') return transactions
  return transactions.filter((t) => t.type === filter)
}

// Format date for display (used in transaction history)
export const formatTransactionDate = (date: Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString()
}

// Format date with time for display
export const formatTransactionDateTime = (date: Date): string => {
  const d = new Date(date)
  return d.toLocaleString()
}

// Get status display class
export const getStatusClass = (status: string): string => {
  switch (status) {
    case 'success':
      return 'status-success'
    case 'failed':
      return 'status-failed'
    case 'processing':
      return 'status-processing'
    default:
      return ''
  }
}

// Check if profile form has changes
export const hasProfileChanges = (current: ProfileFormState, original: ProfileFormState): boolean => {
  return (
    current.nickname !== original.nickname ||
    current.email !== original.email ||
    current.phoneNumber !== original.phoneNumber ||
    current.gender !== original.gender ||
    current.birthday !== original.birthday
  )
}

// Group purchases by series for display
export const groupPurchasesBySeries = (purchases: PurchaseItem[]) => {
  const groups = purchases.reduce((acc, purchase) => {
    if (!acc[purchase.seriesId]) {
      acc[purchase.seriesId] = {
        seriesId: purchase.seriesId,
        seriesName: purchase.seriesName,
        seriesCover: purchase.seriesCover,
        episodes: [],
      }
    }
    acc[purchase.seriesId].episodes.push(purchase)
    return acc
  }, {} as Record<string, { seriesId: string; seriesName: string; seriesCover: string; episodes: PurchaseItem[] }>)
  
  return Object.values(groups)
}
