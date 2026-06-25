import { createSignal, createEffect, onCleanup, Show, For, untrack } from 'solid-js'
import { useParams, useSearchParams, useNavigate } from '@solidjs/router'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import RecommendationSection from '../components/RecommendationSection'
import NewReleasesSection from '../components/NewReleasesSection'
import LoginModal from '../components/LoginModal'
import CommentSection from '../components/CommentSection'
import { PurchasePopup, ResultModal, FavoriteModal, Toast } from '../components/PlayerModals'
import { RatingSection, RatingModal } from '../components/StarRating'
import { t } from '../stores/languageStore'
import {
  playerStore,
  loginModalStore,
  playerStoreActions,
  loginModalStoreActions,
} from '../stores'
import { accountStore, accountStoreActions } from '../stores/accountStore'
import {
  playerPageStore,
  playerPageStoreActions,
  checkSeriesFavorited,
  checkIsSeriesOwner,
  isCurrentEpisodePurchased,
  getFilteredEpisodes,
  getEpisodeRangeOptions,
  handlePlayPause,
  handleTimeUpdate,
  handleLoadedMetadata,
  handleProgressChange,
  handleVolumeToggle,
  handleSpeedChange,
  handleFullscreen,
  initializePlayerJsWithTrialLimit,
  updatePlayerJsPurchaseStatus,
} from '../stores/playerStore'
import { getPreviewLength } from '../stores/systemSettingsStore'
import { isEpisodePurchased } from '../services/dataService'
import { isIOS } from '../utils/cordova'
import {
  formatTime,
  formatLikeCount,
  getEpisodeThumbnailUrl,
  buildEpisodeTitle,
  getIframeUrl,
  playbackSpeeds,
  getShareUrl,
  getShareText,
  shareFacebook,
  shareTwitter,
  shareInstagram,
  shareWhatsApp,
  shareReddit,
  shareEmail,
} from '../utils/playerHelpers'
import type { Episode } from '../types'
import './Player.css'

const Player = () => {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Initialize data
  createEffect(() => {
    const id = params.id
    if (id) {
      playerPageStoreActions.initialize(id)
    }
  })

  // Episode selection logic
  createEffect(() => {
    const episodeNumberFromUrl = (searchParams.episode as string | undefined) || null
    if (playerStore.episodes.length > 0 && !playerStore.loading && params.id) {
      playerPageStoreActions.selectEpisodeFromUrlOrWatchList(episodeNumberFromUrl)
    }
  })

  return (
    <div class="player-page">
      <TopBar />

      {/* Loading state */}
      <Show when={!playerStore.loading} fallback={
        <div class="loading">Loading...</div>
      }>
        {/* Error state */}
        <Show when={playerStore.series} fallback={
          <div class="error">Series not found</div>
        }>
          <Breadcrumb />

          <main class="player-content">
            <div class="player-main">
              <VideoPlayer />
              <EpisodeMetadata />
              <CommentSection />
            </div>

            <EpisodeSidebar />
          </main>

          <RecommendationSection excludeSeriesId={params.id} />
          <NewReleasesSection excludeSeriesId={params.id} />

          <SocialButtons />
        </Show>
      </Show>

      <BottomBar />

      {/* Login Modal */}
      <Show when={loginModalStore.isOpen}>
        <LoginModal
          onClose={loginModalStoreActions.close}
          onLoginSuccess={(user) => {
            accountStoreActions.setUser(user)
            accountStoreActions.setLoading(false)
            accountStoreActions.initializeUserData(user)
            loginModalStoreActions.close()
          }}
        />
      </Show>

      {/* Purchase Popup */}
      <Show when={playerPageStore.showPurchasePopup && playerStore.currentEpisode}>
        <PurchasePopup
          seriesName={playerStore.series?.name || ''}
          episodeNumber={playerStore.currentEpisode!.episodeNumber}
          episodeTitle={playerStore.currentEpisode!.title}
          userBalance={accountStore.user?.balance || 0}
          isPurchasing={playerPageStore.isPurchasing}
          onConfirm={() => playerPageStoreActions.handlePurchaseConfirm(t())}
          onCancel={playerPageStoreActions.hidePurchasePopup}
          t={t().player}
        />
      </Show>

      {/* Result Modal */}
      <Show when={playerPageStore.showResultModal}>
        <ResultModal
          type={playerPageStore.resultModalType}
          title={
            playerPageStore.resultModalType === 'success'
              ? t().player.unlockSuccess
              : t().player.unlockFailed
          }
          message={playerPageStore.resultModalMessage}
          buttonText={
            playerPageStore.resultModalType === 'error' &&
            playerPageStore.resultModalMessage.includes('balance')
              ? t().player.goToWallet
              : 'OK'
          }
          onClose={() => playerPageStoreActions.handleResultModalClose(navigate)}
        />
      </Show>

      {/* Favorite Modal */}
      <Show when={playerPageStore.showFavoriteModal}>
        <FavoriteModal
          action={playerPageStore.pendingFavoriteAction || 'add'}
          seriesName={playerStore.series?.name || ''}
          dontShowAgain={playerPageStore.favoriteModalDontShowAgain}
          onDontShowAgainChange={playerPageStoreActions.setFavoriteModalDontShowAgain}
          onConfirm={playerPageStoreActions.handleFavoriteConfirm}
          onCancel={playerPageStoreActions.hideFavoriteModal}
          t={t().player}
        />
      </Show>

      {/* Rating Modal */}
      <Show when={playerPageStore.showRatingModal}>
        <RatingModal />
      </Show>

      {/* Toast */}
      <Toast />
    </div>
  )
}

