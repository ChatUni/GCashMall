import React, { useRef, useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCarousel from '../../components/phone/PhoneSeriesCarousel'
import LoginModal from '../../components/LoginModal'
import { useLanguage } from '../../context/LanguageContext'
import { usePlayerStore, useLoginModalStore, useUserStore, playerStoreActions, loginModalStoreActions, userStoreActions, useRecommendationsStore, useNewReleasesStore, useToastStore } from '../../stores'
import { accountStoreActions } from '../../stores/accountStore'
import { fetchPlayerData, addToWatchList, addToFavorites, removeFromFavorites, purchaseEpisode, isEpisodePurchased, fetchRecommendations, fetchNewReleases } from '../../services/dataService'
import { isLoggedIn } from '../../utils/api'
import { getIframeUrl, findEpisodeByNumber, getEpisodeRanges, filterEpisodesByRange } from '../../utils/playerHelpers'
import type { Episode, WatchListItem } from '../../types'
import './PhonePlayer.css'

const HIDE_FAVORITE_MODAL_KEY = 'hideFavoriteModal'

// Track the currently loaded series ID
let currentLoadedSeriesId: string | null = null
let watchListUpdatedForSeriesId: string | null = null
let recommendationsFetched = false
let newReleasesFetched = false

const initializePlayerData = (seriesId: string) => {
  if (currentLoadedSeriesId !== seriesId) {
    currentLoadedSeriesId = seriesId
    watchListUpdatedForSeriesId = null
    playerStoreActions.reset()
    fetchPlayerData(seriesId)
  }
  if (!recommendationsFetched) {
    recommendationsFetched = true
    fetchRecommendations()
  }
  if (!newReleasesFetched) {
    newReleasesFetched = true
    fetchNewReleases()
  }
}

const findLastWatchedEpisode = (
  seriesId: string,
  watchList: WatchListItem[] | undefined,
  episodes: Episode[],
): Episode | null => {
  if (!watchList || watchList.length === 0) return null
  const watchListItem = watchList.find((item) => String(item.seriesId) === String(seriesId))
  if (watchListItem) {
    return findEpisodeByNumber(episodes, watchListItem.episodeNumber) || null
  }
  return null
}

const handleWatchListUpdate = async (seriesId: string, episodeNumber: number) => {
  if (!isLoggedIn()) return
  try {
    await addToWatchList(seriesId, episodeNumber)
  } catch (error) {
    console.error('Failed to update watch list:', error)
  }
}

const EPISODE_PRICE = 0.1

const PhonePlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const playerState = usePlayerStore()
  const loginModalState = useLoginModalStore()
  const userState = useUserStore()
  const { series: recommendations } = useRecommendationsStore()
  const { series: newReleases } = useNewReleasesStore()
  const toastState = useToastStore()

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [showPurchasePopup, setShowPurchasePopup] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success')
  const [resultModalMessage, setResultModalMessage] = useState('')
  const [showEpisodeList, setShowEpisodeList] = useState(true)
  const [showFavoriteModal, setShowFavoriteModal] = useState(false)
  const [favoriteModalAction, setFavoriteModalAction] = useState<'add' | 'remove'>('add')
  const [dontShowFavoriteAgain, setDontShowFavoriteAgain] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [showExpandButton, setShowExpandButton] = useState(false)
  const descriptionRef = useRef<HTMLParagraphElement>(null)

  // Initialize data
  if (id) {
    initializePlayerData(id)
  }

  // Handle episode selection
  const episodeNumberFromUrl = searchParams.get('episode')

  if (playerState.episodes.length > 0 && !playerState.loading && id) {
    if (
      episodeNumberFromUrl &&
      (!playerState.currentEpisode || playerState.currentEpisode.episodeNumber !== parseInt(episodeNumberFromUrl, 10))
    ) {
      const episode = findEpisodeByNumber(playerState.episodes, parseInt(episodeNumberFromUrl, 10))
      if (episode) {
        playerStoreActions.setCurrentEpisode(episode)
      }
    } else if (!playerState.currentEpisode) {
      const lastWatchedEpisode = findLastWatchedEpisode(id, userState.user?.watchList, playerState.episodes)
      if (lastWatchedEpisode) {
        playerStoreActions.setCurrentEpisode(lastWatchedEpisode)
      } else if (playerState.episodes.length > 0) {
        playerStoreActions.setCurrentEpisode(playerState.episodes[0])
      }
    }

    if (watchListUpdatedForSeriesId !== id && playerState.currentEpisode && isLoggedIn()) {
      watchListUpdatedForSeriesId = id
      handleWatchListUpdate(id, playerState.currentEpisode.episodeNumber)
    }
  }

  const handleEpisodeClick = (episode: Episode) => {
    playerStoreActions.setCurrentEpisode(episode)
    navigate(`/player/${id}?episode=${episode.episodeNumber}`, { replace: true })
    if (id) {
      handleWatchListUpdate(id, episode.episodeNumber)
    }
  }

  const isSeriesFavorited = (seriesId: string): boolean => {
    if (!userState.user?.favorites || userState.user.favorites.length === 0) return false
    return userState.user.favorites.some((item) => String(item.seriesId) === String(seriesId))
  }

  const isUserSeriesOwner = (): boolean => {
    if (!playerState.series?.uploaderId || !userState.user?._id) return false
    return String(playerState.series.uploaderId) === String(userState.user._id)
  }

  const isCurrentEpisodePurchased = (): boolean => {
    if (!playerState.currentEpisode || !id) return false
    if (isUserSeriesOwner()) return true
    return isEpisodePurchased(
      id,
      playerState.currentEpisode._id,
      userState.user?.purchases,
      playerState.currentEpisode.episodeNumber,
    )
  }

  const handleFavoriteClick = () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }
    if (!id) return

    const isFavorited = isSeriesFavorited(id)
    const hideFavoriteModal = localStorage.getItem(HIDE_FAVORITE_MODAL_KEY) === 'true'

    if (hideFavoriteModal) {
      // Directly perform action without showing modal
      performFavoriteAction(isFavorited)
    } else {
      // Show confirmation modal
      setFavoriteModalAction(isFavorited ? 'remove' : 'add')
      setShowFavoriteModal(true)
    }
  }

  const performFavoriteAction = async (isFavorited: boolean) => {
    if (!id) return

    try {
      if (isFavorited) {
        await removeFromFavorites(id)
      } else {
        await addToFavorites(id)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleFavoriteConfirm = async () => {
    if (!id) return

    // Save preference if checkbox is checked
    if (dontShowFavoriteAgain) {
      localStorage.setItem(HIDE_FAVORITE_MODAL_KEY, 'true')
    }

    const isFavorited = isSeriesFavorited(id)
    await performFavoriteAction(isFavorited)
    setShowFavoriteModal(false)
    setDontShowFavoriteAgain(false)
  }

  const handleFavoriteCancel = () => {
    setShowFavoriteModal(false)
    setDontShowFavoriteAgain(false)
  }

  const handleUnlockClick = () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }
    setShowPurchasePopup(true)
  }

  const handlePurchaseConfirm = async () => {
    if (!id || !playerState.currentEpisode) return

    const userBalance = userState.user?.balance || 0
    if (userBalance < EPISODE_PRICE) {
      setShowPurchasePopup(false)
      setResultModalType('error')
      setResultModalMessage(t.player.insufficientBalance)
      setShowResultModal(true)
      return
    }

    setIsPurchasing(true)
    try {
      const result = await purchaseEpisode(
        id,
        playerState.currentEpisode._id,
        playerState.currentEpisode.episodeNumber,
        EPISODE_PRICE,
      )
      setShowPurchasePopup(false)
      if (result.success) {
        setResultModalType('success')
        setResultModalMessage(t.player.purchaseSuccess)
        setShowResultModal(true)
      } else {
        setResultModalType('error')
        setResultModalMessage(result.error || t.player.purchaseFailed)
        setShowResultModal(true)
      }
    } catch (error) {
      console.error('Failed to purchase episode:', error)
      setShowPurchasePopup(false)
      setResultModalType('error')
      setResultModalMessage(t.player.purchaseFailed)
      setShowResultModal(true)
    } finally {
      setIsPurchasing(false)
    }
  }

  const filteredEpisodes = filterEpisodesByRange(playerState.episodes, playerState.episodeRange)
  const ranges = getEpisodeRanges(playerState.episodes.length)

  // Check if description is truncated and needs expand button
  useEffect(() => {
    const checkTruncation = () => {
      if (descriptionRef.current) {
        const element = descriptionRef.current
        // Check if text is truncated by comparing scrollHeight with clientHeight
        const isTruncated = element.scrollHeight > element.clientHeight
        setShowExpandButton(isTruncated)
      }
    }
    
    // Reset expanded state when episode/series changes
    setIsDescriptionExpanded(false)
    
    // Small delay to ensure content is rendered
    const timer = setTimeout(checkTruncation, 100)
    return () => clearTimeout(timer)
  }, [playerState.currentEpisode, playerState.series])

  if (playerState.loading) {
    return (
      <PhoneLayout showHeader={true} showBackButton={true} title="">
        <div className="phone-player-loading">Loading...</div>
      </PhoneLayout>
    )
  }

  if (!playerState.series) {
    return (
      <PhoneLayout showHeader={true} showBackButton={true} title="">
        <div className="phone-player-error">Series not found</div>
      </PhoneLayout>
    )
  }

  return (
    <PhoneLayout showHeader={false}>
      <div className="phone-player">
        {/* Video Player */}
        <div className="phone-video-container">
          <button className="phone-player-back" onClick={() => navigate(-1)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          {playerState.currentEpisode?.videoId ? (
            <iframe
              ref={iframeRef}
              src={getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, playerState.currentEpisode.videoId)}
              loading="lazy"
              className="phone-video-iframe"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="phone-video-placeholder">No video available</div>
          )}
        </div>

        {/* Episode Info */}
        <div className="phone-player-info">
          <div className="phone-player-header">
            <div className="phone-player-title-section">
              <h1 className="phone-player-title">{playerState.series.name}</h1>
              <span className="phone-player-episode">
                EP {playerState.currentEpisode?.episodeNumber.toString().padStart(2, '0')}
                {playerState.currentEpisode?.title ? ` - ${playerState.currentEpisode.title}` : ''}
              </span>
            </div>
            <div className="phone-player-actions">
              <button
                className={`phone-action-btn phone-action-btn-large ${id && isSeriesFavorited(id) ? 'active' : ''}`}
                onClick={handleFavoriteClick}
              >
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path
                    fill={id && isSeriesFavorited(id) ? '#ef4444' : 'none'}
                    stroke={id && isSeriesFavorited(id) ? '#ef4444' : 'currentColor'}
                    strokeWidth="2"
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  />
                </svg>
              </button>
              <button
                className={`phone-action-btn phone-action-btn-large ${isCurrentEpisodePurchased() ? 'unlocked' : 'locked'}`}
                onClick={!isCurrentEpisodePurchased() ? handleUnlockClick : undefined}
              >
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path
                    fill={isCurrentEpisodePurchased() ? '#F97316' : 'none'}
                    stroke={isCurrentEpisodePurchased() ? '#F97316' : 'currentColor'}
                    strokeWidth="2"
                    d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="phone-player-tags">
            {playerState.series.tags?.map((tag, index) => (
              <span key={index} className="phone-player-tag">
                {tag}
              </span>
            ))}
            {playerState.series.genre?.map((genre) => (
              <span key={genre._id} className="phone-player-tag">
                {genre.name}
              </span>
            ))}
          </div>

          {/* Description */}
          <div className="phone-player-description-container">
            <p
              ref={descriptionRef}
              className={`phone-player-description ${isDescriptionExpanded ? 'expanded' : ''}`}
            >
              {playerState.currentEpisode?.description || playerState.series.description}
            </p>
            {showExpandButton && (
              <button
                className={`phone-player-expand-btn ${isDescriptionExpanded ? 'expanded' : ''}`}
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? ((t.player as unknown as Record<string, string>).collapse || 'Show Less') : ((t.player as unknown as Record<string, string>).expand || 'Show More')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Episode List Toggle */}
        <button
          className="phone-episode-toggle"
          onClick={() => setShowEpisodeList(!showEpisodeList)}
        >
          <span>{t.player.episodes} ({playerState.episodes.length})</span>
          <svg
            className={`phone-episode-arrow ${showEpisodeList ? 'open' : ''}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </button>

        {/* Episode List */}
        {showEpisodeList && (
          <div className="phone-episode-list">
            {/* Range Selector */}
            {ranges.length > 1 && (
              <div className="phone-episode-ranges">
                {ranges.map(([start, end]) => (
                  <button
                    key={`${start}-${end}`}
                    className={`phone-range-btn ${
                      playerState.episodeRange[0] === start && playerState.episodeRange[1] === end ? 'active' : ''
                    }`}
                    onClick={() => playerStoreActions.setEpisodeRange([start, end])}
                  >
                    {start.toString().padStart(2, '0')}-{end.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}

            {/* Episode Grid */}
            <div className="phone-episode-grid">
              {filteredEpisodes.map((episode) => (
                <button
                  key={episode.episodeNumber}
                  className={`phone-episode-item ${
                    playerState.currentEpisode?.episodeNumber === episode.episodeNumber ? 'active' : ''
                  }`}
                  onClick={() => handleEpisodeClick(episode)}
                >
                  <span className="phone-episode-number">
                    {episode.episodeNumber.toString().padStart(2, '0')}
                  </span>
                  {isEpisodePurchased(id || '', episode._id, userState.user?.purchases, episode.episodeNumber) && (
                    <span className="phone-episode-purchased">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <PhoneSeriesCarousel
          title={t.home.youMightLike}
          series={recommendations}
          excludeSeriesId={id}
        />

        {/* New Releases */}
        <PhoneSeriesCarousel
          title={t.home.newReleases}
          series={newReleases}
          excludeSeriesId={id}
        />
      </div>

      {/* Login Modal */}
      {loginModalState.isOpen && (
        <LoginModal
          onClose={loginModalStoreActions.close}
          onLoginSuccess={(user) => {
            userStoreActions.setUser(user)
            userStoreActions.setLoading(false)
            accountStoreActions.initializeUserData(user)
            loginModalStoreActions.close()
          }}
        />
      )}

      {/* Purchase Popup */}
      {showPurchasePopup && playerState.currentEpisode && (
        <div className="phone-popup-overlay" onClick={() => setShowPurchasePopup(false)}>
          <div className="phone-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="phone-popup-icon">🔓</div>
            <h2 className="phone-popup-title">{t.player.unlockEpisode}</h2>
            <p className="phone-popup-message">{t.player.unlockMessage}</p>
            <div className="phone-popup-episode-info">
              <span className="phone-popup-series">{playerState.series?.name}</span>
              <span className="phone-popup-ep">
                EP {playerState.currentEpisode.episodeNumber.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="phone-popup-price">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-logo" />
              <span>{EPISODE_PRICE.toFixed(2)}</span>
            </div>
            <div className="phone-popup-balance">
              {t.player.yourBalance}:
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-balance-logo" />
              <span>{(userState.user?.balance || 0).toFixed(2)}</span>
            </div>
            <div className="phone-popup-buttons">
              <button className="phone-btn-confirm" onClick={handlePurchaseConfirm} disabled={isPurchasing}>
                {isPurchasing ? '...' : t.player.confirmPurchase}
              </button>
              <button className="phone-btn-cancel" onClick={() => setShowPurchasePopup(false)} disabled={isPurchasing}>
                {t.player.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorite Confirmation Modal */}
      {showFavoriteModal && (
        <div className="phone-popup-overlay" onClick={handleFavoriteCancel}>
          <div className="phone-popup-modal phone-favorite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="phone-popup-icon phone-favorite-icon">
              {favoriteModalAction === 'add' ? '❤️' : '💔'}
            </div>
            <h2 className="phone-popup-title">
              {favoriteModalAction === 'add' ? 'Add to Favorites' : 'Remove from Favorites'}
            </h2>
            <div className="phone-popup-episode-info">
              <span className="phone-popup-series">{playerState.series?.name}</span>
              <span className="phone-popup-ep">
                EP {playerState.currentEpisode?.episodeNumber.toString().padStart(2, '0')}
                {playerState.currentEpisode?.title ? ` - ${playerState.currentEpisode.title}` : ''}
              </span>
            </div>
            <p className="phone-popup-message">
              {favoriteModalAction === 'add'
                ? 'Add this series to your favorites?'
                : 'Remove this series from your favorites?'}
            </p>
            <label className="phone-favorite-checkbox">
              <input
                type="checkbox"
                checked={dontShowFavoriteAgain}
                onChange={(e) => setDontShowFavoriteAgain(e.target.checked)}
              />
              <span>Don't show again</span>
            </label>
            <div className="phone-popup-buttons">
              <button className="phone-btn-confirm" onClick={handleFavoriteConfirm}>
                {favoriteModalAction === 'add' ? 'Add to Favorites' : 'Remove'}
              </button>
              <button className="phone-btn-cancel" onClick={handleFavoriteCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <div className="phone-popup-overlay" onClick={() => setShowResultModal(false)}>
          <div className={`phone-popup-modal phone-result-${resultModalType}`} onClick={(e) => e.stopPropagation()}>
            <div className="phone-result-icon">
              {resultModalType === 'success' ? '✓' : '✕'}
            </div>
            <h2 className="phone-popup-title">
              {resultModalType === 'success' ? t.player.unlockSuccess : t.player.unlockFailed}
            </h2>
            <p className="phone-popup-message">{resultModalMessage}</p>
            <button
              className={`phone-btn-result ${resultModalType === 'success' ? 'success' : 'error'}`}
              onClick={() => {
                setShowResultModal(false)
                if (resultModalType === 'error' && resultModalMessage.includes('balance')) {
                  navigate('/account?tab=wallet')
                }
              }}
            >
              {resultModalType === 'error' && resultModalMessage.includes('balance')
                ? t.player.goToWallet
                : 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastState.isVisible && (
        <div className={`phone-toast phone-toast-${toastState.type}`}>
          {toastState.message}
        </div>
      )}
    </PhoneLayout>
  )
}

export default PhonePlayer
