import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './TopBar.css'

const TopBar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleLogoClick = () => {
    navigate('/')
  }

  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <img 
          src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
          alt="App Logo"
          className="app-logo"
          onClick={handleLogoClick}
        />
        
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="search-button"
            onClick={handleSearch}
          >
            🔍
          </button>
        </div>

        <div className="cart">
          🛒
        </div>
      </div>
    </div>
  )
}

export default TopBar