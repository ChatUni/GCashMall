import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import { apiGet } from '../utils/api'
import type { Series, Genre as GenreType } from '../types'
import './Genre.css'

const GenrePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  
  const [genres, setGenres] = useState<GenreType[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGenre, setActiveGenre] = useState<string>('all')
  const [showMobileDropdown, setShowMobileDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get category from URL query params
  useEffect(() => {
    const category = searchParams.get('category')
    if (category) {
      setActiveGenre(category)
    } else {
      setActiveGenre('all')
    }
  }, [searchParams])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMobileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      // Find the genre _id from the genre name
      let params: Record<string, string | number> | undefined = undefined
      if (activeGenre !== 'all') {
        const matchingGenre = genres.find(g => g.name === activeGenre)
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
    setShowMobileDropdown(false)
  }

  const handleCardClick = (seriesId: string) => {
    navigate(`/player/${seriesId}`)
  }

  const getActiveGenreName = (): string => {
    if (activeGenre === 'all') {
      return t.series.allGenres
    }
    return activeGenre
  }

  const toggleMobileDropdown = () => {
    setShowMobileDropdown(!showMobileDropdown)
  }

  return (
    <div className="genre-page">
      <TopBar />
      
      {/* Genre Dropdown - Shown on tablet and mobile (≤1024px) */}
      <div className="genre-mobile-dropdown" ref={dropdownRef}>
        <button className="genre-dropdown-trigger" onClick={toggleMobileDropdown}>
          <span>{getActiveGenreName()}</span>
          <svg
            className={`dropdown-arrow ${showMobileDropdown ? 'open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </button>
        {showMobileDropdown && (
          <div className="genre-dropdown-menu">
            <button
              className={`genre-dropdown-item ${activeGenre === 'all' ? 'active' : ''}`}
              onClick={() => handleGenreClick('all')}
            >
              {t.series.allGenres}
            </button>
            {genres.map((genre) => (
              <button
                key={genre._id}
                className={`genre-dropdown-item ${activeGenre === genre.name ? 'active' : ''}`}
                onClick={() => handleGenreClick(genre.name)}
              >
                {genre.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="genre-content">
        {/* Desktop Sidebar */}
        <aside className="genre-sidebar">
          <div className="genre-list">
            <button
              className={`genre-item ${activeGenre === 'all' ? 'active' : ''}`}
              onClick={() => handleGenreClick('all')}
            >
              {t.series.allGenres}
            </button>
            {genres.map((genre) => (
              <button
                key={genre._id}
                className={`genre-item ${activeGenre === genre.name ? 'active' : ''}`}
                onClick={() => handleGenreClick(genre.name)}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </aside>

        <main className="genre-grid-section">
          <div className="genre-header">
            <h1 className="genre-title">{getActiveGenreName()}</h1>
            <span className="genre-count">
              {t.series.resultsCount.replace('{count}', String(series.length))}
            </span>
          </div>

          {loading ? (
            <div className="genre-loading">{t.series.loading}</div>
          ) : series.length === 0 ? (
            <div className="genre-empty">{t.series.noSeries}</div>
          ) : (
            <div className="genre-grid">
              {series.map((item) => (
                <div
                  key={item._id}
                  className="genre-card"
                  onClick={() => handleCardClick(item._id)}
                >
                  <div className="genre-card-poster">
                    <img
                      src={item.cover}
                      alt={item.name}
                      className="genre-card-image"
                    />
                  </div>
                  <h3 className="genre-card-title">{item.name}</h3>
                  {item.tags && item.tags.length > 0 && (
                    <span className="genre-card-tag">{item.tags[0]}</span>
                  )}
                  {!item.tags?.length && item.genre && item.genre.length > 0 && (
                    <span className="genre-card-tag">{item.genre[0].name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <BottomBar />
    </div>
  )
}

export default GenrePage
