import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { languageIcons, supportedLanguages, type Language } from '../i18n'
import { apiGet, isLoggedIn as checkIsLoggedIn, getStoredUser } from '../utils/api'
import { accountStoreActions } from '../stores/accountStore'
import type { SearchSuggestion, WatchListItem, User } from '../types'
import LoginModal from './LoginModal'
import './TopBar.css'

const TopBar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [showHistoryPopover, setShowHistoryPopover] = useState(false)
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { language, setLanguage, t } = useLanguage()

  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path
  }

  // Check login status on mount and when location changes
  useEffect(() => {
    const loggedIn = checkIsLoggedIn()
    setIsLoggedIn(loggedIn)
    if (loggedIn) {
      const user = getStoredUser()
      setCurrentUser(user)
    } else {
      setCurrentUser(null)
    }
  }, [location])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistoryPopover(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchSuggestions(searchQuery)
  }, [searchQuery])

  const fetchSuggestions = async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      return
    }

    const data = await apiGet<SearchSuggestion[]>('searchSuggestions', { q: query })
    if (data.success && data.data) {
      setSuggestions(data.data)
    }
  }

  // Get watch history from user's watchList (stored on user object, no API call needed)
  const getWatchHistory = (): WatchListItem[] => {
    if (!currentUser?.watchList) return []
    // Return most recent 5 items, sorted by updatedAt descending
    return [...currentUser.watchList]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/series?search=${encodeURIComponent(searchQuery.trim())}`)
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSuggestionClick(suggestions[highlightedIndex])
      } else {
        handleSearch()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    navigate(`/series/${suggestion.seriesId}`)
    setShowSuggestions(false)
    setSearchQuery('')
  }

  const handleLogoClick = () => {
    navigate('/')
  }

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const handleLanguageClick = () => {
    setShowLanguageDropdown(!showLanguageDropdown)
  }

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang)
    setShowLanguageDropdown(false)
  }

  const handleHistoryMouseEnter = () => {
    // Clear any pending hide timeout
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current)
      historyTimeoutRef.current = null
    }
    setShowHistoryPopover(true)
  }

  const handleHistoryMouseLeave = () => {
    // Add a small delay before hiding to allow mouse to move to popover
    historyTimeoutRef.current = setTimeout(() => {
      setShowHistoryPopover(false)
    }, 150)
  }

  const handleHistoryIconClick = () => {
    if (isLoggedIn) {
      navigate('/account?tab=watchHistory')
    } else {
      setShowLoginModal(true)
    }
  }

  const handleAccountClick = () => {
    if (isLoggedIn) {
      navigate('/account')
    } else {
      setShowLoginModal(true)
    }
  }

  const handleHistoryItemClick = (item: WatchListItem) => {
    navigate(`/player/${item.seriesId}?episode=${item.episodeNumber}`)
    setShowHistoryPopover(false)
  }

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <img
              src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
              alt="App Logo"
              className="app-logo"
              onClick={handleLogoClick}
            />
            <span className="app-name" onClick={handleLogoClick}>GcashTV</span>
            
            {/* Genre Icon - Shown on tablet/mobile when nav-links are hidden */}
            <div
              className={`icon-button genre-icon ${isActiveRoute('/genre') ? 'active' : ''}`}
              onClick={() => handleNavClick('/genre')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>

            <nav className="nav-links">
              <a
                className={`nav-link ${isActiveRoute('/') ? 'active' : ''}`}
                onClick={() => handleNavClick('/')}
              >
                {t.topBar.home}
              </a>
              <a
                className={`nav-link ${isActiveRoute('/genre') ? 'active' : ''}`}
                onClick={() => handleNavClick('/genre')}
              >
                {t.topBar.genre}
              </a>
            </nav>
          </div>
          
          <div className="search-container" ref={searchRef}>
            <div className="search-combo">
              <input
                type="text"
                className="search-input"
                placeholder={t.topBar.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(true)
                  setHighlightedIndex(-1)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
              />
              <button className="search-button" onClick={handleSearch}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion._id}
                    className={`suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="suggestion-title">{suggestion.title}</span>
                    <span className="suggestion-tag">{suggestion.tag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="top-bar-right">
            <div
              className="history-wrapper"
              ref={historyRef}
              onMouseEnter={handleHistoryMouseEnter}
              onMouseLeave={handleHistoryMouseLeave}
            >
              <div
                className="icon-button history-icon"
                onClick={handleHistoryIconClick}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              
              {showHistoryPopover && (
                <div className="history-popover">
                  <div className="popover-header">{t.topBar.historyTitle}</div>
                  {getWatchHistory().length === 0 ? (
                    <div className="popover-empty">{t.topBar.noHistory}</div>
                  ) : (
                    <div className="popover-list">
                      {getWatchHistory().map((item) => (
                        <div
                          key={item.seriesId}
                          className="popover-item"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleHistoryItemClick(item)
                          }}
                        >
                          <img
                            src={item.seriesCover}
                            alt={item.seriesName}
                            className="popover-item-cover"
                          />
                          <div className="popover-item-info">
                            <span className="popover-item-title">{item.seriesName}</span>
                            <span className="popover-item-episode">EP {item.episodeNumber}</span>
                          </div>
                          <svg className="popover-item-resume" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className={`icon-button account-icon ${isActiveRoute('/account') ? 'active' : ''}`}
              onClick={handleAccountClick}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
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
          </div>
        </div>
      </div>
      
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(user) => {
            // Initialize account store with user data before navigating
            accountStoreActions.initializeUserData(user)
            setShowLoginModal(false)
            // Navigate to Home page after successful login
            navigate('/')
          }}
        />
      )}
    </>
  )
}

export default TopBar