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

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const tag = getMainTag()
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  return (
    <div className="series-card" onClick={handleClick}>
      <div className="series-poster-container">
        <img src={series.cover} alt={series.name} className="series-poster" />
      </div>
      <h3 className="series-title">{series.name}</h3>
      {getMainTag() && (
        <span className="series-tag" onClick={handleTagClick}>
          {getMainTag()}
        </span>
      )}
    </div>
  )
}

export default SeriesCard
