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
  user?: {
    nickname?: string
    avatarUrl?: string
  } | null
}

const TopBar: React.FC<TopBarProps> = ({ isLoggedIn = false, user = null }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1)
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
        setShowSearchSuggestions(false)
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
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearchSuggestions(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (highlightedSuggestion >= 0 && highlightedSuggestion < suggestions.length) {
        handleSuggestionClick(suggestions[highlightedSuggestion])
      } else {
        handleSearch()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedSuggestion((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSearchSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    navigate(`/series/${suggestion.seriesId}`)
    setShowSearchSuggestions(false)
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
    navigate(`/series/${item.seriesId}?episode=${item.episodeId}`)
    setShowHistoryPopover(false)
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    navigate('/account')
  }

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <img
              src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
              alt="GcashTV"
              className="app-logo"
              onClick={handleLogoClick}
            />
            <span className="brand-name" onClick={handleLogoClick}>GcashTV</span>
            
            <nav className="nav-links">
              <button
                className={`nav-link ${isActiveRoute('/') ? 'active' : ''}`}
                onClick={() => handleNavClick('/')}
              >
                {t.topBar.home}
              </button>
              <button
                className={`nav-link ${isActiveRoute('/genre') ? 'active' : ''}`}
                onClick={() => handleNavClick('/genre')}
              >
                {t.topBar.genre}
              </button>
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
                  setShowSearchSuggestions(true)
                  setHighlightedSuggestion(-1)
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                onKeyDown={handleKeyDown}
              />
              <button className="search-button" onClick={handleSearch}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>
            
            {showSearchSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion._id}
                    className={`suggestion-item ${index === highlightedSuggestion ? 'highlighted' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setHighlightedSuggestion(index)}
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
              className={`icon-button history-icon ${isActiveRoute('/account?tab=watchHistory') ? 'active' : ''}`}
              ref={historyRef}
              onMouseEnter={handleHistoryIconHover}
              onMouseLeave={() => setShowHistoryPopover(false)}
              onClick={handleHistoryIconClick}
              title={t.topBar.watchHistory}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              
              {showHistoryPopover && (
                <div className="history-popover">
                  <div className="popover-header">{t.topBar.historyTitle}</div>
                  {watchHistory.length === 0 ? (
                    <div className="popover-empty">
                      <span className="popover-empty-icon">📺</span>
                      <span className="popover-empty-text">{t.topBar.noHistory}</span>
                    </div>
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
                          <img
                            src={item.thumbnail}
                            alt={item.seriesTitle}
                            className="popover-item-thumbnail"
                          />
                          <div className="popover-item-info">
                            <span className="popover-item-title">{item.seriesTitle}</span>
                            <span className="popover-item-episode">EP {item.episodeNumber}</span>
                          </div>
                          <button className="popover-item-resume" title={t.topBar.watchHistory}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5,3 19,12 5,21" />
                            </svg>
                          </button>
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
              title={isLoggedIn && user?.nickname ? user.nickname : 'Sign In'}
            >
              {isLoggedIn && user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.nickname || 'User'}
                  className="user-avatar"
                />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
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
          onSuccess={handleLoginSuccess}
        />
      )}
    </>
  )
}

export default TopBar
