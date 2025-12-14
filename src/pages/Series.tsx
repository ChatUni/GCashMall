import React, { useEffect, useRef } from 'react'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import './Series.css'

interface YouTubeWindow extends Window {
  YT?: {
    Player: new (
      elementId: string | HTMLElement,
      options: {
        videoId: string
        width?: string | number
        height?: string | number
        playerVars?: {
          autoplay?: 0 | 1
          modestbranding?: 0 | 1
          rel?: 0 | 1
        }
        events?: {
          onReady?: (event: { target: { playVideo: () => void } }) => void
        }
      }
    ) => { destroy: () => void }
  }
  onYouTubeIframeAPIReady?: () => void
}

declare const window: YouTubeWindow

const Series: React.FC = () => {
  const playerRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<{ destroy: () => void } | null>(null)
  // YouTube video ID extracted from https://www.youtube.com/watch?v=FgY912VvdYw
  const videoId = 'FgY912VvdYw'

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = initPlayer
    } else {
      initPlayer()
    }

    return () => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy()
      }
    }
  }, [])

  const initPlayer = () => {
    if (playerRef.current && window.YT && window.YT.Player) {
      ytPlayerRef.current = new window.YT.Player(playerRef.current, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            event.target.playVideo()
          },
        },
      })
    }
  }

  return (
    <div className="series-page">
      <TopBar />
      <main className="series-player-container">
        <div ref={playerRef} className="series-player" id="youtube-player" />
      </main>
      <BottomBar />
    </div>
  )
}

export default Series