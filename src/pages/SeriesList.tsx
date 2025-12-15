import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import type { Series, Genre } from '../types'
import './SeriesList.css'

const SeriesList: React.FC = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [series, setSeries] = useState<Series[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    fetchSeriesByGenre(selectedGenreId)
  }, [selectedGenreId])

  const fetchInitialData = async () => {
    await Promise.all([fetchGenres(), fetchSeriesByGenre(null)])
    setLoading(false)
  }

  const fetchGenres = async () => {
    try {
      const response = await fetch('/.netlify/functions/api?type=genres')
      const data = await response.json()
      if (data.success) {
        setGenres(data.data)
      }
    } catch (error) {
      console.error('Error fetching genres:', error)
    }
  }

  const fetchSeriesByGenre = async (genreId: number | null) => {
    try {
      const url = genreId
        ? `/.netlify/functions/api?type=series&genreId=${genreId}`
        : '/.netlify/functions/api?type=series'
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setSeries(data.data)
      }
    } catch (error) {
      console.error('Error fetching series:', error)
    }
  }

  const handleGenreClick = (genreId: number | null) => {
    setSelectedGenreId(genreId)
  }

  const handleSeriesClick = (seriesId: number) => {
    navigate(`/series/${seriesId}`)
  }

  const handleEditClick = (e: React.MouseEvent, seriesId: number) => {
    e.stopPropagation()
    navigate(`/series/${seriesId}/edit`)
  }

  const sortedGenres = [...genres].sort((a, b) => a.name.localeCompare(b.name))

  const renderLoading = () => (
    <div className="series-list-page">
      <TopBar />
      <div className="loading">Loading series...</div>
      <BottomBar />
    </div>
  )

  const renderPlayIcon = () => (
    <div className="series-play-icon">
      <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  )

  const renderEditIcon = (seriesItem: Series) => (
    <button
      className="series-edit-btn"
      onClick={(e) => handleEditClick(e, seriesItem.id)}
      aria-label={t.series.edit}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
      </svg>
    </button>
  )

  const renderSeriesCard = (seriesItem: Series) => (
    <Card
      key={seriesItem._id}
      className="series-card"
      title={seriesItem.description}
      onClick={() => handleSeriesClick(seriesItem.id)}
    >
      <div className="series-content">
        <div className="series-cover-container">
          <img
            src={seriesItem.cover}
            alt={seriesItem.name}
            className="series-cover"
          />
          {renderPlayIcon()}
        </div>
        <div className="series-info">
          <h3 className="series-name">{seriesItem.name}</h3>
          <p className="series-description">{seriesItem.description}</p>
          <div className="series-actions">
            {renderEditIcon(seriesItem)}
          </div>
        </div>
      </div>
    </Card>
  )

  const renderGenreItem = (genre: Genre) => (
    <li
      key={genre.id}
      className={`genre-item ${selectedGenreId === genre.id ? 'active' : ''}`}
      onClick={() => handleGenreClick(genre.id)}
    >
      {genre.name}
    </li>
  )

  const renderGenreList = () => (
    <aside className="genre-list">
      <ul>
        <li
          className={`genre-item ${selectedGenreId === null ? 'active' : ''}`}
          onClick={() => handleGenreClick(null)}
        >
          {t.series.allGenres}
        </li>
        {sortedGenres.map(renderGenreItem)}
      </ul>
    </aside>
  )

  const renderSeriesGrid = () => (
    <div className="series-grid-container">
      <div className="series-grid card-list">{series.map(renderSeriesCard)}</div>
      {series.length === 0 && (
        <div className="no-series">{t.series.noSeries}</div>
      )}
    </div>
  )

  const renderSeriesList = () => (
    <div className="series-list-page">
      <TopBar />
      <main className="series-list-content">
        {renderGenreList()}
        {renderSeriesGrid()}
      </main>
      <BottomBar />
    </div>
  )

  if (loading) {
    return renderLoading()
  }

  return renderSeriesList()
}

export default SeriesList