import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js'
import { useNavigate, useLocation } from '@solidjs/router'
import { t } from '../stores/languageStore'
import { languageStore, languageStoreActions } from '../stores/languageStore'
import { languageIcons, supportedLanguages, type Language } from '../i18n'
import { apiGet, isLoggedIn as checkIsLoggedIn, getStoredUser } from '../utils/api'
import { accountStoreActions } from '../stores/accountStore'
import type { SearchSuggestion, WatchListItem, User } from '../types'
import LoginModal from './LoginModal'
import './TopBar.css'

const TopBar = () => {
  const [searchQuery, setSearchQuery] = createSignal('')
  const [showLanguageDropdown, setShowLanguageDropdown] = createSignal(false)
  const [showSuggestions, setShowSuggestions] = createSignal(false)
  const [suggestions, setSuggestions] = createSignal<SearchSuggestion[]>([])
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1)
  const [showHistoryPopover, setShowHistoryPopover] = createSignal(false)
  let historyTimeoutRef: ReturnType<typeof setTimeout> | null = null
  const [showLoginModal, setShowLoginModal] = createSignal(false)
  const [isLoggedIn, setIsLoggedIn] = createSignal(false)
  const [currentUser, setCurrentUser] = createSignal<User | null>(null)

  let searchRef: HTMLDivElement | undefined
  let historyRef: HTMLDivElement | undefined

  const navigate = useNavigate()
  const location = useLocation()

  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path
  }

  // Check login status on mount and when location changes
  createEffect(() => {
    // Track location.pathname to re-run when it changes
    const _path = location.pathname
    const loggedIn = checkIsLoggedIn()
    setIsLoggedIn(loggedIn)
    if (loggedIn) {
      const user = getStoredUser()
      setCurrentUser(user)
    } else {
      setCurrentUser(null)
    }
  })

  // Click outside handler
  const handleClickOutside = (event: MouseEvent) => {
    if (searchRef && !searchRef.contains(event.target as Node)) {
      setShowSuggestions(false)
    }
    if (historyRef && !historyRef.contains(event.target as Node)) {
      setShowHistoryPopover(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  onCleanup(() => document.removeEventListener('mousedown', handleClickOutside))

  // Search suggestions effect
  createEffect(() => {
    fetchSuggestions(searchQuery())
  })

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
    const user = currentUser()
    if (!user?.watchList) return []
    // Return most recent 5 items, sorted by updatedAt descending
    return [...user.watchList]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  }

  const handleSearch = () => {
    if (searchQuery().trim()) {
      navigate(`/series?search=${encodeURIComponent(searchQuery().trim())}`)
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (highlightedIndex() >= 0 && highlightedIndex() < suggestions().length) {
        handleSuggestionClick(suggestions()[highlightedIndex()])
      } else {
        handleSearch()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions().length - 1))
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
    setShowLanguageDropdown(!showLanguageDropdown())
  }

  const handleLanguageSelect = (lang: Language) => {
    languageStoreActions.setLanguage(lang)
    setShowLanguageDropdown(false)
  }

  const handleHistoryMouseEnter = () => {
    // Clear any pending hide timeout
    if (historyTimeoutRef) {
      clearTimeout(historyTimeoutRef)
      historyTimeoutRef = null
    }
    setShowHistoryPopover(true)
  }

  const handleHistoryMouseLeave = () => {
    // Add a small delay before hiding to allow mouse to move to popover
    historyTimeoutRef = setTimeout(() => {
      setShowHistoryPopover(false)
    }, 150)
  }

  const handleHistoryIconClick = () => {
    if (isLoggedIn()) {
      navigate('/account?tab=watchHistory')
    } else {
      setShowLoginModal(true)
    }
  }

  const handleAccountClick = () => {
    if (isLoggedIn()) {
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
      <div class="top-bar">
        <div class="top-bar-content">
          <div class="top-bar-left">
            <img
              src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
              alt="App Logo"
              class="app-logo"
              onClick={handleLogoClick}
            />
            <span class="app-name" onClick={handleLogoClick}>GcashTV</span>
            
            {/* Genre Icon - Shown on tablet/mobile when nav-links are hidden */}
            <div
              class={`icon-button genre-icon ${isActiveRoute('/genre') ? 'active' : ''}`}
              onClick={() => handleNavClick('/genre')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>

            <nav class="nav-links">
              <a
                class={`nav-link ${isActiveRoute('/') ? 'active' : ''}`}
                onClick={() => handleNavClick('/')}
              >
                {t().topBar.home}
              </a>
              <a
                class={`nav-link ${isActiveRoute('/genre') ? 'active' : ''}`}
                onClick={() => handleNavClick('/genre')}
              >
                {t().topBar.genre}
              </a>
            </nav>
          </div>
          
          <div class="search-container" ref={searchRef}>
            <div class="search-combo">
              <input
                type="text"
                class="search-input"
                placeholder={t().topBar.searchPlaceholder}
                value={searchQuery()}
                onInput={(e) => {
                  setSearchQuery(e.currentTarget.value)
                  setShowSuggestions(true)
                  setHighlightedIndex(-1)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
              />
              <button class="search-button" onClick={handleSearch}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>
            
            <Show when={showSuggestions() && suggestions().length > 0}>
              <div class="search-suggestions">
                <For each={suggestions()}>
                  {(suggestion, index) => (
                    <div
                      class={`suggestion-item ${index() === highlightedIndex() ? 'highlighted' : ''}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(index())}
                    >
                      <span class="suggestion-title">{suggestion.title}</span>
                      <span class="suggestion-tag">{suggestion.tag}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div class="top-bar-right">
            <div
              class="history-wrapper"
              ref={historyRef}
              onMouseEnter={handleHistoryMouseEnter}
              onMouseLeave={handleHistoryMouseLeave}
            >
              <div
                class="icon-button history-icon"
                onClick={handleHistoryIconClick}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              
              <Show when={showHistoryPopover()}>
                <div class="history-popover">
                  <div class="popover-header">{t().topBar.historyTitle}</div>
                  <Show
                    when={getWatchHistory().length > 0}
                    fallback={<div class="popover-empty">{t().topBar.noHistory}</div>}
                  >
                    <div class="popover-list">
                      <For each={getWatchHistory()}>
                        {(item) => (
                          <div
                            class="popover-item"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleHistoryItemClick(item)
                            }}
                          >
                            <img
                              src={item.seriesCover}
                              alt={item.seriesName}
                              class="popover-item-cover"
                            />
                            <div class="popover-item-info">
                              <span class="popover-item-title">{item.seriesName}</span>
                              <span class="popover-item-episode">EP {item.episodeNumber}</span>
                            </div>
                            <svg class="popover-item-resume" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5,3 19,12 5,21" />
                            </svg>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>

            <div
              class={`icon-button account-icon ${isActiveRoute('/account') ? 'active' : ''}`}
              onClick={handleAccountClick}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <div class="language-switch" onClick={handleLanguageClick}>
              <span class="language-icon">{languageIcons[languageStore.language]}</span>
              <Show when={showLanguageDropdown()}>
                <div class="language-dropdown">
                  <For each={supportedLanguages}>
                    {(lang) => (
                      <div
                        class="language-option"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLanguageSelect(lang)
                        }}
                      >
                        <span class="language-option-icon">{languageIcons[lang]}</span>
                        <span class="language-option-name">{t().languages[lang]}</span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
      
      <Show when={showLoginModal()}>
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(user: User) => {
            // Initialize account store with user data before navigating
            accountStoreActions.initializeUserData(user)
            setShowLoginModal(false)
            // Navigate to Home page after successful login
            navigate('/')
          }}
        />
      </Show>
    </>
  )
}

export default TopBar
