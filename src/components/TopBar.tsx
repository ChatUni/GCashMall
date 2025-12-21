import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useWatchHistory } from '../context/WatchHistoryContext'
import { languageIcons, supportedLanguages } from '../i18n'
import type { Language } from '../i18n'
import LoginModal from './LoginModal'
import './TopBar.css'

interface SearchSuggestion {
  id: string
  title: string
  tag: string
}

const TopBar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [showHistoryPopover, setShowHistoryPopover] = useState(false)
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1)
  const [showLoginModal, setShowLoginModal] = useState(false)
  
  const { isLoggedIn, user } = useAuth()
  const { watchHistory } = useWatchHistory()
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const historyIconRef = useRef<HTMLDivElement>(null)
  const historyPopoverRef = useRef<HTMLDivElement>(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { language, setLanguage, t } = useLanguage()

  // Mock search suggestions
  const mockSuggestions: SearchSuggestion[] = [
    { id: '1', title: 'Drama Series A', tag: 'Drama' },
    { id: '2', title: 'Action Movie B', tag: 'Action' },
    { id: '3', title: 'Comedy Show C', tag: 'Comedy' },
    { id: '4', title: 'Thriller D', tag: 'Thriller' },
  ]

  // Get recent watch history (limit to 5 items for popover)
  const recentWatchHistory = watchHistory.slice(0, 5)

  // Filter suggestions based on query
  const filteredSuggestions = searchQuery.length >= 1
    ? mockSuggestions.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false)
      }
      if (historyIconRef.current && !historyIconRef.current.contains(event.target as Node) &&
          historyPopoverRef.current && !historyPopoverRef.current.contains(event.target as Node)) {
        setShowHistoryPopover(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearchSuggestions(false)
    }
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setShowSearchSuggestions(e.target.value.length >= 1)
    setHighlightedSuggestion(-1)
  }

  const handleSearchFocus = () => {
    if (searchQuery.length >= 1) {
      setShowSearchSuggestions(true)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearchSuggestions(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedSuggestion(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedSuggestion(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      if (highlightedSuggestion >= 0 && filteredSuggestions[highlightedSuggestion]) {
        handleSuggestionClick(filteredSuggestions[highlightedSuggestion].id)
      } else {
        handleSearch()
      }
    }
  }

  const handleSuggestionClick = (id: string) => {
    navigate(`/player/${id}`)
    setShowSearchSuggestions(false)
    setSearchQuery('')
  }

  const handleLogoClick = () => {
    navigate('/')
  }

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const handleHistoryIconClick = () => {
    // Navigate to account page with watch history tab selected
    navigate('/account?tab=watchHistory')
  }

  const handleHistoryItemClick = (seriesId: string, episodeNumber: number) => {
    navigate(`/player/${seriesId}/${episodeNumber}`)
    setShowHistoryPopover(false)
  }

  const handleAccountClick = () => {
    if (isLoggedIn) {
      navigate('/account')
    } else {
      setShowLoginModal(true)
    }
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    navigate('/account')
  }

  const handleLoginClose = () => {
    setShowLoginModal(false)
  }

  const handleLanguageClick = () => {
    setShowLanguageDropdown(!showLanguageDropdown)
  }

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang)
    setShowLanguageDropdown(false)
  }

  const isNavActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header className="top-bar">
      <div className="top-bar-content">
        {/* Left side group */}
        <div className="top-bar-left">
          {/* App Logo */}
          <img
            src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
            alt="App Logo"
            className="app-logo"
            onClick={handleLogoClick}
          />

          {/* Brand Name */}
          <span className="brand-name">GcashTV</span>

          {/* Navigation Links */}
          <nav className="nav-links">
            <button
              className={`nav-link ${isNavActive('/') ? 'active' : ''}`}
              onClick={() => handleNavClick('/')}
            >
              {t.topBar.home}
            </button>
            <button
              className={`nav-link ${isNavActive('/genre') ? 'active' : ''}`}
              onClick={() => handleNavClick('/genre')}
            >
              {t.topBar.genre}
            </button>
          </nav>

          {/* Search Bar */}
          <div className="search-container" ref={searchContainerRef}>
          <div className="search-combo">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder={t.topBar.searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
            />
            <button className="search-button" onClick={handleSearch}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          </div>

          {/* Search Suggestions Popout */}
          {showSearchSuggestions && filteredSuggestions.length > 0 && (
            <div className="search-suggestions">
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`suggestion-item ${index === highlightedSuggestion ? 'highlighted' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion.id)}
                  onMouseEnter={() => setHighlightedSuggestion(index)}
                >
                  <span className="suggestion-title">{suggestion.title}</span>
                  <span className="suggestion-tag">{suggestion.tag}</span>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* Right side icons group */}
        <div className="top-bar-right">
          {/* Watch History Icon */}
          <div
            className={`icon-button history-icon ${isNavActive('/history') ? 'active' : ''}`}
            ref={historyIconRef}
            onMouseEnter={() => setShowHistoryPopover(true)}
            onMouseLeave={() => setShowHistoryPopover(false)}
            onClick={handleHistoryIconClick}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>

            {/* History Popover */}
            {showHistoryPopover && (
              <div
                className="history-popover"
                ref={historyPopoverRef}
                onMouseEnter={() => setShowHistoryPopover(true)}
                onMouseLeave={() => setShowHistoryPopover(false)}
              >
                <div className="popover-header">{t.topBar.watchHistory}</div>
                {recentWatchHistory.length === 0 ? (
                  <div className="popover-empty">
                    <span className="empty-icon">📺</span>
                    <span className="empty-text">{t.topBar.noWatchHistory}</span>
                  </div>
                ) : (
                  <div className="popover-list">
                    {recentWatchHistory.map((item) => (
                      <div
                        key={item.seriesId}
                        className="popover-item"
                        onClick={() => handleHistoryItemClick(item.seriesId, item.episodeNumber)}
                      >
                        <div className="popover-item-thumbnail">
                          <img src={item.poster} alt={item.seriesTitle} className="popover-thumbnail-img" />
                        </div>
                        <div className="popover-item-info">
                          <span className="popover-item-title">{item.seriesTitle}</span>
                          <span className="popover-item-episode">Episode {item.episodeNumber}</span>
                        </div>
                        <span className="popover-item-resume">▶</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Icon */}
          <div
            className={`icon-button account-icon ${isNavActive('/account') ? 'active' : ''}`}
            onClick={handleAccountClick}
            title={isLoggedIn ? user?.nickname || 'Account' : 'Sign In'}
          >
            {isLoggedIn && user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="topbar-avatar" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>

          {/* Language Switch */}
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
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleLoginClose}
        onSuccess={handleLoginSuccess}
      />
    </header>
  )
}

export default TopBar