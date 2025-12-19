import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Card.css'

// Props for series card (with poster, title, tag)
interface SeriesCardProps {
  id: string
  poster: string
  title: string
  tag: string
  onClick?: () => void
  className?: string
  children?: never
}

// Props for generic card (with children)
interface GenericCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  id?: never
  poster?: never
  title?: never
  tag?: never
}

type CardProps = SeriesCardProps | GenericCardProps

const Card: React.FC<CardProps> = (props) => {
  const navigate = useNavigate()
  const { onClick, className = '' } = props

  // Check if it's a series card (has poster property)
  const isSeriesCard = 'poster' in props && props.poster !== undefined

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (isSeriesCard && props.id) {
      navigate(`/player/${props.id}`)
    }
  }

  if (isSeriesCard) {
    const { poster, title, tag } = props as SeriesCardProps
    return (
      <div 
        className={`card series-card ${className}`}
        onClick={handleClick}
      >
        <div className="card-poster-container">
          <img
            src={poster}
            alt={title}
            className="card-poster"
          />
        </div>
        <h3 className="card-title">{title}</h3>
        <span className="card-tag">{tag}</span>
      </div>
    )
  }

  // Generic card with children
  const { children } = props as GenericCardProps
  return (
    <div 
      className={`card ${className}`}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

export default Card