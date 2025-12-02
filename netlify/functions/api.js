import { getTodos, saveTodo, deleteTodo } from './utils/handlers.js'

const apiHandlers = {
  get: {
    todos: (params) => getTodos(params),
  },
  post: {
    todo: (body) => saveTodo(body),
  },
  delete: {
    todo: (body) => deleteTodo(body),
  }
}

export const handler = async (event, context) => {
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