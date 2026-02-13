import React, { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { useVideoFeedStore, useUserStore, loginModalStoreActions, videoFeedStoreActions } from '../../stores'
import { addToFavorites, removeFromFavorites } from '../../services/dataService'
import { isLoggedIn } from '../../utils/api'
import type { Series } from '../../types'
import './VideoCard.css'

interface VideoCardProps {
  series: Series
  isActive: boolean
  index: number
}

const VideoCard: React.FC<VideoCardProps> = ({ series, isActive, index }) => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { isMuted } = useVideoFeedStore()
  const userState = useUserStore()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPlayIcon, setShowPlayIcon] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  const lastTapTime = useRef<number>(0)

  // Get video URL - prefer series videoId, fallback to first episode
  const getVideoUrl = () => {
    const libraryId = import.meta.env.VITE_BUNNY_LIBRARY_ID
    if (series.videoId) {
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${series.videoId}?autoplay=false&loop=true&muted=${isMuted}&preload=true`
    }
    if (series.episodes && series.episodes.length > 0 && series.episodes[0].videoId) {
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${series.episodes[0].videoId}?autoplay=false&loop=true&muted=${isMuted}&preload=true`
    }
    return null
  }

  const videoUrl = getVideoUrl()

  // Check if series is favorited
  const isFavorited = () => {
    if (!userState.user?.favorites) return false
    return userState.user.favorites.some(fav => String(fav.seriesId) === String(series._id))
  }

  // Handle video play/pause based on active state
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {
          // Autoplay might be blocked
          setIsPlaying(false)
        })
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        setIsPlaying(false)
      }
    }
  }, [isActive])

  // Handle mute state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  // Handle tap to pause/play
  const handleVideoTap = () => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapTime.current
    
    // Double tap detection (within 300ms)
    if (timeSinceLastTap < 300) {
      handleDoubleTap()
      lastTapTime.current = 0
      return
    }
    
    lastTapTime.current = now
    
    // Single tap - toggle play/pause after a short delay
    setTimeout(() => {
      if (Date.now() - lastTapTime.current >= 280) {
        togglePlayPause()
      }
    }, 300)
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
        setShowPlayIcon(true)
        setTimeout(() => setShowPlayIcon(false), 1000)
      } else {
        videoRef.current.play()
        setIsPlaying(true)
      }
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
        await addToFavorites(series._id)
      } catch (error) {
        console.error('Failed to add to favorites:', error)
      }
    }
  }

  // Handle favorite button click
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }
    
    try {
      if (isFavorited()) {
        await removeFromFavorites(series._id)
      } else {
        await addToFavorites(series._id)
        setShowHeartAnimation(true)
        setTimeout(() => setShowHeartAnimation(false), 1000)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  // Handle share button click
  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const shareUrl = `${window.location.origin}/player/${series._id}`
    const shareData = {
      title: series.name,
      text: series.description,
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
  const handleWatchClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/player/${series._id}`)
  }

  // Handle series avatar click
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/player/${series._id}`)
  }

  // Handle tag click
  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  // Toggle mute
  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    videoFeedStoreActions.toggleMute()
  }

  return (
    <div className="video-card" data-index={index}>
      {/* Video Player */}
      <div className="video-card-player" onClick={handleVideoTap}>
        {videoUrl ? (
          <iframe
            src={videoUrl}
            className="video-card-iframe"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="video-card-placeholder">
            <img src={series.cover} alt={series.name} className="video-card-cover" />
          </div>
        )}
        
        {/* Play Icon Overlay */}
        {showPlayIcon && (
          <div className="video-card-play-overlay">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        )}
        
        {/* Heart Animation */}
        {showHeartAnimation && (
          <div className="video-card-heart-animation">
            <svg width="100" height="100" viewBox="0 0 24 24">
              <path
                fill="#ef4444"
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Mute Button */}
      <button className="video-card-mute" onClick={handleMuteToggle}>
        {isMuted ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>

      {/* Series Info Overlay */}
      <div className="video-card-info">
        <h2 className="video-card-title" onClick={() => navigate(`/player/${series._id}`)}>
          {series.name}
        </h2>
        
        <p 
          className={`video-card-description ${isDescriptionExpanded ? 'expanded' : ''}`}
          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        >
          {series.description}
        </p>
        
        <div className="video-card-tags">
          {series.tags?.slice(0, 3).map((tag, idx) => (
            <span 
              key={idx} 
              className="video-card-tag"
              onClick={(e) => handleTagClick(tag, e)}
            >
              #{tag}
            </span>
          ))}
          {series.genre?.slice(0, 2).map((genre) => (
            <span 
              key={genre._id} 
              className="video-card-tag"
              onClick={(e) => handleTagClick(genre.name, e)}
            >
              #{genre.name}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="video-card-actions">
        {/* Series Avatar */}
        <button className="video-card-avatar" onClick={handleAvatarClick}>
          <img src={series.cover} alt={series.name} />
        </button>

        {/* Favorite Button */}
        <button 
          className={`video-card-action-btn ${isFavorited() ? 'active' : ''}`}
          onClick={handleFavoriteClick}
        >
          <svg viewBox="0 0 24 24" width="28" height="28">
            <path
              fill={isFavorited() ? '#ef4444' : 'none'}
              stroke={isFavorited() ? '#ef4444' : 'currentColor'}
              strokeWidth="2"
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
          <span className="video-card-action-label">{(t.home as Record<string, string>).like || 'Like'}</span>
        </button>

        {/* Share Button */}
        <button className="video-card-action-btn" onClick={handleShareClick}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="video-card-action-label">{(t.home as Record<string, string>).share || 'Share'}</span>
        </button>

        {/* Watch Button */}
        <button className="video-card-action-btn" onClick={handleWatchClick}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          <span className="video-card-action-label">{(t.home as Record<string, string>).watch || 'Watch'}</span>
        </button>
      </div>
    </div>
  )
}

export default VideoCard
