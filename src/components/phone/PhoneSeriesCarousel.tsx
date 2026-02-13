import React from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneSeriesCard from './PhoneSeriesCard'
import type { Series } from '../../types'
import './PhoneSeriesCarousel.css'

interface PhoneSeriesCarouselProps {
  title: string
  series: Series[]
  loading?: boolean
  excludeSeriesId?: string
  onMoreClick?: () => void
}

const PhoneSeriesCarousel: React.FC<PhoneSeriesCarouselProps> = ({
  title,
  series,
  loading = false,
  excludeSeriesId,
  onMoreClick,
}) => {
  const navigate = useNavigate()
  const filteredSeries = excludeSeriesId
    ? series.filter((s) => s._id !== excludeSeriesId)
    : series

  const handleMoreClick = () => {
    if (onMoreClick) {
      onMoreClick()
    } else {
      // Default: navigate to genre page
      navigate('/genre')
    }
  }

  if (loading) {
    return (
      <section className="phone-carousel">
        <div className="phone-carousel-header">
          <h2 className="phone-carousel-title">{title}</h2>
          <button className="phone-carousel-more" onClick={handleMoreClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <div className="phone-carousel-scroll">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="phone-card-skeleton">
              <div className="phone-card-skeleton-image" />
              <div className="phone-card-skeleton-title" />
              <div className="phone-card-skeleton-tag" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (filteredSeries.length === 0) {
    return null
  }

  return (
    <section className="phone-carousel">
      <div className="phone-carousel-header">
        <h2 className="phone-carousel-title">{title}</h2>
        <button className="phone-carousel-more" onClick={handleMoreClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
      <div className="phone-carousel-scroll">
        {filteredSeries.map((item) => (
          <PhoneSeriesCard key={item._id} series={item} />
        ))}
      </div>
    </section>
  )
}

export default PhoneSeriesCarousel