// ── Breadcrumb ── subscribes directly to playerStore and languageStore

const Breadcrumb = () => {
  const navigate = useNavigate()

  return (
    <div class="breadcrumb">
      <span class="breadcrumb-link" onClick={() => navigate('/')}>
        {t().player.breadcrumbHome}
      </span>
      <span class="breadcrumb-separator">&gt;</span>
      <span class="breadcrumb-current">{playerStore.series!.name}</span>
    </div>
  )
}

// ── VideoPlayer ── subscribes directly to playerStore/playerPageStore

const VideoPlayer = () => {
  let videoRef: HTMLVideoElement | undefined
  let iframeRef: HTMLIFrameElement | undefined
  let controlsTimeoutRef: ReturnType<typeof setTimeout> | null = null
  const [iframeLoaded, setIframeLoaded] = createSignal(false)
  // iOS only: true once the free preview has been spent for the current episode.
  const [previewConsumed, setPreviewConsumed] = createSignal(false)

  const currentVideoId = () => playerStore.currentEpisode?.videoId
  const isPurchased = () => isCurrentEpisodePurchased()

  // Reset iframe loaded state when video changes
  createEffect(() => {
    const _vid = currentVideoId()
    setIframeLoaded(false)
    setPreviewConsumed(false)
  })

  // Initialize Player.js with trial limit enforcement
  // Note: Use untrack for isPurchased() so this effect only re-runs on video/iframe changes.
  // Purchase status updates are handled separately by updatePlayerJsPurchaseStatus below.
  // If we track isPurchased() here, login causes re-initialization which destroys the
  // existing Player.js instance and creates a new one that may not attach listeners in time.
  createEffect(() => {
    const vid = currentVideoId()
    if (!vid || !iframeLoaded()) return

    const cleanup = initializePlayerJsWithTrialLimit(
      { current: iframeRef || null },
      vid,
      untrack(() => isPurchased()),
      playerPageStoreActions.handleTimeLimitReached,
    )

    if (cleanup) {
      onCleanup(cleanup)
    }
  })

  // Update purchase status when it changes
  createEffect(() => {
    if (!iframeLoaded()) return
    updatePlayerJsPurchaseStatus(currentVideoId(), isPurchased())
  })

  // iOS fallback for the preview time limit.
  // Under the app:// WKWebView origin the Player.js <-> Bunny iframe postMessage bridge
  // is unreliable, so its 'timeupdate' enforcement never fires. Enforce the limit with a
  // wall-clock timer and stop playback by reloading the iframe with autoplay disabled —
  // the one form of control that doesn't depend on the bridge.
  createEffect(() => {
    if (!isIOS()) return
    const vid = currentVideoId()
    const purchased = isPurchased()
    if (!vid || purchased) return

    const timer = setTimeout(() => {
      if (untrack(isPurchased)) return
      if (iframeRef) iframeRef.src = getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, vid, false)
      setPreviewConsumed(true)
      playerPageStoreActions.handleTimeLimitReached()
    }, getPreviewLength() * 1000)

    onCleanup(() => clearTimeout(timer))
  })

  // iOS: resume playback after purchase by reloading the iframe that the fallback stopped.
  createEffect(() => {
    if (!isIOS()) return
    const vid = currentVideoId()
    const purchased = isPurchased()
    if (purchased && vid && iframeRef && iframeRef.src.includes('autoplay=false')) {
      iframeRef.src = getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, vid, true)
    }
  })

  const handleMouseMove = () => {
    playerStoreActions.setShowControls(true)
    if (controlsTimeoutRef) {
      clearTimeout(controlsTimeoutRef)
    }
    controlsTimeoutRef = setTimeout(() => {
      if (playerStore.isPlaying) {
        playerStoreActions.setShowControls(false)
      }
    }, 3000)
  }

  const handleMouseLeave = () => {
    if (playerStore.isPlaying) {
      playerStoreActions.setShowControls(false)
    }
  }

  const onPlayPause = () => handlePlayPause({ current: videoRef || null }, playerStore.isPlaying)
  const onTimeUpdate = () => handleTimeUpdate({ current: videoRef || null }, isPurchased(), playerPageStoreActions.handleTimeLimitReached)
  const onLoadedMetadata = () => handleLoadedMetadata({ current: videoRef || null })
  const onProgressChange = (time: number) => handleProgressChange({ current: videoRef || null }, time, isPurchased(), playerPageStoreActions.handleTimeLimitReached)
  const onVolumeToggle = () => handleVolumeToggle({ current: videoRef || null }, playerStore.volume)
  const onSpeedChange = (speed: number) => handleSpeedChange({ current: videoRef || null }, speed)
  const onSpeedSelectorToggle = () => playerStoreActions.setShowSpeedSelector(!playerStore.showSpeedSelector)
  const onFullscreen = () => handleFullscreen({ current: videoRef || null })

  return (
    <div class="video-player">
      <Show when={playerStore.currentEpisode} fallback={<div class="video-placeholder">No video available</div>}>
        <Show when={playerStore.currentEpisode!.videoId} fallback={
          <div
            class="video-player-native"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <video
              ref={(el) => { videoRef = el }}
              src={playerStore.currentEpisode!.videoUrl}
              poster={playerStore.currentEpisode!.thumbnail}
              playsinline
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onClick={onPlayPause}
            />

            <div class={`player-controls ${playerStore.showControls ? 'visible' : ''}`}>
              <PlayPauseButton onClick={onPlayPause} />

              <input
                type="range"
                class="progress-bar"
                min="0"
                max={playerStore.duration}
                value={playerStore.currentTime}
                onInput={(e) => onProgressChange(parseFloat(e.currentTarget.value))}
              />

              <span class="time-display">
                {formatTime(playerStore.currentTime)} / {formatTime(playerStore.duration)}
              </span>

              <VolumeButton onClick={onVolumeToggle} />

              <SpeedSelector
                onToggle={onSpeedSelectorToggle}
                onSpeedSelect={onSpeedChange}
              />

              <FullscreenButton onClick={onFullscreen} />
            </div>
          </div>
        }>
          <iframe
            ref={iframeRef}
            src={getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, playerStore.currentEpisode!.videoId || '')}
            loading="lazy"
            style={{ border: 'none', width: '100%', height: '100%' }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
            onLoad={() => setIframeLoaded(true)}
          />
          {/* iOS: once the preview is spent, block the iframe's native replay and
              reopen the purchase dialog instead. */}
          <Show when={isIOS() && !isPurchased() && previewConsumed()}>
            <div class="preview-lock" onClick={playerPageStoreActions.handleUnlockClick}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>{t().player.unlockMessage}</span>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  )
}

