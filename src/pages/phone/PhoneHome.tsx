import React from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCarousel from '../../components/phone/PhoneSeriesCarousel'
import { useLanguage } from '../../context/LanguageContext'
import { useFeaturedStore, useRecommendationsStore, useNewReleasesStore } from '../../stores'
import { fetchFeaturedSeries, fetchRecommendations, fetchNewReleases } from '../../services/dataService'
import './PhoneHome.css'

// Initialize data fetch outside component
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchFeaturedSeries()
    fetchRecommendations()
    fetchNewReleases()
  }
}

const PhoneHome: React.FC = () => {
  const { series: featuredSeries, loading: featuredLoading } = useFeaturedStore()
  const { series: recommendations, loading: recommendationsLoading } = useRecommendationsStore()
  const { series: newReleases, loading: newReleasesLoading } = useNewReleasesStore()
  const navigate = useNavigate()
  const { t } = useLanguage()

  // Initialize data on first render
  initializeData()

  const handleFeaturedClick = () => {
    if (featuredSeries?._id) {
      navigate(`/player/${featuredSeries._id}`)
    }
  }

  const handleTagClick = (tag: string) => {
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  return (
    <PhoneLayout showHeader={true}>
      <div className="phone-home">
        {/* Featured Hero Section */}
        {featuredLoading ? (
          <div className="phone-hero-loading">
            <div className="phone-hero-skeleton" />
          </div>
        ) : featuredSeries ? (
          <section className="phone-hero" onClick={handleFeaturedClick}>
            <div className="phone-hero-image-container">
              <img
                src={featuredSeries.cover}
                alt={featuredSeries.name}
                className="phone-hero-image"
              />
              <div className="phone-hero-gradient" />
            </div>
            <div className="phone-hero-content">
              <h1 className="phone-hero-title">{featuredSeries.name}</h1>
              <div className="phone-hero-tags">
                {featuredSeries.tags?.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="phone-hero-tag"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTagClick(tag)
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {featuredSeries.genre?.slice(0, 2).map((genre) => (
                  <span
                    key={genre._id}
                    className="phone-hero-tag"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTagClick(genre.name)
                    }}
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
              <p className="phone-hero-description">{featuredSeries.description}</p>
              <button className="phone-hero-play-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                {t.home.play}
              </button>
            </div>
          </section>
        ) : null}

        {/* Recommendations Section */}
        <PhoneSeriesCarousel
          title={t.home.youMightLike}
          series={recommendations}
          loading={recommendationsLoading}
        />

        {/* New Releases Section */}
        <PhoneSeriesCarousel
          title={t.home.newReleases}
          series={newReleases}
          loading={newReleasesLoading}
        />
      </div>
    </PhoneLayout>
  )
}

export default PhoneHome
