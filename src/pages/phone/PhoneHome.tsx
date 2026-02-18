import { Show, For, onMount, onCleanup } from 'solid-js'
import {
  videoFeedStore,
  videoFeedStoreActions,
  loginModalStore,
  loginModalStoreActions,
  userStoreActions,
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
  let observerRef: IntersectionObserver | undefined

  // Initialize data on first render
  initializeData()

  // Handle scroll to detect current video
  const handleScroll = () => {
    if (!containerRef) return

    const scrollTop = containerRef.scrollTop
    const cardHeight = containerRef.clientHeight
    const newIndex = Math.round(scrollTop / cardHeight)

    if (newIndex !== videoFeedStore.currentIndex && newIndex >= 0 && newIndex < videoFeedStore.videos.length) {
      videoFeedStoreActions.setCurrentIndex(newIndex)
    }

    // Load more when approaching end
    if (newIndex >= videoFeedStore.videos.length - 3 && videoFeedStore.hasMore && !videoFeedStore.loading) {
      loadMoreVideos()
    }
  }

  // Set up scroll listener and intersection observer
  onMount(() => {
    if (containerRef) {
      containerRef.addEventListener('scroll', handleScroll, { passive: true })
    }

    setupIntersectionObserver()
  })

  onCleanup(() => {
    if (containerRef) {
      containerRef.removeEventListener('scroll', handleScroll)
    }
    if (observerRef) {
      observerRef.disconnect()
    }
  })

  const setupIntersectionObserver = () => {
    if (observerRef) {
      observerRef.disconnect()
    }

    observerRef = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10)
            videoFeedStoreActions.setCurrentIndex(index)
          }
        })
      },
      {
        root: containerRef,
        threshold: 0.5,
      },
    )

    // Observe all video cards
    const cards = containerRef?.querySelectorAll('.video-card')
    cards?.forEach((card) => observerRef?.observe(card))
  }

  const handleLoginSuccess = (user: import('../../types').User) => {
    userStoreActions.setUser(user)
    userStoreActions.setLoading(false)
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
