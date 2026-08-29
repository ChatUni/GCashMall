import { get, save, remove, update, aggregate } from './db.js'
import { ObjectId } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import Stripe from 'stripe'
import { sendPasswordResetEmail, sendFeedbackEmail } from './email.js'
import mammoth from 'mammoth'
import { containsProfanity } from './profanity.js'
import { verifyAppleTransaction } from './appleIAP.js'
import { verifyGooglePlayTransaction } from './googlePlay.js'
import { finalizeGUSDOrder, parseGUSDOrderId } from './gusdTopup.js'
import { reserveTransaction, releaseTransaction } from './iapLedger.js'
import { bunnyEmbedUrl } from './bunny.js'
import { triggerBackground } from './trigger.js'
import {
  getChatModel,
  chatTuning,
  MODEL_DEFAULTS,
  CHAT_MODEL_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  SEEDANCE_MODEL_OPTIONS,
} from './modelConfig.js'

// Configure Stripe
const stripe = process.env.STRIPE_PRIVATE_KEY
  ? new Stripe(process.env.STRIPE_PRIVATE_KEY)
  : null

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

// Bunny.net Video configuration
const BUNNY_VIDEO_LIBRARY_ID = process.env.VITE_BUNNY_LIBRARY_ID
const BUNNY_API_KEY = process.env.BUNNY_API_KEY
// CDN pull-zone host for direct asset URLs (thumbnails). Prefer the env var; the fallback
// must match the CURRENT library (VITE_BUNNY_LIBRARY_ID) or URLs hit "domain not configured".
const BUNNY_PULL_ZONE = (process.env.BUNNY_PULL_ZONE || 'vz-918d4e7e-1fb.b-cdn.net').replace(/^["']|["']$/g, '')
const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

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
    const populatedSeries = await populateSeriesGenres(series)
    return {
      success: true,
      data: populatedSeries,
    }
  } catch (error) {
    throw new Error(`Failed to get series: ${error.message}`)
  }
}

const getSeriesById = async (id) => {
  // Try to find by _id first (MongoDB ObjectId string)
  let series = await get('series', { _id: new ObjectId(id) }, {}, {}, 1)
  
  if (!series || series.length === 0) {
    return {
      success: false,
      error: 'Series not found',
    }
  }
  
  const populatedSeries = await populateSeriesGenres(series)
  return {
    success: true,
    data: populatedSeries[0],
  }
}

// Populate genre objects from _id array
const populateSeriesGenres = async (seriesList) => {
  if (!seriesList || seriesList.length === 0) return []
  
  // Get all genres once
  const allGenres = await get('genre', {}, {}, {})
  const genreMap = new Map()
  for (const genre of allGenres) {
    genreMap.set(String(genre._id), genre)
  }
  
  return seriesList.map((series) => {
    if (!series) return null
    
    // Populate genre array
    let populatedGenre = []
    if (Array.isArray(series.genre)) {
      populatedGenre = series.genre
        .map((genreId) => {
          // Handle both old format (object with id/name) and new format (just _id)
          if (typeof genreId === 'object' && genreId.name) {
            return { _id: genreId._id || genreId.id, name: genreId.name }
          }
          const genre = genreMap.get(String(genreId))
          return genre ? { _id: genre._id, name: genre.name } : null
        })
        .filter(Boolean)
    }
    
    return {
      ...series,
      genre: populatedGenre,
    }
  })
}

