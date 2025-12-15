import { get, save, remove } from './db.js'
import { ObjectId } from 'mongodb'

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
  const series = await get('series', { id: +id }, {}, {}, 1)
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

const uploadImage = async (body) => {
  // Note: This is a placeholder. In production, this would handle
  // multipart form data and upload to Cloudinary.
  // The actual implementation would require parsing multipart data
  // and using cloudinary SDK.
  return {
    success: true,
    data: {
      url: body.url || '',
    },
  }
}

const deleteImage = async (body) => {
  // Note: This is a placeholder. In production, this would
  // delete the image from Cloudinary using the SDK.
  return {
    success: true,
    data: {
      deleted: true,
    },
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
}