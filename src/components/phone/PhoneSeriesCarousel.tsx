import React from 'react'
import PhoneSeriesCard from './PhoneSeriesCard'
import type { Series } from '../../types'
import './PhoneSeriesCarousel.css'

interface PhoneSeriesCarouselProps {
  title: string
  series: Series[]
  loading?: boolean
  excludeSeriesId?: string
}

const PhoneSeriesCarousel: React.FC<PhoneSeriesCarouselProps> = ({
  title,
  series,
  loading = false,
  excludeSeriesId,
}) => {
  const filteredSeries = excludeSeriesId
    ? series.filter((s) => s._id !== excludeSeriesId)
    : series

  if (loading) {
    return (
      <section className="phone-carousel">
        <h2 className="phone-carousel-title">{title}</h2>
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
      <h2 className="phone-carousel-title">{title}</h2>
      <div className="phone-carousel-scroll">
        {filteredSeries.map((item) => (
          <PhoneSeriesCard key={item._id} series={item} />
        ))}
      </div>
    </section>
  )
}

export default PhoneSeriesCarousel
