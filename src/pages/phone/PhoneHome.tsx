import React, { useRef, useEffect, useCallback } from 'react'
import { useVideoFeedStore, useLoginModalStore, loginModalStoreActions, userStoreActions } from '../../stores'
import { accountStoreActions } from '../../stores/accountStore'
import { fetchVideoFeed, loadMoreVideos } from '../../services/dataService'
import VideoCard from '../../components/phone/VideoCard'
import LoginModal from '../../components/LoginModal'
import PhoneNavBar from '../../components/phone/PhoneNavBar'
import './PhoneHome.css'

// Initialize data fetch outside component
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchVideoFeed(1)
  }
}

const PhoneHome: React.FC = () => {
  const { videos, currentIndex, loading, hasMore } = useVideoFeedStore()
  const loginModalState = useLoginModalStore()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Initialize data on first render
  initializeData()

  // Handle scroll to detect current video
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const scrollTop = container.scrollTop
    const cardHeight = container.clientHeight
    const newIndex = Math.round(scrollTop / cardHeight)
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      // Update current index in store
      import('../../stores').then(({ videoFeedStoreActions }) => {
        videoFeedStoreActions.setCurrentIndex(newIndex)
      })
    }
    
    // Load more when approaching end
    if (newIndex >= videos.length - 3 && hasMore && !loading) {
      loadMoreVideos()
    }
  }, [currentIndex, videos.length, hasMore, loading])

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Set up intersection observer for video visibility
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10)
            import('../../stores').then(({ videoFeedStoreActions }) => {
              videoFeedStoreActions.setCurrentIndex(index)
            })
          }
        })
      },
      {
        root: containerRef.current,
        threshold: 0.5,
      }
    )

    // Observe all video cards
    const cards = containerRef.current?.querySelectorAll('.video-card')
    cards?.forEach((card) => observerRef.current?.observe(card))

    return () => observerRef.current?.disconnect()
  }, [videos])

  if (loading && videos.length === 0) {
    return (
      <div className="phone-home-feed">
        <div className="phone-home-loading">
          <div className="phone-home-spinner" />
        </div>
        <PhoneNavBar />
      </div>
    )
  }

  if (!loading && videos.length === 0) {
    return (
      <div className="phone-home-feed">
        <div className="phone-home-empty">
          <p>No videos available</p>
          <button onClick={() => fetchVideoFeed(1)}>Refresh</button>
        </div>
        <PhoneNavBar />
      </div>
    )
  }

  return (
    <div className="phone-home-feed">
      <div className="phone-home-container" ref={containerRef}>
        {videos.map((series, index) => (
          <VideoCard
            key={series._id}
            series={series}
            isActive={index === currentIndex}
            index={index}
          />
        ))}
        
        {/* Loading indicator at bottom */}
        {loading && videos.length > 0 && (
          <div className="phone-home-loading-more">
            <div className="phone-home-spinner-small" />
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <PhoneNavBar />
      
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
    </div>
  )
}

export default PhoneHome
