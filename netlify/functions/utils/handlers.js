import { get, save, remove } from './db.js'
import { ObjectId } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

// Bunny.net Video configuration
const BUNNY_VIDEO_LIBRARY_ID = process.env.VITE_BUNNY_LIBRARY_ID
const BUNNY_API_KEY = process.env.BUNNY_API_KEY

const getTodos = async (params) => {
  validateGetTodosParams(params)
  
  try {
    const todos = await get('todos', {}, {}, { createdAt: -1 })
    return {
      success: true,
      data: todos
    }
  } catch (error) {
    throw new Error(`Failed to get todos: ${error.message}`)
  }
}

const saveTodo = async (body) => {
  validateSaveTodoBody(body)
  
  try {
    const todoData = prepareTodoData(body)
    const result = await save('todos', todoData)
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    throw new Error(`Failed to save todo: ${error.message}`)
  }
}

const deleteTodo = async (body) => {
  validateDeleteTodoBody(body)
  
  try {
    const { id } = body
    const result = await remove('todos', { _id: id })
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    throw new Error(`Failed to delete todo: ${error.message}`)
  }
}

const getCategories = async (params) => {
  try {
    const categories = await get('categories', {}, {}, { name: 1 })
    return {
      success: true,
      data: categories
    }
  } catch (error) {
    throw new Error(`Failed to get categories: ${error.message}`)
  }
}

const getProducts = async (params) => {
  try {
    let filter = {}
    
    if (params.category) {
      filter.category = new ObjectId(params.category)
    }
    
    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { description: { $regex: params.search, $options: 'i' } }
      ]
    }
    
    const products = await get('products', filter, {}, { name: 1 })
    return {
      success: true,
      data: products
    }
  } catch (error) {
    throw new Error(`Failed to get products: ${error.message}`)
  }
}

const getSeries = async (params) => {
  try {
    if (params.id) {
      return await getSeriesById(params.id)
    }
    const filter = buildSeriesFilter(params)
    const series = await get('series', filter, {}, { name: 1 })
    const normalizedSeries = series.map(normalizeSeries)
    return {
      success: true,
      data: normalizedSeries,
    }
  } catch (error) {
    throw new Error(`Failed to get series: ${error.message}`)
  }
}

const getSeriesById = async (id) => {
  // Try to find by _id first (MongoDB ObjectId string)
  let series = await get('series', { _id: new ObjectId(id) }, {}, {}, 1)
  
  // If not found, try by numeric id
  if (!series || series.length === 0) {
    series = await get('series', { id: +id }, {}, {}, 1)
  }
  
  if (!series || series.length === 0) {
    return {
      success: false,
      error: 'Series not found',
    }
  }
  return {
    success: true,
    data: normalizeSeries(series[0]),
  }
}

const normalizeSeries = (series) => {
  if (!series) return null
  return {
    ...series,
    genre: Array.isArray(series.genre)
      ? series.genre.map((g) => ({ ...g, id: Number(g.id) }))
      : [],
  }
}

const buildSeriesFilter = (params) => {
  const filter = {}

  if (params.genreId) {
    filter.genre = {
      $elemMatch: { id: Number(params.genreId) },
    }
  }

  if (params.search) {
    filter.$or = [
      { name: { $regex: params.search, $options: 'i' } },
      { description: { $regex: params.search, $options: 'i' } }
    ]
  }

  return filter
}

const getGenres = async (params) => {
  try {
    const genres = await get('genre', {}, {}, { name: 1 })
    const normalizedGenres = genres.map((genre) => ({
      ...genre,
      id: Number(genre.id),
    }))
    return {
      success: true,
      data: normalizedGenres,
    }
  } catch (error) {
    throw new Error(`Failed to get genres: ${error.message}`)
  }
}

const saveSeries = async (body) => {
  validateSaveSeriesBody(body)

  try {
    const result = await save('series', body)
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    throw new Error(`Failed to save series: ${error.message}`)
  }
}

const validateSaveSeriesBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.name || typeof body.name !== 'string') {
    throw new Error('Series name is required and must be a string')
  }
}

const deleteSeries = async (body) => {
  validateDeleteSeriesBody(body)

  try {
    const { id } = body
    const result = await remove('series', { id })
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    throw new Error(`Failed to delete series: ${error.message}`)
  }
}

const validateDeleteSeriesBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.id) {
    throw new Error('Series id is required for deletion')
  }
}