const buildSeriesFilter = (params) => {
  // Shelved series are hidden from public listings (genre page, search).
  const filter = { shelved: { $ne: true } }

  if (params.genreId) {
    // Support both old format (object with id) and new format (just _id)
    try {
      const genreObjectId = new ObjectId(params.genreId)
      filter.genre = genreObjectId
    } catch {
      // If not a valid ObjectId, try matching old format
      filter.genre = {
        $elemMatch: { id: Number(params.genreId) },
      }
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
    // Return genres with only _id and name (no legacy id field)
    let cleanGenres = genres.map((genre) => ({
      _id: genre._id,
      name: genre.name,
    }))
    // used=true → only surface genres referenced by a series that actually has episodes,
    // so clicking a genre on the Genre page can never land on an empty list.
    if (params && (params.used === 'true' || params.used === true)) {
      const usedIds = await getUsedGenreIds()
      cleanGenres = cleanGenres.filter((genre) => usedIds.has(String(genre._id)))
    }
    return {
      success: true,
      data: cleanGenres,
    }
  } catch (error) {
    throw new Error(`Failed to get genres: ${error.message}`)
  }
}

// The set of genre id strings referenced by at least one series that has episodes.
const getUsedGenreIds = async () => {
  // Only genres used by a non-shelved series with episodes (so the sidebar never lists a
  // genre whose only series are shelved/empty and would click through to nothing).
  // $slice: 1 keeps the payload tiny — we only need to know an episode exists.
  const series = await get('series', { shelved: { $ne: true } }, { genre: 1, episodes: { $slice: 1 } }, {})
  const ids = new Set()
  for (const s of series) {
    if (!Array.isArray(s.episodes) || s.episodes.length === 0) continue
    for (const g of s.genre || []) {
      // Legacy entries are plain objects { _id/id, name }; modern ones are ObjectId (or
      // string) — String() gives the hex id for both, matching genreMap keys.
      const id = g && typeof g === 'object' && g.name ? g._id || g.id : g
      if (id != null) ids.add(String(id))
    }
  }
  return ids
}

const saveSeries = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  await validateUploadPermission(userId)
  validateSaveSeriesBody(body)

  try {
    // If editing existing series, verify the logged in user is the uploader
    if (body._id) {
      const existingSeries = await get('series', { _id: new ObjectId(body._id) }, {}, {}, 1)
      if (!existingSeries || existingSeries.length === 0) {
        return { success: false, error: 'Series not found' }
      }
      if (String(existingSeries[0].uploaderId) !== String(userId)) {
        return { success: false, error: 'You are not authorized to edit this series' }
      }
      // Convert _id to ObjectId
      body._id = new ObjectId(body._id)
    } else {
      // If creating a new series (no _id), set the uploader
      body.uploaderId = new ObjectId(userId)
      body.createdAt = new Date()
    }
    body.updatedAt = new Date()
    
    // Convert genre array to ObjectIds
    if (Array.isArray(body.genre)) {
      body.genre = body.genre.map((genreId) => new ObjectId(genreId))
    }
    
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

const deleteSeries = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateDeleteSeriesBody(body)

  try {
    const { id } = body
    const series = await getSeriesForDeletion(id)

    validateSeriesUploader(series, userId)
    await validateNoEpisodePurchased(id)

    await remove('series', { _id: new ObjectId(id) })

    return {
      success: true,
      data: { message: 'Series deleted successfully' },
    }
  } catch (error) {
    if (error.message.includes('not authorized') || error.message.includes('purchased')) {
      return { success: false, error: error.message }
    }
    throw new Error(`Failed to delete series: ${error.message}`)
  }
}

const getSeriesForDeletion = async (id) => {
  const seriesResult = await get('series', { _id: new ObjectId(id) }, {}, {}, 1)
  if (!seriesResult || seriesResult.length === 0) {
    throw new Error('Series not found')
  }
  return seriesResult[0]
}

const validateSeriesUploader = (series, userId) => {
  if (String(series.uploaderId) !== String(userId)) {
    throw new Error('You are not authorized to delete this series')
  }
}

const validateNoEpisodePurchased = async (seriesId) => {
  const usersWithPurchases = await get(
    'users',
    {
      $or: [
        { 'purchases.seriesId': seriesId },
        { 'purchaseHistory.seriesId': seriesId },
      ],
    },
    {},
    {},
    1,
  )

  if (usersWithPurchases && usersWithPurchases.length > 0) {
    throw new Error('Cannot delete series: some episodes have been purchased by users')
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

// Utility function to shuffle an array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const getFeaturedSeries = async (params) => {
  try {
    // Get all series and pick a random one as featured (exclude shelved)
    const allSeries = await get('series', { shelved: { $ne: true } }, {}, {})
    
    if (!allSeries || allSeries.length === 0) {
      return {
        success: true,
        data: null
      }
    }
    
    // Pick a random series
    const randomIndex = Math.floor(Math.random() * allSeries.length)
    const featured = [allSeries[randomIndex]]
    
    const populatedSeries = await populateSeriesGenres(featured)
    return {
      success: true,
      data: populatedSeries[0]
    }
  } catch (error) {
    throw new Error(`Failed to get featured series: ${error.message}`)
  }
}

const getRecommendations = async (params) => {
  try {
    const targetCount = 10
    const seriesIds = await getSeriesIdsSortedByLikes(targetCount)
    const series = await getSeriesByIds(seriesIds)
    const orderedSeries = orderSeriesByIds(series, seriesIds)
    const filledSeries = await backfillWithRandomSeries(
      orderedSeries,
      targetCount,
    )
    const populatedSeries = await populateSeriesGenres(filledSeries)
    return {
      success: true,
      data: populatedSeries,
    }
  } catch (error) {
    throw new Error(`Failed to get recommendations: ${error.message}`)
  }
}

// Paginated feed of series that contain a playable video (for the phone home page)
const getVideoFeed = async (params) => {
  try {
    const page = parseInt(params.page) || 1
    const limit = parseInt(params.limit) || 5
    const skip = (page - 1) * limit
    const filter = { ...seriesWithVideoFilter(), shelved: { $ne: true } }
    const series = await get('series', filter, {}, { createdAt: -1 }, limit, skip)
    const populatedSeries = await populateSeriesGenres(series)
    return {
      success: true,
      data: populatedSeries,
    }
  } catch (error) {
    throw new Error(`Failed to get video feed: ${error.message}`)
  }
}

// A series is playable when it has its own videoId or an episode with a videoId
const seriesWithVideoFilter = () => ({
  $or: [
    { videoId: { $exists: true, $nin: [null, ''] } },
    { 'episodes.videoId': { $exists: true, $nin: [null, ''] } },
  ],
})

const getSeriesIdsSortedByLikes = async (limit) => {
  const pipeline = [
    { $group: { _id: '$seriesId', likeCount: { $sum: 1 } } },
    { $sort: { likeCount: -1 } },
    { $limit: limit },
  ]
  const results = await aggregate('likes', pipeline)
  return results.map((r) => r._id)
}

const getSeriesByIds = async (seriesIds) => {
  if (seriesIds.length === 0) return []
  return await get('series', { _id: { $in: seriesIds.map((id) => new ObjectId(id)) }, shelved: { $ne: true } })
}

const orderSeriesByIds = (series, seriesIds) => {
  const seriesMap = new Map(series.map((s) => [s._id.toString(), s]))
  return seriesIds.map((id) => seriesMap.get(id)).filter(Boolean)
}

const backfillWithRandomSeries = async (existingSeries, targetCount) => {
  if (existingSeries.length >= targetCount) return existingSeries

  const remaining = targetCount - existingSeries.length
  const excludeIds = existingSeries.map((s) => s._id)
  const randomSeries = await get(
    'series',
    { _id: { $nin: excludeIds }, shelved: { $ne: true } },
    {},
    {},
    remaining * 2,
  )
  const shuffled = shuffleArray(randomSeries).slice(0, remaining)
  return [...existingSeries, ...shuffled]
}

const getNewReleases = async (params) => {
  try {
    // Get series and randomize the order (exclude shelved)
    const series = await get('series', { shelved: { $ne: true } }, {}, {}, 20)
    const shuffledSeries = shuffleArray(series).slice(0, 10)
    const populatedSeries = await populateSeriesGenres(shuffledSeries)
    return {
      success: true,
      data: populatedSeries
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
    
    // Populate genres for search suggestions
    const populatedSeries = await populateSeriesGenres(series)
    
    const suggestions = populatedSeries.map((s) => ({
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
    
    // Get series and return episodes from the series.episodes field
    const seriesResult = await getSeriesById(seriesId)
    if (!seriesResult.success || !seriesResult.data) {
      return { success: false, error: 'Series not found' }
    }
    
    const series = seriesResult.data
    
    // If series has episodes array, return it
    if (series.episodes && series.episodes.length > 0) {
      // Sort episodes by episodeNumber
      const sortedEpisodes = [...series.episodes].sort(
        (a, b) => a.episodeNumber - b.episodeNumber,
      )
      return {
        success: true,
        data: sortedEpisodes,
      }
    }
    
    // If no episodes array but series has a videoId, return it as single episode
    if (series.videoId) {
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
    
    // No episodes found
    return {
      success: true,
      data: [],
    }
  } catch (error) {
    throw new Error(`Failed to get episodes: ${error.message}`)
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

// Check if email exists in database
const checkEmail = async (params) => {
  validateCheckEmailParams(params)

  try {
    const { email } = params
    const existingUsers = await get('users', { email: email.toLowerCase() }, {}, {}, 1)
    const exists = existingUsers && existingUsers.length > 0

    return {
      success: true,
      data: { exists },
    }
  } catch (error) {
    throw new Error(`Failed to check email: ${error.message}`)
  }
}

const validateCheckEmailParams = (params) => {
  if (!params || !params.email) {
    throw new Error('Email is required')
  }

  if (!isValidEmail(params.email)) {
    throw new Error('Invalid email address')
  }
}

// Email registration
const emailRegister = async (body) => {
  validateEmailRegisterBody(body)

  try {
    const { email, password, nickname, photoUrl, oauthId, oauthType } = body

    // Check if email already exists
    const existingUsers = await get('users', { email: email.toLowerCase() }, {}, {}, 1)
    if (existingUsers && existingUsers.length > 0) {
      return { success: false, error: 'Email already exists' }
    }

    // Create new user with default nickname "Guest" if not provided
    const newUser = {
      email: email.toLowerCase(),
      nickname: nickname || 'Guest',
      avatar: photoUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Hash and store password only if provided (OAuth users may not have password)
    if (password) {
      newUser.password = await bcrypt.hash(password, 10)
    }

    // Add OAuth info if provided
    if (oauthId && oauthType) {
      newUser[`${oauthType}_id`] = oauthId
    }

    // Grant the admin-configured welcome credit as the new user's initial balance
    await applyWelcomeCredit(newUser)

    const result = await save('users', newUser)

    // Generate JWT token
    const token = generateToken({ email: newUser.email, id: result.insertedId })

    // Return user without password
    const userResponse = await buildUserResponse({
      ...newUser,
      _id: result.insertedId,
    })

    return {
      success: true,
      data: {
        user: userResponse,
        token,
      },
    }
  } catch (error) {
    throw new Error(`Registration failed: ${error.message}`)
  }
}

// Set the new user's starting balance + a matching transaction from the admin-configured
// welcome credit. No-op when the credit is 0. Mutates the user object in place.
const applyWelcomeCredit = async (newUser) => {
  const { welcomeCredit } = await readSystemSettings()
  if (!welcomeCredit || welcomeCredit <= 0) return
  newUser.balance = welcomeCredit
  newUser.transactions = [buildWelcomeTransaction(welcomeCredit)]
}

const buildWelcomeTransaction = (amount) => ({
  id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  referenceId: generateReferenceId(),
  type: 'topup',
  method: 'welcome',
  amount,
  status: 'success',
  createdAt: new Date(),
})

const validateEmailRegisterBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.email) {
    throw new Error('Email is required')
  }

  if (!isValidEmail(body.email)) {
    throw new Error('Invalid email address')
  }

  // Password is required if no OAuth type/id
  const hasOAuth = body.oauthId && body.oauthType
  if (!hasOAuth && !body.password) {
    throw new Error('Password is required')
  }

  // Validate password format if provided
  if (body.password && !isValidPassword(body.password)) {
    throw new Error(
      'Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    )
  }
}

// Google OAuth - exchange code for user info
const googleAuth = async (body) => {
  if (!body || !body.code || !body.redirectUri) {
    throw new Error('Authorization code and redirect URI are required')
  }

  try {
    const { code, redirectUri } = body
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    console.log('[googleAuth] Starting token exchange...')
    console.log('[googleAuth] Client ID present:', !!clientId)
    console.log('[googleAuth] Client Secret present:', !!clientSecret)
    console.log('[googleAuth] Redirect URI:', redirectUri)
    console.log('[googleAuth] Code length:', code?.length)

    if (!clientId) {
      return { success: false, error: 'VITE_GOOGLE_CLIENT_ID is not configured' }
    }
    if (!clientSecret) {
      return { success: false, error: 'GOOGLE_CLIENT_SECRET is not configured' }
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log('[googleAuth] Token response status:', tokenResponse.status)
    console.log('[googleAuth] Token data:', JSON.stringify(tokenData, null, 2))

    if (!tokenData.access_token) {
      // Return detailed error from Google
      const errorMessage = tokenData.error_description || tokenData.error || 'Failed to get access token'
      console.error('[googleAuth] Token exchange failed:', errorMessage)
      return { success: false, error: errorMessage }
    }

    // Get user info from Google
    console.log('[googleAuth] Getting user info from Google...')
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const userInfo = await userInfoResponse.json()
    console.log('[googleAuth] User info:', JSON.stringify(userInfo, null, 2))

    return {
      success: true,
      data: {
        id: userInfo.id,
        name: userInfo.name || userInfo.given_name || 'Guest',
        email: userInfo.email,
        picture: userInfo.picture,
      },
    }
  } catch (error) {
    console.error('[googleAuth] Exception:', error)
    throw new Error(`Google OAuth failed: ${error.message}`)
  }
}

// Google login - for existing users who registered via Google
const googleLogin = async (body) => {
  if (!body || !body.email) {
    throw new Error('Email is required')
  }

  try {
    const { email, oauthId, oauthType } = body

    // Find user by email
    const users = await get('users', { email: email.toLowerCase() }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const user = users[0]

    // Generate JWT token
    const token = generateToken({ email: user.email, id: user._id })

    // Add OAuth type/id to the account if not exist
    if (oauthId && oauthType) {
      const oauthKey = `${oauthType}_id`
      if (!user[oauthKey]) {
        const updateData = {
          ...user,
          [oauthKey]: oauthId,
          updatedAt: new Date(),
        }
        await save('users', updateData)
      }
    }

    // Return user without password
    const userResponse = await buildUserResponse(user)

    return {
      success: true,
      data: {
        user: userResponse,
        token,
      },
    }
  } catch (error) {
    throw new Error(`Google login failed: ${error.message}`)
  }
}

// Login with email and password
const login = async (body) => {
  validateLoginBody(body)

  try {
    const { email, password, oauthId, oauthType } = body

    // Find user by email
    const users = await get('users', { email: email.toLowerCase() }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'Invalid email or password' }
    }

    const user = users[0]

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Generate JWT token
    const token = generateToken({ email: user.email, id: user._id })

    // Add OAuth type/id to the account if not exist
    if (oauthId && oauthType) {
      const oauthKey = `${oauthType}_id`
      if (!user[oauthKey]) {
        const updateData = {
          ...user,
          [oauthKey]: oauthId,
          updatedAt: new Date(),
        }
        await save('users', updateData)
      }
    }

    // Return user without password
    const userResponse = await buildUserResponse(user)

    return {
      success: true,
      data: {
        user: userResponse,
        token,
      },
    }
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`)
  }
}

const validateLoginBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.email) {
    throw new Error('Email is required')
  }

  if (!isValidEmail(body.email)) {
    throw new Error('Invalid email address')
  }

  if (!body.password) {
    throw new Error('Password is required')
  }
}

// Helper functions for validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isValidPassword = (password) => {
  // At least 6 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const minLength = password.length >= 6
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial
}

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// Update user profile
const updateProfile = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  console.log('[updateProfile] userId extracted from token:', userId)
  validateUpdateProfileBody(body)

  try {
    const { email, nickname, phone, sex, dob } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== currentUser.email) {
      const existingUsers = await get(
        'users',
        { email: email.toLowerCase(), _id: { $ne: new ObjectId(userId) } },
        {},
        {},
        1,
      )
      if (existingUsers && existingUsers.length > 0) {
        return { success: false, error: 'Email already exists' }
      }
    }

    // Build update object
    const updateData = {
      ...currentUser,
      updatedAt: new Date(),
    }

    if (email) updateData.email = email.toLowerCase()
    if (nickname !== undefined) updateData.nickname = nickname
    if (phone !== undefined) updateData.phone = phone
    if (sex !== undefined) updateData.sex = sex
    if (dob !== undefined) updateData.dob = dob

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }
}

const validateAuth = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded.id
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

// Validate that the authenticated user has upload permission
const validateUploadPermission = async (userId) => {
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) {
    throw new Error('User not found')
  }

  if (!users[0].allowUpload) {
    throw new Error('You do not have permission to upload series')
  }
}

const validateUpdateProfileBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  // Validate email if provided
  if (body.email && !isValidEmail(body.email)) {
    throw new Error('Invalid email address')
  }

  // Validate phone if provided
  if (body.phone && !isValidPhone(body.phone)) {
    throw new Error('Invalid phone number')
  }

  // Validate sex if provided
  if (body.sex && !['male', 'female', 'other'].includes(body.sex)) {
    throw new Error('Invalid sex value')
  }

  // Validate dob if provided
  if (body.dob && !isValidDate(body.dob)) {
    throw new Error('Invalid date of birth')
  }
}

const isValidPhone = (phone) => {
  // Basic phone validation - allows digits, spaces, dashes, parentheses, and plus sign
  const phoneRegex = /^[\d\s\-\(\)\+]+$/
  return phone.length >= 10 && phoneRegex.test(phone)
}

const isValidDate = (dateStr) => {
  const date = new Date(dateStr)
  return !isNaN(date.getTime()) && date < new Date()
}

// Update profile picture
const updateProfilePicture = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateUpdateProfilePictureBody(body)

  try {
    const { photoUrl } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Update avatar
    const updateData = {
      ...currentUser,
      avatar: photoUrl,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to update profile picture: ${error.message}`)
  }
}

const validateUpdateProfilePictureBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.photoUrl || typeof body.photoUrl !== 'string') {
    throw new Error('Photo URL is required')
  }
}

// Update password
const updatePassword = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateUpdatePasswordBody(body)

  try {
    const { oldPassword, newPassword } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, currentUser.password)
    if (!isOldPasswordValid) {
      return { success: false, error: 'Current password is incorrect' }
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    const updateData = {
      ...currentUser,
      password: hashedNewPassword,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to update password: ${error.message}`)
  }
}

const validateUpdatePasswordBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.oldPassword) {
    throw new Error('Current password is required')
  }

  if (!body.newPassword) {
    throw new Error('New password is required')
  }

  if (!isValidPassword(body.newPassword)) {
    throw new Error(
      'New password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    )
  }
}

// Set password (for OAuth users without password)
const setPassword = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateSetPasswordBody(body)

  try {
    const { newPassword } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Check if user already has a password
    if (currentUser.password) {
      return { success: false, error: 'Password already exists. Use change password instead.' }
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Set password
    const updateData = {
      ...currentUser,
      password: hashedNewPassword,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to set password: ${error.message}`)
  }
}

const validateSetPasswordBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.newPassword) {
    throw new Error('New password is required')
  }

  if (!isValidPassword(body.newPassword)) {
    throw new Error(
      'New password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    )
  }
}

// Reset password (send reset email)
const resetPassword = async (body) => {
  validateResetPasswordBody(body)

  try {
    const { email } = body

    // Check if user exists
    const users = await get('users', { email: email.toLowerCase() }, {}, {}, 1)
    
    // Always return success to prevent email enumeration
    // Only send email if user exists
    if (users && users.length > 0) {
      const user = users[0]
      
      // Generate secure reset token
      const resetToken = generateResetToken()
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      
      // Store reset token in database
      const updateData = {
        ...user,
        resetToken,
        resetTokenExpiry,
        updatedAt: new Date(),
      }
      await save('users', updateData)
      
      // Build reset URL — send the user back to the site they asked from (deploy preview,
      // localhost, ganime.io), not to one fixed host.
      const baseUrl = resolveResetBaseUrl(body.origin)
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`
      
      // Send password reset email
      try {
        await sendPasswordResetEmail(email.toLowerCase(), resetToken, resetUrl)
        console.log(`[resetPassword] Reset email sent to: ${email}`)
      } catch (emailError) {
        console.error(`[resetPassword] Failed to send email:`, emailError)
        // Don't throw - still return success to prevent email enumeration
      }
    }

    return {
      success: true,
      data: { message: 'If an account exists with this email, a reset link has been sent.' },
    }
  } catch (error) {
    throw new Error(`Failed to reset password: ${error.message}`)
  }
}

// Generate a secure random reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

// Confirm password reset (verify token and set new password)
const confirmResetPassword = async (body) => {
  validateConfirmResetPasswordBody(body)

  try {
    const { email, token, newPassword } = body

    // Find user by email and valid reset token
    const users = await get('users', {
      email: email.toLowerCase(),
      resetToken: token,
    }, {}, {}, 1)
    
    if (!users || users.length === 0) {
      return { success: false, error: 'Invalid or expired reset token' }
    }

    const user = users[0]

    // Check if token has expired
    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
      return { success: false, error: 'Reset token has expired' }
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user with new password and clear reset token
    const updateData = {
      ...user,
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date(),
    }
    await save('users', updateData)

    return {
      success: true,
      data: { message: 'Password has been reset successfully' },
    }
  } catch (error) {
    throw new Error(`Failed to confirm password reset: ${error.message}`)
  }
}

const validateConfirmResetPasswordBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.email) {
    throw new Error('Email is required')
  }

  if (!isValidEmail(body.email)) {
    throw new Error('Invalid email address')
  }

  if (!body.token) {
    throw new Error('Reset token is required')
  }

  if (!body.newPassword) {
    throw new Error('New password is required')
  }

  if (!isValidPassword(body.newPassword)) {
    throw new Error(
      'New password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    )
  }
}

const validateResetPasswordBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.email) {
    throw new Error('Email is required')
  }

  if (!isValidEmail(body.email)) {
    throw new Error('Invalid email address')
  }
}

// Hosts the reset link may point at. The link is mailed out, so an origin the caller made
// up would turn our own email into a phishing link — only ever echo back an origin we
// recognise, and fall back to the configured site otherwise.
// process.env.URL / DEPLOY_PRIME_URL are set by Netlify (site URL + deploy-preview URL);
// RESET_ALLOWED_ORIGINS is an optional comma-separated list for any extra host.
const resetOriginAllowList = () =>
  [
    process.env.VITE_PROD_SERVER,
    process.env.VITE_LOCALHOST,
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL,
    ...String(process.env.RESET_ALLOWED_ORIGINS || '').split(','),
  ]
    .map((url) => normalizeOrigin(url))
    .filter(Boolean)

const normalizeOrigin = (url) => {
  if (!url) return ''
  try {
    return new URL(String(url).trim()).origin
  } catch {
    return ''
  }
}

const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

const resolveResetBaseUrl = (requestedOrigin) => {
  const fallback =
    normalizeOrigin(process.env.VITE_PROD_SERVER) || normalizeOrigin(process.env.VITE_LOCALHOST)
  const origin = normalizeOrigin(requestedOrigin)
  if (!origin) return fallback
  if (isLocalOrigin(origin) || resetOriginAllowList().includes(origin)) return origin
  console.warn('[resetPassword] Ignoring unrecognised origin:', requestedOrigin)
  return fallback
}

// Add to watch list
const addToWatchList = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateAddToWatchListBody(body)

  try {
    const { seriesId, episodeNumber } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    // Get series info to store name and cover
    const seriesResult = await getSeriesById(seriesId)
    const seriesName = seriesResult.success && seriesResult.data ? seriesResult.data.name : 'Unknown Series'
    const seriesCover = seriesResult.success && seriesResult.data ? seriesResult.data.cover : ''

    const currentUser = users[0]
    const watchList = currentUser.watchList || []

    // Check if series is already in watch list
    const existingIndex = watchList.findIndex(
      (item) => String(item.seriesId) === String(seriesId),
    )

    if (existingIndex >= 0) {
      // Update existing entry with new episode and current time
      watchList[existingIndex].episodeNumber = episodeNumber
      watchList[existingIndex].seriesName = seriesName
      watchList[existingIndex].seriesCover = seriesCover
      watchList[existingIndex].updatedAt = new Date()
    } else {
      // Add new entry to watch list
      watchList.push({
        seriesId,
        seriesName,
        seriesCover,
        episodeNumber,
        addedAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Update user with new watch list
    const updateData = {
      ...currentUser,
      watchList,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to add to watch list: ${error.message}`)
  }
}

const validateAddToWatchListBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('Series ID is required')
  }

  if (!body.episodeNumber && body.episodeNumber !== 0) {
    throw new Error('Episode number is required')
  }
}

// Clear watch history (clear user's watchList array)
const clearWatchHistory = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)

  try {
    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Clear the watchList array
    const updateData = {
      ...currentUser,
      watchList: [],
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to clear watch history: ${error.message}`)
  }
}

// Remove item from watch list
const removeFromWatchList = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateRemoveFromWatchListBody(body)

  try {
    const { seriesId } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]
    const watchList = currentUser.watchList || []

    // Remove the series from watch list
    const updatedWatchList = watchList.filter(
      (item) => String(item.seriesId) !== String(seriesId),
    )

    // Update user with new watch list
    const updateData = {
      ...currentUser,
      watchList: updatedWatchList,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to remove from watch list: ${error.message}`)
  }
}

const validateRemoveFromWatchListBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('Series ID is required')
  }
}

