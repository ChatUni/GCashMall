import React, { useRef, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import RecommendationSection from '../components/RecommendationSection'
import NewReleasesSection from '../components/NewReleasesSection'
import LoginModal from '../components/LoginModal'
import PurchaseDialog from '../components/PurchaseDialog'
import { useLanguage } from '../context/LanguageContext'
import { useLoginModalStore, useUserStore, loginModalStoreActions } from '../stores'
import {
  usePlayerStore,
  playerStoreActions,
  EPISODE_COST,
  TIME_LIMIT,
} from '../stores/playerStore'
import type { WindowWithPlayerJs, PlayerJsPlayer } from '../stores/playerStore'
import {
  formatTime,
  getEpisodeThumbnailUrl,
  getEpisodeRanges,
  filterEpisodesByRange,
  buildEpisodeTitle,
  getIframeUrl,
  playbackSpeeds,
} from '../utils/playerHelpers'
import type { Episode } from '../types'
import './Player.css'

const Player: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const playerState = usePlayerStore()
  const loginModalState = useLoginModalStore()
  const userState = useUserStore()

  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playerInstanceRef = useRef<PlayerJsPlayer | null>(null)
  
  // Ref to hold latest user state for use in event callbacks (avoids stale closures)
  const userStateRef = useRef(userState)
  userStateRef.current = userState

  // Initialize data on first render
  if (id) {
    playerStoreActions.initializePlayerData(id)
  }

  // Determine which episode to show based on URL, watch list, or default to first
  const episodeNumberFromUrl = searchParams.get('episode')
  if (playerState.episodes.length > 0 && !playerState.loading && id) {
    playerStoreActions.determineCurrentEpisode(id, episodeNumberFromUrl, userState.user)

    // Auto-add to watch list on load
    if (playerState.currentEpisode) {
      playerStoreActions.updateWatchList(id, playerState.currentEpisode.episodeNumber)
    }
  }

  // Handle Bunny Stream iframe time updates via Player.js library
  // Dependency on currentEpisode?.videoId ensures this runs when iframe becomes available
  const currentVideoId = playerState.currentEpisode?.videoId
  const currentEpisodeNumber = playerState.currentEpisode?.episodeNumber
  useEffect(() => {
    // Only run when we have a videoId (which means iframe is rendered)
    if (!currentVideoId || !iframeRef.current || typeof window === 'undefined') return

    const playerjs = (window as WindowWithPlayerJs).playerjs
    if (!playerjs) {
      console.warn('Player.js library not loaded')
      return
    }

    // Capture the videoId this player instance was created for
    // This prevents stale events from old players affecting new episodes
    const playerVideoId = currentVideoId
    const playerEpisodeNumber = currentEpisodeNumber

    const player = new playerjs.Player(iframeRef.current)
    playerInstanceRef.current = player

    player.on('ready', () => {
      console.log('Bunny Stream player ready for episode', playerEpisodeNumber)

      player.on('timeupdate', (data: { seconds: number; duration: number }) => {
        const currentTime = data.seconds
        
        // Get current state
        const currentPlayerState = playerStoreActions.getState()
        
        // Guard: Only process if this player is still for the current episode
        // This prevents stale timeupdate events from triggering for wrong episodes
        if (currentPlayerState.currentEpisode?.videoId !== playerVideoId) {
          return
        }
        
        // Use ref to get latest user state to avoid stale closure
        const currentUserState = userStateRef.current
        const canWatch = id && currentPlayerState.currentEpisode
          ? playerStoreActions.canWatchEpisodeUnrestricted(
              id,
              currentPlayerState.series?.uploaderId,
              currentPlayerState.currentEpisode.episodeNumber,
              currentUserState.user,
            )
          : false

        if (!canWatch && currentTime >= TIME_LIMIT) {
          player.pause()
          playerStoreActions.setShowPurchaseDialog(true)
        }
      })

      player.on('seeked', () => {
        player.getCurrentTime((currentTime: number) => {
          // Get current state
          const currentPlayerState = playerStoreActions.getState()
          
          // Guard: Only process if this player is still for the current episode
          if (currentPlayerState.currentEpisode?.videoId !== playerVideoId) {
            return
          }
          
          // Use ref to get latest user state to avoid stale closure
          const currentUserState = userStateRef.current
          const canWatch = id && currentPlayerState.currentEpisode
            ? playerStoreActions.canWatchEpisodeUnrestricted(
                id,
                currentPlayerState.series?.uploaderId,
                currentPlayerState.currentEpisode.episodeNumber,
                currentUserState.user,
              )
            : false

          if (!canWatch && currentTime >= TIME_LIMIT) {
            player.setCurrentTime(TIME_LIMIT - 0.5)
            player.pause()
            playerStoreActions.setShowPurchaseDialog(true)
          }
        })
      })
    })

    return () => {
      playerInstanceRef.current = null
    }
  }, [id, currentVideoId, currentEpisodeNumber]) // Re-run when seriesId or episode changes

  // Event handlers
  const handleEpisodeClick = (episode: Episode) => {
    if (id) {
      playerStoreActions.selectEpisode(episode, id)
      navigate(`/player/${id}?episode=${episode.episodeNumber}`, { replace: true })
    }
  }

  const handleTagClick = (tag: string) => {
    navigate(`/series?genre=${encodeURIComponent(tag)}`)
  }

  const handleFavoriteToggle = () => {
    if (id) {
      playerStoreActions.toggleFavorite(id, userState.user)
    }
  }

  const handlePurchase = () => {
    if (id) {
      playerStoreActions.handlePurchase(id, userState.user, t, navigate)
    }
  }

  const handleMouseMove = () => {
    playerStoreActions.showControlsTemporarily(controlsTimeoutRef)
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
  const isFavorited = id ? playerStoreActions.isSeriesFavorited(id, userState.user) : false

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
            iframeRef={iframeRef}
            isPlaying={playerState.isPlaying}
            showControls={playerState.showControls}
            currentTime={playerState.currentTime}
            duration={playerState.duration}
            volume={playerState.volume}
            playbackSpeed={playerState.playbackSpeed}
            showSpeedSelector={playerState.showSpeedSelector}
            onPlayPause={() => playerStoreActions.handlePlayPause(videoRef)}
            onTimeUpdate={() => playerStoreActions.handleTimeUpdate(videoRef)}
            onLoadedMetadata={() => playerStoreActions.handleLoadedMetadata(videoRef)}
            onProgressChange={(time) => playerStoreActions.handleProgressChange(videoRef, time)}
            onVolumeToggle={() => playerStoreActions.handleVolumeToggle(videoRef)}
            onSpeedChange={(speed) => playerStoreActions.handleSpeedChange(videoRef, speed)}
            onSpeedSelectorToggle={() => playerStoreActions.setShowSpeedSelector(!playerState.showSpeedSelector)}
            onFullscreen={() => playerStoreActions.handleFullscreen(videoRef)}
            onMouseMove={handleMouseMove}
            onMouseLeave={playerStoreActions.hideControlsIfPlaying}
          />

          <EpisodeMetadata
            series={playerState.series}
            currentEpisode={playerState.currentEpisode}
            selectedLanguage={playerState.selectedLanguage}
            isFavorited={isFavorited}
            onLanguageChange={playerStoreActions.setSelectedLanguage}
            onTagClick={handleTagClick}
            onFavoriteToggle={handleFavoriteToggle}
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

      <RecommendationSection />
      <NewReleasesSection />

      <SocialButtons favoritesText={t.player.addToFavorites} />

      <BottomBar />

      {loginModalState.isOpen && (
        <LoginModal
          onClose={loginModalStoreActions.close}
          onLoginSuccess={loginModalStoreActions.close}
        />
      )}

      {playerState.showPurchaseDialog && (
        <PurchaseDialog
          episodeCost={EPISODE_COST}
          onPurchase={handlePurchase}
          onCancel={playerStoreActions.cancelPurchase}
          loading={playerState.purchaseLoading}
        />
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
  iframeRef: React.RefObject<HTMLIFrameElement | null>
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
  iframeRef,
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
        ref={iframeRef}
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
  onLanguageChange: (language: string) => void
  onTagClick: (tag: string) => void
  onFavoriteToggle: () => void
}

const EpisodeMetadata: React.FC<EpisodeMetadataProps> = ({
  series,
  currentEpisode,
  selectedLanguage,
  isFavorited,
  onLanguageChange,
  onTagClick,
  onFavoriteToggle,
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
