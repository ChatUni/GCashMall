import { useNavigate } from '@solidjs/router'
import { Show } from 'solid-js'
import type { Series } from '../types'
import './SeriesCard.css'

interface SeriesCardProps {
  series: Series
  onClick?: () => void
}

const SeriesCard = (props: SeriesCardProps) => {
  const navigate = useNavigate()

  const handleClick = () => {
    if (props.onClick) {
      props.onClick()
    } else {
      navigate(`/player/${props.series._id}`)
    }
  }

  const getMainTag = (): string => {
    if (props.series.tags && props.series.tags.length > 0) {
      return props.series.tags[0]
    }
    if (props.series.genre && props.series.genre.length > 0) {
      return props.series.genre[0].name
    }
    return ''
  }

  const handleTagClick = (e: MouseEvent) => {
    e.stopPropagation()
    const tag = getMainTag()
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  return (
    <div class="series-card" onClick={handleClick}>
      <div class="series-poster-container">
        <img src={props.series.cover} alt={props.series.name} class="series-poster" />
      </div>
      <h3 class="series-title">{props.series.name}</h3>
      <Show when={getMainTag()}>
        <span class="series-tag" onClick={handleTagClick}>
          {getMainTag()}
        </span>
      </Show>
    </div>
  )
}

export default SeriesCard
