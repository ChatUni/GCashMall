import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCard from '../../components/phone/PhoneSeriesCard'
import { useLanguage } from '../../context/LanguageContext'
import { apiGet } from '../../utils/api'
import type { Series, Genre as GenreType } from '../../types'
import './PhoneGenre.css'

const PhoneGenre: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [genres, setGenres] = useState<GenreType[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGenre, setActiveGenre] = useState<string>('all')

  // Get category from URL query params
  useEffect(() => {
    const category = searchParams.get('category')
    if (category) {
      setActiveGenre(category)
    } else {
      setActiveGenre('all')
    }
  }, [searchParams])

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      const result = await apiGet<GenreType[]>('genres')
      if (result.success && result.data) {
        setGenres(result.data)
      }
    }
    fetchGenres()
  }, [])

  // Fetch series based on active genre
  useEffect(() => {
    const fetchSeries = async () => {
      setLoading(true)
      let params: Record<string, string | number> | undefined = undefined
      if (activeGenre !== 'all') {
        const matchingGenre = genres.find((g) => g.name === activeGenre)
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
  }, [activeGenre, genres])

  const handleGenreClick = (genreName: string) => {
    if (genreName === 'all') {
      navigate('/genre')
    } else {
      navigate(`/genre?category=${encodeURIComponent(genreName)}`)
    }
  }

  const getActiveGenreName = (): string => {
    if (activeGenre === 'all') {
      return t.series.allGenres
    }
    return activeGenre
  }

  return (
    <PhoneLayout showHeader={true} title={t.topBar.genre}>
      <div className="phone-genre">
        {/* Genre Pills */}
        <div className="phone-genre-pills">
          <button
            className={`phone-genre-pill ${activeGenre === 'all' ? 'active' : ''}`}
            onClick={() => handleGenreClick('all')}
          >
            {t.series.allGenres}
          </button>
          {genres.map((genre) => (
            <button
              key={genre._id}
              className={`phone-genre-pill ${activeGenre === genre.name ? 'active' : ''}`}
              onClick={() => handleGenreClick(genre.name)}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Results Header */}
        <div className="phone-genre-header">
          <h2 className="phone-genre-title">{getActiveGenreName()}</h2>
          <span className="phone-genre-count">
            {t.series.resultsCount.replace('{count}', String(series.length))}
          </span>
        </div>

        {/* Series Grid */}
        {loading ? (
          <div className="phone-genre-loading">
            <div className="phone-genre-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="phone-genre-skeleton">
                  <div className="phone-genre-skeleton-image" />
                  <div className="phone-genre-skeleton-title" />
                  <div className="phone-genre-skeleton-tag" />
                </div>
              ))}
            </div>
          </div>
        ) : series.length === 0 ? (
          <div className="phone-genre-empty">
            <span className="phone-genre-empty-icon">🎬</span>
            <p>{t.series.noSeries}</p>
          </div>
        ) : (
          <div className="phone-genre-grid">
            {series.map((item) => (
              <PhoneSeriesCard key={item._id} series={item} />
            ))}
          </div>
        )}
      </div>
    </PhoneLayout>
  )
}

export default PhoneGenre
