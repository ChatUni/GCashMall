import React from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import RecommendationSection from '../components/RecommendationSection'
import NewReleasesSection from '../components/NewReleasesSection'
import { useLanguage } from '../context/LanguageContext'
import { useFeaturedStore } from '../stores'
import { fetchFeaturedSeries } from '../services/dataService'
import './Home.css'

// Initialize data fetch outside component (not in useEffect)
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchFeaturedSeries()
  }
}

// Click handlers defined outside component (avoiding embedded functions)
const createPlayClickHandler = (navigate: ReturnType<typeof useNavigate>, seriesId: string | undefined) => () => {
  if (seriesId) {
    navigate(`/player/${seriesId}`)
  }
}

const createPosterClickHandler = (navigate: ReturnType<typeof useNavigate>, seriesId: string | undefined) => () => {
  if (seriesId) {
    navigate(`/player/${seriesId}`)
  }
}

const createTagClickHandler = (navigate: ReturnType<typeof useNavigate>, tag: string) => () => {
  navigate(`/genre?category=${encodeURIComponent(tag)}`)
}

const Home: React.FC = () => {
  const { series: featuredSeries, loading } = useFeaturedStore()
  const navigate = useNavigate()
  const { t } = useLanguage()

  // Initialize data on first render
  initializeData()

  const handlePlayClick = createPlayClickHandler(navigate, featuredSeries?._id)
  const handlePosterClick = createPosterClickHandler(navigate, featuredSeries?._id)
  const handleTagClick = (tag: string) => createTagClickHandler(navigate, tag)()

  return (
    <div className="home-page">
      <TopBar />

      {loading ? (
        <div className="hero-loading">Loading...</div>
      ) : featuredSeries ? (
        <HeroSection
          series={featuredSeries}
          onPlayClick={handlePlayClick}
          onPosterClick={handlePosterClick}
          onTagClick={handleTagClick}
          playText={t.home.play}
        />
      ) : null}

      <RecommendationSection />
      <NewReleasesSection />

      <BottomBar />
    </div>
  )
}

// Pure sub-component for hero section
interface HeroSectionProps {
  series: {
    _id: string
    name: string
    cover: string
    description: string
    tags?: string[]
    genre?: { _id: string; name: string }[]
  }
  onPlayClick: () => void
  onPosterClick: () => void
  onTagClick: (tag: string) => void
  playText: string
}

const HeroSection: React.FC<HeroSectionProps> = ({
  series,
  onPlayClick,
  onPosterClick,
  onTagClick,
  playText,
}) => (
  <section className="hero-section">
    <div className="hero-content">
      <div className="hero-poster" onClick={onPosterClick}>
        <img
          src={series.cover}
          alt={series.name}
          className="hero-poster-image"
        />
        <div className="hero-poster-overlay">
          <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
      </div>

      <div className="hero-info">
        <h1 className="hero-title">{series.name}</h1>

        <div className="hero-tags">
          {series.tags?.map((tag, index) => (
            <span key={index} className="hero-tag" onClick={() => onTagClick(tag)}>
              {tag}
            </span>
          ))}
          {series.genre?.map((genre) => (
            <span key={genre._id} className="hero-tag" onClick={() => onTagClick(genre.name)}>
              {genre.name}
            </span>
          ))}
        </div>

        <p className="hero-description">{series.description}</p>

        <button className="hero-play-button" onClick={onPlayClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          {playText}
        </button>
      </div>
    </div>
  </section>
)

export default Home
