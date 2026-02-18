import { createSignal, onMount, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import Card from '../components/Card'
import { t } from '../stores/languageStore'
import { apiGet } from '../utils/api'
import type { ProductCategory } from '../types'
import './ProductCategoryList.css'

const ProductCategoryList = () => {
  const [categories, setCategories] = createSignal<ProductCategory[]>([])
  const [loading, setLoading] = createSignal(true)
  const navigate = useNavigate()

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

  onMount(() => {
    fetchCategories()
  })

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/products?category=${categoryId}`)
  }

  return (
    <div class="product-category-page">
      <TopBar />
      <Show when={!loading()} fallback={<div class="loading">{t().productCategory.loading}</div>}>
        <main class="product-category-content">
          <div class="product-category-list">
            <For each={categories()}>
              {(category) => (
                <Card
                  class="product-category-card"
                  onClick={() => handleCategoryClick(category._id)}
                >
                  <div class="product-category-item">
                    <div class="product-category-image-container">
                      <img
                        src={category.image}
                        alt={category.name}
                        class="product-category-image"
                      />
                    </div>
                    <h3 class="product-category-name">{category.name}</h3>
                  </div>
                </Card>
              )}
            </For>
          </div>
        </main>
      </Show>
      <BottomBar />
    </div>
  )
}

export default ProductCategoryList
