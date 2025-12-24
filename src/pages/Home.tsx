import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import RecommendationSection from '../components/RecommendationSection'
import NewReleasesSection from '../components/NewReleasesSection'
import { useLanguage } from '../context/LanguageContext'
import { apiGet } from '../utils/api'
import type { Series } from '../types'
import './Home.css'

const Home: React.FC = () => {
  const [featuredSeries, setFeaturedSeries] = useState<Series | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useLanguage()

  useEffect(() => {
    fetchFeaturedSeries()
  }, [])

  const fetchFeaturedSeries = async () => {
    const data = await apiGet<Series>('featured')
    if (data.success && data.data) {
      setFeaturedSeries(data.data)
    }
    setLoading(false)
  }

  const handlePlayClick = () => {
    if (featuredSeries) {
      navigate(`/series/${featuredSeries._id}`)
    }
  }

  const handlePosterClick = () => {
    if (featuredSeries) {
      navigate(`/series/${featuredSeries._id}`)
    }
  }

  return (
    <div className="home-page">
      <TopBar />
      
      {loading ? (
        <div className="hero-loading">Loading...</div>
      ) : featuredSeries ? (
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-poster" onClick={handlePosterClick}>
              <img
                src={featuredSeries.cover}
                alt={featuredSeries.name}
                className="hero-poster-image"
              />
              <div className="hero-poster-overlay">
                <svg className="play-icon" width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
            </div>
            
            <div className="hero-info">
              <h1 className="hero-title">{featuredSeries.name}</h1>
              
              <div className="hero-tags">
                {featuredSeries.tags?.map((tag, index) => (
                  <span key={index} className="hero-tag">{tag}</span>
                ))}
                {featuredSeries.genre?.map((genre) => (
                  <span key={genre.id} className="hero-tag">{genre.name}</span>
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
          </div>
        </section>
      ) : null}

      <RecommendationSection />
      <NewReleasesSection />

      <BottomBar />
    </div>
  )
}

export default Home