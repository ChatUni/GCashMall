import { createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { t } from '../../stores/languageStore'
import { videoFeedStore, loginModalStoreActions, videoFeedStoreActions } from '../../stores'
import { accountStore } from '../../stores/accountStore'
import { addToFavorites, removeFromFavorites } from '../../services/dataService'
import { isLoggedIn } from '../../utils/api'
import type { Series } from '../../types'
import './VideoCard.css'

interface VideoCardProps {
  series: Series
  isActive: boolean
  index: number
}

const BUNNY_LIBRARY_ID = import.meta.env.VITE_BUNNY_LIBRARY_ID

// Get video ID from a series - prefer series videoId, fallback to first episode
const getVideoIdFromSeries = (series: Series) => {
  if (series.videoId) return series.videoId
  if (series.episodes && series.episodes.length > 0 && series.episodes[0].videoId) {
    return series.episodes[0].videoId
  }
  return null
}

// Build iframe src URL for the given video
const buildIframeSrc = (videoId: string | null, isMuted: boolean) => {
  if (!videoId) return null
  return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?autoplay=true&loop=true&muted=${isMuted}&preload=true`
}

const VideoCard = (props: VideoCardProps) => {
  const navigate = useNavigate()

  let lastTapTime = 0
  let iframeRef: HTMLIFrameElement | undefined
  let iframeLoadTimer: ReturnType<typeof setTimeout> | undefined
  const [showPlayIcon, setShowPlayIcon] = createSignal(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = createSignal(false)
  const [showHeartAnimation, setShowHeartAnimation] = createSignal(false)
  const [isPaused, setIsPaused] = createSignal(false)
  const [videoPlaying, setVideoPlaying] = createSignal(false)

  // Derive whether iframe should be active
  const shouldPlay = () => props.isActive && !isPaused()

  // Derive video URL
  const videoUrl = () => {
    const videoId = getVideoIdFromSeries(props.series)
    return buildIframeSrc(videoId, videoFeedStore.isMuted)
  }

  // Check if series is favorited
  const isFavorited = () => {
    if (!accountStore.user?.favorites) return false
    return accountStore.user.favorites.some(
      (fav) => String(fav.seriesId) === String(props.series._id),
    )
  }

  // Listen for Bunny player postMessage events to detect when video is actually playing
  const handleBunnyMessage = (event: MessageEvent) => {
    if (!iframeRef || event.source !== iframeRef.contentWindow) return

    try {
      const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      // Bunny player fires 'play'/'playing' when video playback starts
      if (raw.event === 'play' || raw.event === 'playing') {
        clearTimeout(iframeLoadTimer)
        setVideoPlaying(true)
      }
    } catch {
      // Ignore non-JSON messages
    }
  }

  // Called when iframe finishes loading - use as fallback with delay
  const handleIframeLoad = () => {
    if (!shouldPlay()) return
    // Wait for video to start playing before removing cover.
    // The postMessage listener may fire first and clear this timer.
    clearTimeout(iframeLoadTimer)
    iframeLoadTimer = setTimeout(() => {
      if (shouldPlay()) setVideoPlaying(true)
    }, 1500)
  }

  onMount(() => {
    window.addEventListener('message', handleBunnyMessage)
  })

  onCleanup(() => {
    window.removeEventListener('message', handleBunnyMessage)
    clearTimeout(iframeLoadTimer)
  })

  // Reset pause state when video becomes active (swipe to this video)
  // Separate effect: only reads isActive, only writes isPaused
  createEffect(() => {
    if (props.isActive) {
      setIsPaused(false)
    }
  })

  // Set iframe src when shouldPlay or videoUrl changes
  // Separate effect: only reads shouldPlay/videoUrl, only writes videoPlaying/iframeRef.src
  createEffect(() => {
    const playing = shouldPlay()
    const src = videoUrl()

    if (playing && iframeRef && src) {
      clearTimeout(iframeLoadTimer)
      setVideoPlaying(false)
      iframeRef.src = src
    } else if (iframeRef) {
      clearTimeout(iframeLoadTimer)
      iframeRef.removeAttribute('src')
      setVideoPlaying(false)
    }
  })

  // Handle tap to pause/play
  const handleVideoTap = () => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapTime

    // Double tap detection (within 300ms)
    if (timeSinceLastTap < 300) {
      handleDoubleTap()
      lastTapTime = 0
      return
    }

    lastTapTime = now

    // Single tap - toggle play/pause after a short delay
    setTimeout(() => {
      if (Date.now() - lastTapTime >= 280) {
        togglePlayPause()
      }
    }, 300)
  }

  const togglePlayPause = () => {
    if (isPaused()) {
      setIsPaused(false)
    } else {
      setIsPaused(true)
      setShowPlayIcon(true)
      setTimeout(() => setShowPlayIcon(false), 1000)
    }
  }

  // Handle double tap to favorite
  const handleDoubleTap = async () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }

    // Show heart animation
    setShowHeartAnimation(true)
    setTimeout(() => setShowHeartAnimation(false), 1000)

    // Add to favorites if not already favorited
    if (!isFavorited()) {
      try {
        await addToFavorites(props.series._id)
      } catch (error) {
        console.error('Failed to add to favorites:', error)
      }
    }
  }

  // Handle favorite button click
  const handleFavoriteClick = async (e: MouseEvent) => {
    e.stopPropagation()

    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }

    try {
      if (isFavorited()) {
        await removeFromFavorites(props.series._id)
      } else {
        await addToFavorites(props.series._id)
        setShowHeartAnimation(true)
        setTimeout(() => setShowHeartAnimation(false), 1000)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  // Handle share button click
  const handleShareClick = async (e: MouseEvent) => {
    e.stopPropagation()

    const shareUrl = `${window.location.origin}/player/${props.series._id}`
    const shareData = {
      title: props.series.name,
      text: props.series.description,
      url: shareUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        // User cancelled or share failed
        console.log('Share cancelled or failed')
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        // Could show a toast here
      } catch (error) {
        console.error('Failed to copy link:', error)
      }
    }
  }

  // Handle watch button click
  const handleWatchClick = (e: MouseEvent) => {
    e.stopPropagation()
    navigate(`/player/${props.series._id}`)
  }

  // Handle series avatar click
  const handleAvatarClick = (e: MouseEvent) => {
    e.stopPropagation()
    navigate(`/player/${props.series._id}`)
  }

  // Handle tag click
  const handleTagClick = (tag: string, e: MouseEvent) => {
    e.stopPropagation()
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  // Toggle mute
  const handleMuteToggle = (e: MouseEvent) => {
    e.stopPropagation()
    videoFeedStoreActions.toggleMute()
  }

  return (
    <div class="video-card" data-index={props.index}>
      {/* Video Player / Cover */}
      <div class="video-card-player" onClick={handleVideoTap}>
        {/* Cover image shown when iframe is not active or not yet loaded */}
        <Show when={!shouldPlay() || !videoPlaying()}>
          <div class="video-card-placeholder">
            <img src={props.series.cover} alt={props.series.name} class="video-card-cover" />
            {/* Loading indicator shown while video is loading after scroll/swipe */}
            <Show when={shouldPlay() && !videoPlaying()}>
              <div class="video-card-loading-overlay">
                <div class="video-card-loading-spinner" />
              </div>
            </Show>
          </div>
        </Show>

        {/* Iframe - always rendered, src set imperatively via createEffect */}
        <iframe
          ref={iframeRef}
          class="video-card-iframe"
          style={{ display: shouldPlay() ? 'block' : 'none' }}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
          onLoad={handleIframeLoad}
        />

        {/* Play Icon Overlay */}
        <Show when={showPlayIcon()}>
          <div class="video-card-play-overlay">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </Show>

        {/* Heart Animation */}
        <Show when={showHeartAnimation()}>
          <div class="video-card-heart-animation">
            <svg width="100" height="100" viewBox="0 0 24 24">
              <path
                fill="#ef4444"
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
          </div>
        </Show>
      </div>

      {/* Mute Button */}
      <button class="video-card-mute" onClick={handleMuteToggle}>
        <Show
          when={videoFeedStore.isMuted}
          fallback={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          }
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        </Show>
      </button>

      {/* Series Info Overlay */}
      <div class="video-card-info">
        <h2 class="video-card-title" onClick={() => navigate(`/player/${props.series._id}`)}>
          {props.series.name}
        </h2>

        <p
          class={`video-card-description ${isDescriptionExpanded() ? 'expanded' : ''}`}
          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded())}
        >
          {props.series.description}
        </p>

        <div class="video-card-tags">
          <For each={props.series.tags?.slice(0, 3)}>
            {(tag) => (
              <span
                class="video-card-tag"
                onClick={(e) => handleTagClick(tag, e)}
              >
                #{tag}
              </span>
            )}
          </For>
          <For each={props.series.genre?.slice(0, 2)}>
            {(genre) => (
              <span
                class="video-card-tag"
                onClick={(e) => handleTagClick(genre.name, e)}
              >
                #{genre.name}
              </span>
            )}
          </For>
        </div>
      </div>

      {/* Action Buttons */}
      <div class="video-card-actions">
        {/* Series Avatar */}
        <button class="video-card-avatar" onClick={handleAvatarClick}>
          <img src={props.series.cover} alt={props.series.name} />
        </button>

        {/* Favorite Button */}
        <button
          class={`video-card-action-btn ${isFavorited() ? 'active' : ''}`}
          onClick={handleFavoriteClick}
        >
          <svg viewBox="0 0 24 24" width="28" height="28">
            <path
              fill={isFavorited() ? '#ef4444' : 'none'}
              stroke={isFavorited() ? '#ef4444' : 'currentColor'}
              stroke-width="2"
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
          <span class="video-card-action-label">
            {(t().home as Record<string, string>).like || 'Like'}
          </span>
        </button>

        {/* Share Button */}
        <button class="video-card-action-btn" onClick={handleShareClick}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span class="video-card-action-label">
            {(t().home as Record<string, string>).share || 'Share'}
          </span>
        </button>

        {/* Watch Button */}
        <button class="video-card-action-btn" onClick={handleWatchClick}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          <span class="video-card-action-label">
            {(t().home as Record<string, string>).watch || 'Watch'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default VideoCard
