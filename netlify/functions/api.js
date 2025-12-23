import {
  getTodos,
  saveTodo,
  deleteTodo,
  getCategories,
  getProducts,
  getSeries,
  getGenres,
  saveSeries,
  deleteSeries,
  uploadImage,
  deleteImage,
  uploadVideo,
  deleteVideo,
  getFeaturedSeries,
  getRecommendations,
  getNewReleases,
  getSearchSuggestions,
  getEpisodes,
  getWatchHistory,
  getFavorites,
  getUser,
  login,
  clearWatchHistory,
} from './utils/handlers.js'

const apiHandlers = {
  get: {
    todos: (params) => getTodos(params),
    categories: (params) => getCategories(params),
    products: (params) => getProducts(params),
    series: (params) => getSeries(params),
    genres: (params) => getGenres(params),
    featured: (params) => getFeaturedSeries(params),
    recommendations: (params) => getRecommendations(params),
    newReleases: (params) => getNewReleases(params),
    searchSuggestions: (params) => getSearchSuggestions(params),
    episodes: (params) => getEpisodes(params),
    watchHistory: (params) => getWatchHistory(params),
    favorites: (params) => getFavorites(params),
    user: (params) => getUser(params),
  },
  post: {
    todo: (body) => saveTodo(body),
    saveSeries: (body) => saveSeries(body),
    uploadImage: (body) => uploadImage(body),
    deleteImage: (body) => deleteImage(body),
    uploadVideo: (body) => uploadVideo(body),
    deleteVideo: (body) => deleteVideo(body),
    login: (body) => login(body),
    clearWatchHistory: (body) => clearWatchHistory(body),
  },
  delete: {
    todo: (body) => deleteTodo(body),
    series: (body) => deleteSeries(body),
  },
}

export const handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {})
  }

  try {
    const method = event.httpMethod.toLowerCase()
    const queryParams = event.queryStringParameters || {}
    const { type } = queryParams
    
    validateRequest(method, type)
    
    const handler = getHandler(method, type)
    let result
    
    if (method === 'get') {
      result = await handler(queryParams)
    } else {
      const body = parseBody(event.body)
      result = await handler(body)
    }
    
    return createResponse(200, result)
    
  } catch (error) {
    console.error('API Error:', error)
    return createResponse(500, {
      success: false,
      error: error.message
    })
  }
}

const validateRequest = (method, type) => {
  if (!type) {
    throw new Error('type parameter is required')
  }
  
  if (!apiHandlers[method]) {
    throw new Error(`HTTP method ${method} is not supported`)
  }
  
  if (!apiHandlers[method][type]) {
    throw new Error(`Handler for ${method}:${type} not found`)
  }
}

const getHandler = (method, type) => {
  return apiHandlers[method][type]
}

const parseBody = (body) => {
  if (!body) {
    return {}
  }
  
  try {
    return JSON.parse(body)
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

const createResponse = (statusCode, data) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    },
    body: JSON.stringify(data)
  }
}