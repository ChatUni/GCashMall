import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import SeriesCard from '../components/SeriesCard'
import { useLanguage } from '../context/LanguageContext'
import { apiGet } from '../utils/api'
import type { Series, Genre } from '../types'
import './SeriesList.css'

const SeriesList: React.FC = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [series, setSeries] = useState<Series[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    const searchQuery = searchParams.get('search')
    if (searchQuery) {
      searchSeries(searchQuery)
    } else {
      fetchSeriesByGenre(selectedGenreId)
    }
  }, [selectedGenreId, searchParams])

  const fetchInitialData = async () => {
    await fetchGenres()
    setLoading(false)
  }

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

  const fetchSeriesByGenre = async (genreId: number | null) => {
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

  const handleGenreClick = (genreId: number | null) => {
    setSelectedGenreId(genreId)
  }

  const handleSeriesClick = (seriesItem: Series) => {
    navigate(`/series/${seriesItem._id}`)
  }

  const getSelectedGenreName = (): string => {
    if (selectedGenreId === null) {
      return t.series.allGenres
    }
    const genre = genres.find((g) => g.id === selectedGenreId)
    return genre?.name || t.series.allGenres
  }

  const sortedGenres = [...genres].sort((a, b) => a.name.localeCompare(b.name))

  if (loading) {
    return (
      <div className="series-list-page">
        <TopBar />
        <div className="loading">{t.series.loading}</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="series-list-page">
      <TopBar />
      <main className="series-list-content">
        <aside className="genre-sidebar">
          <ul className="genre-list">
            <li
              className={`genre-item ${selectedGenreId === null ? 'active' : ''}`}
              onClick={() => handleGenreClick(null)}
            >
              {t.series.allGenres}
            </li>
            {sortedGenres.map((genre) => (
              <li
                key={genre.id}
                className={`genre-item ${selectedGenreId === genre.id ? 'active' : ''}`}
                onClick={() => handleGenreClick(genre.id)}
              >
                {genre.name}
              </li>
            ))}
          </ul>
        </aside>

        <div className="content-grid-section">
          <div className="section-header">
            <h2 className="section-title">{getSelectedGenreName()}</h2>
            <span className="result-count">
              {t.series.resultsCount.replace('{count}', String(series.length))}
            </span>
          </div>

          {series.length === 0 ? (
            <div className="no-series">{t.series.noSeries}</div>
          ) : (
            <div className="series-grid">
              {series.map((seriesItem) => (
                <SeriesCard
                  key={seriesItem._id}
                  series={seriesItem}
                  onClick={() => handleSeriesClick(seriesItem)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default SeriesList