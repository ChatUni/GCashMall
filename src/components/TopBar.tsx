import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { languageIcons, supportedLanguages, type Language } from '../i18n'
import { apiGet } from '../utils/api'
import type { SearchSuggestion, WatchHistoryItem } from '../types'
import LoginModal from './LoginModal'
import './TopBar.css'

interface TopBarProps {
  isLoggedIn?: boolean
}

const TopBar: React.FC<TopBarProps> = ({ isLoggedIn = false }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [showHistoryPopover, setShowHistoryPopover] = useState(false)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [showLoginModal, setShowLoginModal] = useState(false)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { language, setLanguage, t } = useLanguage()

  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path
  }

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

  const fetchWatchHistory = async () => {
    const data = await apiGet<WatchHistoryItem[]>('watchHistory', { limit: 5 })
    if (data.success && data.data) {
      setWatchHistory(data.data)
    }
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
    navigate(`/player/${suggestion.seriesId}`)
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

  const handleHistoryIconHover = () => {
    setShowHistoryPopover(true)
    fetchWatchHistory()
  }

  const handleHistoryIconClick = () => {
    navigate('/account?tab=watchHistory')
  }

  const handleAccountClick = () => {
    if (isLoggedIn) {
      navigate('/account')
    } else {
      setShowLoginModal(true)
    }
  }

  const handleHistoryItemClick = (item: WatchHistoryItem) => {
    navigate(`/player/${item.seriesId}?episode=${item.episodeId}`)
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
            <span className="app-name" onClick={handleLogoClick}>GcashReels</span>
            
            <nav className="nav-links">
              <a
                className={`nav-link ${isActiveRoute('/') ? 'active' : ''}`}
                onClick={() => handleNavClick('/')}
              >
                {t.topBar.home}
              </a>
              <a
                className={`nav-link ${isActiveRoute('/series') ? 'active' : ''}`}
                onClick={() => handleNavClick('/series')}
              >
                {t.topBar.genre}
              </a>
            </nav>
          </div>
          
          <div className="search-container" ref={searchRef}>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            
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
              className="icon-button history-icon"
              ref={historyRef}
              onMouseEnter={handleHistoryIconHover}
              onMouseLeave={() => setShowHistoryPopover(false)}
              onClick={handleHistoryIconClick}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              
              {showHistoryPopover && (
                <div className="history-popover">
                  <div className="popover-header">{t.topBar.historyTitle}</div>
                  {watchHistory.length === 0 ? (
                    <div className="popover-empty">{t.topBar.noHistory}</div>
                  ) : (
                    <div className="popover-list">
                      {watchHistory.map((item) => (
                        <div
                          key={item._id}
                          className="popover-item"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleHistoryItemClick(item)
                          }}
                        >
                          <div className="popover-item-info">
                            <span className="popover-item-title">{item.seriesTitle}</span>
                            <span className="popover-item-episode">EP {item.episodeNumber}</span>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
          onLoginSuccess={() => {
            setShowLoginModal(false)
            navigate('/account')
          }}
        />
      )}
    </>
  )
}

export default TopBar