import { Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import RecommendationSection from '../components/RecommendationSection'
import NewReleasesSection from '../components/NewReleasesSection'
import { t } from '../stores/languageStore'
import { featuredStore } from '../stores'
import { fetchFeaturedSeries } from '../services/dataService'
import './Home.css'

// Initialize data fetch outside component (not in useEffect)
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchFeaturedSeries()
  }
}

const Home = () => {
  const navigate = useNavigate()

  // Initialize data on first render
  initializeData()

  return (
    <div class="home-page">
      <TopBar />

      <Show when={!featuredStore.loading} fallback={<div class="hero-loading">Loading...</div>}>
        <Show when={featuredStore.series}>
          <HeroSection />
        </Show>
      </Show>

      <RecommendationSection />
      <NewReleasesSection />

      <BottomBar />
    </div>
  )
}

// ── HeroSection ── subscribes directly to featuredStore and languageStore

const HeroSection = () => {
  const navigate = useNavigate()

  const handlePlayClick = () => {
    if (featuredStore.series?._id) {
      navigate(`/player/${featuredStore.series._id}`)
    }
  }

  const handlePosterClick = () => {
    if (featuredStore.series?._id) {
      navigate(`/player/${featuredStore.series._id}`)
    }
  }

  const handleTagClick = (tag: string) => {
    navigate(`/genre?category=${encodeURIComponent(tag)}`)
  }

  return (
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-poster" onClick={handlePosterClick}>
          <img
            src={featuredStore.series!.cover}
            alt={featuredStore.series!.name}
            class="hero-poster-image"
          />
          <div class="hero-poster-overlay">
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>

        <div class="hero-info">
          <h1 class="hero-title">{featuredStore.series!.name}</h1>

          <div class="hero-tags">
            <For each={featuredStore.series!.tags}>
              {(tag, index) => (
                <span class="hero-tag" onClick={() => handleTagClick(tag)}>
                  {tag}
                </span>
              )}
            </For>
            <For each={featuredStore.series!.genre}>
              {(genre) => (
                <span class="hero-tag" onClick={() => handleTagClick(genre.name)}>
                  {genre.name}
                </span>
              )}
            </For>
          </div>

          <p class="hero-description">{featuredStore.series!.description}</p>

          <button class="hero-play-button" onClick={handlePlayClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            {t().home.play}
          </button>
        </div>
      </div>
    </section>
  )
}

export default Home
