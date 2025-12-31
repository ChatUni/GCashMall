import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import { apiGet } from '../utils/api'
import type { Series } from '../types'
import './Home.css'

const Home: React.FC = () => {
  const [featuredSeries, setFeaturedSeries] = useState<Series | null>(null)
  const [youMightLikeSeries, setYouMightLikeSeries] = useState<Series[]>([])
  const [newReleasesSeries, setNewReleasesSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  
  const youMightLikeRef = useRef<HTMLDivElement>(null)
  const newReleasesRef = useRef<HTMLDivElement>(null)
  
  const navigate = useNavigate()
  const { t } = useLanguage()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [featuredData, recommendationsData, newReleasesData] = await Promise.all([
      apiGet<Series>('featured'),
      apiGet<Series[]>('recommendations'),
      apiGet<Series[]>('newReleases'),
    ])
    
    if (featuredData.success && featuredData.data) {
      setFeaturedSeries(featuredData.data)
    }
    if (recommendationsData.success && recommendationsData.data) {
      setYouMightLikeSeries(recommendationsData.data)
    }
    if (newReleasesData.success && newReleasesData.data) {
      setNewReleasesSeries(newReleasesData.data)
    }
    setLoading(false)
  }

  const handlePlayClick = () => {
    if (featuredSeries) {
      navigate(`/player/${featuredSeries._id}`)
    }
  }

  const handlePosterClick = () => {
    if (featuredSeries) {
      navigate(`/player/${featuredSeries._id}`)
    }
  }

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  const handleSeriesClick = (seriesId: string) => {
    navigate(`/player/${seriesId}`)
  }

  const handleViewMoreClick = () => {
    navigate('/genre')
  }

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  const renderSeriesCard = (series: Series) => (
    <div
      key={series._id}
      className="series-card"
      onClick={() => handleSeriesClick(series._id)}
    >
      <div className="series-poster-container">
        <img
          src={series.cover}
          alt={series.name}
          className="series-poster-image"
        />
      </div>
      <h3 className="series-title">{series.name}</h3>
      {series.genre && series.genre.length > 0 && (
        <span
          className="series-tag"
          onClick={(e) => handleTagClick(series.genre[0].name, e)}
        >
          {series.genre[0].name}
        </span>
      )}
    </div>
  )

  const renderViewMoreCard = () => (
    <div className="view-more-card" onClick={handleViewMoreClick}>
      <div className="view-more-content">
        <svg className="view-more-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6" />
        </svg>
      </div>
      <span className="view-more-text">{t.home.viewMore || 'View More'}</span>
    </div>
  )

  const renderSeriesSection = (
    title: string,
    series: Series[],
    carouselRef: React.RefObject<HTMLDivElement | null>
  ) => (
    <section className="series-section">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <div className="carousel-controls">
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={() => scrollCarousel(carouselRef, 'left')}
            aria-label="Scroll left"
          />
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={() => scrollCarousel(carouselRef, 'right')}
            aria-label="Scroll right"
          />
        </div>
      </div>
      <div className="series-carousel" ref={carouselRef}>
        {series.map(renderSeriesCard)}
        {renderViewMoreCard()}
      </div>
    </section>
  )

  if (loading) {
    return (
      <div className="home-page">
        <TopBar />
        <div className="loading-container">Loading...</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="home-page">
      <TopBar />
      
      <main className="home-content">
        {featuredSeries && (
          <section className="hero-section">
            <div className="hero-poster-container" onClick={handlePosterClick}>
              <img
                src={featuredSeries.cover}
                alt={featuredSeries.name}
                className="hero-poster-image"
              />
              <div className="hero-poster-overlay">
                <svg className="hero-play-icon" width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
            </div>
            
            <div className="hero-info">
              <h1 className="hero-title">{featuredSeries.name}</h1>
              
              <div className="hero-tags">
                {featuredSeries.genre?.map((genre) => (
                  <span
                    key={genre.id}
                    className="hero-tag"
                    onClick={(e) => handleTagClick(genre.name, e)}
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
              
              <p className="hero-description">{featuredSeries.description}</p>
              
              <button className="hero-play-button" onClick={handlePlayClick}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                {t.home.play}
              </button>
            </div>
          </section>
        )}

        {renderSeriesSection(t.home.youMightLike, youMightLikeSeries, youMightLikeRef)}
        {renderSeriesSection(t.home.newReleases, newReleasesSeries, newReleasesRef)}
      </main>

      <BottomBar />
    </div>
  )
}

export default Home
