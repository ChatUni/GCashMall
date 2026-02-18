import { createSignal, onMount, Show, For, createEffect, onCleanup } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCard from '../../components/phone/PhoneSeriesCard'
import { t } from '../../stores/languageStore'
import { apiGet } from '../../utils/api'
import type { Series, SearchSuggestion } from '../../types'
import './PhoneSearch.css'

const PhoneSearch = () => {
  const navigate = useNavigate()
  let inputRef: HTMLInputElement | undefined

  const [searchQuery, setSearchQuery] = createSignal('')
  const [suggestions, setSuggestions] = createSignal<SearchSuggestion[]>([])
  const [searchResults, setSearchResults] = createSignal<Series[]>([])
  const [loading, setLoading] = createSignal(false)
  const [hasSearched, setHasSearched] = createSignal(false)

  // Focus input on mount
  onMount(() => {
    inputRef?.focus()
  })

  // Fetch suggestions as user types
  createEffect(() => {
    const query = searchQuery()

    if (query.length < 1) {
      setSuggestions([])
      return
    }

    const debounce = setTimeout(async () => {
      const data = await apiGet<SearchSuggestion[]>('searchSuggestions', { q: query })
      if (data.success && data.data) {
        setSuggestions(data.data)
      }
    }, 300)

    onCleanup(() => clearTimeout(debounce))
  })

  const handleSearch = async () => {
    if (!searchQuery().trim()) return

    setLoading(true)
    setHasSearched(true)
    setSuggestions([])

    const result = await apiGet<Series[]>('series', { search: searchQuery().trim() })
    if (result.success && result.data) {
      setSearchResults(result.data)
    }
    setLoading(false)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    navigate(`/player/${suggestion.seriesId}`)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClear = () => {
    setSearchQuery('')
    setSuggestions([])
    setSearchResults([])
    setHasSearched(false)
    inputRef?.focus()
  }

  return (
    <PhoneLayout showHeader={false}>
      <div class="phone-search">
        {/* Search Header */}
        <div class="phone-search-header">
          <div class="phone-search-input-container">
            <svg class="phone-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              class="phone-search-input"
              placeholder={t().topBar.searchPlaceholder}
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
            <Show when={searchQuery()}>
              <button class="phone-search-clear" onClick={handleClear}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </button>
            </Show>
          </div>
          <button class="phone-search-cancel" onClick={() => navigate(-1)}>
            {t().player?.cancel || 'Cancel'}
          </button>
        </div>

        {/* Suggestions */}
        <Show when={suggestions().length > 0 && !hasSearched()}>
          <div class="phone-search-suggestions">
            <For each={suggestions()}>
              {(suggestion) => (
                <div
                  class="phone-search-suggestion"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <svg class="phone-suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span class="phone-suggestion-title">{suggestion.title}</span>
                  <span class="phone-suggestion-tag">{suggestion.tag}</span>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Search Results */}
        <Show when={hasSearched()}>
          <div class="phone-search-results">
            <Show
              when={!loading()}
              fallback={
                <div class="phone-search-loading">
                  <div class="phone-search-grid">
                    <For each={[1, 2, 3, 4, 5, 6]}>
                      {() => (
                        <div class="phone-search-skeleton">
                          <div class="phone-search-skeleton-image" />
                          <div class="phone-search-skeleton-title" />
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              }
            >
              <Show
                when={searchResults().length > 0}
                fallback={
                  <div class="phone-search-empty">
                    <span class="phone-search-empty-icon">🔍</span>
                    <p>{t().series?.noSeries || 'No results found'}</p>
                  </div>
                }
              >
                <div class="phone-search-results-header">
                  <span class="phone-search-results-count">
                    {t().series?.resultsCount?.replace('{count}', String(searchResults().length)) || `${searchResults().length} results`}
                  </span>
                </div>
                <div class="phone-search-grid">
                  <For each={searchResults()}>
                    {(item) => <PhoneSeriesCard series={item} />}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        </Show>

        {/* Empty State - No search yet */}
        <Show when={!hasSearched() && suggestions().length === 0}>
          <div class="phone-search-empty-state">
            <span class="phone-search-empty-icon">🔍</span>
            <p>{t().topBar?.searchPlaceholder || 'Search for series'}</p>
          </div>
        </Show>
      </div>
    </PhoneLayout>
  )
}

export default PhoneSearch