// Add to favorites list
const addToFavorites = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateAddToFavoritesBody(body)

  try {
    const { seriesId } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    // Get series info to store name and cover
    const seriesResult = await getSeriesById(seriesId)
    if (!seriesResult.success || !seriesResult.data) {
      return { success: false, error: 'Series not found' }
    }

    const series = seriesResult.data
    const currentUser = users[0]
    const favorites = currentUser.favorites || []

    // Check if series is already in favorites
    const existingIndex = favorites.findIndex(
      (item) => String(item.seriesId) === String(seriesId),
    )

    if (existingIndex >= 0) {
      // Already in favorites, just return success
      return {
        success: true,
        data: await buildUserResponse(currentUser),
      }
    }

    // Add new entry to favorites
    favorites.push({
      seriesId,
      seriesName: series.name,
      seriesCover: series.cover,
      seriesTags: series.tags || (series.genre && series.genre.length > 0 ? [series.genre[0].name] : []),
      addedAt: new Date(),
    })

    // Update user with new favorites
    const updateData = {
      ...currentUser,
      favorites,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to add to favorites: ${error.message}`)
  }
}

const validateAddToFavoritesBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('Series ID is required')
  }
}

// Remove from favorites list
const removeFromFavorites = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateRemoveFromFavoritesBody(body)

  try {
    const { seriesId } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]
    const favorites = currentUser.favorites || []

    // Remove the series from favorites
    const updatedFavorites = favorites.filter(
      (item) => String(item.seriesId) !== String(seriesId),
    )

    // Update user with new favorites
    const updateData = {
      ...currentUser,
      favorites: updatedFavorites,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to remove from favorites: ${error.message}`)
  }
}

const validateRemoveFromFavoritesBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('Series ID is required')
  }
}

// Clear all favorites
const clearFavorites = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)

  try {
    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Clear the favorites array
    const updateData = {
      ...currentUser,
      favorites: [],
      updatedAt: new Date(),
    }

    await save('users', updateData)

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to clear favorites: ${error.message}`)
  }
}

// Filter items whose seriesId no longer exists in the series collection
const filterDeletedSeriesItems = async (items) => {
  if (!items || items.length === 0) return []

  const seriesIds = [...new Set(items.map((item) => item.seriesId).filter(Boolean))]
  if (seriesIds.length === 0) return items

  const objectIds = seriesIds
    .map((id) => {
      try {
        return new ObjectId(id)
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const existingSeries = await get('series', { _id: { $in: objectIds } }, { _id: 1 }, {})
  const existingIds = new Set(existingSeries.map((s) => String(s._id)))

  return items.filter((item) => existingIds.has(String(item.seriesId)))
}

// Helper to build user response without sensitive fields
const buildUserResponse = async (user) => {
  const filteredWatchList = await filterDeletedSeriesItems(user.watchList || [])
  const filteredFavorites = await filterDeletedSeriesItems(user.favorites || [])

  return {
    _id: user._id,
    email: user.email,
    nickname: user.nickname || 'Guest',
    avatar: user.avatar || null,
    phone: user.phone || null,
    sex: user.sex || null,
    dob: user.dob || null,
    hasPassword: !!user.password,
    allowUpload: !!user.allowUpload,
    isAdmin: !!user.isAdmin,
    watchList: filteredWatchList,
    favorites: filteredFavorites,
    purchases: user.purchases || [],
    balance: user.balance || 0,
    transactions: user.transactions || [],
  }
}

// Return the authenticated user's fresh profile (up-to-date permission checks, e.g.
// whether they may publish). Unlike getUser (a mock), this resolves the real user.
const getMe = async (params, authHeader) => {
  const userId = await validateAuth(authHeader)
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) return { success: false, error: 'User not found' }
  return { success: true, data: await buildUserResponse(users[0]) }
}

// Join the Creator Program → grant publish/upload permission. Stores the creator profile
// and returns the updated user so the client can refresh its store + cached login user.
const joinCreatorProgram = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) return { success: false, error: 'User not found' }
  const updated = {
    ...users[0],
    allowUpload: true,
    creatorProfile: (body && body.profile) || users[0].creatorProfile || null,
    creatorPayoutMethod: (body && body.payoutMethod) || users[0].creatorPayoutMethod || null,
    updatedAt: new Date(),
  }
  await save('users', updated)
  return { success: true, data: await buildUserResponse(updated) }
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
    // Get public_id either directly or extract from URL
    const publicId = body.public_id || extractPublicIdFromUrl(body.imageUrl)
    
    if (!publicId) {
      throw new Error('Could not determine public_id for deletion')
    }

    const result = await cloudinary.uploader.destroy(publicId)

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

// Extract public_id from Cloudinary URL
// URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
const extractPublicIdFromUrl = (url) => {
  if (!url) return null
  
  try {
    // Match the path after /upload/ and before the file extension
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
    if (match && match[1]) {
      return match[1]
    }
    return null
  } catch {
    return null
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

  // Either public_id or imageUrl is required
  const hasPublicId = body.public_id && typeof body.public_id === 'string'
  const hasImageUrl = body.imageUrl && typeof body.imageUrl === 'string'

  if (!hasPublicId && !hasImageUrl) {
    throw new Error('Either public_id or imageUrl is required for deletion')
  }
}

const uploadVideo = async (body) => {
  validateUploadVideoBody(body)

  try {
    const videoId = await createBunnyVideo(body.title || 'Untitled')

    return {
      success: true,
      data: {
        videoId,
        uploadUrl: `https://video.bunnycdn.com/library/${BUNNY_VIDEO_LIBRARY_ID}/videos/${videoId}`,
        embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_VIDEO_LIBRARY_ID}/${videoId}`,
        thumbnailUrl: `https://${BUNNY_PULL_ZONE}/${videoId}/thumbnail.jpg`,
        accessKey: BUNNY_API_KEY,
      },
    }
  } catch (error) {
    throw new Error(`Failed to create video: ${error.message}`)
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

// Tell Bunny to fetch/ingest a video from a public URL (used for Quick Create episodes,
// whose video already lives on Cloudinary — no local File to PUT). Async on Bunny's side.
const fetchBunnyVideoFromUrl = async (videoId, url) => {
  const response = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_VIDEO_LIBRARY_ID}/videos/${videoId}/fetch`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        AccessKey: BUNNY_API_KEY,
      },
      body: JSON.stringify({ url }),
    },
  )
  if (!response.ok) {
    throw new Error(`Bunny fetch failed: ${response.statusText}`)
  }
}

// Set a custom thumbnail (from a public image URL) on a Bunny video.
const setBunnyThumbnail = async (videoId, thumbnailUrl) => {
  const response = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_VIDEO_LIBRARY_ID}/videos/${videoId}/thumbnail?thumbnailUrl=${encodeURIComponent(thumbnailUrl)}`,
    { method: 'POST', headers: { Accept: 'application/json', AccessKey: BUNNY_API_KEY } },
  )
  if (!response.ok) {
    throw new Error(`Bunny thumbnail failed: ${response.statusText}`)
  }
}

const toTitleCase = (s) =>
  String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Map tag strings to genre ids, creating any missing genre (title-cased). Tags and
// genres are the same thing on a series. Returns { ids, names } deduped in input order.
const resolveGenres = async (tags) => {
  const ids = []
  const names = []
  const seen = new Set()
  for (const raw of tags || []) {
    const name = toTitleCase(raw)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    const existing = await get(
      'genre',
      { name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } },
      {},
      {},
      1,
    )
    if (existing && existing.length > 0) {
      ids.push(existing[0]._id)
      names.push(existing[0].name)
    } else {
      const res = await save('genre', { name })
      ids.push(res.insertedId)
      names.push(name)
    }
  }
  return { ids, names }
}

// Publish a Quick Create production's Episode 1 as a real series (same result as the
// "upload series" flow). First publish: create the Bunny video (fetched from the
// production's Cloudinary episode video), create the series with Episode 1, and link the
// series back to the production. Subsequent publishes: update the series metadata +
// episode title/thumbnail WITHOUT re-uploading the video.
const publishQuickCreateEpisode = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  await validateUploadPermission(userId)
  if (!body || !body.jobId) throw new Error('jobId is required')
  if (!body.name || typeof body.name !== 'string') throw new Error('Series name is required')

  const docs = await get('productions', { jobId: body.jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) throw new Error('Production not found')
  const doc = docs[0]
  if (String(doc.userId) !== String(userId)) {
    throw new Error('You are not authorized to publish this production')
  }

  const tags = Array.isArray(body.tags) ? body.tags : []
  const episode = parseInt(body.episode) || 1
  const episodeTitle = body.episodeTitle || `Episode ${episode}`
  // Tags are genres: resolve to genre ids (creating any that don't exist yet).
  const { ids: genreIds, names: genreNames } = await resolveGenres(tags)

  // Get (or create) a Bunny video for this production's episode video. s1: reuse the
  // already-uploaded Bunny video; s0: create one and ingest from the Cloudinary mp4.
  const getEpisodeVideoId = async () => {
    if (!doc.episodeVideo) throw new Error('Episode video is not ready yet')
    let videoId = doc.episodeBunnyVideoId
    if (!videoId) {
      videoId = await createBunnyVideo(episodeTitle)
      await fetchBunnyVideoFromUrl(videoId, doc.episodeVideo)
    }
    if (body.thumbnail) {
      await setBunnyThumbnail(videoId, body.thumbnail).catch((e) =>
        console.error('setBunnyThumbnail failed:', e.message),
      )
    }
    return videoId
  }

  // Resolve the series this production belongs to (episode 1 creates it; follow-up
  // episodes attach to the same series, found via this doc's seriesId or a sibling's).
  const rootJobId = doc.parentJobId || doc.jobId
  let series = null
  const loadSeries = async (id) => {
    if (!id) return null
    const ex = await get('series', { _id: new ObjectId(String(id)) }, {}, {}, 1)
    return ex && ex.length > 0 ? ex[0] : null
  }
  series = await loadSeries(doc.seriesId)
  if (!series) {
    const sibs = await get(
      'productions',
      {
        userId: doc.userId,
        $or: [{ jobId: rootJobId }, { parentJobId: rootJobId }],
        seriesId: { $exists: true, $nin: [null, ''] },
      },
      {},
      {},
      1,
    )
    if (sibs && sibs.length > 0) series = await loadSeries(sibs[0].seriesId)
  }

  // ── Attach to an existing series (add or update this episode) ──
  if (series) {
    if (String(series.uploaderId) !== String(userId)) {
      throw new Error('You are not authorized to edit this series')
    }
    // Any episode may update the series info (the publish form is seeded from the current
    // series, so this only changes what the user actually edited).
    if (body.name) series.name = body.name
    if (body.description !== undefined) series.description = body.description || ''
    if (body.cover) series.cover = body.cover
    if (genreNames.length) {
      series.tags = genreNames
      series.genre = genreIds
    }
    series.quickCreate = true
    series.episodes = series.episodes || []
    const ep = series.episodes.find((e) => e.episodeNumber === episode)
    let created = false
    if (ep) {
      ep.title = episodeTitle
      if (body.episodeDescription !== undefined) ep.description = body.episodeDescription
      if (body.thumbnail) {
        ep.thumbnail = body.thumbnail
        if (ep.videoId) {
          await setBunnyThumbnail(ep.videoId, body.thumbnail).catch((e) =>
            console.error('setBunnyThumbnail failed:', e.message),
          )
        }
      }
    } else {
      const videoId = await getEpisodeVideoId()
      series.episodes.push({
        episodeNumber: episode,
        title: episodeTitle,
        description: body.episodeDescription || '',
        thumbnail: body.thumbnail || body.cover || '',
        videoId,
      })
      series.episodes.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
      created = true
    }
    series.updatedAt = new Date()
    await save('series', series)
    await update(
      'productions',
      { jobId: body.jobId },
      {
        $set: {
          seriesId: String(series._id),
          seriesName: series.name,
          seriesCover: series.cover || '',
          updatedAt: new Date(),
        },
      },
    )
    return { success: true, data: { seriesId: String(series._id), created } }
  }

  // ── Create path: no series yet → create it with this episode ──
  const videoId = await getEpisodeVideoId()
  const seriesDoc = {
    name: body.name,
    description: body.description || '',
    cover: body.cover || '',
    tags: genreNames,
    genre: genreIds,
    uploaderId: new ObjectId(userId),
    quickCreate: true, // published from Quick Create — shown in the Published tab, not Uploaded
    shelved: false,
    episodes: [
      {
        episodeNumber: episode,
        title: episodeTitle,
        description: body.episodeDescription || '',
        thumbnail: body.thumbnail || body.cover || '',
        videoId,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const result = await save('series', seriesDoc)
  const seriesId = result.insertedId || seriesDoc._id
  await update(
    'productions',
    { jobId: body.jobId },
    { $set: { seriesId, seriesName: body.name, seriesCover: body.cover || '', updatedAt: new Date() } },
  )
  return { success: true, data: { seriesId: String(seriesId), created: true } }
}

const validateUploadVideoBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.title || typeof body.title !== 'string') {
    throw new Error('Video title is required')
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

// Get My Series List - get all series uploaded by the logged in user
const getMySeries = async (params, authHeader) => {
  const userId = await validateAuth(authHeader)

  try {
    // Find the user's uploaded series — exclude those published from Quick Create
    // (they appear in the Published tab instead)
    const series = await get(
      'series',
      { uploaderId: new ObjectId(userId), quickCreate: { $ne: true } },
      {},
      { createdAt: -1 },
    )
    const populatedSeries = await populateSeriesGenres(series)

    return {
      success: true,
      data: populatedSeries,
    }
  } catch (error) {
    throw new Error(`Failed to get my series: ${error.message}`)
  }
}

// Shelve/unshelve series
const shelveSeries = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateShelveSeriesBody(body)

  try {
    const { seriesId } = body

    // Get the series
    const seriesResult = await get('series', { _id: new ObjectId(seriesId) }, {}, {}, 1)
    if (!seriesResult || seriesResult.length === 0) {
      return { success: false, error: 'Series not found' }
    }

    const series = seriesResult[0]

    // Verify the logged in user is the uploader
    // Compare as strings since uploaderId is ObjectId and userId is string from JWT
    if (String(series.uploaderId) !== String(userId)) {
      return { success: false, error: 'You are not authorized to modify this series' }
    }

    // Toggle the shelved status
    const newShelvedStatus = !series.shelved
    const updateData = {
      ...series,
      shelved: newShelvedStatus,
      updatedAt: new Date(),
    }

    await save('series', updateData)

    // Populate genre for response
    const populatedSeries = await populateSeriesGenres([updateData])

    return {
      success: true,
      data: populatedSeries[0],
    }
  } catch (error) {
    throw new Error(`Failed to shelve/unshelve series: ${error.message}`)
  }
}

const validateShelveSeriesBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('Series ID is required')
  }
}

