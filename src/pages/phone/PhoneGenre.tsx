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
  const [showFilterModal, setShowFilterModal] = useState(false)

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

  const handleGenreSelect = (genreName: string) => {
    setShowFilterModal(false)
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
        {/* Filter Button */}
        <div className="phone-genre-filter-bar">
          <button 
            className="phone-genre-filter-button"
            onClick={() => setShowFilterModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>{getActiveGenreName()}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <span className="phone-genre-count">
            {t.series.resultsCount.replace('{count}', String(series.length))}
          </span>
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="phone-genre-modal-overlay" onClick={() => setShowFilterModal(false)}>
            <div className="phone-genre-modal" onClick={(e) => e.stopPropagation()}>
              <div className="phone-genre-modal-header">
                <h3>Select Category</h3>
                <button 
                  className="phone-genre-modal-close"
                  onClick={() => setShowFilterModal(false)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="phone-genre-modal-list">
                <button
                  className={`phone-genre-modal-item ${activeGenre === 'all' ? 'active' : ''}`}
                  onClick={() => handleGenreSelect('all')}
                >
                  <span>{t.series.allGenres}</span>
                  {activeGenre === 'all' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                {genres.map((genre) => (
                  <button
                    key={genre._id}
                    className={`phone-genre-modal-item ${activeGenre === genre.name ? 'active' : ''}`}
                    onClick={() => handleGenreSelect(genre.name)}
                  >
                    <span>{genre.name}</span>
                    {activeGenre === genre.name && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
