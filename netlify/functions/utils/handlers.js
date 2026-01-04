import { get, save, remove } from './db.js'
import { ObjectId } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { sendPasswordResetEmail } from './email.js'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

// Bunny.net Video configuration
const BUNNY_VIDEO_LIBRARY_ID = process.env.VITE_BUNNY_LIBRARY_ID
const BUNNY_API_KEY = process.env.BUNNY_API_KEY
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
    const series = await get('series', {}, {}, { createdAt: -1 }, 10)
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
    const series = await get('series', {}, {}, { createdAt: -1 }, 10)
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user with default nickname "Guest" if not provided
    const newUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      nickname: nickname || 'Guest',
      avatar: photoUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Add OAuth info if provided
    if (oauthId && oauthType) {
      newUser[`${oauthType}_id`] = oauthId
    }

    const result = await save('users', newUser)

    // Generate JWT token
    const token = generateToken({ email: newUser.email, id: result.insertedId })

    // Return user without password
    const userResponse = {
      _id: result.insertedId,
      email: newUser.email,
      nickname: newUser.nickname,
      avatar: newUser.avatar,
      hasPassword: true,
    }

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

  if (!body.password) {
    throw new Error('Password is required')
  }

  if (!isValidPassword(body.password)) {
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

    // Determine if user has a password set
    const hasPassword = !!user.password

    // Return user without password
    const userResponse = {
      _id: user._id,
      email: user.email,
      nickname: user.nickname || 'Guest',
      avatar: user.avatar || null,
      phone: user.phone || null,
      gender: user.gender || null,
      birthday: user.birthday || null,
      hasPassword,
    }

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

    // Determine if user has a password set
    const hasPassword = !!user.password

    // Return user without password
    const userResponse = {
      _id: user._id,
      email: user.email,
      nickname: user.nickname || 'Guest',
      avatar: user.avatar || null,
      phone: user.phone || null,
      gender: user.gender || null,
      birthday: user.birthday || null,
      hasPassword,
    }

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

    // Return updated user without password
    const userResponse = {
      _id: updateData._id,
      email: updateData.email,
      nickname: updateData.nickname || 'Guest',
      avatar: updateData.avatar || null,
      phone: updateData.phone || null,
      sex: updateData.sex || null,
      dob: updateData.dob || null,
    }

    return {
      success: true,
      data: userResponse,
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

    // Return updated user without password
    const userResponse = {
      _id: updateData._id,
      email: updateData.email,
      nickname: updateData.nickname || 'Guest',
      avatar: updateData.avatar,
      phone: updateData.phone || null,
      sex: updateData.sex || null,
      dob: updateData.dob || null,
    }

    return {
      success: true,
      data: userResponse,
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

    // Return updated user without password
    const userResponse = {
      _id: updateData._id,
      email: updateData.email,
      nickname: updateData.nickname || 'Guest',
      avatar: updateData.avatar || null,
      phone: updateData.phone || null,
      sex: updateData.sex || null,
      dob: updateData.dob || null,
    }

    return {
      success: true,
      data: userResponse,
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

    // Return updated user without password
    const userResponse = {
      _id: updateData._id,
      email: updateData.email,
      nickname: updateData.nickname || 'Guest',
      avatar: updateData.avatar || null,
      phone: updateData.phone || null,
      sex: updateData.sex || null,
      dob: updateData.dob || null,
      hasPassword: true,
    }

    return {
      success: true,
      data: userResponse,
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
      
      // Build reset URL
      const baseUrl = process.env.APP_URL || 'http://localhost:5173'
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
        thumbnailUrl: `https://vz-4ecde8c7-5c4.b-cdn.net/${videoId}/thumbnail.jpg`,
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
  clearWatchHistory,
}