// Get My Purchases - get all purchased episodes for the logged in user
const getMyPurchases = async (params, authHeader) => {
  const userId = await validateAuth(authHeader)

  try {
    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]
    const purchases = currentUser.purchases || []

    // Return the purchases array directly
    // Each purchase item should have: seriesId, seriesName, seriesCover, episodeId, episodeNumber, episodeTitle, episodeThumbnail, price, purchasedAt
    return {
      success: true,
      data: purchases,
    }
  } catch (error) {
    throw new Error(`Failed to get my purchases: ${error.message}`)
  }
}

// Get My Revenue - get revenue data for the logged in creator
const getMyRevenue = async (params, authHeader) => {
  const userId = await validateAuth(authHeader)

  try {
    // Creator revenue share (percent) comes from the admin-configured system settings
    const { creatorShare: creatorSharePercent } = await readSystemSettings()
    const creatorShareRate = creatorSharePercent / 100

    // Get all series uploaded by this user
    const mySeries = await get('series', { uploaderId: new ObjectId(userId) }, {}, {})
    
    if (!mySeries || mySeries.length === 0) {
      return {
        success: true,
        data: {
          series: [],
          totalRevenue: 0,
          totalCreatorShare: 0,
          pendingPayout: 0,
          paidOut: 0,
        },
      }
    }

    // Get all series IDs
    const seriesIds = mySeries.map(s => String(s._id))

    // Get all users who have purchases
    const allUsers = await get('users', { 'purchases.0': { $exists: true } }, {}, {})

    // Collect all purchases for this creator's series
    const purchasesBySeriesAndEpisode = new Map()

    for (const user of allUsers) {
      const purchases = user.purchases || []
      for (const purchase of purchases) {
        if (seriesIds.includes(String(purchase.seriesId)) && purchase.status === 'success') {
          const key = `${purchase.seriesId}-${purchase.episodeNumber}`
          if (!purchasesBySeriesAndEpisode.has(key)) {
            purchasesBySeriesAndEpisode.set(key, {
              seriesId: purchase.seriesId,
              seriesName: purchase.seriesName,
              seriesCover: purchase.seriesCover,
              episodeNumber: purchase.episodeNumber,
              episodeTitle: purchase.episodeTitle,
              totalSales: 0,
              totalRevenue: 0,
            })
          }
          const episodeData = purchasesBySeriesAndEpisode.get(key)
          episodeData.totalSales += 1
          episodeData.totalRevenue += purchase.price || 0
        }
      }
    }

    // Group by series
    const seriesRevenueMap = new Map()

    for (const [key, episodeData] of purchasesBySeriesAndEpisode) {
      const seriesId = episodeData.seriesId
      if (!seriesRevenueMap.has(seriesId)) {
        seriesRevenueMap.set(seriesId, {
          seriesId,
          seriesName: episodeData.seriesName,
          seriesCover: episodeData.seriesCover,
          episodes: [],
          totalSales: 0,
          totalRevenue: 0,
          creatorShare: 0,
        })
      }
      const seriesData = seriesRevenueMap.get(seriesId)
      seriesData.episodes.push({
        episodeId: key,
        episodeNumber: episodeData.episodeNumber,
        episodeTitle: episodeData.episodeTitle,
        totalSales: episodeData.totalSales,
        totalRevenue: episodeData.totalRevenue,
        creatorShare: episodeData.totalRevenue * creatorShareRate,
      })
      seriesData.totalSales += episodeData.totalSales
      seriesData.totalRevenue += episodeData.totalRevenue
      seriesData.creatorShare += episodeData.totalRevenue * creatorShareRate
    }

    // Sort episodes by episode number within each series
    for (const seriesData of seriesRevenueMap.values()) {
      seriesData.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber)
    }

    // Convert to array and calculate totals
    const seriesRevenue = Array.from(seriesRevenueMap.values())
    const totalRevenue = seriesRevenue.reduce((sum, s) => sum + s.totalRevenue, 0)
    const totalCreatorShare = seriesRevenue.reduce((sum, s) => sum + s.creatorShare, 0)

    // For now, all creator share is pending (paidOut would be tracked separately)
    // In a real system, you'd track payouts in a separate collection
    const pendingPayout = totalCreatorShare
    const paidOut = 0

    return {
      success: true,
      data: {
        series: seriesRevenue,
        totalRevenue,
        totalCreatorShare,
        pendingPayout,
        paidOut,
      },
    }
  } catch (error) {
    throw new Error(`Failed to get my revenue: ${error.message}`)
  }
}

// Add purchase - add a purchased episode to user's purchases
const addPurchase = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateAddPurchaseBody(body)

  try {
    const { seriesId, episodeId, episodeNumber, price } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Check if user has enough balance
    const userBalance = currentUser.balance || 0
    if (userBalance < price) {
      return { success: false, error: 'Insufficient balance' }
    }

    // Get series info
    const seriesResult = await getSeriesById(seriesId)
    if (!seriesResult.success || !seriesResult.data) {
      return { success: false, error: 'Series not found' }
    }
    const series = seriesResult.data

    // Get episode info from series.episodes array
    let episodeTitle = `Episode ${episodeNumber}`
    let episodeThumbnail = series.cover
    let actualEpisodeId = episodeId

    // Episodes are stored in series.episodes array, not a separate collection
    if (series.episodes && series.episodes.length > 0) {
      const episode = series.episodes.find(ep => ep.episodeNumber === episodeNumber)
      if (episode) {
        episodeTitle = episode.title || episodeTitle
        // A custom thumbnail (chosen at publish time) wins over Bunny's auto-generated one
        if (episode.thumbnail) {
          episodeThumbnail = episode.thumbnail
        } else if (episode.videoId) {
          episodeThumbnail = `https://${BUNNY_PULL_ZONE}/${episode.videoId}/thumbnail.jpg`
        }
        actualEpisodeId = episode._id || `${seriesId}-ep${episodeNumber}`
      }
    }

    const purchases = currentUser.purchases || []

    // Check if episode is already purchased
    const existingPurchase = purchases.find(
      (p) => String(p.seriesId) === String(seriesId) && p.episodeNumber === episodeNumber
    )

    if (existingPurchase) {
      return { success: false, error: 'Episode already purchased' }
    }

    // Generate reference ID for the purchase
    const purchaseReferenceId = `GC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create purchase record
    const purchaseItem = {
      _id: new ObjectId().toString(),
      seriesId,
      seriesName: series.name,
      seriesCover: series.cover,
      episodeId: actualEpisodeId,
      episodeNumber,
      episodeTitle,
      episodeThumbnail,
      price,
      purchasedAt: new Date(),
      status: 'success',
      referenceId: purchaseReferenceId,
    }

    purchases.push(purchaseItem)

    // Deduct balance and update purchases
    const updateData = {
      ...currentUser,
      balance: userBalance - price,
      purchases,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    // Credit the creator (uploader) their revenue share (in GUSD), unless the buyer
    // is the uploader themselves. Based on the Creator Share percentage setting.
    if (series.uploaderId && String(series.uploaderId) !== String(userId)) {
      const { creatorShare } = await readSystemSettings()
      await creditCreatorRevenue(series, price, creatorShare, episodeNumber)
    }

    return {
      success: true,
      data: await buildUserResponse(updateData),
    }
  } catch (error) {
    throw new Error(`Failed to add purchase: ${error.message}`)
  }
}

const validateAddPurchaseBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('Series ID is required')
  }

  if (!body.episodeNumber && body.episodeNumber !== 0) {
    throw new Error('Episode number is required')
  }

  if (body.price === undefined || body.price === null) {
    throw new Error('Price is required')
  }
}

// Top up - add balance to user's wallet
const topUp = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateTopUpBody(body)

  try {
    const { amount, paymentType, callbackUrl, referenceId } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // If payment type is Credit Card or Apple Pay, use Stripe sdk to generate a checkout session
    if (paymentType === 'Credit Card' || paymentType === 'Apple Pay') {
      const paymentUrl = await createStripeCheckoutSession(amount, callbackUrl, userId, referenceId, paymentType)
      return {
        success: true,
        data: { paymentUrl },
      }
    }

    // If payment type is GUSD, call the GUSD payment API
    if (paymentType === 'GUSD') {
      const gusdResponse = await createGUSDPayOrder(amount, callbackUrl, userId, referenceId)
      return {
        success: true,
        data: gusdResponse,
      }
    }

    // Fallback: unknown payment type
    return { success: false, error: 'Unsupported payment type' }
  } catch (error) {
    throw new Error(`Failed to top up: ${error.message}`)
  }
}

// Create Stripe checkout session and return the payment URL
const createStripeCheckoutSession = async (amount, callbackUrl, userId, referenceId, paymentType = 'Credit Card') => {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  const txnReferenceId = referenceId || generateReferenceId()

  // Apple Pay uses the 'card' payment method type - Stripe automatically shows
  // the Apple Pay sheet on iOS devices when the 'card' method is enabled.
  // We can optionally restrict to only Apple Pay by using payment_method_types: ['card']
  // with payment_method_options that prefer Apple Pay.
  const paymentMethodTypes = paymentType === 'Apple Pay' ? ['card'] : ['card']

  const session = await stripe.checkout.sessions.create({
    payment_method_types: paymentMethodTypes,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Top Up',
          },
          unit_amount: Math.round(amount * 100), // Stripe expects cents
        },
        quantity: 1,
      },
    ],
    success_url: `${callbackUrl}${callbackUrl.includes('?') ? '&' : '?'}topup_status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${callbackUrl}${callbackUrl.includes('?') ? '&' : '?'}topup_status=cancelled`,
    metadata: {
      userId,
      amount: String(amount),
      referenceId: txnReferenceId,
      paymentType: paymentType || 'Credit Card',
    },
  })

  return session.url
}

// Call the GUSD provider. A transport-level failure surfaces from undici as a bare
// "fetch failed", which reaches the user as "Failed to top up: fetch failed" and says
// nothing about what actually went wrong (DNS, refused connection, TLS, timeout — the
// provider is reachable from some networks and not others). Unwrap error.cause so the
// real reason is in the function log and in the message.
const fetchGUSD = async (url, options) => {
  try {
    return await fetch(url, options)
  } catch (error) {
    const cause = error.cause || {}
    const detail = [cause.code, cause.message].filter(Boolean).join(' ') || error.message
    console.error('[GUSD] Request to %s failed: %s', url, detail, error)
    throw new Error(`could not reach the GUSD payment service (${detail})`)
  }
}

// Create GUSD pay order via external API
const createGUSDPayOrder = async (amount, callbackUrl, userId, referenceId) => {
  const appId = process.env.GUSD_APPID
  const secret = process.env.GUSD_SECRET

  validateGUSDConfig(appId, secret)

  const nonce = generateGUSDNonce()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = computeGUSDSignature(appId, nonce, timestamp, secret)
  const orderId = generateGUSDOrderId(userId, referenceId)

  const gusdNotifyUrl = process.env.GUSD_NOTIFY_URL
  if (!gusdNotifyUrl) {
    throw new Error('GUSD_NOTIFY_URL is not configured')
  }

  const gusdApiUrl = process.env.GUSD_API_URL
  if (!gusdApiUrl) {
    throw new Error('GUSD_API_URL is not configured')
  }

  // GUSD rejects non-public callback URLs (e.g. localhost → "callback url is invalid"). For
  // local dev, set GUSD_CALLBACK_BASE_URL to a public tunnel (e.g. an ngrok URL mapping to
  // :8888) — it rebases all three callback URLs so the provider accepts them while the
  // redirect/webhook still reach your machine. Unset in prod → uses the client's origin.
  const callback = rebaseCallbackOrigin(callbackUrl, process.env.GUSD_CALLBACK_BASE_URL)
  // Point the webhook at the same host as redirect/failure (keeps the configured path).
  const notifyUrl = resolveNotifyUrl(gusdNotifyUrl, callback)

  const requestBody = {
    price: String(amount),
    order_id: orderId,
    desc: `Top Up ${amount} GUSD`,
    notify_url: notifyUrl,
    redirect_url: `${callback}${callback.includes('?') ? '&' : '?'}topup_status=success&order_id=${orderId}`,
    failure_url: `${callback}${callback.includes('?') ? '&' : '?'}topup_status=cancelled&order_id=${orderId}`,
  }

  console.log('[GUSD] Creating pay order:', JSON.stringify(requestBody))
  console.log('[GUSD] Headers: appid=%s, nonce=%s, timestamp=%s', appId, nonce, timestamp)

  const response = await fetchGUSD(gusdApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      appid: String(appId),
      nonce: String(nonce),
      timestamp: String(timestamp),
      signature: String(signature),
    },
    body: JSON.stringify(requestBody),
  })

  const responseText = await response.text()
  console.log('[GUSD] Response status:', response.status, 'body:', responseText)

  const data = parseGUSDResponse(responseText)

  if (!response.ok || !data.data?.pay_url) {
    throw new Error(data.message || data.msg || `GUSD API error (${response.status}): ${responseText.substring(0, 200)}`)
  }

  // Record a PENDING top-up transaction now (payment is async). The wallet shows it as
  // pending and reconciles it via the webhook or a pay_order_info query, which credits the
  // balance and flips it to success/fail.
  const { referenceId: orderRef } = parseGUSDOrderId(orderId)
  const pendingTxn = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    referenceId: orderRef,
    order_id: orderId,
    type: 'topup',
    method: 'GUSD',
    amount: Number(amount),
    status: 'processing',
    createdAt: new Date(),
  }
  try {
    await update(
      'users',
      { _id: new ObjectId(userId) },
      { $push: { transactions: { $each: [pendingTxn], $position: 0 } }, $set: { updatedAt: new Date() } },
    )
  } catch (error) {
    console.error('[GUSD] Failed to record pending transaction:', error.message)
  }

  return data
}

const parseGUSDResponse = (responseText) => {
  try {
    return JSON.parse(responseText)
  } catch {
    throw new Error(`GUSD API returned invalid JSON: ${responseText.substring(0, 200)}`)
  }
}

// Replace a callback URL's origin with a public base (GUSD_CALLBACK_BASE_URL) when set,
// preserving its path/query — lets local dev route GUSD callbacks through a public tunnel.
// No override → the URL is returned unchanged.
const rebaseCallbackOrigin = (callbackUrl, baseOverride) => {
  const base = (baseOverride || '').trim().replace(/\/+$/, '')
  if (!base) return callbackUrl
  try {
    const u = new URL(callbackUrl)
    return `${base}${u.pathname}${u.search}${u.hash}`
  } catch {
    return callbackUrl
  }
}

// Build the webhook (notify) URL from the configured GUSD_NOTIFY_URL's path but the
// caller's origin, so it matches the redirect/failure host. Falls back to the configured
// URL if either can't be parsed.
const resolveNotifyUrl = (configuredNotifyUrl, callbackUrl) => {
  try {
    const origin = new URL(callbackUrl).origin
    const { pathname, search } = new URL(configuredNotifyUrl)
    return `${origin}${pathname}${search}`
  } catch {
    return configuredNotifyUrl
  }
}

const validateGUSDConfig = (appId, secret) => {
  if (!appId) {
    throw new Error('GUSD_APPID is not configured')
  }
  if (!secret) {
    throw new Error('GUSD_SECRET is not configured')
  }
}

const generateGUSDNonce = () => {
  return Math.floor(Math.random() * 1000000).toString()
}

const computeGUSDSignature = (appId, nonce, timestamp, secret) => {
  const message = `appid=${appId}&nonce=${nonce}&timestamp=${timestamp}`
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}

const generateGUSDOrderId = (userId, referenceId) => {
  return `${referenceId || generateReferenceId()}_${userId}_${Date.now()}`
}

// Generate a unique reference ID
const generateReferenceId = () => {
  return `GC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

// Process the top up (add balance and create transaction)
const processTopUp = async (currentUser, amount, method, referenceId, transactionId = '') => {
  const currentBalance = currentUser.balance || 0
  const transactions = currentUser.transactions || []

  // Create transaction record
  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    referenceId: referenceId || generateReferenceId(),
    type: 'topup',
    method: method,
    amount,
    transactionId: transactionId || '',
    status: 'success',
    createdAt: new Date(),
  }

  // Add transaction to history (prepend)
  transactions.unshift(transaction)

  // Update user with new balance and transaction
  const updateData = {
    ...currentUser,
    balance: currentBalance + amount,
    transactions,
    updatedAt: new Date(),
  }

  await save('users', updateData)

  return {
    success: true,
    data: await buildUserResponse(updateData),
  }
}

