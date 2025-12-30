import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import { useLanguage } from '../context/LanguageContext'
import './Player.css'

interface Episode {
  id: number
  number: number
  title: string
  thumbnail: string
  duration: string
}

interface Series {
  id: number
  title: string
  description: string
  tags: string[]
  language: string
  episodes: Episode[]
  poster: string
}

interface RecommendedSeries {
  id: string
  title: string
  poster: string
  tag: string
}

// Mock series database
const seriesDatabase: Record<string, Series> = {
  'featured-1': {
    id: 1,
    title: 'The Secret Garden',
    description: 'A mysterious garden holds the key to healing broken hearts and mending family bonds. Follow Mary as she discovers the magic within and transforms not just the garden, but everyone around her.',
    tags: ['Romance', 'Drama', 'Fantasy'],
    language: 'English',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster1_abc123.jpg',
    episodes: [],
  },
  '1': {
    id: 1,
    title: 'Love in the City',
    description: 'A heartwarming romance set in the bustling streets of a modern metropolis. Two strangers from different worlds find their paths crossing in unexpected ways.',
    tags: ['Romance', 'Teenagers'],
    language: 'English',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster2_ywfbxe.jpg',
    episodes: [],
  },
  '2': {
    id: 2,
    title: 'Dark Secrets',
    description: 'A gripping thriller that keeps you on the edge of your seat. When a detective uncovers a web of lies, nothing is as it seems.',
    tags: ['Thriller', 'Mystery & Suspense'],
    language: 'English',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster3_abc123.jpg',
    episodes: [],
  },
  '3': {
    id: 3,
    title: 'The Last Kingdom',
    description: 'An epic tale of warriors, honor, and the fight for survival in a world torn apart by war.',
    tags: ['Action', 'Adventure'],
    language: 'English',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster4_def456.jpg',
    episodes: [],
  },
  '4': {
    id: 4,
    title: 'Laugh Out Loud',
    description: 'A hilarious comedy series that will have you laughing from start to finish. Follow the misadventures of a quirky group of friends.',
    tags: ['Comedy', 'Humor'],
    language: 'English',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster5_ghi789.jpg',
    episodes: [],
  },
}

