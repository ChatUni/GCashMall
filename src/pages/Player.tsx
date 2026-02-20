import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js'
import { useParams, useSearchParams, useNavigate } from '@solidjs/router'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import RecommendationSection from '../components/RecommendationSection'
import NewReleasesSection from '../components/NewReleasesSection'
import LoginModal from '../components/LoginModal'
import { PurchasePopup, ResultModal, FavoriteModal, Toast } from '../components/PlayerModals'
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
import { isEpisodePurchased } from '../services/dataService'
import {
  formatTime,
  getEpisodeThumbnailUrl,
  buildEpisodeTitle,
  getIframeUrl,
  playbackSpeeds,
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

  const currentVideoId = () => playerStore.currentEpisode?.videoId
  const isPurchased = () => isCurrentEpisodePurchased()

  // Reset iframe loaded state when video changes
  createEffect(() => {
    const _vid = currentVideoId()
    setIframeLoaded(false)
  })

  // Initialize Player.js with trial limit enforcement
  createEffect(() => {
    const vid = currentVideoId()
    if (!vid || !iframeLoaded()) return

    const cleanup = initializePlayerJsWithTrialLimit(
      { current: iframeRef || null },
      vid,
      isPurchased(),
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

// ── SocialButtons ── subscribes directly to languageStore

const SocialButtons = () => (
  <div class="social-buttons">
    <button class="social-button" title="Facebook">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#1877F2"
          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        />
      </svg>
    </button>
    <button class="social-button" title="Twitter">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#1DA1F2"
          d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
        />
      </svg>
    </button>
    <button class="social-button" title="Pinterest">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#E60023"
          d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"
        />
      </svg>
    </button>
    <button class="social-button" title="WhatsApp">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#25D366"
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        />
      </svg>
    </button>
    <button class="social-button" title={t().player.addToFavorites}>
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
