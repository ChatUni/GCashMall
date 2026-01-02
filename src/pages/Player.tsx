import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import RecommendationSection from '../components/RecommendationSection'
import NewReleasesSection from '../components/NewReleasesSection'
import LoginModal from '../components/LoginModal'
import { useLanguage } from '../context/LanguageContext'
import { apiGet } from '../utils/api'
import type { Series, Episode } from '../types'
import './Player.css'

const Player: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [series, setSeries] = useState<Series | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedSelector, setShowSpeedSelector] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [episodeRange, setEpisodeRange] = useState<[number, number]>([1, 40])
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isLoggedIn] = useState(false)
  const [hoveredEpisodeId, setHoveredEpisodeId] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playbackSpeeds = [0.25, 0.5, 1.0, 1.25, 1.5, 2.0, 3.0]

  useEffect(() => {
    if (id) {
      fetchSeriesData(id)
    }
  }, [id])

  useEffect(() => {
    const episodeId = searchParams.get('episode')
    if (episodeId && episodes.length > 0) {
      const episode = episodes.find((ep) => ep._id === episodeId)
      if (episode) {
        setCurrentEpisode(episode)
      }
    } else if (episodes.length > 0 && !currentEpisode) {
      setCurrentEpisode(episodes[0])
    }
  }, [searchParams, episodes, currentEpisode])

  const fetchSeriesData = async (seriesId: string) => {
    try {
      const [seriesResponse, episodesResponse] = await Promise.all([
        apiGet<Series>('series', { id: seriesId }),
        apiGet<Episode[]>('episodes', { seriesId }),
      ])

      if (seriesResponse.success && seriesResponse.data) {
        setSeries(seriesResponse.data)
      }
      if (episodesResponse.success && episodesResponse.data && episodesResponse.data.length > 0) {
        setEpisodes(episodesResponse.data)
        setCurrentEpisode(episodesResponse.data[0])
      }
    } catch (error) {
      console.error('Error fetching series data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeToggle = () => {
    if (videoRef.current) {
      const newVolume = volume === 0 ? 1 : 0
      videoRef.current.volume = newVolume
      setVolume(newVolume)
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
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
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

  const handleEpisodeClick = (episode: Episode) => {
    setCurrentEpisode(episode)
    navigate(`/player/${id}?episode=${episode._id}`, { replace: true })
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getEpisodeThumbnailUrl = (episode: Episode, isHovered: boolean): string => {
    if (episode.videoId) {
      const baseUrl = 'https://vz-918d4e7e-1fb.b-cdn.net'
      return isHovered
        ? `${baseUrl}/${episode.videoId}/preview.webp`
        : `${baseUrl}/${episode.videoId}/thumbnail.jpg`
    }
    return episode.thumbnail || ''
  }

  const getEpisodeRanges = (): [number, number][] => {
    const ranges: [number, number][] = []
    const rangeSize = 40
    for (let i = 0; i < episodes.length; i += rangeSize) {
      ranges.push([i + 1, Math.min(i + rangeSize, episodes.length)])
    }
    return ranges
  }

  if (loading) {
    return (
      <div className="player-page">
        <TopBar />
        <div className="loading">Loading...</div>
        <BottomBar />
      </div>
    )
  }

  if (!series || !currentEpisode) {
    return (
      <div className="player-page">
        <TopBar />
        <div className="error">Series not found</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="player-page">
      <TopBar isLoggedIn={isLoggedIn} />

      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/')}>
          {t.player.breadcrumbHome}
        </span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-current">{series.name}</span>
      </div>

      <main className="player-content">
        <div className="player-main">
          <div className="video-player">
            {currentEpisode.videoId ? (
              <iframe
                src={`https://iframe.mediadelivery.net/embed/${import.meta.env.VITE_BUNNY_LIBRARY_ID}/${currentEpisode.videoId}?autoplay=true&loop=false&muted=false&preload=true`}
                loading="lazy"
                style={{ border: 'none', width: '100%', height: '100%' }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div
                className="video-player-native"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
              >
                <video
                  ref={videoRef}
                  src={currentEpisode.videoUrl}
                  poster={currentEpisode.thumbnail}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={handlePlayPause}
                />

                <div className={`player-controls ${showControls ? 'visible' : ''}`}>
                  <button className="control-button play-pause" onClick={handlePlayPause}>
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

                  <input
                    type="range"
                    className="progress-bar"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleProgressChange}
                  />

                  <span className="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <button className="control-button volume" onClick={handleVolumeToggle}>
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

                  <div className="speed-selector">
                    <button
                      className="control-button speed"
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

                  <button className="control-button fullscreen" onClick={handleFullscreen}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="episode-metadata">
            <h1 className="episode-title">
              {series.name} - EP {currentEpisode.episodeNumber.toString().padStart(2, '0')}
            </h1>

            <div className="episode-language">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="language-select"
              >
                {series.languages?.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                )) || <option value="English">English</option>}
              </select>
            </div>

            <div className="episode-tags">
              {series.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="episode-tag"
                  onClick={() => navigate(`/series?genre=${encodeURIComponent(tag)}`)}
                >
                  {tag}
                </span>
              ))}
              {series.genre?.map((genre) => (
                <span
                  key={genre.id}
                  className="episode-tag"
                  onClick={() => navigate(`/series?genre=${encodeURIComponent(genre.name)}`)}
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <p className="episode-description">{currentEpisode.description || series.description}</p>
          </div>
        </div>

        <aside className="episode-sidebar">
          <h2 className="sidebar-title">{t.player.episodes}</h2>

          <div className="episode-range-selector">
            {getEpisodeRanges().map(([start, end]) => (
              <button
                key={`${start}-${end}`}
                className={`range-button ${
                  episodeRange[0] === start && episodeRange[1] === end ? 'active' : ''
                }`}
                onClick={() => setEpisodeRange([start, end])}
              >
                {start.toString().padStart(2, '0')}-{end.toString().padStart(2, '0')}
              </button>
            ))}
          </div>

          <div className="episode-grid">
            {episodes
              .filter(
                (ep) =>
                  ep.episodeNumber >= episodeRange[0] && ep.episodeNumber <= episodeRange[1]
              )
              .map((episode) => (
                <div
                  key={episode._id}
                  className={`episode-thumbnail ${
                    currentEpisode._id === episode._id ? 'active' : ''
                  }`}
                  onClick={() => handleEpisodeClick(episode)}
                  onMouseEnter={() => setHoveredEpisodeId(episode._id)}
                  onMouseLeave={() => setHoveredEpisodeId(null)}
                >
                  <img
                    src={getEpisodeThumbnailUrl(episode, hoveredEpisodeId === episode._id)}
                    alt={episode.title}
                  />
                  <span className="episode-number">
                    EP {episode.episodeNumber.toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
          </div>
        </aside>
      </main>

      <RecommendationSection />
      <NewReleasesSection />

      <div className="social-buttons">
        <button className="social-button" title="Facebook">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </button>
        <button className="social-button" title="Twitter">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
          </svg>
        </button>
        <button className="social-button" title="Pinterest">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
          </svg>
        </button>
        <button className="social-button" title="WhatsApp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
        <button className="social-button" title={t.player.addToFavorites}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <BottomBar />

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => setShowLoginModal(false)}
        />
      )}
    </div>
  )
}

export default Player