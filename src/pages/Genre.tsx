import { createEffect, onMount, onCleanup, Show, For } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { genreStore, genreStoreActions, activeGenreName, seriesCount } from '../stores/genreStore'
import { t } from '../stores/languageStore'
import {
  fetchGenres,
  fetchSeriesByGenre,
  navigateToGenre,
  syncActiveGenreFromUrl,
} from '../services/genreService'
import './Genre.css'

// ======================
// Sub-components
// ======================

const DropdownArrow = (props: { open: boolean }) => (
  <svg
    class={`dropdown-arrow ${props.open ? 'open' : ''}`}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <polyline points="6,9 12,15 18,9" />
  </svg>
)

const GenreButton = (props: {
  genreName: string
  isActive: boolean
  className: string
  onClick: () => void
}) => (
  <button
    class={`${props.className} ${props.isActive ? 'active' : ''}`}
    onClick={props.onClick}
  >
    {props.genreName === 'all' ? t().series.allGenres : props.genreName}
  </button>
)

const GenreCard = (props: {
  item: { _id: string; name: string; cover: string; tags?: string[]; genre?: { name: string }[] }
  onClick: () => void
}) => (
  <div class="genre-card" onClick={props.onClick}>
    <div class="genre-card-poster">
      <img src={props.item.cover} alt={props.item.name} class="genre-card-image" />
    </div>
    <h3 class="genre-card-title">{props.item.name}</h3>
    <Show when={props.item.tags && props.item.tags.length > 0}>
      <span class="genre-card-tag">{props.item.tags![0]}</span>
    </Show>
    <Show when={!props.item.tags?.length && props.item.genre && props.item.genre.length > 0}>
      <span class="genre-card-tag">{props.item.genre![0].name}</span>
    </Show>
  </div>
)

// ======================
// Main page component
// ======================

const GenrePage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  let dropdownRef: HTMLDivElement | undefined

  // Sync active genre from URL
  createEffect(() => {
    syncActiveGenreFromUrl(searchParams.category as string | undefined)
  })

  // Fetch genres on mount
  onMount(() => {
    fetchGenres()
  })

  // Fetch series when activeGenre or genres change
  createEffect(() => {
    // Track reactive dependencies
    genreStore.activeGenre
    genreStore.genres
    fetchSeriesByGenre()
  })

  // Close dropdown when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      genreStoreActions.setShowMobileDropdown(false)
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside)
  })

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside)
  })

  const handleGenreClick = (genreName: string) => navigateToGenre(genreName, navigate)
  const handleCardClick = (seriesId: string) => navigate(`/player/${seriesId}`)

  return (
    <div class="genre-page">
      <TopBar />

      {/* Genre Dropdown - Shown on tablet and mobile (≤1024px) */}
      <div class="genre-mobile-dropdown" ref={dropdownRef}>
        <button
          class="genre-dropdown-trigger"
          onClick={genreStoreActions.toggleMobileDropdown}
        >
          <span>{activeGenreName()}</span>
          <DropdownArrow open={genreStore.showMobileDropdown} />
        </button>
        <Show when={genreStore.showMobileDropdown}>
          <div class="genre-dropdown-menu">
            <GenreButton
              genreName="all"
              isActive={genreStore.activeGenre === 'all'}
              className="genre-dropdown-item"
              onClick={() => handleGenreClick('all')}
            />
            <For each={genreStore.genres}>
              {(genre) => (
                <GenreButton
                  genreName={genre.name}
                  isActive={genreStore.activeGenre === genre.name}
                  className="genre-dropdown-item"
                  onClick={() => handleGenreClick(genre.name)}
                />
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="genre-content">
        {/* Desktop Sidebar */}
        <aside class="genre-sidebar">
          <div class="genre-list">
            <GenreButton
              genreName="all"
              isActive={genreStore.activeGenre === 'all'}
              className="genre-item"
              onClick={() => handleGenreClick('all')}
            />
            <For each={genreStore.genres}>
              {(genre) => (
                <GenreButton
                  genreName={genre.name}
                  isActive={genreStore.activeGenre === genre.name}
                  className="genre-item"
                  onClick={() => handleGenreClick(genre.name)}
                />
              )}
            </For>
          </div>
        </aside>

        <main class="genre-grid-section">
          <div class="genre-header">
            <h1 class="genre-title">{activeGenreName()}</h1>
            <span class="genre-count">{seriesCount()}</span>
          </div>

          <Show
            when={!genreStore.loading}
            fallback={<div class="genre-loading">{t().series.loading}</div>}
          >
            <Show
              when={genreStore.series.length > 0}
              fallback={<div class="genre-empty">{t().series.noSeries}</div>}
            >
              <div class="genre-grid">
                <For each={genreStore.series}>
                  {(item) => (
                    <GenreCard
                      item={item}
                      onClick={() => handleCardClick(item._id)}
                    />
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}

export default GenrePage
