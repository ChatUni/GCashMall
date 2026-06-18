import { For, Show } from 'solid-js'
import { playerPageStore, playerPageStoreActions } from '../stores/playerStore'
import { t } from '../stores/languageStore'
import './StarRating.css'

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

// Percentage of a single star (1-based index) that should be gold-filled for a given rating.
const starFillPercent = (rating: number, index: number): number => {
  if (rating >= index) return 100
  if (rating >= index - 0.5) return 50
  return 0
}

// Single star rendered as a gray base with a gold overlay clipped to fillPercent width.
const Star = (props: { fillPercent: number; size: number }) => (
  <span class="star" style={{ width: `${props.size}px`, height: `${props.size}px` }}>
    <svg viewBox="0 0 24 24" width={props.size} height={props.size} class="star-base">
      <path d={STAR_PATH} fill="#3a3a3e" />
    </svg>
    <span class="star-fill" style={{ width: `${props.fillPercent}%` }}>
      <svg viewBox="0 0 24 24" width={props.size} height={props.size}>
        <path d={STAR_PATH} fill="#FFD700" />
      </svg>
    </span>
  </span>
)

// Read-only star display, supports half stars based on the rating value.
export const Stars = (props: { rating: number; size?: number }) => (
  <div class="stars-row">
    <For each={[1, 2, 3, 4, 5]}>
      {(index) => <Star fillPercent={starFillPercent(props.rating, index)} size={props.size || 18} />}
    </For>
  </div>
)

// Star rating section shown in the episode metadata: average, stars and number of votes.
// Clicking opens the rating modal (login modal if the user isn't logged in).
export const RatingSection = () => (
  <div class="rating-section" onClick={playerPageStoreActions.openRatingModal}>
    <span class="rating-average">{playerPageStore.ratingAverage.toFixed(1)}</span>
    <Stars rating={playerPageStore.ratingAverage} />
    <span class="rating-votes">
      {playerPageStore.ratingCount} {t().player.rating.votes}
    </span>
  </div>
)

// Interactive rating modal: 5 stars initialised to the user's previous rating.
// Hovering fills the hovered star and all previous ones; clicking saves the rating.
export const RatingModal = () => {
  const displayRating = () =>
    playerPageStore.hoveredRating || playerPageStore.userRating

  return (
    <div class="popup-overlay" onClick={playerPageStoreActions.closeRatingModal}>
      <div class="popup-modal rating-modal" onClick={(e) => e.stopPropagation()}>
        <h2 class="popup-title">{t().player.rating.title}</h2>
        <div class="rating-modal-stars" onMouseLeave={() => playerPageStoreActions.setHoveredRating(0)}>
          <For each={[1, 2, 3, 4, 5]}>
            {(index) => (
              <button
                class="rating-star-button"
                onMouseEnter={() => playerPageStoreActions.setHoveredRating(index)}
                onClick={() => playerPageStoreActions.submitRating(index)}
              >
                <Star fillPercent={displayRating() >= index ? 100 : 0} size={40} />
              </button>
            )}
          </For>
        </div>
        <span class="rating-modal-value">
          <Show when={displayRating() > 0} fallback={t().player.rating.selectPrompt}>
            {displayRating()} / 5
          </Show>
        </span>
      </div>
    </div>
  )
}
