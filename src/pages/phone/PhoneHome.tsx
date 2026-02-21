import { Show, For, createEffect } from 'solid-js'
import {
  videoFeedStore,
  videoFeedStoreActions,
  loginModalStore,
  loginModalStoreActions,
} from '../../stores'
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

const PhoneHome = () => {
  let containerRef: HTMLDivElement | undefined

  // Initialize data on first render
  initializeData()

  // Handle scroll to detect current video and trigger infinite scroll
  const handleScroll = () => {
    if (!containerRef) return

    const scrollTop = containerRef.scrollTop
    const cardHeight = containerRef.clientHeight
    const newIndex = Math.round(scrollTop / cardHeight)
    const videos = videoFeedStore.videos

    if (newIndex !== videoFeedStore.currentIndex && newIndex >= 0 && newIndex < videos.length) {
      videoFeedStoreActions.setCurrentIndex(newIndex)
    }

    // Load more when current position is length - 2
    if (newIndex >= videos.length - 2 && videoFeedStore.hasMore && !videoFeedStore.loading) {
      loadMoreVideos()
    }
  }

  // Attach scroll listener after render
  createEffect(() => {
    if (containerRef) {
      containerRef.addEventListener('scroll', handleScroll, { passive: true })
    }
  })

  const handleLoginSuccess = (user: import('../../types').User) => {
    accountStoreActions.setUser(user)
    accountStoreActions.setLoading(false)
    accountStoreActions.initializeUserData(user)
    loginModalStoreActions.close()
  }

  return (
    <div class="phone-home-feed">
      <Show
        when={!(videoFeedStore.loading && videoFeedStore.videos.length === 0)}
        fallback={
          <div class="phone-home-feed">
            <div class="phone-home-loading">
              <div class="phone-home-spinner" />
            </div>
            <PhoneNavBar />
          </div>
        }
      >
        <Show
          when={videoFeedStore.videos.length > 0}
          fallback={
            <div class="phone-home-feed">
              <div class="phone-home-empty">
                <p>No videos available</p>
                <button onClick={() => fetchVideoFeed(1)}>Refresh</button>
              </div>
              <PhoneNavBar />
            </div>
          }
        >
          <div class="phone-home-container" ref={containerRef}>
            <For each={videoFeedStore.videos}>
              {(series, index) => (
                <VideoCard
                  series={series}
                  isActive={index() === videoFeedStore.currentIndex}
                  index={index()}
                />
              )}
            </For>

            {/* Loading indicator at bottom */}
            <Show when={videoFeedStore.loading && videoFeedStore.videos.length > 0}>
              <div class="phone-home-loading-more">
                <div class="phone-home-spinner-small" />
              </div>
            </Show>
          </div>

          {/* Bottom Navigation */}
          <PhoneNavBar />

          {/* Login Modal */}
          <Show when={loginModalStore.isOpen}>
            <LoginModal
              onClose={loginModalStoreActions.close}
              onLoginSuccess={handleLoginSuccess}
            />
          </Show>
        </Show>
      </Show>
    </div>
  )
}

export default PhoneHome
