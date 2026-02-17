import React, { useRef, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCarousel from '../../components/phone/PhoneSeriesCarousel'
import LoginModal from '../../components/LoginModal'
import { PurchasePopup, ResultModal, FavoriteModal, Toast } from '../../components/PlayerModals'
import { useLanguage } from '../../context/LanguageContext'
import {
  usePlayerStore,
  useLoginModalStore,
  useUserStore,
  playerStoreActions,
  loginModalStoreActions,
  userStoreActions,
  useRecommendationsStore,
  useNewReleasesStore,
  useToastStore,
} from '../../stores'
import {
  usePlayerPageStore,
  playerPageStoreActions,
  checkSeriesFavorited,
  isCurrentEpisodePurchased,
  getFilteredEpisodes,
  getEpisodeRangeOptions,
  checkEpisodePurchased,
  initializePlayerJsWithTrialLimit,
  updatePlayerJsPurchaseStatus,
} from '../../stores/playerStore'
import { accountStoreActions } from '../../stores/accountStore'
import { getIframeUrl } from '../../utils/playerHelpers'
import './PhonePlayer.css'

const PhonePlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  // Subscribe to stores
  const playerState = usePlayerStore()
  const playerPageState = usePlayerPageStore()
  const loginModalState = useLoginModalStore()
  const userState = useUserStore()
  const { series: recommendations } = useRecommendationsStore()
  const { series: newReleases } = useNewReleasesStore()
  const toastState = useToastStore()

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const [iframeLoaded, setIframeLoaded] = React.useState(false)

  // Initialize data
  if (id) {
    playerPageStoreActions.initialize(id, true) // true = fetch recommendations
  }

  // Episode selection logic
  const episodeNumberFromUrl = searchParams.get('episode')
  if (playerState.episodes.length > 0 && !playerState.loading && id) {
    playerPageStoreActions.selectEpisodeFromUrlOrWatchList(episodeNumberFromUrl)
  }

  // Derived state from store
  const isFavorited = checkSeriesFavorited(id)
  const isPurchased = isCurrentEpisodePurchased()
  const filteredEpisodes = getFilteredEpisodes()
  const ranges = getEpisodeRangeOptions()

  // Check description truncation
  useEffect(() => {
    const checkTruncation = () => {
      if (descriptionRef.current) {
        const element = descriptionRef.current
        const isTruncated = element.scrollHeight > element.clientHeight
        playerPageStoreActions.setShowExpandButton(isTruncated)
      }
    }

    playerPageStoreActions.setDescriptionExpanded(false)
    const timer = setTimeout(checkTruncation, 100)
    return () => clearTimeout(timer)
  }, [playerState.currentEpisode, playerState.series])

  // Player.js initialization
  const currentVideoId = playerState.currentEpisode?.videoId
  const userId = userState.user?._id

  useEffect(() => {
    setIframeLoaded(false)
  }, [currentVideoId, userId])

  const handleIframeLoad = () => {
    setIframeLoaded(true)
  }

  useEffect(() => {
    if (!currentVideoId || !iframeLoaded) return

    const cleanup = initializePlayerJsWithTrialLimit(
      iframeRef,
      currentVideoId,
      isPurchased,
      playerPageStoreActions.handleTimeLimitReached,
    )

    return cleanup
  }, [currentVideoId, isPurchased, iframeLoaded])

  useEffect(() => {
    if (!iframeLoaded) return
    updatePlayerJsPurchaseStatus(currentVideoId, isPurchased)
  }, [isPurchased, currentVideoId, iframeLoaded])

  // Loading state
  if (playerState.loading) {
    return (
      <PhoneLayout showHeader={true} showBackButton={true} title="">
        <div className="phone-player-loading">Loading...</div>
      </PhoneLayout>
    )
  }

  // Error state
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
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {playerState.currentEpisode?.videoId ? (
            <iframe
              key={`${playerState.currentEpisode.videoId}-${userId || 'anon'}`}
              ref={iframeRef}
              src={getIframeUrl(
                import.meta.env.VITE_BUNNY_LIBRARY_ID,
                playerState.currentEpisode.videoId,
              )}
              loading="lazy"
              className="phone-video-iframe"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              onLoad={handleIframeLoad}
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
                {playerState.currentEpisode?.title
                  ? ` - ${playerState.currentEpisode.title}`
                  : ''}
              </span>
            </div>
            <div className="phone-player-actions">
              <button
                className={`phone-action-btn phone-action-btn-large ${isFavorited ? 'active' : ''}`}
                onClick={playerPageStoreActions.handleFavoriteToggle}
              >
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path
                    fill={isFavorited ? '#ef4444' : 'none'}
                    stroke={isFavorited ? '#ef4444' : 'currentColor'}
                    strokeWidth="2"
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  />
                </svg>
              </button>
              {!isPurchased && (
                <button
                  className="phone-action-btn phone-action-btn-large locked"
                  onClick={playerPageStoreActions.handleUnlockClick}
                >
                  <svg viewBox="0 0 24 24" width="32" height="32">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"
                    />
                  </svg>
                </button>
              )}
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
              className={`phone-player-description ${playerPageState.isDescriptionExpanded ? 'expanded' : ''}`}
            >
              {playerState.currentEpisode?.description || playerState.series.description}
            </p>
            {playerPageState.showExpandButton && (
              <button
                className={`phone-player-expand-btn ${playerPageState.isDescriptionExpanded ? 'expanded' : ''}`}
                onClick={playerPageStoreActions.toggleDescription}
              >
                {playerPageState.isDescriptionExpanded
                  ? (t.player as unknown as Record<string, string>).collapse || 'Show Less'
                  : (t.player as unknown as Record<string, string>).expand || 'Show More'}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Episode List Toggle */}
        <button
          className="phone-episode-toggle"
          onClick={playerPageStoreActions.toggleEpisodeList}
        >
          <span>
            {t.player.episodes} ({playerState.episodes.length})
          </span>
          <svg
            className={`phone-episode-arrow ${playerPageState.showEpisodeList ? 'open' : ''}`}
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
        {playerPageState.showEpisodeList && (
          <div className="phone-episode-list">
            {/* Range Selector */}
            {ranges.length > 1 && (
              <div className="phone-episode-ranges">
                {ranges.map(([start, end]) => (
                  <button
                    key={`${start}-${end}`}
                    className={`phone-range-btn ${
                      playerState.episodeRange[0] === start &&
                      playerState.episodeRange[1] === end
                        ? 'active'
                        : ''
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
                <div
                  key={episode.episodeNumber}
                  className={`phone-episode-thumbnail ${
                    playerState.currentEpisode?.episodeNumber === episode.episodeNumber
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => playerPageStoreActions.handleEpisodeClick(episode, navigate)}
                >
                  <img
                    src={`https://vz-918d4e7e-1fb.b-cdn.net/${episode.videoId}/thumbnail.jpg`}
                    alt={`Episode ${episode.episodeNumber}`}
                    className="phone-episode-thumb-img"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        playerState.series?.cover || '/placeholder.jpg'
                    }}
                  />
                  <span className="phone-episode-badge">
                    EP {episode.episodeNumber.toString().padStart(2, '0')}
                  </span>
                  {checkEpisodePurchased(episode._id, episode.episodeNumber) && (
                    <span className="phone-episode-ribbon" />
                  )}
                </div>
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
      {playerPageState.showPurchasePopup && playerState.currentEpisode && (
        <PurchasePopup
          seriesName={playerState.series?.name || ''}
          episodeNumber={playerState.currentEpisode.episodeNumber}
          episodeTitle={playerState.currentEpisode.title}
          userBalance={userState.user?.balance || 0}
          isPurchasing={playerPageState.isPurchasing}
          onConfirm={() => playerPageStoreActions.handlePurchaseConfirm(t)}
          onCancel={playerPageStoreActions.hidePurchasePopup}
          t={t.player}
        />
      )}

      {/* Favorite Modal */}
      {playerPageState.showFavoriteModal && (
        <FavoriteModal
          action={playerPageState.pendingFavoriteAction || 'add'}
          seriesName={playerState.series?.name || ''}
          dontShowAgain={playerPageState.favoriteModalDontShowAgain}
          onDontShowAgainChange={playerPageStoreActions.setFavoriteModalDontShowAgain}
          onConfirm={playerPageStoreActions.handleFavoriteConfirm}
          onCancel={playerPageStoreActions.hideFavoriteModal}
          t={t.player}
        />
      )}

      {/* Result Modal */}
      {playerPageState.showResultModal && (
        <ResultModal
          type={playerPageState.resultModalType}
          title={
            playerPageState.resultModalType === 'success'
              ? t.player.unlockSuccess
              : t.player.unlockFailed
          }
          message={playerPageState.resultModalMessage}
          buttonText={
            playerPageState.resultModalType === 'error' &&
            playerPageState.resultModalMessage.includes('balance')
              ? t.player.goToWallet
              : 'OK'
          }
          onClose={() => playerPageStoreActions.handleResultModalClose(navigate)}
        />
      )}

      {/* Toast */}
      <Toast
        message={toastState.message}
        type={toastState.type}
        isVisible={toastState.isVisible}
      />
    </PhoneLayout>
  )
}

export default PhonePlayer
