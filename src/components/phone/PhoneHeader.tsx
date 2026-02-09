import React from 'react'
import { useNavigate } from 'react-router-dom'
import './PhoneHeader.css'

interface PhoneHeaderProps {
  title?: string
  showBackButton?: boolean
  showSearch?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
}

const PhoneHeader: React.FC<PhoneHeaderProps> = ({
  title,
  showBackButton = false,
  showSearch = true,
  onBack,
  rightAction,
}) => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  const handleLogoClick = () => {
    navigate('/')
  }

  const handleSearchClick = () => {
    navigate('/search')
  }

  return (
    <header className="phone-header">
      <div className="phone-header-left">
        {showBackButton ? (
          <button className="phone-header-back" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <div className="phone-header-logo" onClick={handleLogoClick}>
            <img
              src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
              alt="GcashTV"
              className="phone-logo-image"
            />
          </div>
        )}
      </div>

      {title && (
        <h1 className="phone-header-title">{title}</h1>
      )}

      <div className="phone-header-right">
        {rightAction}
        {showSearch && (
          <button className="phone-header-search" onClick={handleSearchClick}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}

export default PhoneHeader
