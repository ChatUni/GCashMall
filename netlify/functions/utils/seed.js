import { save, remove } from './db.js'

const seedData = async () => {
  try {
    console.log('Starting to seed database...')
    
    // Clear existing data
    console.log('Clearing existing categories and products...')
    await remove('categories', {})
    await remove('products', {})
    console.log('Existing data cleared.')
    
    // Seed categories
    const categories = [
      {
        name: 'Electronics',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop'
      },
      {
        name: 'Clothing',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
      },
      {
        name: 'Books',
        image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop'
      },
      {
        name: 'Home & Garden',
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop'
      },
      {
        name: 'Sports',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
      },
      {
        name: 'Beauty',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop'
      }
    ]
    
    const savedCategories = []
    for (const category of categories) {
      const result = await save('categories', category)
      savedCategories.push({ ...category, _id: result.insertedId })
      console.log(`Saved category: ${category.name}`)
    }
    
    // Seed products
    const products = [
      // Electronics
      {
        name: 'Smartphone Pro',
        description: 'Latest flagship smartphone with advanced camera system',
        price: 999.99,
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
        category: savedCategories[0]._id
      },
      {
        name: 'Wireless Headphones',
        description: 'Premium noise-cancelling wireless headphones',
        price: 299.99,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        category: savedCategories[0]._id
      },
      {
        name: 'Laptop Ultra',
        description: 'Thin and light laptop for professionals',
        price: 1299.99,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
        category: savedCategories[0]._id
      },
      {
        name: 'Smart Watch',
        description: 'Fitness tracking smartwatch with health monitoring',
        price: 399.99,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        category: savedCategories[0]._id
      },
      
      // Clothing
      {
        name: 'Designer T-Shirt',
        description: 'Premium cotton t-shirt with modern design',
        price: 49.99,
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
        category: savedCategories[1]._id
      },
      {
        name: 'Denim Jeans',
        description: 'Classic fit denim jeans in dark wash',
        price: 79.99,
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
        category: savedCategories[1]._id
      },
      {
        name: 'Winter Jacket',
        description: 'Warm and stylish winter jacket for cold weather',
        price: 159.99,
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
        category: savedCategories[1]._id
      },
      {
        name: 'Running Shoes',
        description: 'Comfortable running shoes with advanced cushioning',
        price: 129.99,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
        category: savedCategories[1]._id
      },
      
      // Books
      {
        name: 'Programming Guide',
        description: 'Complete guide to modern web development',
        price: 39.99,
        image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=400&fit=crop',
        category: savedCategories[2]._id
      },
      {
        name: 'Science Fiction Novel',
        description: 'Bestselling science fiction adventure story',
        price: 14.99,
        image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
        category: savedCategories[2]._id
      },
      
      // Home & Garden
      {
        name: 'Indoor Plant Set',
        description: 'Collection of easy-care indoor plants',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
        category: savedCategories[3]._id
      },
      {
        name: 'Kitchen Knife Set',
        description: 'Professional chef knife set with wooden block',
        price: 199.99,
        image: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop',
        category: savedCategories[3]._id
      }
    ]
    
    for (const product of products) {
      await save('products', product)
      console.log(`Saved product: ${product.name}`)
    }
    
    console.log('Database seeding completed successfully!')
    process.exit(0)
    
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }
}

// Run the seed function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData()
}

export { seedData }