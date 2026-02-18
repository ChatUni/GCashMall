import { For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import SeriesCard from './SeriesCard'
import { t } from '../stores/languageStore'
import type { Series } from '../types'
import './SeriesCarousel.css'

interface SeriesCarouselProps {
  title: string
  series: Series[]
  loading?: boolean
  excludeSeriesId?: string
}

const SeriesCarousel = (props: SeriesCarouselProps) => {
  const navigate = useNavigate()
  let carouselRef: HTMLDivElement | undefined

  // Filter out excluded series if provided
  const filteredSeries = () =>
    props.excludeSeriesId
      ? props.series.filter((s) => s._id !== props.excludeSeriesId)
      : props.series

  const scrollLeft = () => {
    if (carouselRef) {
      const scrollAmount = carouselRef.clientWidth * 0.8
      carouselRef.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (carouselRef) {
      const scrollAmount = carouselRef.clientWidth * 0.8
      carouselRef.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleViewMore = () => {
    navigate('/genre')
  }

  if (props.loading) {
    return <div class="series-section loading">Loading...</div>
  }

  return (
    <section class="series-section">
      <div class="series-section-header">
        <h2 class="series-section-title">{props.title}</h2>
        <div class="carousel-controls">
          <button
            class="carousel-arrow carousel-arrow-left"
            onClick={scrollLeft}
            aria-label="Scroll left"
          />
          <button
            class="carousel-arrow carousel-arrow-right"
            onClick={scrollRight}
            aria-label="Scroll right"
          />
        </div>
      </div>
      <div class="series-carousel" ref={carouselRef}>
        <For each={filteredSeries()}>
          {(item) => <SeriesCard series={item} />}
        </For>
        <div class="view-more-card" onClick={handleViewMore}>
          <div class="view-more-content">
            <svg class="view-more-arrow" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </div>
          <span class="view-more-text">{t().home.viewMore || 'View More'}</span>
        </div>
      </div>
    </section>
  )
}

export default SeriesCarousel
