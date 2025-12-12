import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import type { ProductCategory } from '../types'
import './Home.css'

const Home: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/.netlify/functions/api?type=categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/products?category=${categoryId}`)
  }

  if (loading) {
    return (
      <div className="home-page">
        <TopBar />
        <div className="loading">Loading categories...</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="home-page">
      <TopBar />
      <main className="home-content">
        <div className="category-list">
          {categories.map((category) => (
            <Card
              key={category._id}
              className="category-card"
              onClick={() => handleCategoryClick(category._id)}
            >
              <div className="category-content">
                <img
                  src={category.image}
                  alt={category.name}
                  className="category-image"
                />
                <h3 className="category-name">{category.name}</h3>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default Home