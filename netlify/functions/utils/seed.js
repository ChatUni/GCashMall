import { save, remove } from './db.js'

const seedData = async () => {
  try {
    console.log('Starting to seed database...')
    
    // Clear existing data
    console.log('Clearing existing data...')
    await remove('categories', {})
    await remove('products', {})
    await remove('series', {})
    await remove('genre', {})
    await remove('episodes', {})
    await remove('users', {})
    await remove('watchHistory', {})
    await remove('favorites', {})
    console.log('Existing data cleared.')
    
    // Seed genres
    const genres = [
      { id: 1, name: 'Romance' },
      { id: 2, name: 'Action' },
      { id: 3, name: 'Comedy' },
      { id: 4, name: 'Drama' },
      { id: 5, name: 'Thriller' },
      { id: 6, name: 'Fantasy' },
      { id: 7, name: 'Sci-Fi' },
      { id: 8, name: 'Horror' },
    ]
    
    for (const genre of genres) {
      await save('genre', genre)
      console.log(`Saved genre: ${genre.name}`)
    }
    
    // Seed series
    const seriesList = [
      {
        id: 1,
        name: 'Love in the City',
        description: 'A heartwarming story of two strangers who meet in the bustling streets of Manila and discover that love can bloom in the most unexpected places. Follow their journey as they navigate the challenges of modern relationships.',
        cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=600&fit=crop',
        genre: [{ id: 1, name: 'Romance' }, { id: 4, name: 'Drama' }],
        tags: ['Romance', 'Modern', 'Manila'],
        languages: ['English', 'Filipino'],
        isFeatured: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: 'Shadow Warriors',
        description: 'An elite team of special operatives must save the world from a mysterious organization threatening global peace. Action-packed sequences and intense drama await.',
        cover: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop',
        genre: [{ id: 2, name: 'Action' }, { id: 5, name: 'Thriller' }],
        tags: ['Action', 'Military', 'Suspense'],
        languages: ['English'],
        isFeatured: false,
        createdAt: new Date(),
      },
      {
        id: 3,
        name: 'Laugh Factory',
        description: 'A hilarious comedy series following the misadventures of a quirky group of friends trying to start their own comedy club. Get ready for non-stop laughter!',
        cover: 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=400&h=600&fit=crop',
        genre: [{ id: 3, name: 'Comedy' }],
        tags: ['Comedy', 'Friends', 'Fun'],
        languages: ['English', 'Filipino'],
        isFeatured: false,
        createdAt: new Date(),
      },
      {
        id: 4,
        name: 'The Last Kingdom',
        description: 'In a world where magic is fading, one young hero must embark on an epic quest to restore balance to the realm. A fantasy adventure of epic proportions.',
        cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop',
        genre: [{ id: 6, name: 'Fantasy' }, { id: 2, name: 'Action' }],
        tags: ['Fantasy', 'Adventure', 'Magic'],
        languages: ['English'],
        isFeatured: false,
        createdAt: new Date(),
      },
      {
        id: 5,
        name: 'Space Frontier',
        description: 'Journey to the edge of the galaxy with the crew of the starship Horizon as they explore uncharted territories and encounter alien civilizations.',
        cover: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop',
        genre: [{ id: 7, name: 'Sci-Fi' }, { id: 2, name: 'Action' }],
        tags: ['Sci-Fi', 'Space', 'Adventure'],
        languages: ['English'],
        isFeatured: false,
        createdAt: new Date(),
      },
      {
        id: 6,
        name: 'Midnight Whispers',
        description: 'A chilling horror series that will keep you on the edge of your seat. When strange occurrences plague a small town, residents must face their darkest fears.',
        cover: 'https://images.unsplash.com/photo-1509248961895-d505faa8e495?w=400&h=600&fit=crop',
        genre: [{ id: 8, name: 'Horror' }, { id: 5, name: 'Thriller' }],
        tags: ['Horror', 'Mystery', 'Supernatural'],
        languages: ['English'],
        isFeatured: false,
        createdAt: new Date(),
      },
      {
        id: 7,
        name: 'Family Ties',
        description: 'A touching drama about three generations of a Filipino family navigating life, love, and tradition in modern times. Heartfelt storytelling at its finest.',
        cover: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=600&fit=crop',
        genre: [{ id: 4, name: 'Drama' }, { id: 1, name: 'Romance' }],
        tags: ['Drama', 'Family', 'Filipino'],
        languages: ['English', 'Filipino'],
        isFeatured: false,
        createdAt: new Date(),
      },
      {
        id: 8,
        name: 'Office Chronicles',
        description: 'Workplace comedy at its best! Follow the daily antics of employees at a quirky tech startup where nothing ever goes according to plan.',
        cover: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=600&fit=crop',
        genre: [{ id: 3, name: 'Comedy' }, { id: 4, name: 'Drama' }],
        tags: ['Comedy', 'Workplace', 'Modern'],
        languages: ['English'],
        isFeatured: false,
        createdAt: new Date(),
      },
    ]
    
    const savedSeries = []
    for (const series of seriesList) {
      const result = await save('series', series)
      savedSeries.push({ ...series, _id: result.insertedId })
      console.log(`Saved series: ${series.name}`)
    }
    
    // Seed episodes for the first few series
    const episodeTemplates = [
      { title: 'Pilot', description: 'The story begins as we meet our main characters.' },
      { title: 'New Beginnings', description: 'Characters face new challenges and opportunities.' },
      { title: 'The Turning Point', description: 'A major event changes everything.' },
      { title: 'Revelations', description: 'Secrets are revealed and alliances are tested.' },
      { title: 'The Journey', description: 'Our heroes embark on an important mission.' },
      { title: 'Crossroads', description: 'Difficult decisions must be made.' },
      { title: 'Rising Tension', description: 'Conflict reaches a critical point.' },
      { title: 'Aftermath', description: 'Characters deal with the consequences of their actions.' },
      { title: 'New Allies', description: 'Unexpected help arrives from unlikely sources.' },
      { title: 'The Final Chapter', description: 'Everything comes to a dramatic conclusion.' },
    ]
    
    for (const series of savedSeries.slice(0, 3)) {
      for (let i = 0; i < 10; i++) {
        const episode = {
          seriesId: series._id.toString(),
          episodeNumber: i + 1,
          title: `${series.name} - ${episodeTemplates[i].title}`,
          description: episodeTemplates[i].description,
          thumbnail: series.cover,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          duration: 1200 + Math.floor(Math.random() * 600),
          createdAt: new Date(),
        }
        await save('episodes', episode)
      }
      console.log(`Saved 10 episodes for: ${series.name}`)
    }
    
    // Seed demo user
    const demoUser = {
      username: 'DemoUser',
      email: 'demo@example.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      createdAt: new Date(),
    }
    const userResult = await save('users', demoUser)
    console.log('Saved demo user')
    
    // Seed watch history
    const watchHistory = savedSeries.slice(0, 3).map((series, index) => ({
      seriesId: series._id.toString(),
      seriesTitle: series.name,
      episodeId: `ep-${index + 1}`,
      episodeNumber: index + 1,
      thumbnail: series.cover,
      lastWatched: new Date(Date.now() - index * 86400000),
      progress: Math.floor(Math.random() * 100),
    }))
    
    for (const item of watchHistory) {
      await save('watchHistory', item)
    }
    console.log('Saved watch history')
    
    // Seed favorites
    const favorites = savedSeries.slice(3, 6).map((series) => ({
      seriesId: series._id.toString(),
      seriesTitle: series.name,
      thumbnail: series.cover,
      addedAt: new Date(),
    }))
    
    for (const item of favorites) {
      await save('favorites', item)
    }
    console.log('Saved favorites')
    
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