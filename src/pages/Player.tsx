import React, { useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import RecommendationSection from '../components/RecommendationSection'
import NewReleasesSection from '../components/NewReleasesSection'
import LoginModal from '../components/LoginModal'
import { useLanguage } from '../context/LanguageContext'
import { usePlayerStore, useLoginModalStore, useUserStore, playerStoreActions, loginModalStoreActions, useToastStore } from '../stores'
import { fetchPlayerData, addToWatchList, addToFavorites, removeFromFavorites, purchaseEpisode, isEpisodePurchased } from '../services/dataService'
import { isLoggedIn } from '../utils/api'
import {
  formatTime,
  getEpisodeThumbnailUrl,
  getEpisodeRanges,
  filterEpisodesByRange,
  findEpisodeByNumber,
  buildEpisodeTitle,
  getIframeUrl,
  playbackSpeeds,
} from '../utils/playerHelpers'
import type { Episode, WatchListItem } from '../types'
import './Player.css'

// Track the currently loaded series ID to detect changes
let currentLoadedSeriesId: string | null = null
// Track if watch list has been updated on load for current series
let watchListUpdatedForSeriesId: string | null = null

const initializePlayerData = (seriesId: string) => {
  if (currentLoadedSeriesId !== seriesId) {
    currentLoadedSeriesId = seriesId
    watchListUpdatedForSeriesId = null // Reset watch list tracking for new series
    playerStoreActions.reset()
    fetchPlayerData(seriesId)
  }
}

// Find last watched episode for series from user's watch list
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

// Handle adding to watch list on load or episode change
const handleWatchListUpdate = async (seriesId: string, episodeNumber: number) => {
  if (!isLoggedIn()) return

  try {
    await addToWatchList(seriesId, episodeNumber)
  } catch (error) {
    console.error('Failed to update watch list:', error)
  }
}

// Event handlers (pure functions)
const handlePlayPause = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isPlaying: boolean,
) => {
  if (videoRef.current) {
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    playerStoreActions.setIsPlaying(!isPlaying)
  }
}

const handleTimeUpdate = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  if (videoRef.current) {
    playerStoreActions.setCurrentTime(videoRef.current.currentTime)
  }
}

const handleLoadedMetadata = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  if (videoRef.current) {
    playerStoreActions.setDuration(videoRef.current.duration)
  }
}

const handleProgressChange = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  time: number,
) => {
  if (videoRef.current) {
    videoRef.current.currentTime = time
    playerStoreActions.setCurrentTime(time)
  }
}

const handleVolumeToggle = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  currentVolume: number,
) => {
  if (videoRef.current) {
    const newVolume = currentVolume === 0 ? 1 : 0
    videoRef.current.volume = newVolume
    playerStoreActions.setVolume(newVolume)
  }
}

const handleSpeedChange = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  speed: number,
) => {
  if (videoRef.current) {
    videoRef.current.playbackRate = speed
    playerStoreActions.setPlaybackSpeed(speed)
    playerStoreActions.setShowSpeedSelector(false)
  }
}

const handleFullscreen = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  if (videoRef.current) {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      videoRef.current.requestFullscreen()
    }
  }
}

// Episode price constant
const EPISODE_PRICE = 0.1

