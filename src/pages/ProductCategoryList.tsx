import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import Card from '../components/Card'
import { useLanguage } from '../context/LanguageContext'
import { apiGet } from '../utils/api'
import type { ProductCategory } from '../types'
import './ProductCategoryList.css'

const ProductCategoryList: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useLanguage()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await apiGet<ProductCategory[]>('categories')
      if (response.success && response.data) {
        setCategories(response.data)
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
      <div className="product-category-page">
        <TopBar />
        <div className="loading">{t.productCategory.loading}</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="product-category-page">
      <TopBar />
      <main className="product-category-content">
        <div className="product-category-list">
          {categories.map((category) => (
            <Card
              key={category._id}
              className="product-category-card"
              onClick={() => handleCategoryClick(category._id)}
            >
              <div className="product-category-item">
                <div className="product-category-image-container">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="product-category-image"
                  />
                </div>
                <h3 className="product-category-name">{category.name}</h3>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default ProductCategoryList