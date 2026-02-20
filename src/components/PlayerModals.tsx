import { Show } from 'solid-js'
import { EPISODE_PRICE } from '../services/playerPageService'
import { toastStore } from '../stores'
import './PlayerModals.css'

// Purchase Popup Modal
interface PurchasePopupProps {
  seriesName: string
  episodeNumber: number
  episodeTitle?: string
  userBalance: number
  isPurchasing: boolean
  onConfirm: () => void
  onCancel: () => void
  t: {
    unlockEpisode: string
    unlockMessage: string
    yourBalance: string
    confirmPurchase: string
    cancel: string
  }
}

export const PurchasePopup = (props: PurchasePopupProps) => (
  <div class="popup-overlay" onClick={props.onCancel}>
    <div class="popup-modal purchase-modal" onClick={(e) => e.stopPropagation()}>
      <div class="popup-icon">🔓</div>
      <h2 class="popup-title">{props.t.unlockEpisode}</h2>
      <p class="popup-message">{props.t.unlockMessage}</p>
      <div class="popup-episode-info">
        <span class="popup-series-name">{props.seriesName}</span>
        <span class="popup-episode-name">
          EP {props.episodeNumber.toString().padStart(2, '0')}
          {props.episodeTitle ? ` ${props.episodeTitle}` : ''}
        </span>
      </div>
      <div class="popup-price">
        <img
          src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
          alt="GCash"
          class="popup-price-logo"
        />
        <span>{EPISODE_PRICE.toFixed(2)}</span>
      </div>
      <div class="popup-balance">
        {props.t.yourBalance}:
        <img
          src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
          alt="GCash"
          class="popup-balance-logo"
        />
        <span>{props.userBalance.toFixed(2)}</span>
      </div>
      <div class="popup-buttons">
        <button class="btn-confirm" onClick={props.onConfirm} disabled={props.isPurchasing}>
          {props.isPurchasing ? '...' : props.t.confirmPurchase}
        </button>
        <button class="btn-cancel" onClick={props.onCancel} disabled={props.isPurchasing}>
          {props.t.cancel}
        </button>
      </div>
    </div>
  </div>
)

// Result Modal
interface ResultModalProps {
  type: 'success' | 'error'
  title: string
  message: string
  buttonText: string
  onClose: () => void
}

export const ResultModal = (props: ResultModalProps) => (
  <div class="popup-overlay" onClick={props.onClose}>
    <div
      class={`popup-modal result-modal result-${props.type}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div class="result-icon">
        <Show
          when={props.type === 'success'}
          fallback={
            <svg viewBox="0 0 24 24" width="64" height="64">
              <circle cx="12" cy="12" r="11" fill="#ef4444" />
              <path
                d="M8 8l8 8M16 8l-8 8"
                stroke="#ffffff"
                stroke-width="2.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
        >
          <svg viewBox="0 0 24 24" width="64" height="64">
            <circle cx="12" cy="12" r="11" fill="#22c55e" />
            <path
              d="M7 12l3 3 7-7"
              stroke="#ffffff"
              stroke-width="2.5"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Show>
      </div>
      <h2 class="result-title">{props.title}</h2>
      <p class="result-message">{props.message}</p>
      <button
        class={`btn-result ${props.type === 'success' ? 'btn-result-success' : 'btn-result-error'}`}
        onClick={props.onClose}
      >
        {props.buttonText}
      </button>
    </div>
  </div>
)

// Favorite Confirmation Modal
interface FavoriteModalProps {
  action: 'add' | 'remove'
  seriesName: string
  dontShowAgain: boolean
  onDontShowAgainChange: (checked: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  t: {
    addToFavoritesTitle: string
    removeFromFavoritesTitle: string
    addToFavoritesMessage: string
    removeFromFavoritesMessage: string
    dontShowAgain: string
    confirm: string
    cancel: string
  }
}

export const FavoriteModal = (props: FavoriteModalProps) => (
  <div class="popup-overlay" onClick={props.onCancel}>
    <div class="popup-modal favorite-modal" onClick={(e) => e.stopPropagation()}>
      <div class="popup-icon">{props.action === 'add' ? '❤️' : '💔'}</div>
      <h2 class="popup-title">
        {props.action === 'add' ? props.t.addToFavoritesTitle : props.t.removeFromFavoritesTitle}
      </h2>
      <p class="popup-message">
        {props.action === 'add' ? props.t.addToFavoritesMessage : props.t.removeFromFavoritesMessage}
      </p>
      <div class="popup-series-info">
        <span class="popup-series-name">{props.seriesName}</span>
      </div>
      <label class="dont-show-again">
        <input
          type="checkbox"
          checked={props.dontShowAgain}
          onChange={(e) => props.onDontShowAgainChange(e.currentTarget.checked)}
        />
        <span>{props.t.dontShowAgain}</span>
      </label>
      <div class="popup-buttons">
        <button class="btn-confirm" onClick={props.onConfirm}>
          {props.t.confirm}
        </button>
        <button class="btn-cancel" onClick={props.onCancel}>
          {props.t.cancel}
        </button>
      </div>
    </div>
  </div>
)

// Toast Notification - subscribes directly to toastStore

export const Toast = () => (
  <Show when={toastStore.isVisible}>
    <div class={`toast-notification toast-${toastStore.type}`}>{toastStore.message}</div>
  </Show>
)
