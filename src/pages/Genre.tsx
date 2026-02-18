import { createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { t } from '../stores/languageStore'
import { apiGet } from '../utils/api'
import type { Series, Genre as GenreType } from '../types'
import './Genre.css'

const GenrePage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [genres, setGenres] = createSignal<GenreType[]>([])
  const [series, setSeries] = createSignal<Series[]>([])
  const [loading, setLoading] = createSignal(true)
  const [activeGenre, setActiveGenre] = createSignal<string>('all')
  const [showMobileDropdown, setShowMobileDropdown] = createSignal(false)
  let dropdownRef: HTMLDivElement | undefined

  // Get category from URL query params
  createEffect(() => {
    const category = searchParams.category
    if (category) {
      setActiveGenre(category as string)
    } else {
      setActiveGenre('all')
    }
  })

  // Close dropdown when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      setShowMobileDropdown(false)
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside)
  })

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside)
  })

  // Fetch genres
  const fetchGenres = async () => {
    const result = await apiGet<GenreType[]>('genres')
    if (result.success && result.data) {
      setGenres(result.data)
    }
  }

  onMount(() => {
    fetchGenres()
  })

  // Fetch series based on active genre
  createEffect(() => {
    const currentGenre = activeGenre()
    const currentGenres = genres()
    const fetchSeries = async () => {
      setLoading(true)
      let params: Record<string, string | number> | undefined = undefined
      if (currentGenre !== 'all') {
        const matchingGenre = currentGenres.find(g => g.name === currentGenre)
        if (matchingGenre) {
          params = { genreId: matchingGenre._id }
        }
      }
      const result = await apiGet<Series[]>('series', params)
      if (result.success && result.data) {
        setSeries(result.data)
      }
      setLoading(false)
    }
    fetchSeries()
  })

  const handleGenreClick = (genreName: string) => {
    if (genreName === 'all') {
      navigate('/genre')
    } else {
      navigate(`/genre?category=${encodeURIComponent(genreName)}`)
    }
    setShowMobileDropdown(false)
  }

  const handleCardClick = (seriesId: string) => {
    navigate(`/player/${seriesId}`)
  }

  const getActiveGenreName = (): string => {
    if (activeGenre() === 'all') {
      return t().series.allGenres
    }
    return activeGenre()
  }

  const toggleMobileDropdown = () => {
    setShowMobileDropdown(!showMobileDropdown())
  }

  return (
    <div class="genre-page">
      <TopBar />

      {/* Genre Dropdown - Shown on tablet and mobile (≤1024px) */}
      <div class="genre-mobile-dropdown" ref={dropdownRef}>
        <button class="genre-dropdown-trigger" onClick={toggleMobileDropdown}>
          <span>{getActiveGenreName()}</span>
          <svg
            class={`dropdown-arrow ${showMobileDropdown() ? 'open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </button>
        <Show when={showMobileDropdown()}>
          <div class="genre-dropdown-menu">
            <button
              class={`genre-dropdown-item ${activeGenre() === 'all' ? 'active' : ''}`}
              onClick={() => handleGenreClick('all')}
            >
              {t().series.allGenres}
            </button>
            <For each={genres()}>
              {(genre) => (
                <button
                  class={`genre-dropdown-item ${activeGenre() === genre.name ? 'active' : ''}`}
                  onClick={() => handleGenreClick(genre.name)}
                >
                  {genre.name}
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="genre-content">
        {/* Desktop Sidebar */}
        <aside class="genre-sidebar">
          <div class="genre-list">
            <button
              class={`genre-item ${activeGenre() === 'all' ? 'active' : ''}`}
              onClick={() => handleGenreClick('all')}
            >
              {t().series.allGenres}
            </button>
            <For each={genres()}>
              {(genre) => (
                <button
                  class={`genre-item ${activeGenre() === genre.name ? 'active' : ''}`}
                  onClick={() => handleGenreClick(genre.name)}
                >
                  {genre.name}
                </button>
              )}
            </For>
          </div>
        </aside>

        <main class="genre-grid-section">
          <div class="genre-header">
            <h1 class="genre-title">{getActiveGenreName()}</h1>
            <span class="genre-count">
              {t().series.resultsCount.replace('{count}', String(series().length))}
            </span>
          </div>

          <Show when={!loading()} fallback={<div class="genre-loading">{t().series.loading}</div>}>
            <Show when={series().length > 0} fallback={<div class="genre-empty">{t().series.noSeries}</div>}>
              <div class="genre-grid">
                <For each={series()}>
                  {(item) => (
                    <div
                      class="genre-card"
                      onClick={() => handleCardClick(item._id)}
                    >
                      <div class="genre-card-poster">
                        <img
                          src={item.cover}
                          alt={item.name}
                          class="genre-card-image"
                        />
                      </div>
                      <h3 class="genre-card-title">{item.name}</h3>
                      <Show when={item.tags && item.tags.length > 0}>
                        <span class="genre-card-tag">{item.tags![0]}</span>
                      </Show>
                      <Show when={!item.tags?.length && item.genre && item.genre.length > 0}>
                        <span class="genre-card-tag">{item.genre![0].name}</span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}

export default GenrePage
