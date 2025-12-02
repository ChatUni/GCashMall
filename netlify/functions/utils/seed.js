import { save } from './db.js'

const seedData = async () => {
  try {
    console.log('Starting to seed database...')
    
    const testTodos = [
      {
        text: 'Learn React and TypeScript',
        completed: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        text: 'Set up Netlify functions',
        completed: true,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      },
      {
        text: 'Connect to MongoDB',
        completed: true,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03')
      },
      {
        text: 'Build todo list component',
        completed: false,
        createdAt: new Date('2024-01-04'),
        updatedAt: new Date('2024-01-04')
      },
      {
        text: 'Add styling to the app',
        completed: false,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05')
      }
    ]
    
    for (const todo of testTodos) {
      await save('todos', todo)
      console.log(`Saved todo: ${todo.text}`)
    }
    
    console.log('Database seeding completed successfully!')
    
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