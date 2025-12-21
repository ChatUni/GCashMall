import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import { useFavorites } from '../context/FavoritesContext'
import { useWatchHistory } from '../context/WatchHistoryContext'
import { useDownloads } from '../context/DownloadsContext'
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

const Player: React.FC = () => {
  const { t } = useLanguage()
  const { seriesId, episodeId } = useParams<{ seriesId: string; episodeId?: string }>()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Refs for carousel scrolling (same as Home page)
  const youMightLikeRef = useRef<HTMLDivElement>(null)
  const newReleasesRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [episodeRange, setEpisodeRange] = useState('1-40')
  const [showFavoritePopup, setShowFavoritePopup] = useState(false)
  const [showDownloadPopup, setShowDownloadPopup] = useState(false)
  
  // Use FavoritesContext
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()
  const isCurrentFavorite = isFavorite(seriesId || '1')
  
  // Use WatchHistoryContext
  const { addToHistory } = useWatchHistory()
  
  // Use DownloadsContext
  const { addDownload, isDownloaded } = useDownloads()

  // Mock series database (matching Home page data)
  const seriesDatabase: { [key: string]: { title: string; description: string; tags: string[]; poster: string } } = {
    'featured-1': {
      title: 'The Crown of Destiny',
      description: 'A captivating tale of love, power, and destiny. Follow the journey of a young princess as she navigates the treacherous waters of court politics while discovering her true calling.',
      tags: ['Drama', 'Romance', 'Fantasy'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster1.jpg'
    },
    '1': {
      title: 'Love in the City',
      description: 'A heartwarming romantic comedy set in the bustling streets of a modern metropolis. Follow the intertwined lives of young professionals as they navigate love, friendship, and career challenges.',
      tags: ['Romance', 'Comedy', 'Drama'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster2.jpg'
    },
    '2': {
      title: 'Mystery Manor',
      description: 'A gripping thriller that unfolds within the walls of an ancient mansion. Dark secrets, unexpected twists, and a mystery that will keep you guessing until the very end.',
      tags: ['Thriller', 'Mystery', 'Drama'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster3.jpg'
    },
    '3': {
      title: 'Comedy Central',
      description: 'A hilarious comedy series featuring a group of friends navigating the ups and downs of everyday life with humor and heart.',
      tags: ['Comedy', 'Slice of Life'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster4.jpg'
    },
    '4': {
      title: 'Action Heroes',
      description: 'High-octane action and adventure await in this thrilling series. Follow elite warriors as they battle against evil forces threatening the world.',
      tags: ['Action', 'Adventure', 'Sci-Fi'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster5.jpg'
    },
    '5': {
      title: 'Fantasy World',
      description: 'Enter a magical realm where dragons soar and wizards cast powerful spells. An epic fantasy adventure that will transport you to another world.',
      tags: ['Fantasy', 'Adventure', 'Magic'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster6.jpg'
    },
    '6': {
      title: 'Historical Drama',
      description: 'A sweeping historical drama set in ancient times. Experience the rise and fall of empires through the eyes of unforgettable characters.',
      tags: ['Drama', 'History'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster7.jpg'
    },
    '7': {
      title: 'Sci-Fi Adventures',
      description: 'Journey through space and time in this epic science fiction series. Explore distant galaxies and encounter alien civilizations.',
      tags: ['Sci-Fi', 'Adventure'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster8.jpg'
    },
    '8': {
      title: 'Horror Nights',
      description: 'A spine-chilling horror series that will keep you up at night. Face your deepest fears in this terrifying anthology.',
      tags: ['Horror', 'Thriller'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster9.jpg'
    },
    '9': {
      title: 'Fresh Start',
      description: 'A romantic journey of second chances and new beginnings. Watch as characters rediscover love and find their path to happiness.',
      tags: ['Drama', 'Romance'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster10.jpg'
    },
    '10': {
      title: 'New Horizons',
      description: 'An adventure series following explorers as they discover uncharted territories and face incredible challenges.',
      tags: ['Adventure', 'Drama'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster11.jpg'
    },
    '11': {
      title: 'Rising Stars',
      description: 'A romantic drama following aspiring artists as they chase their dreams and find love along the way.',
      tags: ['Romance', 'Drama'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster12.jpg'
    },
    '12': {
      title: 'Breaking Dawn',
      description: 'A fantasy epic about a chosen hero destined to save the world from an ancient evil awakening.',
      tags: ['Fantasy', 'Adventure'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster13.jpg'
    },
    '13': {
      title: 'First Light',
      description: 'A psychological thriller that blurs the line between reality and illusion. Nothing is as it seems.',
      tags: ['Thriller', 'Mystery'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster14.jpg'
    },
    '14': {
      title: 'New Chapter',
      description: 'A heartwarming comedy about starting over and finding joy in unexpected places.',
      tags: ['Comedy', 'Drama'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster15.jpg'
    },
    '15': {
      title: 'Debut Season',
      description: 'An action-packed sports drama following a rookie athlete on their journey to greatness.',
      tags: ['Action', 'Sports', 'Drama'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster16.jpg'
    },
    '16': {
      title: 'Premier Night',
      description: 'A dramatic series set in the world of theater, exploring the lives of performers behind the curtain.',
      tags: ['Drama', 'Arts'],
      poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster17.jpg'
    }
  }

  // Get series data based on ID, fallback to default
  const currentSeriesData = seriesDatabase[seriesId || '1'] || seriesDatabase['1']

  // Mock series data
  const mockSeries: Series = {
    id: parseInt(seriesId || '1'),
    title: currentSeriesData.title,
    description: currentSeriesData.description,
    tags: currentSeriesData.tags,
    language: 'English',
    episodes: Array.from({ length: 77 }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      title: `Episode ${i + 1}`,
      thumbnail: `https://via.placeholder.com/120x180?text=EP${i + 1}`,
      duration: `${Math.floor(Math.random() * 20) + 20}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
    })),
    poster: currentSeriesData.poster
  }

  const currentEpisode = parseInt(episodeId || '1')
  
  // Check if current episode is downloaded (after currentEpisode is defined)
  const isCurrentEpisodeDownloaded = isDownloaded(seriesId || '1', currentEpisode)

  // Mock recommended series (same as Home page)
  const recommendedSeries: RecommendedSeries[] = [
    { id: '1', title: 'Love in the City', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster2.jpg', tag: 'Romance' },
    { id: '2', title: 'Mystery Manor', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster3.jpg', tag: 'Thriller' },
    { id: '3', title: 'Comedy Central', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster4.jpg', tag: 'Comedy' },
    { id: '4', title: 'Action Heroes', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster5.jpg', tag: 'Action' },
    { id: '5', title: 'Fantasy World', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster6.jpg', tag: 'Fantasy' },
    { id: '6', title: 'Historical Drama', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster7.jpg', tag: 'Drama' },
    { id: '7', title: 'Sci-Fi Adventures', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster8.jpg', tag: 'Sci-Fi' },
    { id: '8', title: 'Horror Nights', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster9.jpg', tag: 'Horror' },
  ]

  // Mock new releases (same as Home page)
  const newReleases: RecommendedSeries[] = [
    { id: '9', title: 'Fresh Start', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster10.jpg', tag: 'Drama' },
    { id: '10', title: 'New Horizons', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster11.jpg', tag: 'Adventure' },
    { id: '11', title: 'Rising Stars', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster12.jpg', tag: 'Romance' },
    { id: '12', title: 'Breaking Dawn', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster13.jpg', tag: 'Fantasy' },
    { id: '13', title: 'First Light', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster14.jpg', tag: 'Thriller' },
    { id: '14', title: 'New Chapter', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster15.jpg', tag: 'Comedy' },
    { id: '15', title: 'Debut Season', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster16.jpg', tag: 'Action' },
    { id: '16', title: 'Premier Night', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster17.jpg', tag: 'Drama' },
  ]

  const playbackSpeeds = [0.25, 0.5, 1, 1.25, 1.5, 2, 3]
  const languages = ['English', '中文', 'Español', 'Français']

  // Get episodes for current range
  const getEpisodesInRange = () => {
    const [start, end] = episodeRange.split('-').map(Number)
    return mockSeries.episodes.filter(ep => ep.number >= start && ep.number <= end)
  }

  // Episode ranges
  const episodeRanges = ['1-40', '41-77']

  // Scroll to top when series changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [seriesId])

  // Record watch history when viewing an episode
  useEffect(() => {
    if (seriesId && currentSeriesData) {
      addToHistory({
        seriesId: seriesId,
        seriesTitle: currentSeriesData.title,
        episodeNumber: currentEpisode,
        poster: currentSeriesData.poster,
        tag: currentSeriesData.tags[0] || 'Drama'
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, currentEpisode])

  // Control visibility timeout
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    if (isPlaying && showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000)
    }
    return () => clearTimeout(timeout)
  }, [isPlaying, showControls])

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
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = pos * duration
    }
  }

  const handleVolumeToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
    }
  }

  const handleFullscreen = () => {
    const playerContainer = document.querySelector('.video-player-container')
    if (playerContainer) {
      if (!isFullscreen) {
        playerContainer.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
      setIsFullscreen(!isFullscreen)
    }
  }

  const handleEpisodeClick = (episodeNumber: number) => {
    navigate(`/player/${seriesId}/${episodeNumber}`)
  }

  const handleSeriesClick = (id: string) => {
    navigate(`/player/${id}`)
  }

  const handleTagClick = (tag: string) => {
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  const handleDownloadClick = () => {
    if (isCurrentEpisodeDownloaded) {
      // Already downloaded, could show a message or navigate to downloads
      console.log('Episode already downloaded')
    } else {
      // Show confirmation popup
      setShowDownloadPopup(true)
    }
  }

  const handleConfirmDownload = () => {
    addDownload({
      seriesId: seriesId || '1',
      seriesTitle: mockSeries.title,
      episodeNumber: currentEpisode,
      poster: mockSeries.poster,
      tag: mockSeries.tags[0] || 'Drama',
      fileSize: '1.2 GB' // Mock file size
    })
    setShowDownloadPopup(false)
  }

  const handleCancelDownload = () => {
    setShowDownloadPopup(false)
  }

  const handleShare = (platform: string) => {
    console.log(`Share to ${platform}`)
  }

  const handleFavoriteClick = () => {
    if (isCurrentFavorite) {
      // If already a favorite, remove it directly
      removeFavorite(seriesId || '1')
    } else {
      // Show confirmation popup
      setShowFavoritePopup(true)
    }
  }

  const handleConfirmFavorite = () => {
    addFavorite({
      id: seriesId || '1',
      title: mockSeries.title,
      poster: mockSeries.poster,
      tag: mockSeries.tags[0] || 'Drama'
    })
    setShowFavoritePopup(false)
  }

  const handleCancelFavorite = () => {
    setShowFavoritePopup(false)
  }

  const handleViewMoreClick = () => {
    navigate('/genre')
  }

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="player-page">
      <TopBar />
      
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/')}>
          GcashTV
        </span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-current">{mockSeries.title}</span>
      </nav>

      <main className="player-main">
        {/* Main Player Section */}
        <div className="player-content">
          <div className="player-left">
            {/* Video Player */}
            <div 
              className="video-player-container"
              onMouseMove={() => setShowControls(true)}
              onMouseLeave={() => isPlaying && setShowControls(false)}
            >
              <video
                ref={videoRef}
                className="video-player"
                poster={mockSeries.poster}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={handlePlayPause}
              >
                <source src="" type="video/mp4" />
              </video>

              {/* Player Controls */}
              <div className={`player-controls ${showControls ? 'visible' : ''}`}>
                <div className="progress-bar" onClick={handleProgressClick}>
                  <div 
                    className="progress-filled" 
                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                  />
                </div>

                <div className="controls-row">
                  <div className="controls-left">
                    <button className="control-btn play-btn" onClick={handlePlayPause}>
                      {isPlaying ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>

                    <button className="control-btn volume-btn" onClick={handleVolumeToggle}>
                      {isMuted ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      )}
                    </button>

                    <span className="time-display">
                      {formatTime(currentTime)} / {formatTime(duration || 0)}
                    </span>
                  </div>

                  <div className="controls-right">
                    <div className="speed-selector">
                      <select 
                        value={playbackSpeed} 
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                      >
                        {playbackSpeeds.map(speed => (
                          <option key={speed} value={speed}>{speed}x</option>
                        ))}
                      </select>
                    </div>

                    <button className="control-btn fullscreen-btn" onClick={handleFullscreen}>
                      {isFullscreen ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Episode Title & Metadata */}
            <div className="episode-metadata">
              <h1 className="episode-title">
                {mockSeries.title} - {t.player.episode} {currentEpisode.toString().padStart(2, '0')}
              </h1>

              <div className="metadata-row">
                <div className="language-selector">
                  <svg className="globe-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  <select 
                    value={selectedLanguage} 
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <button
                  className={`download-btn ${isCurrentEpisodeDownloaded ? 'downloaded' : ''}`}
                  onClick={handleDownloadClick}
                >
                  {isCurrentEpisodeDownloaded ? (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                  )}
                  <span>{isCurrentEpisodeDownloaded ? 'Downloaded' : t.player.download}</span>
                </button>

                <button
                  className={`favorite-btn ${isCurrentFavorite ? 'active' : ''}`}
                  onClick={handleFavoriteClick}
                  title={isCurrentFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg viewBox="0 0 24 24" fill={isCurrentFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
              </div>

              <div className="tag-list">
                {mockSeries.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="tag-pill"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Episode Description */}
            <div className="episode-description">
              <p>{mockSeries.description}</p>
            </div>
          </div>

          {/* Episode List Panel (Right Sidebar) */}
          <aside className="episode-list-panel">
            <h2 className="panel-title">{t.player.episodes}</h2>
            
            <div className="episode-range-selector">
              {episodeRanges.map(range => (
                <button
                  key={range}
                  className={`range-btn ${episodeRange === range ? 'active' : ''}`}
                  onClick={() => setEpisodeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>

            <div className="episode-grid">
              {getEpisodesInRange().map(episode => (
                <div
                  key={episode.id}
                  className={`episode-thumbnail ${episode.number === currentEpisode ? 'active' : ''}`}
                  onClick={() => handleEpisodeClick(episode.number)}
                >
                  <img src={episode.thumbnail} alt={episode.title} />
                  <span className="episode-number">EP {episode.number.toString().padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* Recommendation Section - You Might Like */}
        <section className="series-section">
          <div className="section-header">
            <h2 className="section-title">{t.home.youMightLike}</h2>
            <div className="carousel-controls">
              <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scrollCarousel(youMightLikeRef, 'left')}
                aria-label="Scroll left"
              />
              <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scrollCarousel(youMightLikeRef, 'right')}
                aria-label="Scroll right"
              />
            </div>
          </div>
          <div className="series-carousel" ref={youMightLikeRef}>
            {recommendedSeries
              .filter(series => series.id !== seriesId)
              .map(series => (
              <div
                key={series.id}
                className="series-card"
                onClick={() => handleSeriesClick(series.id)}
              >
                <div className="series-poster-container">
                  <img src={series.poster} alt={series.title} className="series-poster" />
                </div>
                <h3 className="series-title">{series.title}</h3>
                <span
                  className="series-tag"
                  onClick={(e) => { e.stopPropagation(); handleTagClick(series.tag); }}
                >
                  {series.tag}
                </span>
              </div>
            ))}
            {/* View More Arrow */}
            <div className="view-more-card" onClick={handleViewMoreClick}>
              <div className="view-more-content">
                <svg className="view-more-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="view-more-text">{t.home.viewMore}</span>
              </div>
            </div>
          </div>
        </section>

        {/* New Releases Section */}
        <section className="series-section">
          <div className="section-header">
            <h2 className="section-title">{t.home.newReleases}</h2>
            <div className="carousel-controls">
              <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scrollCarousel(newReleasesRef, 'left')}
                aria-label="Scroll left"
              />
              <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scrollCarousel(newReleasesRef, 'right')}
                aria-label="Scroll right"
              />
            </div>
          </div>
          <div className="series-carousel" ref={newReleasesRef}>
            {newReleases
              .filter(series => series.id !== seriesId)
              .map(series => (
              <div
                key={series.id}
                className="series-card"
                onClick={() => handleSeriesClick(series.id)}
              >
                <div className="series-poster-container">
                  <img src={series.poster} alt={series.title} className="series-poster" />
                </div>
                <h3 className="series-title">{series.title}</h3>
                <span
                  className="series-tag"
                  onClick={(e) => { e.stopPropagation(); handleTagClick(series.tag); }}
                >
                  {series.tag}
                </span>
              </div>
            ))}
            {/* View More Arrow */}
            <div className="view-more-card" onClick={handleViewMoreClick}>
              <div className="view-more-content">
                <svg className="view-more-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="view-more-text">{t.home.viewMore}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomBar />

      {/* Favorite Confirmation Popup */}
      {showFavoritePopup && (
        <div className="favorite-popup-overlay" onClick={handleCancelFavorite}>
          <div className="favorite-popup" onClick={(e) => e.stopPropagation()}>
            <div className="favorite-popup-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <h3 className="favorite-popup-title">Add to Favorites?</h3>
            <p className="favorite-popup-message">
              Add this series to your favorites? View it later in your account dashboard!
            </p>
            <div className="favorite-popup-buttons">
              <button className="favorite-popup-btn favorite-popup-btn-yes" onClick={handleConfirmFavorite}>
                Yes
              </button>
              <button className="favorite-popup-btn favorite-popup-btn-no" onClick={handleCancelFavorite}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Confirmation Popup */}
      {showDownloadPopup && (
        <div className="download-popup-overlay" onClick={handleCancelDownload}>
          <div className="download-popup" onClick={(e) => e.stopPropagation()}>
            <div className="download-popup-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </div>
            <h3 className="download-popup-title">Download Episode?</h3>
            <p className="download-popup-message">
              Download "{mockSeries.title} - Episode {currentEpisode.toString().padStart(2, '0')}" for offline viewing?
              View your downloads in your account dashboard!
            </p>
            <div className="download-popup-buttons">
              <button className="download-popup-btn download-popup-btn-yes" onClick={handleConfirmDownload}>
                Yes
              </button>
              <button className="download-popup-btn download-popup-btn-no" onClick={handleCancelDownload}>
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Player