// Complete Stripe top up after successful payment callback
// Retrieves the Stripe session to verify payment and get transaction data
const completeStripeTopUp = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateCompleteStripeTopUpBody(body)

  try {
    const { sessionId } = body

    if (!stripe) {
      throw new Error('Stripe is not configured')
    }

    // Retrieve the checkout session from Stripe to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Verify session metadata matches the authenticated user
    if (session.metadata?.userId !== String(userId)) {
      return { success: false, error: 'Session does not belong to this user' }
    }

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Payment has not been completed' }
    }

    const amount = parseFloat(session.metadata.amount)
    const referenceId = session.metadata.referenceId

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Check if this referenceId has already been processed (prevent double processing)
    // This may have been processed by the webhook already
    const existingTxn = (currentUser.transactions || []).find(
      (t) => t.referenceId === referenceId,
    )
    if (existingTxn) {
      // Already processed (likely by webhook), just return the current user data
      return {
        success: true,
        data: await buildUserResponse(currentUser),
      }
    }

    // Process the top up (webhook may not have fired yet)
    // Use the paymentType from session metadata (defaults to 'Credit Card' for backwards compatibility)
    const method = session.metadata.paymentType || 'Credit Card'
    return await processTopUp(currentUser, amount, method, referenceId)
  } catch (error) {
    throw new Error(`Failed to complete Stripe top up: ${error.message}`)
  }
}

// Reconcile the user's PENDING GUSD top-ups: query pay_order_info for each and finalize
// (credit + complete on success, mark fail on failure). Called from the wallet on the
// payment redirect and on wallet load, so crediting doesn't depend solely on the async
// notify_url webhook. Idempotent — shares finalizeGUSDOrder's pending-only guard with the
// webhook, so the two paths can never double-credit.
const syncGUSDTopUps = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) {
    return { success: false, error: 'User not found' }
  }
  const pendings = (users[0].transactions || []).filter(
    (t) =>
      (t.type === 'topup' || t.type === 'withdraw') &&
      t.method === 'GUSD' &&
      t.status === 'processing' &&
      t.order_id,
  )
  for (const t of pendings) {
    try {
      const info = await fetchGUSDOrderInfo(t.order_id)
      await finalizeGUSDOrder(t.order_id, info)
    } catch (error) {
      console.error('[syncGUSDTopUps] order', t.order_id, 'failed:', error.message)
    }
  }
  const fresh = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  return { success: true, data: await buildUserResponse(fresh[0]) }
}

// The user backed out of the GUSD hosted pay page (redirected to failure_url). Drop the
// pending top-up transaction we created up front so a cancelled top-up doesn't linger in the
// history. Guarded to status 'processing' — if a webhook already credited it ('success'), or a
// reconcile marked it 'failed', it's left untouched (never remove a paid/settled top-up).
const cancelGUSDTopUp = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  const orderId = body?.orderId
  if (!orderId) throw new Error('orderId is required')
  await update(
    'users',
    { _id: new ObjectId(userId) },
    {
      $pull: { transactions: { order_id: orderId, type: 'topup', status: 'processing' } },
      $set: { updatedAt: new Date() },
    },
  )
  const fresh = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  return { success: true, data: await buildUserResponse(fresh[0]) }
}

// Query GUSD's pay_order_info for the current status of one of OUR merchant orders. The
// `order_id` param is the merchant order_id we passed at creation (per the API docs — not
// GUSD's internal id). Reuses the same signed-header auth as createGUSDPayOrder. Returns the
// `data` object ({ state, price, pay_time, ... }).
const fetchGUSDOrderInfo = async (orderId) => {
  const appId = process.env.GUSD_APPID
  const secret = process.env.GUSD_SECRET
  const gusdApiUrl = process.env.GUSD_API_URL
  validateGUSDConfig(appId, secret)
  if (!gusdApiUrl) {
    throw new Error('GUSD_API_URL is not configured')
  }
  if (!orderId) {
    throw new Error('order_id is required')
  }

  const nonce = generateGUSDNonce()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = computeGUSDSignature(appId, nonce, timestamp, secret)
  const url = `${new URL(gusdApiUrl).origin}/api/v1/bridge/pay_order_info?order_id=${encodeURIComponent(orderId)}`

  const response = await fetchGUSD(url, {
    method: 'GET',
    headers: {
      appid: String(appId),
      nonce: String(nonce),
      timestamp: String(timestamp),
      signature: String(signature),
    },
  })
  const responseText = await response.text()
  console.log('[GUSD] pay_order_info status:', response.status, 'body:', responseText)
  const data = parseGUSDResponse(responseText)
  if (!response.ok || data.code !== 200) {
    throw new Error(data.msg || data.message || `GUSD order info error (${response.status}): ${responseText.substring(0, 200)}`)
  }
  return data.data || {}
}

const validateCompleteStripeTopUpBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.sessionId) {
    throw new Error('Session ID is required')
  }
}

const validateTopUpBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (body.amount === undefined || body.amount === null) {
    throw new Error('Amount is required')
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    throw new Error('Amount must be a positive number')
  }

  if (!body.paymentType) {
    throw new Error('Payment type is required')
  }

  if (!['Credit Card', 'GUSD', 'Apple Pay'].includes(body.paymentType)) {
    throw new Error('Payment type must be Credit Card, Apple Pay, or GUSD')
  }

  if (!body.callbackUrl) {
    throw new Error('Callback URL is required')
  }
}

// ── IAP Receipt Verification ──

// Valid IAP product amounts (must match App Store Connect tiers)
const VALID_IAP_AMOUNTS = [1, 5, 10, 20, 50, 100, 200, 500, 1000]

// Apple/Google take a 30% store fee on in-app purchases. Products are priced at face value
// (the user pays the amount shown), and we absorb the fee by crediting 30% LESS — e.g. a
// $10 top-up adds 7 GUSD. Applies only to store purchases (not Card/GUSD).
const STORE_FEE_RATE = 0.3
const netAfterStoreFee = (amount) => Math.round(Number(amount) * (1 - STORE_FEE_RATE) * 100) / 100

// Verify an iOS In-App Purchase receipt and credit the user's wallet
const verifyIAPReceipt = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateIAPReceiptBody(body)

  try {
    const { transactionId, productId, amount, referenceId } = body

    validateIAPAmount(amount)
    validateIAPProductId(productId, amount)

    const currentUser = await getUserForTopUp(userId)

    // Validate the transaction with Apple before crediting (no-op until creds are configured).
    await verifyAppleTransaction(transactionId, productId)

    // Idempotency: atomically reserve this transactionId in the global ledger. If it was
    // already credited (to this or any user), skip re-crediting. The client finishes
    // consumables unconditionally and may re-deliver a transaction, so the same transactionId
    // can arrive more than once.
    const reserved = await reserveTransaction(transactionId, userId, productId, amount)
    if (!reserved) {
      return { success: true, data: await buildUserResponse(currentUser) }
    }

    // Process the top up (add balance and create transaction). Credit 30% less than paid —
    // Apple's store fee. Release the reservation on failure so it can be retried.
    try {
      return await processTopUp(currentUser, netAfterStoreFee(amount), 'Apple Pay (IAP)', referenceId, transactionId)
    } catch (creditError) {
      await releaseTransaction(transactionId)
      throw creditError
    }
  } catch (error) {
    throw new Error(`IAP verification failed: ${error.message}`)
  }
}

const validateIAPReceiptBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }
  if (!body.transactionId) {
    throw new Error('Transaction ID is required')
  }
  if (!body.productId) {
    throw new Error('Product ID is required')
  }
  if (body.amount === undefined || body.amount === null) {
    throw new Error('Amount is required')
  }
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    throw new Error('Amount must be a positive number')
  }
  if (!body.referenceId) {
    throw new Error('Reference ID is required')
  }
}

const validateIAPAmount = (amount) => {
  if (!VALID_IAP_AMOUNTS.includes(amount)) {
    throw new Error(`Invalid IAP amount: ${amount}. Must be one of: ${VALID_IAP_AMOUNTS.join(', ')}`)
  }
}

const validateIAPProductId = (productId, amount) => {
  const expectedProductId = `io.ganime.app.topup_${amount}`
  if (productId !== expectedProductId) {
    throw new Error(`Product ID mismatch: expected ${expectedProductId}, got ${productId}`)
  }
}

// Verify a Google Play Billing purchase and credit the user's wallet. Mirrors
// verifyIAPReceipt: same product/amount validation and the same idempotent, atomic
// crediting via the shared transaction ledger. Google's order id is the idempotency key.
const verifyGooglePlayPurchase = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateGooglePlayBody(body)

  try {
    const { productId, purchaseToken, orderId, amount, referenceId } = body

    validateIAPAmount(amount)
    validateIAPProductId(productId, amount)

    const currentUser = await getUserForTopUp(userId)

    // Validate the purchase with Google before crediting (no-op until creds are configured).
    await verifyGooglePlayTransaction(purchaseToken, productId)

    // Idempotency key: Google's order id (fallback to the purchase token or reference id).
    const txnKey = orderId || purchaseToken || referenceId
    const reserved = await reserveTransaction(txnKey, userId, productId, amount)
    if (!reserved) {
      return { success: true, data: await buildUserResponse(currentUser) }
    }

    try {
      // Credit 30% less than paid — Google Play's store fee.
      return await processTopUp(currentUser, netAfterStoreFee(amount), 'Google Play', referenceId, txnKey)
    } catch (creditError) {
      await releaseTransaction(txnKey)
      throw creditError
    }
  } catch (error) {
    throw new Error(`Google Play verification failed: ${error.message}`)
  }
}

const validateGooglePlayBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }
  if (!body.productId) {
    throw new Error('Product ID is required')
  }
  if (body.amount === undefined || body.amount === null) {
    throw new Error('Amount is required')
  }
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    throw new Error('Amount must be a positive number')
  }
  if (!body.referenceId) {
    throw new Error('Reference ID is required')
  }
  if (!body.orderId && !body.purchaseToken) {
    throw new Error('orderId or purchaseToken is required')
  }
}

const getUserForTopUp = async (userId) => {
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {})
  if (!users || users.length === 0) {
    throw new Error('User not found')
  }
  return users[0]
}

// Withdraw - subtract balance from user's wallet
// Funds credited (top-ups and earnings) within this many days are held and not
// yet available for withdrawal.
const WITHDRAW_HOLD_DAYS = 30

// Max withdrawable amount.
//
// Two things are excluded from the balance:
//   • credits received inside the hold window (not settled long enough to withdraw), and
//   • the welcome bonus, which is never withdrawable at any age.
//
// The bonus is treated as SPENT FIRST. Without that, a creator who spent their bonus on
// episodes and later topped up with real money could never withdraw that real money,
// because we'd keep deducting the full bonus forever.
//
// Spending is derived by conservation rather than tallied: episode purchases are stored
// outside `transactions`, so summing debits directly would miss them. Everything ever
// credited that is no longer in the balance — and wasn't withdrawn — has been spent.
// Failed withdrawals are refunded, so only settled/in-flight ones hold the balance down.
const getMaxWithdrawAmount = (balance, transactions) => {
  const txns = transactions || []
  const cutoff = Date.now() - WITHDRAW_HOLD_DAYS * 24 * 60 * 60 * 1000
  const sum = (list) => list.reduce((total, t) => total + (Number(t.amount) || 0), 0)

  const credits = txns.filter(
    (t) => (t.type === 'topup' || t.type === 'earning') && t.status === 'success',
  )
  const withdrawn = sum(
    txns.filter(
      (t) => t.type === 'withdraw' && (t.status === 'success' || t.status === 'processing'),
    ),
  )

  const welcomeTotal = sum(credits.filter((t) => t.method === 'welcome'))
  const spent = Math.max(0, sum(credits) - balance - withdrawn)
  const bonusRemaining = Math.max(0, welcomeTotal - spent)

  const heldCredits = sum(
    credits.filter(
      (t) => t.method !== 'welcome' && new Date(t.createdAt).getTime() >= cutoff,
    ),
  )

  return Math.max(0, Number((balance - bonusRemaining - heldCredits).toFixed(2)))
}

