import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Series } from '../../types'
import './PhoneSeriesCard.css'

interface PhoneSeriesCardProps {
  series: Series
  onClick?: () => void
}

const PhoneSeriesCard: React.FC<PhoneSeriesCardProps> = ({ series, onClick }) => {
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
    <div className="phone-series-card" onClick={handleClick}>
      <div className="phone-series-poster">
        <img src={series.cover} alt={series.name} className="phone-series-image" />
      </div>
      <h3 className="phone-series-title">{series.name}</h3>
      {getMainTag() && (
        <span className="phone-series-tag">{getMainTag()}</span>
      )}
    </div>
  )
}

export default PhoneSeriesCard