// ── PlayPauseButton ── subscribes directly to playerStore

interface PlayPauseButtonProps {
  onClick: () => void
}

const PlayPauseButton = (props: PlayPauseButtonProps) => (
  <button class="control-button play-pause" onClick={props.onClick}>
    <Show when={playerStore.isPlaying} fallback={
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21" />
      </svg>
    }>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
    </Show>
  </button>
)

// ── VolumeButton ── subscribes directly to playerStore

interface VolumeButtonProps {
  onClick: () => void
}

const VolumeButton = (props: VolumeButtonProps) => (
  <button class="control-button volume" onClick={props.onClick}>
    <Show when={playerStore.volume === 0} fallback={
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8c1.48-.73 2.5-2.25 2.5-4zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
    }>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45a4.5 4.5 0 0 0 .05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
      </svg>
    </Show>
  </button>
)

// ── SpeedSelector ── subscribes directly to playerStore

interface SpeedSelectorProps {
  onToggle: () => void
  onSpeedSelect: (speed: number) => void
}

const SpeedSelector = (props: SpeedSelectorProps) => (
  <div class="speed-selector">
    <button class="control-button speed" onClick={props.onToggle}>
      {playerStore.playbackSpeed}x
    </button>
    <Show when={playerStore.showSpeedSelector}>
      <div class="speed-options">
        <For each={playbackSpeeds}>
          {(speed) => (
            <button
              class={`speed-option ${speed === playerStore.playbackSpeed ? 'active' : ''}`}
              onClick={() => props.onSpeedSelect(speed)}
            >
              {speed}x
            </button>
          )}
        </For>
      </div>
    </Show>
  </div>
)

