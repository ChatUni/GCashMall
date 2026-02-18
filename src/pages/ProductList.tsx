import { createSignal, createEffect, Show, For } from 'solid-js'
import { useSearchParams } from '@solidjs/router'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { apiGet } from '../utils/api'
import type { Product } from '../types'
import './ProductList.css'

const ProductList = () => {
  const [products, setProducts] = createSignal<Product[]>([])
  const [loading, setLoading] = createSignal(true)
  const [searchParams] = useSearchParams()

  const fetchProducts = async () => {
    try {
      const category = searchParams.category as string | undefined
      const search = searchParams.search as string | undefined

      const params: Record<string, string | number> = {}
      if (category) {
        params.category = category
      }
      if (search) {
        params.search = search
      }

      const response = await apiGet<Product[]>('products', Object.keys(params).length > 0 ? params : undefined)
      if (response.success && response.data) {
        setProducts(response.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  createEffect(() => {
    // Track searchParams to re-fetch when they change
    const _category = searchParams.category
    const _search = searchParams.search
    fetchProducts()
  })

  return (
    <div class="product-list-page">
      <TopBar />
      <Show when={!loading()} fallback={<div class="loading">Loading products...</div>}>
        <main class="product-list-content">
          <div class="products-grid card-list">
            <For each={products()}>
              {(product) => (
                <Card class="product-card">
                  <div class="product-content">
                    <img
                      src={product.image}
                      alt={product.name}
                      class="product-image"
                    />
                    <div class="product-info">
                      <h3 class="product-name">{product.name}</h3>
                      <p class="product-description">{product.description}</p>
                      <p class="product-price">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              )}
            </For>
          </div>
          <Show when={products().length === 0}>
            <div class="no-products">No products found.</div>
          </Show>
        </main>
      </Show>
      <BottomBar />
    </div>
  )
}

export default ProductList
