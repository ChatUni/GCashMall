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
  id: number
  name: string
  description: string
  cover: string
  videoId?: string
  genre: Genre[]
  tags?: string[]
  episodes?: Episode[]
  languages?: string[]
}

export interface Genre {
  id: number
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
  duration: number
  episodeNumber: number
}

export interface User {
  _id: string
  username: string
  email: string
  avatar?: string
  isLoggedIn: boolean
}

export interface WatchHistoryItem {
  _id: string
  seriesId: string
  seriesTitle: string
  episodeId: string
  episodeNumber: number
  thumbnail: string
  lastWatched?: Date
  watchedAt?: string
  progress?: number
  tag?: string
}

export interface FavoriteItem {
  _id: string
  seriesId: string
  seriesTitle: string
  thumbnail: string
  addedAt?: Date
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