interface FullscreenButtonProps {
  onClick: () => void
}

const FullscreenButton = (props: FullscreenButtonProps) => (
  <button class="control-button fullscreen" onClick={props.onClick}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  </button>
)

// ── EpisodeMetadata ── subscribes directly to playerStore/playerPageStore

const EpisodeMetadata = () => {
  const navigate = useNavigate()
  const isFavorited = () => checkSeriesFavorited(useParams().id)
  const isPurchased = () => isCurrentEpisodePurchased()
  const handleTagClick = (tag: string) => navigate(`/series?genre=${encodeURIComponent(tag)}`)

  return (
    <div class="episode-metadata">
      <h1 class="episode-title">
        {playerStore.currentEpisode
          ? buildEpisodeTitle(playerStore.series!.name, playerStore.currentEpisode.episodeNumber)
          : playerStore.series!.name}
      </h1>

      <div class="metadata-row">
        <div class="episode-language">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          <select
            value={playerStore.selectedLanguage}
            onChange={(e) => playerStoreActions.setSelectedLanguage(e.currentTarget.value)}
            class="language-select"
          >
            <Show when={playerStore.series!.languages && playerStore.series!.languages.length > 0} fallback={
              <option value="English">English</option>
            }>
              <For each={playerStore.series!.languages}>
                {(lang) => (
                  <option value={lang}>{lang}</option>
                )}
              </For>
            </Show>
          </select>
        </div>

        <div class="metadata-buttons">
          <div class="view-count">
            {t().player.views.replace('{count}', formatLikeCount(playerPageStore.viewCount))}
          </div>

          <RatingSection />

          <button
            class={`like-button ${playerPageStore.isLiked ? 'active' : ''}`}
            onClick={playerPageStoreActions.handleLikeToggle}
            title={playerPageStore.isLiked ? t().player.unlike : t().player.like}
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path
                fill={playerPageStore.isLiked ? '#FFD700' : 'none'}
                stroke={playerPageStore.isLiked ? '#FFD700' : '#9ca3af'}
                stroke-width="2"
                d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
              />
            </svg>
            <span class="like-count">{formatLikeCount(playerPageStore.likeCount)}</span>
          </button>

          <button
            class={`favorite-button ${isFavorited() ? 'active' : ''}`}
            onClick={playerPageStoreActions.handleFavoriteToggle}
            title={isFavorited() ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path
                fill={isFavorited() ? '#ef4444' : 'none'}
                stroke={isFavorited() ? '#ef4444' : '#9ca3af'}
                stroke-width="2"
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
          </button>

          <Show when={!isPurchased()}>
            <button class="unlock-button" onClick={playerPageStoreActions.handleUnlockClick} title="Unlock episode">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="none"
                  stroke="#9ca3af"
                  stroke-width="2"
                  d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"
                />
              </svg>
            </button>
          </Show>
        </div>
      </div>

      <div class="episode-tags">
        <For each={playerStore.series!.tags}>
          {(tag, index) => (
            <span class="episode-tag" onClick={() => handleTagClick(tag)}>
              {tag}
            </span>
          )}
        </For>
        <For each={playerStore.series!.genre}>
          {(genre) => (
            <span
              class="episode-tag"
              onClick={() => handleTagClick(genre.name)}
            >
              {genre.name}
            </span>
          )}
        </For>
      </div>

      <p class="episode-description">
        {playerStore.currentEpisode?.description || playerStore.series!.description}
      </p>
    </div>
  )
}

// ── EpisodeItem ── pure presentational (episode comes from For loop)

interface EpisodeItemProps {
  episode: Episode
  isActive: boolean
  isPurchased: boolean
  onClick: () => void
}

const EpisodeItem = (props: EpisodeItemProps) => {
  const [isHovered, setIsHovered] = createSignal(false)

  return (
    <div
      class={`episode-thumbnail ${props.isActive ? 'active' : ''}`}
      onClick={props.onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Show when={props.isPurchased}>
        <div class="purchased-ribbon" />
      </Show>
      <img src={getEpisodeThumbnailUrl(props.episode, isHovered())} alt={props.episode.title} />
      <span class="episode-number">
        EP {props.episode.episodeNumber.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

// ── EpisodeSidebar ── subscribes directly to playerStore/playerPageStore/accountStore

const EpisodeSidebar = () => {
  const params = useParams()
  const navigate = useNavigate()
  const purchases = () => accountStore.user?.purchases
  const isOwner = () => checkIsSeriesOwner()
  const filteredEpisodes = () => getFilteredEpisodes()
  const ranges = () => getEpisodeRangeOptions()

  const checkPurchased = (episode: Episode): boolean => {
    if (!params.id) return false
    if (isOwner()) return true
    return isEpisodePurchased(params.id, episode._id, purchases(), episode.episodeNumber)
  }

  return (
    <aside class="episode-sidebar">
      <h2 class="sidebar-title">{t().player.episodes}</h2>

      <div class="episode-range-selector">
        <For each={ranges()}>
          {([start, end]) => (
            <button
              class={`range-button ${
                playerStore.episodeRange[0] === start && playerStore.episodeRange[1] === end ? 'active' : ''
              }`}
              onClick={() => playerStoreActions.setEpisodeRange([start, end])}
            >
              {start.toString().padStart(2, '0')}-{end.toString().padStart(2, '0')}
            </button>
          )}
        </For>
      </div>

      <div class="episode-grid">
        <For each={filteredEpisodes()}>
          {(episode) => (
            <EpisodeItem
              episode={episode}
              isActive={
                playerStore.currentEpisode !== null &&
                playerStore.currentEpisode.episodeNumber === episode.episodeNumber
              }
              isPurchased={checkPurchased(episode)}
              onClick={() => playerPageStoreActions.handleEpisodeClick(episode, navigate)}
            />
          )}
        </For>
      </div>
    </aside>
  )
}

// ── SocialButtons ── subscribes directly to playerStore/languageStore

const SocialButtons = () => {
  const shareUrl = () => getShareUrl()
  const shareText = () =>
    getShareText(
      playerStore.series?.name || '',
      playerStore.currentEpisode?.episodeNumber,
    )

  return (
    <div class="social-buttons">
      <button
        class="social-button"
        title="Facebook"
        onClick={() => shareFacebook(shareUrl())}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#1877F2"
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          />
        </svg>
      </button>
      <button
        class="social-button"
        title="X"
        onClick={() => shareTwitter(shareUrl(), shareText())}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#FFFFFF"
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"
          />
        </svg>
      </button>
      <button
        class="social-button"
        title="Instagram"
        onClick={() => shareInstagram(playerStore.series?.cover || '')}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#E4405F"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
          />
        </svg>
      </button>
      <button
        class="social-button"
        title="WhatsApp"
        onClick={() => shareWhatsApp(shareUrl(), shareText())}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#25D366"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
          />
        </svg>
      </button>
      <button
        class="social-button"
        title="Reddit"
        onClick={() => shareReddit(shareUrl(), shareText())}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#FF4500"
            d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.07 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"
          />
        </svg>
      </button>
      <button
        class="social-button"
        title="Email"
        onClick={() => shareEmail(shareUrl(), shareText())}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#777"
            d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
          />
        </svg>
      </button>
      <button
        class="social-button"
        title={t().player.addToFavorites}
        onClick={playerPageStoreActions.handleFavoriteToggle}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#ef4444"
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          />
        </svg>
      </button>
    </div>
  )
}

export default Player