// Create a GUSD one-time withdrawal link (30-min, single claim). Mirrors createGUSDPayOrder
// but hits create_withdraw_order; the final result comes async via notify_url. Returns the
// GUSD response ({ data: { withdraw_url } }).
const createGUSDWithdrawOrder = async (amount, callbackUrl, orderId) => {
  const appId = process.env.GUSD_APPID
  const secret = process.env.GUSD_SECRET
  validateGUSDConfig(appId, secret)

  const gusdNotifyUrl = process.env.GUSD_NOTIFY_URL
  if (!gusdNotifyUrl) throw new Error('GUSD_NOTIFY_URL is not configured')
  const gusdApiUrl = process.env.GUSD_API_URL
  if (!gusdApiUrl) throw new Error('GUSD_API_URL is not configured')

  const nonce = generateGUSDNonce()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = computeGUSDSignature(appId, nonce, timestamp, secret)

  // Same callback-host handling as top-up (public tunnel in dev, prod domain in prod).
  const callback = rebaseCallbackOrigin(callbackUrl, process.env.GUSD_CALLBACK_BASE_URL)
  const notifyUrl = resolveNotifyUrl(gusdNotifyUrl, callback)
  const sep = callback.includes('?') ? '&' : '?'

  const requestBody = {
    price: String(amount),
    order_id: orderId,
    desc: `Withdraw ${amount} GUSD`,
    notify_url: notifyUrl,
    redirect_url: `${callback}${sep}withdraw_status=success&order_id=${orderId}`,
    failure_url: `${callback}${sep}withdraw_status=cancelled&order_id=${orderId}`,
  }
  console.log('[GUSD] Creating withdraw order:', JSON.stringify(requestBody))

  const response = await fetchGUSD(`${new URL(gusdApiUrl).origin}/api/v1/bridge/create_withdraw_order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      appid: String(appId),
      nonce: String(nonce),
      timestamp: String(timestamp),
      signature: String(signature),
    },
    body: JSON.stringify(requestBody),
  })
  const responseText = await response.text()
  console.log('[GUSD] withdraw order response:', response.status, responseText)
  const data = parseGUSDResponse(responseText)
  if (!response.ok || !data.data?.withdraw_url) {
    throw new Error(data.message || data.msg || `GUSD withdraw error (${response.status}): ${responseText.substring(0, 200)}`)
  }
  return data
}

// Start a GUSD withdrawal: reserve (deduct) the funds now and record a PENDING withdraw
// transaction, then create the one-time withdrawal link. The final result is applied async
// (webhook / pay_order_info query): kept on success, refunded on failure. Returns the
// withdraw_url for the client to open.
const withdraw = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateWithdrawBody(body)

  try {
    const { amount, callbackUrl } = body

    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }
    const currentUser = users[0]
    const currentBalance = currentUser.balance || 0
    const transactions = currentUser.transactions || []

    if (amount > currentBalance) {
      return { success: false, error: 'Insufficient balance' }
    }
    // Credits (top-ups/earnings) within the hold window aren't withdrawable yet.
    if (amount > getMaxWithdrawAmount(currentBalance, transactions)) {
      return { success: false, error: 'Amount exceeds the max withdrawable amount' }
    }

    const orderId = generateGUSDOrderId(userId, null)
    const { referenceId: orderRef } = parseGUSDOrderId(orderId)
    const pendingTxn = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      referenceId: orderRef,
      order_id: orderId,
      type: 'withdraw',
      method: 'GUSD',
      amount: Number(amount),
      status: 'processing',
      createdAt: new Date(),
    }

    // Reserve the funds atomically (only if balance still covers it) + record the pending txn.
    const reserve = await update(
      'users',
      { _id: new ObjectId(userId), balance: { $gte: amount } },
      {
        $inc: { balance: -amount },
        $push: { transactions: { $each: [pendingTxn], $position: 0 } },
        $set: { updatedAt: new Date() },
      },
    )
    if (reserve.matchedCount === 0) {
      return { success: false, error: 'Insufficient balance' }
    }

    // Create the GUSD withdrawal link. If that fails, refund + mark the txn failed.
    let withdrawUrl
    try {
      const gusd = await createGUSDWithdrawOrder(amount, callbackUrl, orderId)
      withdrawUrl = gusd.data.withdraw_url
    } catch (error) {
      await update(
        'users',
        { _id: new ObjectId(userId), transactions: { $elemMatch: { order_id: orderId, status: 'processing' } } },
        {
          $inc: { balance: amount },
          $set: { 'transactions.$.status': 'failed', 'transactions.$.fail_reason': 'order creation failed', updatedAt: new Date() },
        },
      )
      return { success: false, error: `Failed to create withdrawal order: ${error.message}` }
    }

    const updated = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    return { success: true, data: { withdrawUrl, user: await buildUserResponse((updated && updated[0]) || currentUser) } }
  } catch (error) {
    throw new Error(`Failed to withdraw: ${error.message}`)
  }
}

const validateWithdrawBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (body.amount === undefined || body.amount === null) {
    throw new Error('Amount is required')
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    throw new Error('Amount must be a positive number')
  }

  if (!body.callbackUrl) {
    throw new Error('Callback URL is required')
  }
}

// Purchase Episode API handler
const purchaseEpisode = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validatePurchaseEpisodeBody(body)

  try {
    const { seriesId, episodeNumber } = body

    // Get current user
    const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const currentUser = users[0]

    // Episode cost, revenue share and the free-episode count all come from the
    // admin-configured system settings.
    const { episodeCost, creatorShare, freeEpisodes } = await readSystemSettings()

    // A free episode needs no purchase — never take money for one, even if a stale client
    // asks. Reported as success so the caller just unlocks and plays.
    if (isEpisodeFree(episodeNumber, freeEpisodes)) {
      return {
        success: true,
        data: { free: true, balance: currentUser.balance || 0, episodeNumber: parseInt(episodeNumber) },
      }
    }

    // Check if user has enough balance
    const balance = currentUser.balance || 0
    if (balance < episodeCost) {
      return { success: false, error: 'Insufficient balance' }
    }

    // Check if series exists
    const seriesResult = await get('series', { _id: new ObjectId(seriesId) }, {}, {}, 1)
    if (!seriesResult || seriesResult.length === 0) {
      return { success: false, error: 'Series not found' }
    }

    const series = seriesResult[0]

    // Check if the series is uploaded by the user (users cannot purchase their own series)
    if (String(series.uploaderId) === String(userId)) {
      return { success: false, error: 'You cannot purchase your own series' }
    }

    // Check if episode exists in series.episodes array or single episode via videoId
    const seriesEpisodes = series.episodes || []
    const episodeInSeries = seriesEpisodes.find(
      (ep) => ep.episodeNumber === parseInt(episodeNumber),
    )
    const hasEpisode =
      episodeInSeries ||
      (parseInt(episodeNumber) === 1 && series.videoId)
    if (!hasEpisode) {
      return { success: false, error: 'Episode not found' }
    }

    // Check if already purchased
    const purchaseHistory = currentUser.purchaseHistory || []
    const alreadyPurchased = purchaseHistory.some(
      (p) =>
        String(p.seriesId) === String(seriesId) &&
        p.episodeNumber === parseInt(episodeNumber),
    )
    if (alreadyPurchased) {
      return { success: false, error: 'Episode already purchased' }
    }

    // Deduct from balance and add to purchase history
    const newBalance = balance - episodeCost
    const newPurchaseHistory = [
      ...purchaseHistory,
      {
        seriesId,
        seriesName: series.name,
        episodeNumber: parseInt(episodeNumber),
        cost: episodeCost,
        purchasedAt: new Date(),
      },
    ]

    // Update user
    const updateData = {
      ...currentUser,
      balance: newBalance,
      purchaseHistory: newPurchaseHistory,
      updatedAt: new Date(),
    }

    await save('users', updateData)

    // Credit the creator (uploader) their revenue share (in GUSD) of this purchase
    await creditCreatorRevenue(series, episodeCost, creatorShare, parseInt(episodeNumber))

    return {
      success: true,
      data: {
        message: 'Episode purchased successfully',
        balance: newBalance,
        purchasedEpisode: {
          seriesId,
          episodeNumber: parseInt(episodeNumber),
        },
      },
    }
  } catch (error) {
    throw new Error(`Failed to purchase episode: ${error.message}`)
  }
}

const validatePurchaseEpisodeBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('Series ID is required')
  }

  if (body.episodeNumber === undefined || body.episodeNumber === null) {
    throw new Error('Episode number is required')
  }
}

// Credit the creator (series uploader) their revenue share of an episode purchase.
// The amount (creatorShare% of the episode cost) is added to the creator's balance
// in GUSD along with an 'earning' transaction. Failures here must not fail the buyer's
// purchase, so errors are logged and swallowed.
const creditCreatorRevenue = async (series, episodeCost, creatorSharePercent, episodeNumber) => {
  try {
    if (!series || !series.uploaderId) return

    const amount = Number((episodeCost * (creatorSharePercent / 100)).toFixed(4))
    if (!(amount > 0)) return

    const uploaders = await get('users', { _id: new ObjectId(String(series.uploaderId)) }, {}, {}, 1)
    if (!uploaders || uploaders.length === 0) return
    const uploader = uploaders[0]

    const transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      referenceId: generateReferenceId(),
      type: 'earning',
      method: 'GUSD',
      amount,
      status: 'success',
      source: {
        seriesId: String(series._id),
        seriesName: series.name,
        episodeNumber,
      },
      createdAt: new Date(),
    }

    const transactions = uploader.transactions || []
    transactions.unshift(transaction)

    await save('users', {
      ...uploader,
      balance: (uploader.balance || 0) + amount,
      transactions,
      updatedAt: new Date(),
    })
  } catch (error) {
    console.error('[creditCreatorRevenue] Failed to credit creator:', error.message)
  }
}

// ── Comments ──

const getComments = async (params) => {
  validateGetCommentsParams(params)

  try {
    const { seriesId, episodeId } = params
    const page = parseInt(params.page) || 1
    const pageSize = parseInt(params.pageSize) || 20

    const filter = { seriesId, episodeId }
    const skip = (page - 1) * pageSize

    const comments = await get('comments', filter, {}, { createdAt: -1 }, pageSize, skip)
    const totalCount = await countComments(filter)
    const hasMore = skip + comments.length < totalCount

    return {
      success: true,
      data: { comments, totalCount, hasMore },
    }
  } catch (error) {
    throw new Error(`Failed to get comments: ${error.message}`)
  }
}

const countComments = async (filter) => {
  const db = await (await import('./db.js')).connectDB()
  return await db.collection('comments').countDocuments(filter)
}

const validateGetCommentsParams = (params) => {
  if (!params || !params.seriesId) {
    throw new Error('seriesId is required')
  }
  if (!params.episodeId) {
    throw new Error('episodeId is required')
  }
}

const addComment = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateAddCommentBody(body)
  validateCommentProfanity(body.body)

  try {
    const { seriesId, episodeId, body: commentBody } = body

    const user = await getUserById(userId)

    const comment = {
      seriesId,
      episodeId,
      userId: String(userId),
      userNickname: user.nickname || 'Guest',
      userAvatar: user.avatar || null,
      body: commentBody.trim(),
      createdAt: new Date(),
    }

    const result = await save('comments', comment)

    return {
      success: true,
      data: {
        comment: { ...comment, _id: result.insertedId },
      },
    }
  } catch (error) {
    throw new Error(`Failed to add comment: ${error.message}`)
  }
}

const getUserById = async (userId) => {
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) {
    throw new Error('User not found')
  }
  return users[0]
}

const validateCommentProfanity = (text) => {
  if (containsProfanity(text)) {
    throw new Error('Comment contains profane words')
  }
}

const validateAddCommentBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }
  if (!body.seriesId) {
    throw new Error('seriesId is required')
  }
  if (!body.episodeId) {
    throw new Error('episodeId is required')
  }
  if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
    throw new Error('Comment body is required and must be a non-empty string')
  }
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
  publishQuickCreateEpisode,
  getFeaturedSeries,
  getRecommendations,
  getVideoFeed,
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
  getMyRevenue,
  addPurchase,
  topUp,
  completeStripeTopUp,
  syncGUSDTopUps,
  cancelGUSDTopUp,
  verifyIAPReceipt,
  withdraw,
  purchaseEpisode,
  getLikes,
  likeSeries,
  unlikeSeries,
  getRatings,
  rateSeries,
  getShares,
  shareSeries,
  getViews,
  recordView,
  getSettings,
  saveSettings,
  submitFeedback,
  getTemplates,
  extractStory,
  generateStoryPrompt,
  suggestDescription,
  getPipelinePrompts,
  savePipelinePrompt,
  getProductionStatus,
  advanceProduction,
  getModerationStatus,
  verifyGooglePlayPurchase,
  getSharedEpisode,
  deleteProduction,
  startNextEpisode,
  getMe,
  joinCreatorProgram,
  getMyProductions,
  getComments,
  addComment,
}

// Database migration: update genre structure
const migrateGenres = async (body) => {
  try {
    const results = {
      genresUpdated: 0,
      genresRemoved: 0,
      seriesUpdated: 0,
      fieldsRemoved: [],
    }

    // Step 1: Get all genres and all series
    const allGenres = await get('genre', {}, {}, {})
    const allSeries = await get('series', {}, {}, {})

    // Step 2: Build a set of genre ids that are actually used by series
    const usedGenreIds = new Set()
    for (const series of allSeries) {
      if (Array.isArray(series.genre)) {
        for (const g of series.genre) {
          // Genre can be an object with id/name or just an id
          const genreId = typeof g === 'object' ? (g.id || g._id) : g
          if (genreId) {
            usedGenreIds.add(String(genreId))
          }
        }
      }
    }

    // Step 3: Remove unused genres
    const unusedGenres = allGenres.filter((g) => {
      const gId = String(g.id || g._id)
      return !usedGenreIds.has(gId)
    })

    for (const unusedGenre of unusedGenres) {
      await remove('genre', { _id: unusedGenre._id })
      results.genresRemoved++
    }

    // Step 4: Build a map from old id to _id for genres
    const genreIdToObjectId = new Map()
    for (const genre of allGenres) {
      if (genre.id !== undefined) {
        genreIdToObjectId.set(String(genre.id), genre._id)
      }
      // Also map _id string to _id ObjectId
      genreIdToObjectId.set(String(genre._id), genre._id)
    }

    // Step 5: Update each series
    for (const series of allSeries) {
      let needsUpdate = false
      const setFields = {}
      const unsetFields = {}

      // Convert genre array to _id array
      if (Array.isArray(series.genre)) {
        const newGenreIds = []
        for (const g of series.genre) {
          const oldId = typeof g === 'object' ? String(g.id || g._id) : String(g)
          const objectId = genreIdToObjectId.get(oldId)
          if (objectId) {
            newGenreIds.push(objectId)
          }
        }
        setFields.genre = newGenreIds
        needsUpdate = true
      }

      // Remove deprecated fields using $unset
      const fieldsToRemove = ['id', 'types', 'heat', 'localType']
      for (const field of fieldsToRemove) {
        if (field in series) {
          unsetFields[field] = ''
          needsUpdate = true
          if (!results.fieldsRemoved.includes(field)) {
            results.fieldsRemoved.push(field)
          }
        }
      }

      if (needsUpdate) {
        const updateOps = {}
        if (Object.keys(setFields).length > 0) {
          updateOps.$set = setFields
        }
        if (Object.keys(unsetFields).length > 0) {
          updateOps.$unset = unsetFields
        }
        await update('series', { _id: series._id }, updateOps)
        results.seriesUpdated++
      }
    }

    // Step 6: Update genres to remove the old 'id' and 'idStr' fields using $unset
    for (const genre of allGenres) {
      const fieldsToUnset = {}
      if ('id' in genre) {
        fieldsToUnset.id = ''
      }
      if ('idStr' in genre) {
        fieldsToUnset.idStr = ''
      }
      if (Object.keys(fieldsToUnset).length > 0) {
        await update('genre', { _id: genre._id }, { $unset: fieldsToUnset })
        results.genresUpdated++
      }
    }

    return {
      success: true,
      data: results,
    }
  } catch (error) {
    throw new Error(`Migration failed: ${error.message}`)
  }
}

// ── Like / Unlike ──

const getLikes = async (params, authHeader) => {
  validateGetLikesParams(params)

  try {
    const { seriesId } = params
    const count = await countSeriesLikes(seriesId)

    let isLiked = false
    if (authHeader) {
      try {
        const userId = await validateAuth(authHeader)
        isLiked = await hasUserLikedSeries(seriesId, userId)
      } catch {
        // Not logged in or invalid token – isLiked stays false
      }
    }

    return {
      success: true,
      data: { count, isLiked },
    }
  } catch (error) {
    throw new Error(`Failed to get likes: ${error.message}`)
  }
}

const validateGetLikesParams = (params) => {
  if (!params || !params.seriesId) {
    throw new Error('seriesId is required')
  }
}

const countSeriesLikes = async (seriesId) => {
  const likes = await get('likes', { seriesId }, {}, {})
  return likes.length
}

const hasUserLikedSeries = async (seriesId, userId) => {
  const existing = await get(
    'likes',
    { seriesId, userId: new ObjectId(userId).toString() },
    {},
    {},
    1,
  )
  return existing.length > 0
}

const likeSeries = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateLikeSeriesBody(body)

  try {
    const { seriesId } = body
    const userIdStr = new ObjectId(userId).toString()

    const existing = await get(
      'likes',
      { seriesId, userId: userIdStr },
      {},
      {},
      1,
    )

    if (existing.length === 0) {
      await save('likes', {
        seriesId,
        userId: userIdStr,
        createdAt: new Date(),
      })
    }

    const count = await countSeriesLikes(seriesId)

    return {
      success: true,
      data: { count, isLiked: true },
    }
  } catch (error) {
    throw new Error(`Failed to like series: ${error.message}`)
  }
}

const unlikeSeries = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateLikeSeriesBody(body)

  try {
    const { seriesId } = body
    const userIdStr = new ObjectId(userId).toString()

    await remove('likes', { seriesId, userId: userIdStr })

    const count = await countSeriesLikes(seriesId)

    return {
      success: true,
      data: { count, isLiked: false },
    }
  } catch (error) {
    throw new Error(`Failed to unlike series: ${error.message}`)
  }
}

const validateLikeSeriesBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('seriesId is required')
  }
}

// ── Star Rating ──

const getRatings = async (params, authHeader) => {
  validateGetRatingsParams(params)

  try {
    const { seriesId } = params
    const summary = await getSeriesRatingSummary(seriesId)

    let userRating = 0
    if (authHeader) {
      try {
        const userId = await validateAuth(authHeader)
        userRating = await getUserSeriesRating(seriesId, userId)
      } catch {
        // Not logged in or invalid token – userRating stays 0
      }
    }

    return {
      success: true,
      data: { ...summary, userRating },
    }
  } catch (error) {
    throw new Error(`Failed to get ratings: ${error.message}`)
  }
}

const validateGetRatingsParams = (params) => {
  if (!params || !params.seriesId) {
    throw new Error('seriesId is required')
  }
}

// Returns { average, count } using a simple average of all user ratings
const getSeriesRatingSummary = async (seriesId) => {
  const ratings = await get('ratings', { seriesId }, {}, {})
  const count = ratings.length
  if (count === 0) return { average: 0, count: 0 }

  const total = ratings.reduce((sum, r) => sum + (r.rating || 0), 0)
  return { average: total / count, count }
}

const getUserSeriesRating = async (seriesId, userId) => {
  const existing = await get(
    'ratings',
    { seriesId, userId: new ObjectId(userId).toString() },
    {},
    {},
    1,
  )
  return existing.length > 0 ? existing[0].rating : 0
}

const rateSeries = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  validateRateSeriesBody(body)

  try {
    const { seriesId, rating } = body
    const userIdStr = new ObjectId(userId).toString()

    const existing = await get('ratings', { seriesId, userId: userIdStr }, {}, {}, 1)

    if (existing.length > 0) {
      // Override the user's previous rating
      await update(
        'ratings',
        { seriesId, userId: userIdStr },
        { $set: { rating, updatedAt: new Date() } },
      )
    } else {
      await save('ratings', {
        seriesId,
        userId: userIdStr,
        rating,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    const summary = await getSeriesRatingSummary(seriesId)

    return {
      success: true,
      data: { ...summary, userRating: rating },
    }
  } catch (error) {
    throw new Error(`Failed to rate series: ${error.message}`)
  }
}

const validateRateSeriesBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.seriesId) {
    throw new Error('seriesId is required')
  }

  if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
    throw new Error('rating must be a number between 1 and 5')
  }
}

// ── Shares ──

const getShares = async (params) => {
  validateSharesParams(params)

  try {
    const count = await countSeriesShares(params.seriesId)
    return {
      success: true,
      data: { count },
    }
  } catch (error) {
    throw new Error(`Failed to get shares: ${error.message}`)
  }
}

const shareSeries = async (body) => {
  validateSharesParams(body)

  try {
    const { seriesId } = body
    await save('shares', { seriesId, createdAt: new Date() })

    const count = await countSeriesShares(seriesId)
    return {
      success: true,
      data: { count },
    }
  } catch (error) {
    throw new Error(`Failed to record share: ${error.message}`)
  }
}

const countSeriesShares = async (seriesId) => {
  const shares = await get('shares', { seriesId }, {}, {})
  return shares.length
}

const validateSharesParams = (data) => {
  if (!data || !data.seriesId) {
    throw new Error('seriesId is required')
  }
}

// ── Views ──

const getViews = async (params) => {
  validateViewsParams(params)

  try {
    const count = await countSeriesViews(params.seriesId)
    return {
      success: true,
      data: { count },
    }
  } catch (error) {
    throw new Error(`Failed to get views: ${error.message}`)
  }
}

const recordView = async (body) => {
  validateViewsParams(body)

  try {
    const { seriesId } = body
    await save('views', { seriesId, createdAt: new Date() })

    const count = await countSeriesViews(seriesId)
    return {
      success: true,
      data: { count },
    }
  } catch (error) {
    throw new Error(`Failed to record view: ${error.message}`)
  }
}

const countSeriesViews = async (seriesId) => {
  const views = await get('views', { seriesId }, {}, {})
  return views.length
}

const validateViewsParams = (data) => {
  if (!data || !data.seriesId) {
    throw new Error('seriesId is required')
  }
}

// ── System Settings (Admin only to change, public to read) ──

// Global app settings stored as a singleton document in the 'settings' collection.
const SYSTEM_SETTINGS_KEY = 'system'
const DEFAULT_SYSTEM_SETTINGS = {
  freeEpisodes: 5, // episodes at the start of every series that need no purchase
  creatorShare: 50, // percent of episode revenue paid to the creator
  episodeCost: 0.1, // GUSD cost to unlock an episode
  nextEpisodeCost: 0.99, // GUSD cost to generate a follow-up episode
  welcomeCredit: 100, // GUSD granted to a newly registered user
  chatModel: MODEL_DEFAULTS.chatModel, // OpenAI text/story model
  imageModel: MODEL_DEFAULTS.imageModel, // OpenAI image model
  seedanceModel: MODEL_DEFAULTS.seedanceModel, // Seedance video model
}
const FREE_EPISODES_OPTIONS = [0, 1, 3, 5, 10]
const CREATOR_SHARE_OPTIONS = [25, 30, 40, 50, 60, 75]
const EPISODE_COST_OPTIONS = [0.1, 0.2, 0.3, 0.5, 0.75, 1]
const WELCOME_CREDIT_OPTIONS = [0, 5, 10, 20, 50, 100]

// An episode is free when it is among the first `freeEpisodes` of its series. Replaces the
// old n-second preview: locked episodes are not playable at all, free ones play in full.
// Mirrored client-side in systemSettingsStore.isEpisodeFree.
const isEpisodeFree = (episodeNumber, freeEpisodes) => Number(episodeNumber) <= Number(freeEpisodes || 0)

// Read the system settings (merged with defaults). Used server-side by the
// purchase/revenue logic and exposed to the client via the API.
const readSystemSettings = async () => {
  const docs = await get('settings', { key: SYSTEM_SETTINGS_KEY }, {}, {}, 1)
  const saved = docs && docs.length > 0 ? docs[0] : {}
  return {
    freeEpisodes: saved.freeEpisodes ?? DEFAULT_SYSTEM_SETTINGS.freeEpisodes,
    creatorShare: saved.creatorShare ?? DEFAULT_SYSTEM_SETTINGS.creatorShare,
    episodeCost: saved.episodeCost ?? DEFAULT_SYSTEM_SETTINGS.episodeCost,
    nextEpisodeCost: saved.nextEpisodeCost ?? DEFAULT_SYSTEM_SETTINGS.nextEpisodeCost,
    welcomeCredit: saved.welcomeCredit ?? DEFAULT_SYSTEM_SETTINGS.welcomeCredit,
    chatModel: saved.chatModel || DEFAULT_SYSTEM_SETTINGS.chatModel,
    imageModel: saved.imageModel || DEFAULT_SYSTEM_SETTINGS.imageModel,
    seedanceModel: saved.seedanceModel || DEFAULT_SYSTEM_SETTINGS.seedanceModel,
  }
}

const getSettings = async () => {
  try {
    return { success: true, data: await readSystemSettings() }
  } catch (error) {
    throw new Error(`Failed to get settings: ${error.message}`)
  }
}

const saveSettings = async (body, authHeader) => {
  await requireAdmin(authHeader)
  validateSystemSettingsBody(body)

  try {
    const fields = {
      key: SYSTEM_SETTINGS_KEY,
      freeEpisodes: body.freeEpisodes ?? DEFAULT_SYSTEM_SETTINGS.freeEpisodes,
      creatorShare: body.creatorShare,
      episodeCost: body.episodeCost,
      nextEpisodeCost: body.nextEpisodeCost ?? DEFAULT_SYSTEM_SETTINGS.nextEpisodeCost,
      welcomeCredit: body.welcomeCredit ?? DEFAULT_SYSTEM_SETTINGS.welcomeCredit,
      chatModel: body.chatModel || DEFAULT_SYSTEM_SETTINGS.chatModel,
      imageModel: body.imageModel || DEFAULT_SYSTEM_SETTINGS.imageModel,
      seedanceModel: body.seedanceModel || DEFAULT_SYSTEM_SETTINGS.seedanceModel,
      updatedAt: new Date(),
    }

    const existing = await get('settings', { key: SYSTEM_SETTINGS_KEY }, {}, {}, 1)
    if (existing && existing.length > 0) {
      await update('settings', { key: SYSTEM_SETTINGS_KEY }, { $set: fields })
    } else {
      await save('settings', { ...fields, createdAt: new Date() })
    }

    return { success: true, data: await readSystemSettings() }
  } catch (error) {
    throw new Error(`Failed to save settings: ${error.message}`)
  }
}

// Validate the caller is a logged-in admin user
const requireAdmin = async (authHeader) => {
  const userId = await validateAuth(authHeader)
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0 || !users[0].isAdmin) {
    throw new Error('Admin access required')
  }
  return userId
}

const validateSystemSettingsBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }
  if (body.freeEpisodes != null && !FREE_EPISODES_OPTIONS.includes(body.freeEpisodes)) {
    throw new Error('Invalid freeEpisodes')
  }
  if (!CREATOR_SHARE_OPTIONS.includes(body.creatorShare)) {
    throw new Error('Invalid creatorShare')
  }
  if (!EPISODE_COST_OPTIONS.includes(body.episodeCost)) {
    throw new Error('Invalid episodeCost')
  }
  if (body.chatModel != null && !CHAT_MODEL_OPTIONS.includes(body.chatModel)) {
    throw new Error('Invalid chatModel')
  }
  if (body.imageModel != null && !IMAGE_MODEL_OPTIONS.includes(body.imageModel)) {
    throw new Error('Invalid imageModel')
  }
  if (body.seedanceModel != null && !SEEDANCE_MODEL_OPTIONS.includes(body.seedanceModel)) {
    throw new Error('Invalid seedanceModel')
  }
  if (body.welcomeCredit != null && !WELCOME_CREDIT_OPTIONS.includes(body.welcomeCredit)) {
    throw new Error('Invalid welcomeCredit')
  }
}

// ── Feedback ──

const ADMIN_EMAIL = 'chatuni.ai@gmail.com'
const FEEDBACK_MAX_LENGTH = 5000

const submitFeedback = async (body) => {
  validateFeedbackBody(body)

  try {
    await sendFeedbackEmail(body.feedback.trim(), ADMIN_EMAIL)
    return { success: true }
  } catch (error) {
    throw new Error(`Failed to submit feedback: ${error.message}`)
  }
}

const validateFeedbackBody = (body) => {
  if (!body || !body.feedback || !body.feedback.trim()) {
    throw new Error('Feedback is required')
  }
  if (body.feedback.length > FEEDBACK_MAX_LENGTH) {
    throw new Error(`Feedback must be ${FEEDBACK_MAX_LENGTH} characters or less`)
  }
}

// ── Quick Create templates (starter stories) ──

const getTemplates = async () => {
  try {
    const templates = await get('templates', {}, {}, { order: 1 })
    return { success: true, data: templates }
  } catch (error) {
    throw new Error(`Failed to get templates: ${error.message}`)
  }
}

// ── Extract a story prompt from an uploaded PDF/DOCX file (via OpenAI) ──

const EXTRACT_STORY_INSTRUCTION =
  'The document contains a story premise/prompt for an anime series. Read it and return the complete story text as clean plain text, preserving paragraph breaks. Do not summarize, translate, or add any commentary, headings, or labels (like "Title" or "Prompt") — return only the story prompt text itself.'

const extractStory = async (body) => {
  validateExtractStoryBody(body)

  try {
    const { file, filename } = body
    const ext = String(filename).split('.').pop().toLowerCase()

    let text
    if (ext === 'pdf') {
      text = await extractStoryFromPdf(file, filename)
    } else if (ext === 'docx') {
      text = await extractStoryFromDocx(file)
    } else {
      return { success: false, error: 'Unsupported file type. Please upload a PDF or DOCX file.' }
    }

    text = (text || '').trim()
    if (!text) {
      return { success: false, error: 'Could not read any story text from the file.' }
    }
    return { success: true, data: { text } }
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`)
  }
}

