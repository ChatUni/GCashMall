import { MongoClient } from 'mongodb'

let cachedDb = null

const connectDB = async () => {
  if (cachedDb) {
    return cachedDb
  }

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined')
  }

  try {
    const client = new MongoClient(mongoUri)
    await client.connect()
    
    // Determine database name based on environment
    const appName = 'GCashMall'
    let dbName = appName
    
    if (process.env.NODE_ENV === 'production') {
      dbName = `${appName}-dev`
    } else if (process.env.NODE_ENV === 'qa') {
      dbName = `${appName}-qa`
    } else {
      // local development
      dbName = `${appName}-dev`
    }
    
    cachedDb = client.db(dbName)
    return cachedDb
  } catch (error) {
    throw new Error(`Failed to connect to MongoDB: ${error.message}`)
  }
}

const get = async (docName, filter = {}, projection = {}, sort = {}, limit = 0, skip = 0) => {
  validateInput(docName, 'docName')
  
  const db = await connectDB()
  const collection = db.collection(docName)
  
  let query = collection.find(filter, { projection })
  
  if (Object.keys(sort).length > 0) {
    query = query.sort(sort)
  }
  
  if (skip > 0) {
    query = query.skip(skip)
  }
  
  if (limit > 0) {
    query = query.limit(limit)
  }
  
  return await query.toArray()
}

const save = async (docName, object) => {
  validateInput(docName, 'docName')
  validateInput(object, 'object')
  
  const db = await connectDB()
  const collection = db.collection(docName)
  
  if (object._id) {
    const { _id, ...updateData } = object
    return await collection.updateOne(
      { _id },
      { $set: updateData },
      { upsert: true }
    )
  } else {
    return await collection.insertOne(object)
  }
}

const remove = async (docName, filter) => {
  validateInput(docName, 'docName')
  validateInput(filter, 'filter')
  
  const db = await connectDB()
  const collection = db.collection(docName)
  
  return await collection.deleteMany(filter)
}

// Update with support for $set and $unset operations
const update = async (docName, filter, updates) => {
  validateInput(docName, 'docName')
  validateInput(filter, 'filter')
  validateInput(updates, 'updates')
  
  const db = await connectDB()
  const collection = db.collection(docName)
  
  return await collection.updateOne(filter, updates)
}

const validateInput = (value, paramName) => {
  if (!value) {
    throw new Error(`${paramName} is required`)
  }
}

export { connectDB, get, save, remove, update }