import React from 'react'
import './Card.css'

interface CardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  title?: string
}

const Card: React.FC<CardProps> = ({ children, onClick, className = '', title }) => {
  return (
    <div
      className={`card ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </div>
  )
}

export default Card