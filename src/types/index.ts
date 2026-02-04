export interface ProductCategory {
  _id: string
  name: string
  image: string
}

export interface Product {
  _id: string
  name: string
  description: string
  price: number
  image: string
  category: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface AccountFeature {
  _id: string
  name: string
  description: string
  icon?: string
}

export interface Series {
  _id: string
  name: string
  description: string
  cover: string
  videoId?: string
  genre: Genre[]
  tags?: string[]
  episodes?: Episode[]
  languages?: string[]
  uploaderId?: string
  shelved?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface Genre {
  _id: string
  name: string
}

export interface Episode {
  _id: string
  id: number
  seriesId: string
  title: string
  description: string
  thumbnail: string
  videoUrl: string
  videoId?: string
  duration: number
  episodeNumber: number
}

export type OAuthType = 'google' | 'facebook' | 'twitter' | 'linkedin'

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

export interface PurchaseItem {
  _id: string
  seriesId: string
  seriesName: string
  seriesCover: string
  episodeId: string
  episodeNumber: number
  episodeTitle: string
  episodeThumbnail?: string
  price: number
  purchasedAt: Date
  status: TransactionStatus
  referenceId: string
}

export interface WatchListItem {
  seriesId: string
  seriesName: string
  seriesCover: string
  episodeNumber: number
  addedAt: Date
  updatedAt: Date
}

export interface FavoriteUserItem {
  seriesId: string
  seriesName: string
  seriesCover: string
  seriesTags?: string[]
  addedAt: Date
}

export interface PurchaseHistoryItem {
  seriesId: string
  seriesName?: string
  episodeNumber: number
  cost?: number
  purchasedAt: Date | string
}

export interface User {
  _id: string | null
  email: string
  nickname: string
  avatar?: string | null
  phone?: string | null
  gender?: string | null
  birthday?: string | null
  sex?: string | null
  dob?: string | null
  balance?: number
  transactions?: Transaction[]
  purchases?: PurchaseItem[]
  hasPassword?: boolean
  watchList?: WatchListItem[]
  favorites?: FavoriteUserItem[]
  purchaseHistory?: PurchaseHistoryItem[]
  google_id?: string
  facebook_id?: string
  twitter_id?: string
  linkedin_id?: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface CheckEmailResponse {
  exists: boolean
}

export interface LoginRequest {
  email: string
  password: string
  oauthId?: string
  oauthType?: OAuthType
}

export interface RegisterRequest {
  email: string
  password?: string
  nickname?: string
  photoUrl?: string
  oauthId?: string
  oauthType?: OAuthType
}

export interface SetPasswordRequest {
  newPassword: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface ResetPasswordResponse {
  message: string
}

export interface WatchHistoryItem {
  _id: string
  seriesId: string
  seriesTitle: string
  episodeId: string
  episodeNumber: number
  thumbnail: string
  lastWatched: Date
  progress: number
  tag?: string
}

export interface FavoriteItem {
  _id: string
  seriesId: string
  seriesTitle: string
  thumbnail: string
  addedAt: Date
  tag?: string
}

export interface FeaturedSeries {
  _id: string
  series: Series
  isFeatured: boolean
}

export type NavItemType = 'home' | 'genre' | 'account' | 'history'

export interface SearchSuggestion {
  _id: string
  seriesId: string
  title: string
  tag: string
}