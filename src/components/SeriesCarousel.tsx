import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SeriesCard from './SeriesCard'
import { useLanguage } from '../context/LanguageContext'
import type { Series } from '../types'
import './SeriesCarousel.css'

interface SeriesCarouselProps {
  title: string
  series: Series[]
  loading?: boolean
  excludeSeriesId?: string
}

const SeriesCarousel: React.FC<SeriesCarouselProps> = ({ 
  title, 
  series, 
  loading = false,
  excludeSeriesId 
}) => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const carouselRef = useRef<HTMLDivElement>(null)

  // Filter out excluded series if provided
  const filteredSeries = excludeSeriesId 
    ? series.filter(s => s._id !== excludeSeriesId)
    : series

  const scrollLeft = () => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.8
      carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.8
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleViewMore = () => {
    navigate('/genre')
  }

  if (loading) {
    return <div className="series-section loading">Loading...</div>
  }

  return (
    <section className="series-section">
      <div className="series-section-header">
        <h2 className="series-section-title">{title}</h2>
        <div className="carousel-controls">
          <button 
            className="carousel-arrow carousel-arrow-left" 
            onClick={scrollLeft}
            aria-label="Scroll left"
          />
          <button 
            className="carousel-arrow carousel-arrow-right" 
            onClick={scrollRight}
            aria-label="Scroll right"
          />
        </div>
      </div>
      <div className="series-carousel" ref={carouselRef}>
        {filteredSeries.map((item) => (
          <SeriesCard key={item._id} series={item} />
        ))}
        <div className="view-more-card" onClick={handleViewMore}>
          <div className="view-more-content">
            <svg className="view-more-arrow" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </div>
          <span className="view-more-text">{t.home.viewMore || 'View More'}</span>
        </div>
      </div>
    </section>
  )
}

export default SeriesCarousel
