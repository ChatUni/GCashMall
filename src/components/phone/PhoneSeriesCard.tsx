import { Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type { Series } from '../../types'
import './PhoneSeriesCard.css'

interface PhoneSeriesCardProps {
  series: Series
  onClick?: () => void
}

const PhoneSeriesCard = (props: PhoneSeriesCardProps) => {
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

  return (
    <div class="phone-series-card" onClick={handleClick}>
      <div class="phone-series-poster">
        <img src={props.series.cover} alt={props.series.name} class="phone-series-image" />
      </div>
      <h3 class="phone-series-title">{props.series.name}</h3>
      <Show when={getMainTag()}>
        <span class="phone-series-tag">{getMainTag()}</span>
      </Show>
    </div>
  )
}

export default PhoneSeriesCard
