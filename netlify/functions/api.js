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
  getFavorites,
  getUser,
  checkEmail,
  emailRegister,
  login,
  googleAuth,
  googleLogin,
  updateProfile,
  updateProfilePicture,
  updatePassword,
  setPassword,
  resetPassword,
  confirmResetPassword,
  addToWatchList,
  clearWatchHistory,
  removeFromWatchList,
  addToFavorites,
  removeFromFavorites,
  clearFavorites,
  migrateGenres,
  getMySeries,
  shelveSeries,
  getMyPurchases,
  addPurchase,
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
    favorites: (params) => getFavorites(params),
    user: (params) => getUser(params),
    checkEmail: (params) => checkEmail(params),
    mySeries: (params, authHeader) => getMySeries(params, authHeader),
    myPurchases: (params, authHeader) => getMyPurchases(params, authHeader),
  },
  post: {
    todo: (body) => saveTodo(body),
    saveSeries: (body, authHeader) => saveSeries(body, authHeader),
    uploadImage: (body) => uploadImage(body),
    deleteImage: (body) => deleteImage(body),
    uploadVideo: (body) => uploadVideo(body),
    deleteVideo: (body) => deleteVideo(body),
    emailRegister: (body) => emailRegister(body),
    login: (body) => login(body),
    googleAuth: (body) => googleAuth(body),
    googleLogin: (body) => googleLogin(body),
    updateProfile: (body, authHeader) => updateProfile(body, authHeader),
    updateProfilePicture: (body, authHeader) => updateProfilePicture(body, authHeader),
    updatePassword: (body, authHeader) => updatePassword(body, authHeader),
    setPassword: (body, authHeader) => setPassword(body, authHeader),
    resetPassword: (body) => resetPassword(body),
    confirmResetPassword: (body) => confirmResetPassword(body),
    addToWatchList: (body, authHeader) => addToWatchList(body, authHeader),
    clearWatchHistory: (body, authHeader) => clearWatchHistory(body, authHeader),
    removeFromWatchList: (body, authHeader) => removeFromWatchList(body, authHeader),
    addToFavorites: (body, authHeader) => addToFavorites(body, authHeader),
    removeFromFavorites: (body, authHeader) => removeFromFavorites(body, authHeader),
    clearFavorites: (body, authHeader) => clearFavorites(body, authHeader),
    migrateGenres: (body) => migrateGenres(body),
    shelveSeries: (body, authHeader) => shelveSeries(body, authHeader),
    addPurchase: (body, authHeader) => addPurchase(body, authHeader),
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
    const authHeader = event.headers?.authorization || event.headers?.Authorization

    validateRequest(method, type)

    const handler = getHandler(method, type)
    let result

    if (method === 'get') {
      // Pass auth header for handlers that need it (e.g., mySeries)
      result = await handler(queryParams, authHeader)
    } else {
      const body = parseBody(event.body)
      // Pass auth header for handlers that need it
      result = await handler(body, authHeader)
    }

    return createResponse(200, result)
  } catch (error) {
    console.error('API Error:', error)
    return createResponse(500, {
      success: false,
      error: error.message,
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