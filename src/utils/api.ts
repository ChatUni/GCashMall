export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return 'http://localhost:8888'
  }
  return ''
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