const validateExtractStoryBody = (body) => {
  if (!body || !body.file || typeof body.file !== 'string') {
    throw new Error('File data is required')
  }
  if (!body.filename || typeof body.filename !== 'string') {
    throw new Error('File name is required')
  }
}

// PDF: gpt-4o reads the file natively via the Responses API (base64 data URL)
const extractStoryFromPdf = async (dataUrl, filename) => {
  const model = await getChatModel()
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: EXTRACT_STORY_INSTRUCTION },
            { type: 'input_file', filename, file_data: dataUrl },
          ],
        },
      ],
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  return extractResponsesOutputText(data)
}

// DOCX: extract the raw text with mammoth, then normalize via OpenAI chat
const extractStoryFromDocx = async (dataUrl) => {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const buffer = Buffer.from(base64, 'base64')
  const result = await mammoth.extractRawText({ buffer })
  const rawText = (result.value || '').trim()
  if (!rawText) return ''

  const model = await getChatModel()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: EXTRACT_STORY_INSTRUCTION },
        { role: 'user', content: rawText },
      ],
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── Surprise Me: expand a short idea into a full template-format story prompt ──

const STORY_PROMPT_INSTRUCTION =
  'You are a creative anime story writer. Given a short story idea (or nothing at all), craft a rich, original story premise for an anime series. Return a JSON object with two fields: "title" — a short, catchy 2-4 word series title; and "prompt" — the full premise written as 3 to 4 short paragraphs of flowing prose (no headings, no bullet points, no labels) covering the world/setting, the main character, a supporting character, the inciting incident, the goal, and the main conflict, and ending with a final paragraph that begins with "Episode 1 introduces" describing what the first episode covers and ending on an intriguing hook or cliffhanger. Return only valid JSON.'

