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
}