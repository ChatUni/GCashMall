import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import type { Product } from '../types'
import './ProductList.css'

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    fetchProducts()
  }, [searchParams])

  const fetchProducts = async () => {
    try {
      const category = searchParams.get('category')
      const search = searchParams.get('search')
      
      let url = '/.netlify/functions/api?type=products'
      if (category) {
        url += `&category=${category}`
      }
      if (search) {
        url += `&search=${search}`
      }

      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="product-list-page">
        <TopBar />
        <div className="loading">Loading products...</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="product-list-page">
      <TopBar />
      <main className="product-list-content">
        <div className="products-grid">
          {products.map((product) => (
            <Card
              key={product._id}
              className="product-card"
            >
              <div className="product-content">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image"
                />
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <p className="product-price">${product.price.toFixed(2)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        {products.length === 0 && (
          <div className="no-products">No products found.</div>
        )}
      </main>
      <BottomBar />
    </div>
  )
}

export default ProductList