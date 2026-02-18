import { Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
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

const PhoneSeriesCarousel = (props: PhoneSeriesCarouselProps) => {
  const navigate = useNavigate()

  const filteredSeries = () =>
    props.excludeSeriesId
      ? props.series.filter((s) => s._id !== props.excludeSeriesId)
      : props.series

  const handleMoreClick = () => {
    if (props.onMoreClick) {
      props.onMoreClick()
    } else {
      navigate('/genre')
    }
  }

  const moreButton = (
    <button class="phone-carousel-more" onClick={handleMoreClick}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )

  return (
    <Show when={!props.loading} fallback={
      <section class="phone-carousel">
        <div class="phone-carousel-header">
          <h2 class="phone-carousel-title">{props.title}</h2>
          {moreButton}
        </div>
        <div class="phone-carousel-scroll">
          <For each={[1, 2, 3, 4]}>
            {() => (
              <div class="phone-card-skeleton">
                <div class="phone-card-skeleton-image" />
                <div class="phone-card-skeleton-title" />
                <div class="phone-card-skeleton-tag" />
              </div>
            )}
          </For>
        </div>
      </section>
    }>
      <Show when={filteredSeries().length > 0}>
        <section class="phone-carousel">
          <div class="phone-carousel-header">
            <h2 class="phone-carousel-title">{props.title}</h2>
            {moreButton}
          </div>
          <div class="phone-carousel-scroll">
            <For each={filteredSeries()}>
              {(item) => <PhoneSeriesCard series={item} />}
            </For>
          </div>
        </section>
      </Show>
    </Show>
  )
}

export default PhoneSeriesCarousel