// New handlers for player and account features

const getFeaturedSeries = async (params) => {
  try {
    // Get the first series marked as featured, or just the first series
    let featured = await get('series', { isFeatured: true }, {}, {}, 1)
    
    if (!featured || featured.length === 0) {
      featured = await get('series', {}, {}, { createdAt: -1 }, 1)
    }
    
    if (!featured || featured.length === 0) {
      return {
        success: true,
        data: null
      }
    }
    
    return {
      success: true,
      data: normalizeSeries(featured[0])
    }
  } catch (error) {
    throw new Error(`Failed to get featured series: ${error.message}`)
  }
}

const getRecommendations = async (params) => {
  try {
    // Get a random selection of series as recommendations
    const series = await get('series', {}, {}, { createdAt: -1 }, 6)
    const normalizedSeries = series.map(normalizeSeries)
    return {
      success: true,
      data: normalizedSeries
    }
  } catch (error) {
    throw new Error(`Failed to get recommendations: ${error.message}`)
  }
}

const getNewReleases = async (params) => {
  try {
    // Get the most recently added series
    const series = await get('series', {}, {}, { createdAt: -1 }, 6)
    const normalizedSeries = series.map(normalizeSeries)
    return {
      success: true,
      data: normalizedSeries
    }
  } catch (error) {
    throw new Error(`Failed to get new releases: ${error.message}`)
  }
}

const getSearchSuggestions = async (params) => {
  try {
    const query = params.q || ''
    if (!query || query.length < 1) {
      return { success: true, data: [] }
    }
    
    const series = await get(
      'series',
      { name: { $regex: query, $options: 'i' } },
      { _id: 1, name: 1, genre: 1 },
      {},
      5
    )
    
    const suggestions = series.map((s) => ({
      _id: s._id,
      seriesId: s._id,
      title: s.name,
      tag: s.genre && s.genre.length > 0 ? s.genre[0].name : ''
    }))
    
    return {
      success: true,
      data: suggestions
    }
  } catch (error) {
    throw new Error(`Failed to get search suggestions: ${error.message}`)
  }
}

const getEpisodes = async (params) => {
  try {
    const seriesId = params.seriesId
    if (!seriesId) {
      return { success: false, error: 'Series ID is required' }
    }
    
    const episodes = await get(
      'episodes',
      { seriesId: seriesId },
      {},
      { episodeNumber: 1 }
    )
    
    // If no episodes found, return the series videoId as a single episode
    if (!episodes || episodes.length === 0) {
      const seriesResult = await getSeriesById(seriesId)
      if (seriesResult.success && seriesResult.data && seriesResult.data.videoId) {
        const series = seriesResult.data
        return {
          success: true,
          data: [
            {
              _id: `${seriesId}-ep1`,
              id: 1,
              seriesId: seriesId,
              title: series.name || 'Episode 1',
              description: series.description || '',
              thumbnail: series.cover || '',
              videoId: series.videoId,
              duration: 0,
              episodeNumber: 1,
            },
          ],
        }
      }
    }
    
    return {
      success: true,
      data: episodes
    }
  } catch (error) {
    throw new Error(`Failed to get episodes: ${error.message}`)
  }
}

const getWatchHistory = async (params) => {
  try {
    const limit = params.limit ? parseInt(params.limit) : 20
    const history = await get('watchHistory', {}, {}, { lastWatched: -1 }, limit)
    return {
      success: true,
      data: history
    }
  } catch (error) {
    throw new Error(`Failed to get watch history: ${error.message}`)
  }
}

const getFavorites = async (params) => {
  try {
    const limit = params.limit ? parseInt(params.limit) : 20
    const favorites = await get('favorites', {}, {}, { addedAt: -1 }, limit)
    return {
      success: true,
      data: favorites
    }
  } catch (error) {
    throw new Error(`Failed to get favorites: ${error.message}`)
  }
}

const getUser = async (params) => {
  try {
    // For now, return a mock user or null
    // In production, this would validate session and return user data
    const users = await get('users', {}, {}, {}, 1)
    
    if (users && users.length > 0) {
      return {
        success: true,
        data: {
          ...users[0],
          isLoggedIn: true
        }
      }
    }
    
    return {
      success: true,
      data: {
        _id: null,
        username: 'Guest',
        email: '',
        isLoggedIn: false
      }
    }
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`)
  }
}

const login = async (body) => {
  try {
    const { email, password } = body
    
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' }
    }
    
    // For demo purposes, accept any credentials
    // In production, this would validate against the database
    const user = {
      _id: 'demo-user',
      username: email.split('@')[0],
      email: email,
      isLoggedIn: true
    }
    
    return {
      success: true,
      data: user
    }
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`)
  }
}

