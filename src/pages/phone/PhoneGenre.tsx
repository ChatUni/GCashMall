import { createEffect, Show, For } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCard from '../../components/phone/PhoneSeriesCard'
import { genreStore, genreStoreActions, activeGenreName, seriesCount } from '../../stores/genreStore'
import { t } from '../../stores/languageStore'
import {
  fetchGenres,
  fetchSeriesByGenre,
  navigateToGenre,
  syncActiveGenreFromUrl,
} from '../../services/genreService'
import './PhoneGenre.css'

// ======================
// Sub-components
// ======================

const FilterButton = (props: { onClick: () => void }) => (
  <button class="phone-genre-filter-button" onClick={props.onClick}>
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
    <span>{activeGenreName()}</span>
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
)

const CheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CloseIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const GenreModalItem = (props: {
  genreName: string
  label: string
  isActive: boolean
  onClick: () => void
}) => (
  <button
    class={`phone-genre-modal-item ${props.isActive ? 'active' : ''}`}
    onClick={props.onClick}
  >
    <span>{props.label}</span>
    <Show when={props.isActive}>
      <CheckIcon />
    </Show>
  </button>
)

const FilterModal = (props: { onSelect: (name: string) => void }) => (
  <div
    class="phone-genre-modal-overlay"
    onClick={() => genreStoreActions.setShowFilterModal(false)}
  >
    <div class="phone-genre-modal" onClick={(e) => e.stopPropagation()}>
      <div class="phone-genre-modal-header">
        <h3>Select Category</h3>
        <button
          class="phone-genre-modal-close"
          onClick={() => genreStoreActions.setShowFilterModal(false)}
        >
          <CloseIcon />
        </button>
      </div>
      <div class="phone-genre-modal-list">
        <GenreModalItem
          genreName="all"
          label={t().series.allGenres}
          isActive={genreStore.activeGenre === 'all'}
          onClick={() => props.onSelect('all')}
        />
        <For each={genreStore.genres}>
          {(genre) => (
            <GenreModalItem
              genreName={genre.name}
              label={genre.name}
              isActive={genreStore.activeGenre === genre.name}
              onClick={() => props.onSelect(genre.name)}
            />
          )}
        </For>
      </div>
    </div>
  </div>
)

const SkeletonGrid = () => (
  <div class="phone-genre-loading">
    <div class="phone-genre-grid">
      <For each={[1, 2, 3, 4, 5, 6]}>
        {() => (
          <div class="phone-genre-skeleton">
            <div class="phone-genre-skeleton-image" />
            <div class="phone-genre-skeleton-title" />
            <div class="phone-genre-skeleton-tag" />
          </div>
        )}
      </For>
    </div>
  </div>
)

const EmptyState = () => (
  <div class="phone-genre-empty">
    <span class="phone-genre-empty-icon">🎬</span>
    <p>{t().series.noSeries}</p>
  </div>
)

// ======================
// Main page component
// ======================

const PhoneGenre = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Sync active genre from URL
  createEffect(() => {
    syncActiveGenreFromUrl(searchParams.category as string | undefined)
  })

  // Fetch genres on first render
  fetchGenres()

  // Fetch series when activeGenre or genres change
  createEffect(() => {
    genreStore.activeGenre
    genreStore.genres
    fetchSeriesByGenre()
  })

  const handleGenreSelect = (genreName: string) =>
    navigateToGenre(genreName, navigate)

  return (
    <PhoneLayout showHeader={true} title={t().topBar.genre}>
      <div class="phone-genre">
        {/* Filter Button */}
        <div class="phone-genre-filter-bar">
          <FilterButton
            onClick={() => genreStoreActions.setShowFilterModal(true)}
          />
          <span class="phone-genre-count">{seriesCount()}</span>
        </div>

        {/* Filter Modal */}
        <Show when={genreStore.showFilterModal}>
          <FilterModal onSelect={handleGenreSelect} />
        </Show>

        {/* Series Grid */}
        <Show when={!genreStore.loading} fallback={<SkeletonGrid />}>
          <Show when={genreStore.series.length > 0} fallback={<EmptyState />}>
            <div class="phone-genre-grid">
              <For each={genreStore.series}>
                {(item) => <PhoneSeriesCard series={item} />}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </PhoneLayout>
  )
}

export default PhoneGenre
