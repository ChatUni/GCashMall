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

export { getTodos, saveTodo, deleteTodo, getCategories, getProducts }