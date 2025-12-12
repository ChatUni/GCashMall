import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { languageIcons, supportedLanguages, type Language } from '../i18n'
import './TopBar.css'

const TopBar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()

  const handleSearch = () => {
    navigateToProductsWithSearch(searchQuery, navigate)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    handleEnterKeyPress(e, handleSearch)
  }

  const handleLogoClick = () => {
    navigate('/')
  }

  const handleLanguageClick = () => {
    setShowLanguageDropdown(!showLanguageDropdown)
  }

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang)
    setShowLanguageDropdown(false)
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
            placeholder={t.topBar.searchPlaceholder}
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

        <div className="language-switch" onClick={handleLanguageClick}>
          <span className="language-icon">{languageIcons[language]}</span>
          {showLanguageDropdown && (
            <div className="language-dropdown">
              {supportedLanguages.map((lang) => (
                <div
                  key={lang}
                  className="language-option"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLanguageSelect(lang)
                  }}
                >
                  <span className="language-option-icon">{languageIcons[lang]}</span>
                  <span className="language-option-name">{t.languages[lang]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cart">
          🛒
        </div>
      </div>
    </div>
  )
}

const navigateToProductsWithSearch = (
  searchQuery: string,
  navigate: ReturnType<typeof useNavigate>,
) => {
  if (searchQuery.trim()) {
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
  }
}

const handleEnterKeyPress = (
  e: React.KeyboardEvent,
  callback: () => void,
) => {
  if (e.key === 'Enter') {
    callback()
  }
}

export default TopBar