const clearWatchHistory = async (body) => {
  try {
    await remove('watchHistory', {})
    return {
      success: true,
      data: { cleared: true }
    }
  } catch (error) {
    throw new Error(`Failed to clear watch history: ${error.message}`)
  }
}

const uploadImage = async (body) => {
  validateUploadImageBody(body)

  try {
    const uploadOptions = {
      folder: body.folder || 'gcashmall',
    }

    // If public_id is provided, use it (for updating existing images)
    if (body.public_id) {
      uploadOptions.public_id = body.public_id
      uploadOptions.overwrite = true
    }

    const result = await cloudinary.uploader.upload(body.image, uploadOptions)

    return {
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    }
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }
}

const deleteImage = async (body) => {
  validateDeleteImageBody(body)

  try {
    const result = await cloudinary.uploader.destroy(body.public_id)

    return {
      success: true,
      data: {
        deleted: result.result === 'ok',
        result: result.result,
      },
    }
  } catch (error) {
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}

const validateUploadImageBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.image || typeof body.image !== 'string') {
    throw new Error('Image data is required and must be a string (base64 or URL)')
  }
}

const validateDeleteImageBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.public_id || typeof body.public_id !== 'string') {
    throw new Error('Image public_id is required for deletion')
  }
}

const uploadVideo = async (body) => {
  validateUploadVideoBody(body)

  try {
    const videoId = await createBunnyVideo(body.title || 'Untitled')
    await uploadVideoToBunny(videoId, body.video)

    return {
      success: true,
      data: {
        videoId,
        embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_VIDEO_LIBRARY_ID}/${videoId}`,
        thumbnailUrl: `https://vz-4ecde8c7-5c4.b-cdn.net/${videoId}/thumbnail.jpg`,
      },
    }
  } catch (error) {
    throw new Error(`Failed to upload video: ${error.message}`)
  }
}

const createBunnyVideo = async (title) => {
  const response = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_VIDEO_LIBRARY_ID}/videos`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        AccessKey: BUNNY_API_KEY,
      },
      body: JSON.stringify({ title }),
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to create video: ${response.statusText}`)
  }

  const data = await response.json()
  return data.guid
}

const uploadVideoToBunny = async (videoId, videoData) => {
  const response = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_VIDEO_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/octet-stream',
        AccessKey: BUNNY_API_KEY,
      },
      body: Buffer.from(videoData, 'base64'),
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to upload video content: ${response.statusText}`)
  }
}

const deleteVideo = async (body) => {
  validateDeleteVideoBody(body)

  try {
    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_VIDEO_LIBRARY_ID}/videos/${body.videoId}`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          AccessKey: BUNNY_API_KEY,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to delete video: ${response.statusText}`)
    }

    return {
      success: true,
      data: {
        deleted: true,
      },
    }
  } catch (error) {
    throw new Error(`Failed to delete video: ${error.message}`)
  }
}

const validateUploadVideoBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.video || typeof body.video !== 'string') {
    throw new Error('Video data is required and must be a base64 string')
  }
}

const validateDeleteVideoBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.videoId || typeof body.videoId !== 'string') {
    throw new Error('Video ID is required for deletion')
  }
}

const validateGetTodosParams = (params) => {
  // No specific validation needed for getting todos
}

const validateSaveTodoBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }
  
  if (!body.text || typeof body.text !== 'string') {
    throw new Error('Todo text is required and must be a string')
  }
  
  if (body.text.trim().length === 0) {
    throw new Error('Todo text cannot be empty')
  }
}

const validateDeleteTodoBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }
  
  if (!body.id) {
    throw new Error('Todo id is required for deletion')
  }
}

const prepareTodoData = (body) => {
  const todoData = {
    text: body.text.trim(),
    completed: body.completed || false,
    createdAt: body.createdAt || new Date(),
    updatedAt: new Date()
  }
  
  if (body._id) {
    todoData._id = body._id
  }
  
  return todoData
}

export {
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
}