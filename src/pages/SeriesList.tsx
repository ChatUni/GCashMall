import { createSignal, createEffect, onMount, Show, For } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import SeriesCard from '../components/SeriesCard'
import { t } from '../stores/languageStore'
import { apiGet } from '../utils/api'
import type { Series, Genre } from '../types'
import './SeriesList.css'

const SeriesList = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [series, setSeries] = createSignal<Series[]>([])
  const [genres, setGenres] = createSignal<Genre[]>([])
  const [selectedGenreId, setSelectedGenreId] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(true)

  const fetchGenres = async () => {
    try {
      const response = await apiGet<Genre[]>('genres')
      if (response.success && response.data) {
        setGenres(response.data)
      }
    } catch (error) {
      console.error('Error fetching genres:', error)
    }
  }

  const fetchSeriesByGenre = async (genreId: string | null) => {
    try {
      const params: Record<string, string | number> | undefined = genreId ? { genreId } : undefined
      const response = await apiGet<Series[]>('series', params)
      if (response.success && response.data) {
        setSeries(response.data)
      }
    } catch (error) {
      console.error('Error fetching series:', error)
    }
  }

  const searchSeries = async (query: string) => {
    try {
      const response = await apiGet<Series[]>('series', { search: query })
      if (response.success && response.data) {
        setSeries(response.data)
      }
    } catch (error) {
      console.error('Error searching series:', error)
    }
  }

  const fetchInitialData = async () => {
    await fetchGenres()
    setLoading(false)
  }

  onMount(() => {
    fetchInitialData()
  })

  createEffect(() => {
    const searchQuery = searchParams.search as string | undefined
    if (searchQuery) {
      searchSeries(searchQuery)
    } else {
      fetchSeriesByGenre(selectedGenreId())
    }
  })

  const handleGenreClick = (genreId: string | null) => {
    setSelectedGenreId(genreId)
  }

  const handleSeriesClick = (seriesItem: Series) => {
    navigate(`/player/${seriesItem._id}`)
  }

  const getSelectedGenreName = (): string => {
    if (selectedGenreId() === null) {
      return t().series.allGenres
    }
    const genre = genres().find((g) => g._id === selectedGenreId())
    return genre?.name || t().series.allGenres
  }

  const sortedGenres = () => [...genres()].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div class="series-list-page">
      <TopBar />
      <Show when={!loading()} fallback={<div class="loading">{t().series.loading}</div>}>
        <main class="series-list-content">
          <aside class="genre-sidebar">
            <ul class="genre-list">
              <li
                class={`genre-item ${selectedGenreId() === null ? 'active' : ''}`}
                onClick={() => handleGenreClick(null)}
              >
                {t().series.allGenres}
              </li>
              <For each={sortedGenres()}>
                {(genre) => (
                  <li
                    class={`genre-item ${selectedGenreId() === genre._id ? 'active' : ''}`}
                    onClick={() => handleGenreClick(genre._id)}
                  >
                    {genre.name}
                  </li>
                )}
              </For>
            </ul>
          </aside>

          <div class="content-grid-section">
            <div class="section-header">
              <h2 class="section-title">{getSelectedGenreName()}</h2>
              <span class="result-count">
                {t().series.resultsCount.replace('{count}', String(series().length))}
              </span>
            </div>

            <Show when={series().length > 0} fallback={<div class="no-series">{t().series.noSeries}</div>}>
              <div class="series-grid">
                <For each={series()}>
                  {(seriesItem) => (
                    <SeriesCard
                      series={seriesItem}
                      onClick={() => handleSeriesClick(seriesItem)}
                    />
                  )}
                </For>
              </div>
            </Show>
          </div>
        </main>
      </Show>
      <BottomBar />
    </div>
  )
}

export default SeriesList
