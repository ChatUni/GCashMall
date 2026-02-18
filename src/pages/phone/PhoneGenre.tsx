import { createSignal, createEffect, Show, For } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCard from '../../components/phone/PhoneSeriesCard'
import { t } from '../../stores/languageStore'
import { apiGet } from '../../utils/api'
import type { Series, Genre as GenreType } from '../../types'
import './PhoneGenre.css'

const PhoneGenre = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [genres, setGenres] = createSignal<GenreType[]>([])
  const [series, setSeries] = createSignal<Series[]>([])
  const [loading, setLoading] = createSignal(true)
  const [activeGenre, setActiveGenre] = createSignal<string>('all')
  const [showFilterModal, setShowFilterModal] = createSignal(false)

  // Get category from URL query params
  createEffect(() => {
    const category = searchParams.category as string | undefined
    if (category) {
      setActiveGenre(category)
    } else {
      setActiveGenre('all')
    }
  })

  // Fetch genres
  const fetchGenres = async () => {
    const result = await apiGet<GenreType[]>('genres')
    if (result.success && result.data) {
      setGenres(result.data)
    }
  }
  fetchGenres()

  // Fetch series based on active genre
  createEffect(() => {
    const currentGenre = activeGenre()
    const currentGenres = genres()
    const fetchSeries = async () => {
      setLoading(true)
      let params: Record<string, string | number> | undefined = undefined
      if (currentGenre !== 'all') {
        const matchingGenre = currentGenres.find((g) => g.name === currentGenre)
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

  const handleGenreSelect = (genreName: string) => {
    setShowFilterModal(false)
    if (genreName === 'all') {
      navigate('/genre')
    } else {
      navigate(`/genre?category=${encodeURIComponent(genreName)}`)
    }
  }

  const getActiveGenreName = (): string => {
    if (activeGenre() === 'all') {
      return t().series.allGenres
    }
    return activeGenre()
  }

  return (
    <PhoneLayout showHeader={true} title={t().topBar.genre}>
      <div class="phone-genre">
        {/* Filter Button */}
        <div class="phone-genre-filter-bar">
          <button
            class="phone-genre-filter-button"
            onClick={() => setShowFilterModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>{getActiveGenreName()}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <span class="phone-genre-count">
            {t().series.resultsCount.replace('{count}', String(series().length))}
          </span>
        </div>

        {/* Filter Modal */}
        <Show when={showFilterModal()}>
          <div class="phone-genre-modal-overlay" onClick={() => setShowFilterModal(false)}>
            <div class="phone-genre-modal" onClick={(e) => e.stopPropagation()}>
              <div class="phone-genre-modal-header">
                <h3>Select Category</h3>
                <button
                  class="phone-genre-modal-close"
                  onClick={() => setShowFilterModal(false)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div class="phone-genre-modal-list">
                <button
                  class={`phone-genre-modal-item ${activeGenre() === 'all' ? 'active' : ''}`}
                  onClick={() => handleGenreSelect('all')}
                >
                  <span>{t().series.allGenres}</span>
                  <Show when={activeGenre() === 'all'}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </Show>
                </button>
                <For each={genres()}>
                  {(genre) => (
                    <button
                      class={`phone-genre-modal-item ${activeGenre() === genre.name ? 'active' : ''}`}
                      onClick={() => handleGenreSelect(genre.name)}
                    >
                      <span>{genre.name}</span>
                      <Show when={activeGenre() === genre.name}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        {/* Series Grid */}
        <Show
          when={!loading()}
          fallback={
            <div class="phone-genre-loading">
              <div class="phone-genre-grid">
                <For each={[1, 2, 3, 4, 5, 6]}>
                  {() => (
                    <div class="phone-genre-skeleton">
                      <div class="phone-genre-skeleton-image" />
                      <div class="phone-genre-skeleton-title" />
                      <div class="phone-genre-skeleton-tag" />
                    </div>
                  )}
                </For>
              </div>
            </div>
          }
        >
          <Show
            when={series().length > 0}
            fallback={
              <div class="phone-genre-empty">
                <span class="phone-genre-empty-icon">🎬</span>
                <p>{t().series.noSeries}</p>
              </div>
            }
          >
            <div class="phone-genre-grid">
              <For each={series()}>
                {(item) => <PhoneSeriesCard series={item} />}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </PhoneLayout>
  )
}

export default PhoneGenre
