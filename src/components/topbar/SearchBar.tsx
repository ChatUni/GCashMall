import { createEffect, onCleanup, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { t } from '../../stores/languageStore'
import { topBarStore, topBarStoreActions } from '../../stores/topBarStore'
import { fetchSuggestions } from '../../services/topBarService'
import type { SearchSuggestion } from '../../types'

const SearchBar = () => {
  const navigate = useNavigate()
  let searchRef: HTMLDivElement | undefined

  const handleClickOutside = (event: MouseEvent) => {
    if (searchRef && !searchRef.contains(event.target as Node)) {
      topBarStoreActions.setShowSuggestions(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  onCleanup(() => document.removeEventListener('mousedown', handleClickOutside))

  createEffect(() => {
    fetchSuggestions(topBarStore.searchQuery)
  })

  const handleSearch = () => {
    const query = topBarStore.searchQuery.trim()
    if (!query) return
    navigate(`/series?search=${encodeURIComponent(query)}`)
    topBarStoreActions.setShowSuggestions(false)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    navigate(`/series/${suggestion.seriesId}`)
    topBarStoreActions.setShowSuggestions(false)
    topBarStoreActions.setSearchQuery('')
  }

  const handleInput = (value: string) => {
    topBarStoreActions.setSearchQuery(value)
    topBarStoreActions.setShowSuggestions(true)
    topBarStoreActions.setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEnterKey()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      topBarStoreActions.moveHighlightDown()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      topBarStoreActions.moveHighlightUp()
    } else if (e.key === 'Escape') {
      topBarStoreActions.setShowSuggestions(false)
    }
  }

  const handleEnterKey = () => {
    const idx = topBarStore.highlightedIndex
    if (idx >= 0 && idx < topBarStore.suggestions.length) {
      handleSuggestionClick(topBarStore.suggestions[idx])
    } else {
      handleSearch()
    }
  }

  return (
    <div class="search-container" ref={searchRef}>
      <div class="search-combo">
        <input
          type="text"
          class="search-input"
          placeholder={t().topBar.searchPlaceholder}
          value={topBarStore.searchQuery}
          onInput={(e) => handleInput(e.currentTarget.value)}
          onFocus={() => topBarStoreActions.setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
        />
        <button class="search-button" onClick={handleSearch}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>

      <Show
        when={topBarStore.showSuggestions && topBarStore.suggestions.length > 0}
      >
        <div class="search-suggestions">
          <For each={topBarStore.suggestions}>
            {(suggestion, index) => (
              <div
                class={`suggestion-item ${index() === topBarStore.highlightedIndex ? 'highlighted' : ''}`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() =>
                  topBarStoreActions.setHighlightedIndex(index())
                }
              >
                <span class="suggestion-title">{suggestion.title}</span>
                <span class="suggestion-tag">{suggestion.tag}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default SearchBar