const generateStoryPrompt = async (body) => {
  const idea = (body && typeof body.idea === 'string' ? body.idea : '').trim()

  try {
    const userMessage = idea
      ? `Expand this idea into a full anime story premise:\n\n${idea}`
      : 'Create a completely original, surprising anime story premise.'

    const model = await getChatModel()
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: STORY_PROMPT_INSTRUCTION },
          { role: 'user', content: userMessage },
        ],
        ...chatTuning(model, 0.9),
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) {
      throw new Error(`OpenAI error (${res.status}): ${(await res.text()).slice(0, 300)}`)
    }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    let title = ''
    let text = ''
    try {
      const parsed = JSON.parse(content)
      title = (parsed.title || '').trim()
      text = (parsed.prompt || '').trim()
    } catch {
      text = content.trim()
    }
    if (!text) {
      return { success: false, error: 'Could not generate a story. Please try again.' }
    }
    return { success: true, data: { title, text } }
  } catch (error) {
    throw new Error(`Failed to generate story: ${error.message}`)
  }
}

// AI Suggest: generate a series or episode description from the current context.
const suggestDescription = async (body) => {
  const isEpisode = body?.type === 'episode'
  const seriesName = (body?.seriesName || '').trim()
  const episodeTitle = (body?.episodeTitle || '').trim()
  const currentDesc = (body?.currentDesc || '').trim()
  const genres = Array.isArray(body?.genres) ? body.genres.filter(Boolean) : []

  const system = isEpisode
    ? 'You are a copywriter for an anime streaming platform. Write ONE vivid episode description (2-3 sentences, roughly 40-60 words) that entices viewers to watch. Output only the description text — no title, no quotes, no markdown, no preamble.'
    : 'You are a copywriter for an anime streaming platform. Write ONE compelling series description / logline (2-3 sentences, roughly 40-60 words) that hooks viewers. Output only the description text — no title, no quotes, no markdown, no preamble.'

  const ctx = [
    seriesName ? `Series name: ${seriesName}` : '',
    genres.length ? `Genres: ${genres.join(', ')}` : '',
    isEpisode && episodeTitle ? `Episode title: ${episodeTitle}` : '',
    currentDesc ? `Current description (rewrite/improve, keep the same story): ${currentDesc}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const model = await getChatModel()
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `Write a ${isEpisode ? 'episode' : 'series'} description.\n\n${ctx}`,
          },
        ],
        ...chatTuning(model, 0.9),
      }),
    })
    if (!res.ok) {
      throw new Error(`OpenAI error (${res.status}): ${(await res.text()).slice(0, 300)}`)
    }
    const data = await res.json()
    const description = (data.choices?.[0]?.message?.content || '')
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!description) {
      return { success: false, error: 'Could not generate a description. Please try again.' }
    }
    return { success: true, data: { description } }
  } catch (error) {
    throw new Error(`Failed to generate description: ${error.message}`)
  }
}

// Aggregate output_text items from a Responses API result
const extractResponsesOutputText = (data) => {
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text
  const parts = []
  for (const item of data.output || []) {
    for (const c of item.content || []) {
      if (c.type === 'output_text' && c.text) parts.push(c.text)
    }
  }
  return parts.join('\n')
}

// ── AI Production Pipeline (Quick Create) ──
//
// The 6-call pipeline + cover generation runs in the pipeline-background function
// (netlify/functions/pipeline-background.js), which writes progress into a
// `productions` job document. These handlers cover the admin prompt editor and the
// client's status polling.

const PIPELINE_CALL_KEYS = [
  'executiveProducer',
  'aiDirector',
  'characterDesigner',
  'storyboardArchitect',
  'storyOptimizer',
  'promptCompiler',
]

// Admin: read all pipeline prompt documents (ordered)
const getPipelinePrompts = async (params, authHeader) => {
  await requireAdmin(authHeader)
  try {
    const docs = await get('pipelinePrompts', {}, {}, { order: 1 })
    return { success: true, data: docs }
  } catch (error) {
    throw new Error(`Failed to get pipeline prompts: ${error.message}`)
  }
}

// Admin: create/update a single pipeline prompt's markdown
const savePipelinePrompt = async (body, authHeader) => {
  await requireAdmin(authHeader)
  if (!body || !body.key) throw new Error('Prompt key is required')
  if (typeof body.markdown !== 'string') throw new Error('Prompt markdown is required')

  try {
    const existing = await get('pipelinePrompts', { key: body.key }, {}, {}, 1)
    if (existing && existing.length > 0) {
      await update(
        'pipelinePrompts',
        { key: body.key },
        { $set: { markdown: body.markdown, updatedAt: new Date() } },
      )
    } else {
      const order = PIPELINE_CALL_KEYS.indexOf(body.key) + 1 || 99
      await save('pipelinePrompts', {
        key: body.key,
        title: body.title || body.key,
        order,
        markdown: body.markdown,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
    const docs = await get('pipelinePrompts', {}, {}, { order: 1 })
    return { success: true, data: docs }
  } catch (error) {
    throw new Error(`Failed to save pipeline prompt: ${error.message}`)
  }
}

// List the logged-in user's Quick Create productions (episode jobs) for My Series.
// Excludes the large `calls` field — the list only needs title/cover/progress.
const getMyProductions = async (params, authHeader) => {
  const userId = await validateAuth(authHeader)
  try {
    // v0 episodes plus v1 productions AND v1 proposal drafts (so an un-approved proposal
    // is resumable/deletable from My Series). The client filters by the active
    // VITE_QUICK_CREATE_VERSION (v1 docs carry v:1). v0 'plan' drafts stay hidden.
    const docs = await get(
      'productions',
      { userId, mode: { $in: ['episode', 'v1produce', 'v1proposal'] } },
      { calls: 0, callsV1: 0 },
      { createdAt: -1 },
      50,
    )
    return { success: true, data: docs }
  } catch (error) {
    throw new Error(`Failed to get productions: ${error.message}`)
  }
}

// Poll a production job's progress/result (written by the pipeline-background function)
const getProductionStatus = async (params, authHeader) => {
  const userId = await validateAuth(authHeader)
  if (!params || !params.jobId) throw new Error('jobId is required')

  try {
    const docs = await get('productions', { jobId: params.jobId }, {}, {}, 1)
    if (!docs || docs.length === 0) {
      // The background function may not have created the doc yet
      return { success: true, data: { status: 'pending' } }
    }
    const doc = docs[0]
    if (String(doc.userId) !== String(userId)) {
      return { success: false, error: 'Not authorized to view this production' }
    }
    return { success: true, data: doc }
  } catch (error) {
    throw new Error(`Failed to get production status: ${error.message}`)
  }
}

// Drive one step of a production's async video render (poll-first pipeline). Fired by the
// client alongside its progress poll while shots render. Hands off to a background function
// (which bundles ffmpeg for frame extraction) rather than running inline — this keeps the
// heavy render deps out of the main `api` bundle. A doc-level advisory lock in
// advanceVideoGeneration makes overlapping triggers cheap no-ops.
const advanceProduction = async (body, authHeader) => {
  await validateAuth(authHeader)
  if (!body || !body.jobId) throw new Error('jobId is required')
  await triggerBackground('pipeline-video-advance-background', body.jobId, authHeader)
  return { success: true, data: { triggered: true } }
}

// Status of an uploaded video's content-moderation job (transcribe + text/frame checks).
// Polled by the upload flow, which won't publish an episode until it reads 'approved'.
const getModerationStatus = async (params, authHeader) => {
  await validateAuth(authHeader)
  if (!params || !params.videoId) throw new Error('videoId is required')
  const docs = await get('videoModeration', { videoId: params.videoId }, {}, {}, 1)
  if (!docs || docs.length === 0) return { success: true, data: { status: 'pending', progress: 0 } }
  const m = docs[0]
  return {
    success: true,
    data: {
      status: m.status || 'processing',
      stage: m.stage || '',
      progress: m.progress || 0,
      reason: m.reason || '',
      categories: m.categories || [],
    },
  }
}

// Charge for + unlock the generation of episode N from an existing production. Idempotent:
// once a (paid) episode-N production exists for this series/production group, we reuse it
// and never re-charge — so a failed render can be retried for free. Returns the jobId of
// the episode-N production to generate.
const startNextEpisode = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  if (!body || !body.jobId) throw new Error('jobId is required')
  const episode = parseInt(body.episode)
  if (!episode || episode < 2) throw new Error('A valid episode number (>= 2) is required')

  const parents = await get('productions', { jobId: body.jobId }, {}, {}, 1)
  if (!parents || parents.length === 0) return { success: false, error: 'Production not found' }
  const parent = parents[0]
  if (String(parent.userId) !== String(userId)) return { success: false, error: 'Not authorized' }

  const rootJobId = parent.parentJobId || parent.jobId
  const groupKey = parent.seriesId ? `series:${parent.seriesId}` : `job:${rootJobId}`

  // Already unlocked → reuse the existing paid production (free retry, no re-charge).
  const existing = await get(
    'productions',
    { userId: parent.userId, episodeGroup: groupKey, episode },
    {},
    {},
    1,
  )
  if (existing && existing.length > 0) {
    return { success: true, data: { jobId: existing[0].jobId, charged: false, alreadyUnlocked: true } }
  }

  // Charge the user's GUSD balance (cost is admin-configurable via system settings).
  const { nextEpisodeCost } = await readSystemSettings()
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) return { success: false, error: 'User not found' }
  const user = users[0]
  const balance = user.balance || 0
  if (balance < nextEpisodeCost) return { success: false, error: 'Insufficient balance' }

  const seriesTitle = parent.proposal?.project?.title || parent.ideaTitle || 'Series'
  const episodeTitle = (parent.proposal?.seasonRoadmap || [])[episode - 1]?.title || ''
  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    referenceId: generateReferenceId(),
    type: 'generate',
    amount: nextEpisodeCost,
    description: `Generate ${seriesTitle} — Episode ${episode}`,
    source: { seriesName: seriesTitle, episodeNumber: episode, episodeTitle },
    status: 'success',
    createdAt: new Date(),
  }
  const transactions = user.transactions || []
  transactions.unshift(transaction)
  const newBalance = balance - nextEpisodeCost
  await save('users', { ...user, balance: newBalance, transactions, updatedAt: new Date() })

  // Create the (paid) episode-N production doc, reusing the parent's Character Bible for
  // visual consistency. Deterministic jobId keeps retries pointing at the same doc.
  const newJobId = `${rootJobId}-ep${episode}`
  await save('productions', {
    jobId: newJobId,
    userId: parent.userId,
    v: 1,
    mode: 'v1produce',
    episode,
    paid: true,
    episodeGroup: groupKey,
    parentJobId: rootJobId,
    seriesId: parent.seriesId || null,
    status: 'pending',
    proposal: parent.proposal || null,
    ideaTitle: seriesTitle,
    title: seriesTitle,
    episodeLength: 30,
    callsV1: parent.callsV1?.characterDirector
      ? { characterDirector: parent.callsV1.characterDirector }
      : {},
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return { success: true, data: { jobId: newJobId, charged: true, balance: newBalance } }
}

// Delete a Quick Create production (the job doc). Only the owner may delete it. Does not
// touch a published series — that lives independently once published.
const deleteProduction = async (body, authHeader) => {
  const userId = await validateAuth(authHeader)
  if (!body || !body.jobId) throw new Error('jobId is required')
  const docs = await get('productions', { jobId: body.jobId }, {}, {}, 1)
  if (docs && docs.length > 0) {
    if (String(docs[0].userId) !== String(userId)) {
      throw new Error('Not authorized to delete this production')
    }
    await remove('productions', { jobId: body.jobId })
  }
  return { success: true, data: { deleted: true } }
}

// PUBLIC: minimal shared-episode info for the /watch/:jobId share page (no auth — anyone
// with the link can watch the full episode). Returns the Bunny embed (s1) or mp4 (s0).
const getSharedEpisode = async (params) => {
  if (!params || !params.jobId) throw new Error('jobId is required')
  try {
    const docs = await get('productions', { jobId: params.jobId }, {}, {}, 1)
    if (!docs || docs.length === 0) return { success: false, error: 'Not found' }
    const doc = docs[0]
    const videoId = doc.episodeBunnyVideoId || ''
    return {
      success: true,
      data: {
        title: doc.title || doc.ideaTitle || 'Episode 1',
        cover: doc.cover || '',
        videoId,
        embedUrl: videoId ? bunnyEmbedUrl(videoId) : '',
        // s0 fallback: episodeVideo is a real mp4 the watch page can play directly.
        mp4Url: !videoId && doc.episodeVideo ? doc.episodeVideo : '',
        seriesId: doc.seriesId ? String(doc.seriesId) : '',
      },
    }
  } catch (error) {
    throw new Error(`Failed to get shared episode: ${error.message}`)
  }
}