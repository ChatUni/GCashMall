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