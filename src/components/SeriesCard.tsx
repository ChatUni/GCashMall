import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Series } from '../types'
import './SeriesCard.css'

interface SeriesCardProps {
  series: Series
  onClick?: () => void
}

const SeriesCard: React.FC<SeriesCardProps> = ({ series, onClick }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(`/player/${series._id}`)
    }
  }

  const getMainTag = (): string => {
    if (series.tags && series.tags.length > 0) {
      return series.tags[0]
    }
    if (series.genre && series.genre.length > 0) {
      return series.genre[0].name
    }
    return ''
  }

  return (
    <div className="series-card" onClick={handleClick}>
      <div className="series-card-poster">
        <img src={series.cover} alt={series.name} className="series-card-image" />
        <div className="series-card-overlay">
          <svg className="series-card-play-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
      </div>
      <div className="series-card-info">
        <h3 className="series-card-title">{series.name}</h3>
        {getMainTag() && <span className="series-card-tag">{getMainTag()}</span>}
      </div>
    </div>
  )
}

export default SeriesCard