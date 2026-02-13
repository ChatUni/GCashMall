import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCard from '../../components/phone/PhoneSeriesCard'
import { useLanguage } from '../../context/LanguageContext'
import { apiGet } from '../../utils/api'
import type { Series, SearchSuggestion } from '../../types'
import './PhoneSearch.css'

const PhoneSearch: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [searchResults, setSearchResults] = useState<Series[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 1) {
        setSuggestions([])
        return
      }

      const data = await apiGet<SearchSuggestion[]>('searchSuggestions', { q: searchQuery })
      if (data.success && data.data) {
        setSuggestions(data.data)
      }
    }

    const debounce = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setHasSearched(true)
    setSuggestions([])

    const result = await apiGet<Series[]>('series', { search: searchQuery.trim() })
    if (result.success && result.data) {
      setSearchResults(result.data)
    }
    setLoading(false)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    navigate(`/player/${suggestion.seriesId}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClear = () => {
    setSearchQuery('')
    setSuggestions([])
    setSearchResults([])
    setHasSearched(false)
    inputRef.current?.focus()
  }

  return (
    <PhoneLayout showHeader={false}>
      <div className="phone-search">
        {/* Search Header */}
        <div className="phone-search-header">
          <div className="phone-search-input-container">
            <svg className="phone-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="phone-search-input"
              placeholder={t.topBar.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchQuery && (
              <button className="phone-search-clear" onClick={handleClear}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </button>
            )}
          </div>
          <button className="phone-search-cancel" onClick={() => navigate(-1)}>
            {t.player?.cancel || 'Cancel'}
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !hasSearched && (
          <div className="phone-search-suggestions">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion._id}
                className="phone-search-suggestion"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <svg className="phone-suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <span className="phone-suggestion-title">{suggestion.title}</span>
                <span className="phone-suggestion-tag">{suggestion.tag}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search Results */}
        {hasSearched && (
          <div className="phone-search-results">
            {loading ? (
              <div className="phone-search-loading">
                <div className="phone-search-grid">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="phone-search-skeleton">
                      <div className="phone-search-skeleton-image" />
                      <div className="phone-search-skeleton-title" />
                    </div>
                  ))}
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="phone-search-empty">
                <span className="phone-search-empty-icon">🔍</span>
                <p>{t.series?.noSeries || 'No results found'}</p>
              </div>
            ) : (
              <>
                <div className="phone-search-results-header">
                  <span className="phone-search-results-count">
                    {t.series?.resultsCount?.replace('{count}', String(searchResults.length)) || `${searchResults.length} results`}
                  </span>
                </div>
                <div className="phone-search-grid">
                  {searchResults.map((item) => (
                    <PhoneSeriesCard key={item._id} series={item} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty State - No search yet */}
        {!hasSearched && suggestions.length === 0 && (
          <div className="phone-search-empty-state">
            <span className="phone-search-empty-icon">🔍</span>
            <p>{t.topBar?.searchPlaceholder || 'Search for series'}</p>
          </div>
        )}
      </div>
    </PhoneLayout>
  )
}

export default PhoneSearch