const Player: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const playerState = usePlayerStore()
  const loginModalState = useLoginModalStore()
  const userState = useUserStore()
  const toastState = useToastStore()

  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Purchase popup state
  const [showPurchasePopup, setShowPurchasePopup] = React.useState(false)
  const [isPurchasing, setIsPurchasing] = React.useState(false)
  
  // Result modal state
  const [showResultModal, setShowResultModal] = React.useState(false)
  const [resultModalType, setResultModalType] = React.useState<'success' | 'error'>('success')
  const [resultModalMessage, setResultModalMessage] = React.useState('')
  
  // Favorite confirmation modal state
  const [showFavoriteModal, setShowFavoriteModal] = React.useState(false)
  const [favoriteModalDontShowAgain, setFavoriteModalDontShowAgain] = React.useState(false)
  const [pendingFavoriteAction, setPendingFavoriteAction] = React.useState<'add' | 'remove' | null>(null)

  // Initialize data on first render
  if (id) {
    initializePlayerData(id)
  }

  // Handle episode selection from URL or watch list
  const episodeNumberFromUrl = searchParams.get('episode')
  
  // Determine which episode to show based on priority:
  // 1. URL parameter (explicit selection)
  // 2. Last watched from user's watch list
  // 3. First episode (default)
  if (
    playerState.episodes.length > 0 &&
    !playerState.loading &&
    id
  ) {
    // If URL has episode parameter, use it
    if (
      episodeNumberFromUrl &&
      (!playerState.currentEpisode || playerState.currentEpisode.episodeNumber !== parseInt(episodeNumberFromUrl, 10))
    ) {
      const episode = findEpisodeByNumber(playerState.episodes, parseInt(episodeNumberFromUrl, 10))
      if (episode) {
        playerStoreActions.setCurrentEpisode(episode)
      }
    }
    // Otherwise, if no current episode set, find from watch list or use first episode
    else if (!playerState.currentEpisode) {
      const lastWatchedEpisode = findLastWatchedEpisode(id, userState.user?.watchList, playerState.episodes)
      if (lastWatchedEpisode) {
        playerStoreActions.setCurrentEpisode(lastWatchedEpisode)
      } else if (playerState.episodes.length > 0) {
        playerStoreActions.setCurrentEpisode(playerState.episodes[0])
      }
    }

    // Auto-add to watch list on load (only once per series)
    if (
      watchListUpdatedForSeriesId !== id &&
      playerState.currentEpisode &&
      isLoggedIn()
    ) {
      watchListUpdatedForSeriesId = id
      handleWatchListUpdate(id, playerState.currentEpisode.episodeNumber)
    }
  }

  const handleMouseMove = () => {
    playerStoreActions.setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playerState.isPlaying) {
        playerStoreActions.setShowControls(false)
      }
    }, 3000)
  }

  const handleEpisodeClick = (episode: Episode) => {
    playerStoreActions.setCurrentEpisode(episode)
    navigate(`/player/${id}?episode=${episode.episodeNumber}`, { replace: true })
    // Update watch list when user clicks on an episode
    if (id) {
      handleWatchListUpdate(id, episode.episodeNumber)
    }
  }

  const handleTagClick = (tag: string) => {
    navigate(`/series?genre=${encodeURIComponent(tag)}`)
  }

  // Check if current series is in favorites
  const isSeriesFavorited = (seriesId: string): boolean => {
    if (!userState.user?.favorites || userState.user.favorites.length === 0) return false
    return userState.user.favorites.some((item) => String(item.seriesId) === String(seriesId))
  }

  // Check if current episode is purchased
  const isCurrentEpisodePurchased = (): boolean => {
    if (!playerState.currentEpisode || !id) return false
    return isEpisodePurchased(
      id,
      playerState.currentEpisode._id,
      userState.user?.purchases,
      playerState.currentEpisode.episodeNumber,
    )
  }

  // Check if favorite modal should be shown (based on localStorage)
  const shouldShowFavoriteModal = (): boolean => {
    const dontShowAgain = localStorage.getItem('hideFavoriteModal')
    return dontShowAgain !== 'true'
  }

  const handleFavoriteToggle = async () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }

    if (!id) return

    const willAdd = !isSeriesFavorited(id)
    
    // If "don't show again" is set, directly perform the action
    if (!shouldShowFavoriteModal()) {
      try {
        if (willAdd) {
          await addToFavorites(id)
        } else {
          await removeFromFavorites(id)
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error)
      }
      return
    }

    // Show confirmation modal
    setPendingFavoriteAction(willAdd ? 'add' : 'remove')
    setFavoriteModalDontShowAgain(false)
    setShowFavoriteModal(true)
  }

  // Confirm favorite action from modal
  const handleFavoriteConfirm = async () => {
    if (!id || !pendingFavoriteAction) return

    // Save "don't show again" preference
    if (favoriteModalDontShowAgain) {
      localStorage.setItem('hideFavoriteModal', 'true')
    }

    try {
      if (pendingFavoriteAction === 'add') {
        await addToFavorites(id)
      } else {
        await removeFromFavorites(id)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }

    setShowFavoriteModal(false)
    setPendingFavoriteAction(null)
  }

  // Cancel favorite action
  const handleFavoriteCancel = () => {
    setShowFavoriteModal(false)
    setPendingFavoriteAction(null)
  }

  // Handle unlock button click
  const handleUnlockClick = () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }
    setShowPurchasePopup(true)
  }

  // Handle purchase confirmation
  const handlePurchaseConfirm = async () => {
    if (!id || !playerState.currentEpisode) return

    // Check if user has enough balance
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

  if (playerState.loading) {
    return (
      <div className="player-page">
        <TopBar />
        <div className="loading">Loading...</div>
        <BottomBar />
      </div>
    )
  }

  if (!playerState.series) {
    return (
      <div className="player-page">
        <TopBar />
        <div className="error">Series not found</div>
        <BottomBar />
      </div>
    )
  }

  const filteredEpisodes = filterEpisodesByRange(playerState.episodes, playerState.episodeRange)

  return (
    <div className="player-page">
      <TopBar />

      <Breadcrumb
        seriesName={playerState.series.name}
        homeText={t.player.breadcrumbHome}
        onHomeClick={() => navigate('/')}
      />

      <main className="player-content">
        <div className="player-main">
          <VideoPlayer
            episode={playerState.currentEpisode}
            videoRef={videoRef}
            isPlaying={playerState.isPlaying}
            showControls={playerState.showControls}
            currentTime={playerState.currentTime}
            duration={playerState.duration}
            volume={playerState.volume}
            playbackSpeed={playerState.playbackSpeed}
            showSpeedSelector={playerState.showSpeedSelector}
            onPlayPause={() => handlePlayPause(videoRef, playerState.isPlaying)}
            onTimeUpdate={() => handleTimeUpdate(videoRef)}
            onLoadedMetadata={() => handleLoadedMetadata(videoRef)}
            onProgressChange={(time) => handleProgressChange(videoRef, time)}
            onVolumeToggle={() => handleVolumeToggle(videoRef, playerState.volume)}
            onSpeedChange={(speed) => handleSpeedChange(videoRef, speed)}
            onSpeedSelectorToggle={() => playerStoreActions.setShowSpeedSelector(!playerState.showSpeedSelector)}
            onFullscreen={() => handleFullscreen(videoRef)}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => playerState.isPlaying && playerStoreActions.setShowControls(false)}
          />

          <EpisodeMetadata
            series={playerState.series}
            currentEpisode={playerState.currentEpisode}
            selectedLanguage={playerState.selectedLanguage}
            isFavorited={id ? isSeriesFavorited(id) : false}
            isEpisodePurchased={isCurrentEpisodePurchased()}
            onLanguageChange={playerStoreActions.setSelectedLanguage}
            onTagClick={handleTagClick}
            onFavoriteToggle={handleFavoriteToggle}
            onUnlockClick={handleUnlockClick}
          />
        </div>

        <EpisodeSidebar
          episodes={filteredEpisodes}
          allEpisodes={playerState.episodes}
          currentEpisode={playerState.currentEpisode}
          episodeRange={playerState.episodeRange}
          title={t.player.episodes}
          onEpisodeClick={handleEpisodeClick}
          onRangeSelect={playerStoreActions.setEpisodeRange}
        />
      </main>

      <RecommendationSection excludeSeriesId={id} />
      <NewReleasesSection excludeSeriesId={id} />

      <SocialButtons favoritesText={t.player.addToFavorites} />

      <BottomBar />

      {loginModalState.isOpen && (
        <LoginModal
          onClose={loginModalStoreActions.close}
          onLoginSuccess={loginModalStoreActions.close}
        />
      )}

      {/* Purchase Popup */}
      {showPurchasePopup && playerState.currentEpisode && (
        <div className="popup-overlay" onClick={() => setShowPurchasePopup(false)}>
          <div className="popup-modal purchase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon">🔓</div>
            <h2 className="popup-title">
              {t.player.unlockEpisode}
            </h2>
            <p className="popup-message">
              {t.player.unlockMessage}
            </p>
            <div className="popup-episode-info">
              <span className="popup-series-name">{playerState.series?.name || ''}</span>
              <span className="popup-episode-name">
                EP {playerState.currentEpisode.episodeNumber.toString().padStart(2, '0')}{playerState.currentEpisode.title ? ` ${playerState.currentEpisode.title}` : ''}
              </span>
            </div>
            <div className="popup-price">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="popup-price-logo" />
              <span>{EPISODE_PRICE.toFixed(2)}</span>
            </div>
            <div className="popup-balance">
              {t.player.yourBalance}:
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="popup-balance-logo" />
              <span>{(userState.user?.balance || 0).toFixed(2)}</span>
            </div>
            <div className="popup-buttons">
              <button
                className="btn-confirm"
                onClick={handlePurchaseConfirm}
                disabled={isPurchasing}
              >
                {isPurchasing ? '...' : t.player.confirmPurchase}
              </button>
              <button
                className="btn-cancel"
                onClick={() => setShowPurchasePopup(false)}
                disabled={isPurchasing}
              >
                {t.player.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <div className="popup-overlay" onClick={() => setShowResultModal(false)}>
          <div className={`popup-modal result-modal result-${resultModalType}`} onClick={(e) => e.stopPropagation()}>
            <div className="result-icon">
              {resultModalType === 'success' ? (
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
            <h2 className="result-title">
              {resultModalType === 'success'
                ? t.player.unlockSuccess
                : t.player.unlockFailed}
            </h2>
            <p className="result-message">{resultModalMessage}</p>
            <button
              className={`btn-result ${resultModalType === 'success' ? 'btn-result-success' : 'btn-result-error'}`}
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

      {/* Favorite Confirmation Modal */}
      {showFavoriteModal && (
        <div className="popup-overlay" onClick={handleFavoriteCancel}>
          <div className="popup-modal favorite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon">
              {pendingFavoriteAction === 'add' ? '❤️' : '💔'}
            </div>
            <h2 className="popup-title">
              {pendingFavoriteAction === 'add'
                ? t.player.addToFavoritesTitle
                : t.player.removeFromFavoritesTitle}
            </h2>
            <p className="popup-message">
              {pendingFavoriteAction === 'add'
                ? t.player.addToFavoritesMessage
                : t.player.removeFromFavoritesMessage}
            </p>
            <div className="popup-series-info">
              <span className="popup-series-name">{playerState.series?.name || ''}</span>
            </div>
            <label className="dont-show-again">
              <input
                type="checkbox"
                checked={favoriteModalDontShowAgain}
                onChange={(e) => setFavoriteModalDontShowAgain(e.target.checked)}
              />
              <span>{t.player.dontShowAgain}</span>
            </label>
            <div className="popup-buttons">
              <button
                className="btn-confirm"
                onClick={handleFavoriteConfirm}
              >
                {t.player.confirm}
              </button>
              <button
                className="btn-cancel"
                onClick={handleFavoriteCancel}
              >
                {t.player.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastState.isVisible && (
        <div className={`toast-notification toast-${toastState.type}`}>
          {toastState.message}
        </div>
      )}
    </div>
  )
}

// Pure sub-components

interface BreadcrumbProps {
  seriesName: string
  homeText: string
  onHomeClick: () => void
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ seriesName, homeText, onHomeClick }) => (
  <div className="breadcrumb">
    <span className="breadcrumb-link" onClick={onHomeClick}>
      {homeText}
    </span>
    <span className="breadcrumb-separator">&gt;</span>
    <span className="breadcrumb-current">{seriesName}</span>
  </div>
)

interface VideoPlayerProps {
  episode: Episode | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  isPlaying: boolean
  showControls: boolean
  currentTime: number
  duration: number
  volume: number
  playbackSpeed: number
  showSpeedSelector: boolean
  onPlayPause: () => void
  onTimeUpdate: () => void
  onLoadedMetadata: () => void
  onProgressChange: (time: number) => void
  onVolumeToggle: () => void
  onSpeedChange: (speed: number) => void
  onSpeedSelectorToggle: () => void
  onFullscreen: () => void
  onMouseMove: () => void
  onMouseLeave: () => void
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  episode,
  videoRef,
  isPlaying,
  showControls,
  currentTime,
  duration,
  volume,
  playbackSpeed,
  showSpeedSelector,
  onPlayPause,
  onTimeUpdate,
  onLoadedMetadata,
  onProgressChange,
  onVolumeToggle,
  onSpeedChange,
  onSpeedSelectorToggle,
  onFullscreen,
  onMouseMove,
  onMouseLeave,
}) => (
  <div className="video-player">
    {!episode ? (
      <div className="video-placeholder">No video available</div>
    ) : episode.videoId ? (
      <iframe
        src={getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, episode.videoId)}
        loading="lazy"
        style={{ border: 'none', width: '100%', height: '100%' }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <div
        className="video-player-native"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <video
          ref={videoRef}
          src={episode.videoUrl}
          poster={episode.thumbnail}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onClick={onPlayPause}
        />

        <div className={`player-controls ${showControls ? 'visible' : ''}`}>
          <PlayPauseButton isPlaying={isPlaying} onClick={onPlayPause} />

          <input
            type="range"
            className="progress-bar"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => onProgressChange(parseFloat(e.target.value))}
          />

          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <VolumeButton volume={volume} onClick={onVolumeToggle} />

          <SpeedSelector
            currentSpeed={playbackSpeed}
            showSelector={showSpeedSelector}
            onToggle={onSpeedSelectorToggle}
            onSpeedSelect={onSpeedChange}
          />

          <FullscreenButton onClick={onFullscreen} />
        </div>
      </div>
    )}
  </div>
)

interface PlayPauseButtonProps {
  isPlaying: boolean
  onClick: () => void
}

const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({ isPlaying, onClick }) => (
  <button className="control-button play-pause" onClick={onClick}>
    {isPlaying ? (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
    ) : (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21" />
      </svg>
    )}
  </button>
)

interface VolumeButtonProps {
  volume: number
  onClick: () => void
}

const VolumeButton: React.FC<VolumeButtonProps> = ({ volume, onClick }) => (
  <button className="control-button volume" onClick={onClick}>
    {volume === 0 ? (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45a4.5 4.5 0 0 0 .05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
      </svg>
    ) : (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8c1.48-.73 2.5-2.25 2.5-4zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
    )}
  </button>
)

interface SpeedSelectorProps {
  currentSpeed: number
  showSelector: boolean
  onToggle: () => void
  onSpeedSelect: (speed: number) => void
}

const SpeedSelector: React.FC<SpeedSelectorProps> = ({
  currentSpeed,
  showSelector,
  onToggle,
  onSpeedSelect,
}) => (
  <div className="speed-selector">
    <button className="control-button speed" onClick={onToggle}>
      {currentSpeed}x
    </button>
    {showSelector && (
      <div className="speed-options">
        {playbackSpeeds.map((speed) => (
          <button
            key={speed}
            className={`speed-option ${speed === currentSpeed ? 'active' : ''}`}
            onClick={() => onSpeedSelect(speed)}
          >
            {speed}x
          </button>
        ))}
      </div>
    )}
  </div>
)

interface FullscreenButtonProps {
  onClick: () => void
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({ onClick }) => (
  <button className="control-button fullscreen" onClick={onClick}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  </button>
)

interface EpisodeMetadataProps {
  series: { name: string; tags?: string[]; genre?: { _id: string; name: string }[]; description: string; languages?: string[] }
  currentEpisode: Episode | null
  selectedLanguage: string
  isFavorited: boolean
  isEpisodePurchased: boolean
  onLanguageChange: (language: string) => void
  onTagClick: (tag: string) => void
  onFavoriteToggle: () => void
  onUnlockClick: () => void
}

const EpisodeMetadata: React.FC<EpisodeMetadataProps> = ({
  series,
  currentEpisode,
  selectedLanguage,
  isFavorited,
  isEpisodePurchased,
  onLanguageChange,
  onTagClick,
  onFavoriteToggle,
  onUnlockClick,
}) => (
  <div className="episode-metadata">
    <h1 className="episode-title">
      {currentEpisode ? buildEpisodeTitle(series.name, currentEpisode.episodeNumber) : series.name}
    </h1>

    <div className="metadata-row">
      <div className="episode-language">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
        <select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="language-select"
        >
          {series.languages?.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          )) || <option value="English">English</option>}
        </select>
      </div>

      <div className="metadata-buttons">
        <button
          className={`favorite-button ${isFavorited ? 'active' : ''}`}
          onClick={onFavoriteToggle}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill={isFavorited ? '#ef4444' : 'none'}
              stroke={isFavorited ? '#ef4444' : '#9ca3af'}
              strokeWidth="2"
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
        </button>

        <button
          className={`unlock-button ${isEpisodePurchased ? 'purchased' : ''}`}
          onClick={onUnlockClick}
          title={isEpisodePurchased ? 'Episode unlocked' : 'Unlock episode'}
          disabled={isEpisodePurchased}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            {isEpisodePurchased ? (
              <path
                fill="#f97316"
                d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"
              />
            ) : (
              <path
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"
              />
            )}
          </svg>
        </button>
      </div>
    </div>

    <div className="episode-tags">
      {series.tags?.map((tag, index) => (
        <span key={index} className="episode-tag" onClick={() => onTagClick(tag)}>
          {tag}
        </span>
      ))}
      {series.genre?.map((genre) => (
        <span key={genre._id} className="episode-tag" onClick={() => onTagClick(genre.name)}>
          {genre.name}
        </span>
      ))}
    </div>

    <p className="episode-description">{currentEpisode?.description || series.description}</p>
  </div>
)

interface EpisodeItemProps {
  episode: Episode
  isActive: boolean
  onClick: () => void
}

const EpisodeItem: React.FC<EpisodeItemProps> = ({ episode, isActive, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div
      className={`episode-thumbnail ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={getEpisodeThumbnailUrl(episode, isHovered)}
        alt={episode.title}
      />
      <span className="episode-number">
        EP {episode.episodeNumber.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

interface EpisodeSidebarProps {
  episodes: Episode[]
  allEpisodes: Episode[]
  currentEpisode: Episode | null
  episodeRange: [number, number]
  title: string
  onEpisodeClick: (episode: Episode) => void
  onRangeSelect: (range: [number, number]) => void
}

const EpisodeSidebar: React.FC<EpisodeSidebarProps> = ({
  episodes,
  allEpisodes,
  currentEpisode,
  episodeRange,
  title,
  onEpisodeClick,
  onRangeSelect,
}) => {
  const ranges = getEpisodeRanges(allEpisodes.length)

  return (
    <aside className="episode-sidebar">
      <h2 className="sidebar-title">{title}</h2>

      <div className="episode-range-selector">
        {ranges.map(([start, end]) => (
          <button
            key={`${start}-${end}`}
            className={`range-button ${
              episodeRange[0] === start && episodeRange[1] === end ? 'active' : ''
            }`}
            onClick={() => onRangeSelect([start, end])}
          >
            {start.toString().padStart(2, '0')}-{end.toString().padStart(2, '0')}
          </button>
        ))}
      </div>

      <div className="episode-grid">
        {episodes.map((episode) => (
          <EpisodeItem
            key={episode.episodeNumber}
            episode={episode}
            isActive={currentEpisode !== null && currentEpisode.episodeNumber === episode.episodeNumber}
            onClick={() => onEpisodeClick(episode)}
          />
        ))}
      </div>
    </aside>
  )
}

interface SocialButtonsProps {
  favoritesText: string
}

const SocialButtons: React.FC<SocialButtonsProps> = ({ favoritesText }) => (
  <div className="social-buttons">
    <button className="social-button" title="Facebook">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#1877F2"
          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        />
      </svg>
    </button>
    <button className="social-button" title="Twitter">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#1DA1F2"
          d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
        />
      </svg>
    </button>
    <button className="social-button" title="Pinterest">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#E60023"
          d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"
        />
      </svg>
    </button>
    <button className="social-button" title="WhatsApp">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#25D366"
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        />
      </svg>
    </button>
    <button className="social-button" title={favoritesText}>
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#ef4444"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        />
      </svg>
    </button>
  </div>
)

export default Player