// Generate episodes for each series
Object.keys(seriesDatabase).forEach((key) => {
  const episodes: Episode[] = []
  for (let i = 1; i <= 77; i++) {
    episodes.push({
      id: i,
      number: i,
      title: `Episode ${i}`,
      thumbnail: `https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/ep${i}_thumb.jpg`,
      duration: `${Math.floor(Math.random() * 20) + 20}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
    })
  }
  seriesDatabase[key].episodes = episodes
})

// Mock recommended series
const recommendedSeries: RecommendedSeries[] = [
  { id: '5', title: 'Eternal Love', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster6_jkl012.jpg', tag: 'Romance' },
  { id: '6', title: 'Time Traveler', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster7_mno345.jpg', tag: 'Sci-Fi' },
  { id: '7', title: 'The Haunting', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster8_pqr678.jpg', tag: 'Horror' },
  { id: '8', title: 'Royal Princess', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster9_stu901.jpg', tag: 'Drama' },
  { id: '9', title: 'Revenge of the Fallen', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster10_vwx234.jpg', tag: 'Action' },
  { id: '10', title: 'The Miracle Doctor', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster11_yza567.jpg', tag: 'Drama' },
  { id: '11', title: 'Hidden Identity', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster12_bcd890.jpg', tag: 'Thriller' },
  { id: '12', title: 'Celebrity Life', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster13_efg123.jpg', tag: 'Drama' },
]

const newReleases: RecommendedSeries[] = [
  { id: '13', title: 'The Substitute', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster14_hij456.jpg', tag: 'Romance' },
  { id: '14', title: 'Security Guard Hero', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster15_klm789.jpg', tag: 'Action' },
  { id: '15', title: 'Crime Investigation', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster16_nop012.jpg', tag: 'Thriller' },
  { id: '16', title: 'Teen Dreams', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster17_qrs345.jpg', tag: 'Comedy' },
  { id: '17', title: 'Fantasy World', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster18_tuv678.jpg', tag: 'Fantasy' },
  { id: '18', title: 'Time Loop', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster19_wxy901.jpg', tag: 'Sci-Fi' },
  { id: '19', title: 'The Healer', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster20_zab234.jpg', tag: 'Drama' },
  { id: '20', title: 'Adventure Quest', poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster21_cde567.jpg', tag: 'Adventure' },
]

const Player: React.FC = () => {
  const { id: seriesId, episodeId } = useParams<{ id: string; episodeId?: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedSelector, setShowSpeedSelector] = useState(false)

  // UI state
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [episodeRange, setEpisodeRange] = useState('1-40')
  const [showFavoritePopup, setShowFavoritePopup] = useState(false)
  const [showDownloadPopup, setShowDownloadPopup] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isLoggedIn] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recommendationsRef = useRef<HTMLDivElement>(null)
  const newReleasesRef = useRef<HTMLDivElement>(null)

  const playbackSpeeds = [0.25, 0.5, 1, 1.25, 1.5, 2, 3]
  const languages = ['English', '中文', 'Español', 'Français']

  // Get series data
  const series = seriesId ? seriesDatabase[seriesId] : null
  const currentEpisodeNumber = episodeId ? parseInt(episodeId) : 1
  const currentEpisode = series?.episodes.find((ep) => ep.number === currentEpisodeNumber) || series?.episodes[0]

  // Filter recommendations to exclude current series
  const filteredRecommendations = useMemo(() => {
    return recommendedSeries.filter((s) => s.id !== seriesId)
  }, [seriesId])

  const filteredNewReleases = useMemo(() => {
    return newReleases.filter((s) => s.id !== seriesId)
  }, [seriesId])

  // Scroll to top on series change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [seriesId])

  // Video player handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const time = percent * duration
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeToggle = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
      setShowSpeedSelector(false)
    }
  }

  const handleFullscreen = () => {
    if (playerContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
        setIsFullscreen(false)
      } else {
        playerContainerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Episode handlers
  const handleEpisodeClick = (episodeNumber: number) => {
    navigate(`/player/${seriesId}/${episodeNumber}`)
  }

  const getEpisodeRanges = (): string[] => {
    if (!series) return []
    const ranges: string[] = []
    const rangeSize = 40
    for (let i = 0; i < series.episodes.length; i += rangeSize) {
      const start = i + 1
      const end = Math.min(i + rangeSize, series.episodes.length)
      ranges.push(`${start}-${end}`)
    }
    return ranges
  }

  const getFilteredEpisodes = () => {
    if (!series) return []
    const [start, end] = episodeRange.split('-').map(Number)
    return series.episodes.filter((ep) => ep.number >= start && ep.number <= end)
  }

  // Action handlers
  const handleDownloadClick = () => {
    if (isLoggedIn) {
      setShowDownloadPopup(true)
    } else {
      setShowLoginModal(true)
    }
  }

  const handleFavoriteClick = () => {
    if (isLoggedIn) {
      setShowFavoritePopup(true)
    } else {
      setShowLoginModal(true)
    }
  }

  const confirmDownload = () => {
    setIsDownloaded(true)
    setShowDownloadPopup(false)
  }

  const confirmFavorite = () => {
    setIsFavorite(!isFavorite)
    setShowFavoritePopup(false)
  }

  // Tag click handler
  const handleTagClick = (tag: string) => {
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  // Carousel scroll handlers
  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  // Series card click handler
  const handleSeriesClick = (id: string) => {
    navigate(`/player/${id}`)
  }

  if (!series || !currentEpisode) {
    return (
      <div className="player-page">
        <TopBar />
        <div className="player-error">Series not found</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="player-page">
      <TopBar isLoggedIn={isLoggedIn} />

      {/* Breadcrumb */}
      <div className="player-breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/')}>
          {t.player.breadcrumbHome}
        </span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-current">{series.title}</span>
      </div>

      <div className="player-main-container">
        {/* Main Content */}
        <div className="player-content">
          {/* Left Section - Video Player */}
          <div className="player-left">
            <div
              ref={playerContainerRef}
              className="video-container"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <video
                ref={videoRef}
                poster={series.poster}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={handlePlayPause}
              />

              {/* Player Controls Overlay */}
              <div className={`player-controls-overlay ${showControls ? 'visible' : ''}`}>
                {/* Progress Bar */}
                <div className="progress-bar-container" onClick={handleProgressClick}>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                    />
                  </div>
                </div>

                {/* Controls Row */}
                <div className="controls-row">
                  <div className="controls-left">
                    <button className="control-btn play-btn" onClick={handlePlayPause}>
                      {isPlaying ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                      ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      )}
                    </button>

                    <button className="control-btn volume-btn" onClick={handleVolumeToggle}>
                      {isMuted || volume === 0 ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45a4.5 4.5 0 0 0 .05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8c1.48-.73 2.5-2.25 2.5-4zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </button>

                    <span className="time-display">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="controls-right">
                    <div className="speed-selector">
                      <button
                        className="control-btn speed-btn"
                        onClick={() => setShowSpeedSelector(!showSpeedSelector)}
                      >
                        {playbackSpeed}x
                      </button>
                      {showSpeedSelector && (
                        <div className="speed-options">
                          {playbackSpeeds.map((speed) => (
                            <button
                              key={speed}
                              className={`speed-option ${speed === playbackSpeed ? 'active' : ''}`}
                              onClick={() => handleSpeedChange(speed)}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button className="control-btn fullscreen-btn" onClick={handleFullscreen}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Episode Metadata */}
            <div className="episode-metadata">
              <h1 className="episode-title">
                {series.title} - Episode {currentEpisode.number.toString().padStart(2, '0')}
              </h1>

              <div className="metadata-row">
                {/* Language Selector */}
                <div className="language-selector">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="language-select"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Download Button */}
                <button
                  className={`download-btn ${isDownloaded ? 'downloaded' : ''}`}
                  onClick={handleDownloadClick}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {t.player.download}
                </button>

                {/* Favorite Button */}
                <button
                  className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                  onClick={handleFavoriteClick}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>

              {/* Tag List */}
              <div className="tag-list">
                {series.tags.map((tag, index) => (
                  <button
                    key={index}
                    className="tag-pill"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Episode Description */}
              <p className="episode-description">{series.description}</p>
            </div>
          </div>

          {/* Right Section - Episode List Panel */}
          <aside className="episode-panel">
            <h2 className="panel-title">{t.player.episodes}</h2>

            {/* Episode Range Selector */}
            <div className="episode-range-selector">
              {getEpisodeRanges().map((range) => (
                <button
                  key={range}
                  className={`range-btn ${episodeRange === range ? 'active' : ''}`}
                  onClick={() => setEpisodeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Episode Grid */}
            <div className="episode-grid">
              {getFilteredEpisodes().map((episode) => (
                <div
                  key={episode.id}
                  className={`episode-thumb ${currentEpisode.number === episode.number ? 'active' : ''}`}
                  onClick={() => handleEpisodeClick(episode.number)}
                >
                  <img src={episode.thumbnail} alt={episode.title} />
                  <span className="episode-badge">EP {episode.number.toString().padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* Recommendation Carousels */}
        <section className="recommendation-section">
          <div className="section-header">
            <h2 className="section-title">{t.home.youMightLike}</h2>
            <div className="carousel-controls">
              <button
                className="carousel-arrow left"
                onClick={() => scrollCarousel(recommendationsRef, 'left')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
              </button>
              <button
                className="carousel-arrow right"
                onClick={() => scrollCarousel(recommendationsRef, 'right')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="carousel" ref={recommendationsRef}>
            {filteredRecommendations.map((item) => (
              <div
                key={item.id}
                className="series-card"
                onClick={() => handleSeriesClick(item.id)}
              >
                <div className="series-poster">
                  <img src={item.poster} alt={item.title} />
                </div>
                <h3 className="series-title">{item.title}</h3>
                <span className="series-tag">{item.tag}</span>
              </div>
            ))}
            <div className="view-more-card" onClick={() => navigate('/genre')}>
              <div className="view-more-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </div>
              <span className="view-more-text">{t.home.viewMore}</span>
            </div>
          </div>
        </section>

        <section className="recommendation-section">
          <div className="section-header">
            <h2 className="section-title">{t.home.newReleases}</h2>
            <div className="carousel-controls">
              <button
                className="carousel-arrow left"
                onClick={() => scrollCarousel(newReleasesRef, 'left')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
              </button>
              <button
                className="carousel-arrow right"
                onClick={() => scrollCarousel(newReleasesRef, 'right')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="carousel" ref={newReleasesRef}>
            {filteredNewReleases.map((item) => (
              <div
                key={item.id}
                className="series-card"
                onClick={() => handleSeriesClick(item.id)}
              >
                <div className="series-poster">
                  <img src={item.poster} alt={item.title} />
                </div>
                <h3 className="series-title">{item.title}</h3>
                <span className="series-tag">{item.tag}</span>
              </div>
            ))}
            <div className="view-more-card" onClick={() => navigate('/genre')}>
              <div className="view-more-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </div>
              <span className="view-more-text">{t.home.viewMore}</span>
            </div>
          </div>
        </section>
      </div>

      <BottomBar />

      {/* Favorite Confirmation Popup */}
      {showFavoritePopup && (
        <div className="popup-overlay" onClick={() => setShowFavoritePopup(false)}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon favorite">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="popup-title">{t.player.addToFavorites}?</h3>
            <p className="popup-message">
              {isFavorite
                ? 'Remove this series from your favorites?'
                : 'Add this series to your favorites list?'}
            </p>
            <div className="popup-buttons">
              <button className="popup-btn confirm" onClick={confirmFavorite}>
                Yes
              </button>
              <button className="popup-btn cancel" onClick={() => setShowFavoritePopup(false)}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Confirmation Popup */}
      {showDownloadPopup && (
        <div className="popup-overlay" onClick={() => setShowDownloadPopup(false)}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon download">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h3 className="popup-title">{t.player.download} Episode?</h3>
            <p className="popup-message">
              Download "{series.title} - Episode {currentEpisode.number.toString().padStart(2, '0')}" for offline viewing?
            </p>
            <div className="popup-buttons">
              <button className="popup-btn confirm" onClick={confirmDownload}>
                Yes
              </button>
              <button className="popup-btn cancel" onClick={() => setShowDownloadPopup(false)}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => setShowLoginModal(false)}
        />
      )}
    </div>
  )
}

export default Player