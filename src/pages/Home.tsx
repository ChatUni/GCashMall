import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import { featuredSeries, youMightLikeSeries, newReleasesSeries } from '../data/seriesData'
import './Home.css'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  
  // Refs for carousel scrolling
  const youMightLikeRef = useRef<HTMLDivElement>(null)
  const newReleasesRef = useRef<HTMLDivElement>(null)

  const handleSeriesClick = (seriesId: string) => {
    navigate(`/player/${seriesId}`)
  }

  const handlePlayClick = () => {
    navigate(`/player/${featuredSeries.id}`)
  }

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  const handleViewMoreClick = () => {
    navigate('/genre')
  }

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="home-page">
      <TopBar />
      <main className="home-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-poster-container" onClick={() => handleSeriesClick(featuredSeries.id)}>
            <img
              src={featuredSeries.poster}
              alt={featuredSeries.title}
              className="hero-poster"
            />
            <div className="hero-poster-overlay">
              <svg className="hero-play-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="hero-info">
            <h1 className="hero-title">{featuredSeries.title}</h1>
            <div className="hero-tags">
              {featuredSeries.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="hero-tag"
                  onClick={(e) => handleTagClick(tag, e)}
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="hero-description">{featuredSeries.description}</p>
            <button className="hero-play-button" onClick={handlePlayClick}>
              <svg className="play-button-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {t.home.play}
            </button>
          </div>
        </section>

        {/* You Might Like Section */}
        <section className="series-section">
          <div className="section-header">
            <h2 className="section-title">{t.home.youMightLike}</h2>
            <div className="carousel-controls">
              <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scrollCarousel(youMightLikeRef, 'left')}
                aria-label="Scroll left"
              />
              <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scrollCarousel(youMightLikeRef, 'right')}
                aria-label="Scroll right"
              />
            </div>
          </div>
          <div className="series-carousel" ref={youMightLikeRef}>
            {youMightLikeSeries.map((series) => (
              <div
                key={series.id}
                className="series-card"
                onClick={() => handleSeriesClick(series.id)}
              >
                <div className="series-poster-container">
                  <img
                    src={series.poster}
                    alt={series.title}
                    className="series-poster"
                  />
                </div>
                <h3 className="series-title">{series.title}</h3>
                <span
                  className="series-tag"
                  onClick={(e) => handleTagClick(series.tag, e)}
                >
                  {series.tag}
                </span>
              </div>
            ))}
            {/* View More Arrow */}
            <div className="view-more-card" onClick={handleViewMoreClick}>
              <div className="view-more-content">
                <svg className="view-more-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="view-more-text">{t.home.viewMore}</span>
              </div>
            </div>
          </div>
        </section>

        {/* New Releases Section */}
        <section className="series-section">
          <div className="section-header">
            <h2 className="section-title">{t.home.newReleases}</h2>
            <div className="carousel-controls">
              <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scrollCarousel(newReleasesRef, 'left')}
                aria-label="Scroll left"
              />
              <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scrollCarousel(newReleasesRef, 'right')}
                aria-label="Scroll right"
              />
            </div>
          </div>
          <div className="series-carousel" ref={newReleasesRef}>
            {newReleasesSeries.map((series) => (
              <div
                key={series.id}
                className="series-card"
                onClick={() => handleSeriesClick(series.id)}
              >
                <div className="series-poster-container">
                  <img
                    src={series.poster}
                    alt={series.title}
                    className="series-poster"
                  />
                </div>
                <h3 className="series-title">{series.title}</h3>
                <span
                  className="series-tag"
                  onClick={(e) => handleTagClick(series.tag, e)}
                >
                  {series.tag}
                </span>
              </div>
            ))}
            {/* View More Arrow */}
            <div className="view-more-card" onClick={handleViewMoreClick}>
              <div className="view-more-content">
                <svg className="view-more-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="view-more-text">{t.home.viewMore}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BottomBar />
    </div>
  )
}

export default Home