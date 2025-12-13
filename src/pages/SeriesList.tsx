import React, { useState, useEffect } from 'react'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import type { Series, Genre } from '../types'
import './SeriesList.css'

const SeriesList: React.FC = () => {
  const { t } = useLanguage()
  const [series, setSeries] = useState<Series[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null)
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

  const fetchSeriesByGenre = async (genreId: string | null) => {
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

  const handleGenreClick = (genreId: string | null) => {
    setSelectedGenreId(genreId)
  }

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

  const renderSeriesCard = (seriesItem: Series) => (
    <Card
      key={seriesItem._id}
      className="series-card"
      title={seriesItem.description}
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
        {genres.map(renderGenreItem)}
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