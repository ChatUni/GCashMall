import React from 'react'
import { EPISODE_PRICE } from '../services/playerPageService'
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

export const PurchasePopup: React.FC<PurchasePopupProps> = ({
  seriesName,
  episodeNumber,
  episodeTitle,
  userBalance,
  isPurchasing,
  onConfirm,
  onCancel,
  t,
}) => (
  <div className="popup-overlay" onClick={onCancel}>
    <div className="popup-modal purchase-modal" onClick={(e) => e.stopPropagation()}>
      <div className="popup-icon">🔓</div>
      <h2 className="popup-title">{t.unlockEpisode}</h2>
      <p className="popup-message">{t.unlockMessage}</p>
      <div className="popup-episode-info">
        <span className="popup-series-name">{seriesName}</span>
        <span className="popup-episode-name">
          EP {episodeNumber.toString().padStart(2, '0')}
          {episodeTitle ? ` ${episodeTitle}` : ''}
        </span>
      </div>
      <div className="popup-price">
        <img
          src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
          alt="GCash"
          className="popup-price-logo"
        />
        <span>{EPISODE_PRICE.toFixed(2)}</span>
      </div>
      <div className="popup-balance">
        {t.yourBalance}:
        <img
          src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
          alt="GCash"
          className="popup-balance-logo"
        />
        <span>{userBalance.toFixed(2)}</span>
      </div>
      <div className="popup-buttons">
        <button className="btn-confirm" onClick={onConfirm} disabled={isPurchasing}>
          {isPurchasing ? '...' : t.confirmPurchase}
        </button>
        <button className="btn-cancel" onClick={onCancel} disabled={isPurchasing}>
          {t.cancel}
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

export const ResultModal: React.FC<ResultModalProps> = ({
  type,
  title,
  message,
  buttonText,
  onClose,
}) => (
  <div className="popup-overlay" onClick={onClose}>
    <div
      className={`popup-modal result-modal result-${type}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="result-icon">
        {type === 'success' ? (
          <svg viewBox="0 0 24 24" width="64" height="64">
            <circle cx="12" cy="12" r="11" fill="#22c55e" />
            <path
              d="M7 12l3 3 7-7"
              stroke="#ffffff"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="64" height="64">
            <circle cx="12" cy="12" r="11" fill="#ef4444" />
            <path
              d="M8 8l8 8M16 8l-8 8"
              stroke="#ffffff"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <h2 className="result-title">{title}</h2>
      <p className="result-message">{message}</p>
      <button
        className={`btn-result ${type === 'success' ? 'btn-result-success' : 'btn-result-error'}`}
        onClick={onClose}
      >
        {buttonText}
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

export const FavoriteModal: React.FC<FavoriteModalProps> = ({
  action,
  seriesName,
  dontShowAgain,
  onDontShowAgainChange,
  onConfirm,
  onCancel,
  t,
}) => (
  <div className="popup-overlay" onClick={onCancel}>
    <div className="popup-modal favorite-modal" onClick={(e) => e.stopPropagation()}>
      <div className="popup-icon">{action === 'add' ? '❤️' : '💔'}</div>
      <h2 className="popup-title">
        {action === 'add' ? t.addToFavoritesTitle : t.removeFromFavoritesTitle}
      </h2>
      <p className="popup-message">
        {action === 'add' ? t.addToFavoritesMessage : t.removeFromFavoritesMessage}
      </p>
      <div className="popup-series-info">
        <span className="popup-series-name">{seriesName}</span>
      </div>
      <label className="dont-show-again">
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(e) => onDontShowAgainChange(e.target.checked)}
        />
        <span>{t.dontShowAgain}</span>
      </label>
      <div className="popup-buttons">
        <button className="btn-confirm" onClick={onConfirm}>
          {t.confirm}
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </div>
  </div>
)

// Toast Notification
interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  isVisible: boolean
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible }) => {
  if (!isVisible) return null
  return <div className={`toast-notification toast-${type}`}>{message}</div>
}
