import type {
  AuthResponse,
  CheckEmailResponse,
  LoginRequest,
  RegisterRequest,
} from '../types'

export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return 'http://localhost:8888'
  }
  return window.location.origin
}

const buildUrl = (type: string, params?: Record<string, string | number>): string => {
  const baseUrl = getApiBaseUrl()
  const url = new URL(`${baseUrl}/.netlify/functions/api`)
  url.searchParams.set('type', type)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}

export const apiGet = async <T>(
  type: string,
  params?: Record<string, string | number>,
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const url = buildUrl(type, params)
    const response = await fetch(url)
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API GET error for type "${type}":`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const apiGetWithAuth = async <T>(
  type: string,
  params?: Record<string, string | number>,
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const url = buildUrl(type, params)
    const token = localStorage.getItem('gcashmall_token')

    const headers: Record<string, string> = {}

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, { headers })
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API GET (auth) error for type "${type}":`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const apiPost = async <T>(
  type: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/.netlify/functions/api?type=${type}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API POST error for type "${type}":`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const apiPostWithAuth = async <T>(
  type: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/.netlify/functions/api?type=${type}`
    const token = localStorage.getItem('gcashmall_token')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API POST (auth) error for type "${type}":`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const apiDelete = async <T>(
  type: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/.netlify/functions/api?type=${type}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API DELETE error for type "${type}":`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const apiPostFormData = async <T>(
  type: string,
  formData: FormData,
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/.netlify/functions/api?type=${type}`

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API POST FormData error for type "${type}":`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Account API functions

export const checkEmail = async (
  email: string,
): Promise<{ success: boolean; data?: CheckEmailResponse; error?: string }> => {
  return apiGet<CheckEmailResponse>('checkEmail', { email })
}

export const emailRegister = async (
  request: RegisterRequest,
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
  return apiPost<AuthResponse>('emailRegister', request as unknown as Record<string, unknown>)
}

export const login = async (
  request: LoginRequest,
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
  return apiPost<AuthResponse>('login', request as unknown as Record<string, unknown>)
}

// Token storage utilities
const TOKEN_KEY = 'gcashmall_token'
const USER_KEY = 'gcashmall_user'

export const saveAuthData = (token: string, user: AuthResponse['user']): void => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const getStoredUser = (): AuthResponse['user'] | null => {
  const userJson = localStorage.getItem(USER_KEY)
  if (!userJson) return null
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

export const clearAuthData = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const isLoggedIn = (): boolean => {
  return !!getStoredToken()
}