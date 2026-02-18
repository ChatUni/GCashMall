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

// Click handlers defined outside component (avoiding embedded functions)
const createPlayClickHandler = (navigate: ReturnType<typeof useNavigate>, seriesId: string | undefined) => () => {
  if (seriesId) {
    navigate(`/player/${seriesId}`)
  }
}

const createPosterClickHandler = (navigate: ReturnType<typeof useNavigate>, seriesId: string | undefined) => () => {
  if (seriesId) {
    navigate(`/player/${seriesId}`)
  }
}

const createTagClickHandler = (navigate: ReturnType<typeof useNavigate>, tag: string) => () => {
  navigate(`/genre?category=${encodeURIComponent(tag)}`)
}

const Home = () => {
  const navigate = useNavigate()

  // Initialize data on first render
  initializeData()

  const handlePlayClick = () => createPlayClickHandler(navigate, featuredStore.series?._id)()
  const handlePosterClick = () => createPosterClickHandler(navigate, featuredStore.series?._id)()
  const handleTagClick = (tag: string) => createTagClickHandler(navigate, tag)()

  return (
    <div class="home-page">
      <TopBar />

      <Show when={!featuredStore.loading} fallback={<div class="hero-loading">Loading...</div>}>
        <Show when={featuredStore.series}>
          {(series) => (
            <HeroSection
              series={series()}
              onPlayClick={handlePlayClick}
              onPosterClick={handlePosterClick}
              onTagClick={handleTagClick}
              playText={t().home.play}
            />
          )}
        </Show>
      </Show>

      <RecommendationSection />
      <NewReleasesSection />

      <BottomBar />
    </div>
  )
}

// Pure sub-component for hero section
interface HeroSectionProps {
  series: {
    _id: string
    name: string
    cover: string
    description: string
    tags?: string[]
    genre?: { _id: string; name: string }[]
  }
  onPlayClick: () => void
  onPosterClick: () => void
  onTagClick: (tag: string) => void
  playText: string
}

const HeroSection = (props: HeroSectionProps) => (
  <section class="hero-section">
    <div class="hero-content">
      <div class="hero-poster" onClick={props.onPosterClick}>
        <img
          src={props.series.cover}
          alt={props.series.name}
          class="hero-poster-image"
        />
        <div class="hero-poster-overlay">
          <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
      </div>

      <div class="hero-info">
        <h1 class="hero-title">{props.series.name}</h1>

        <div class="hero-tags">
          <For each={props.series.tags}>
            {(tag, index) => (
              <span class="hero-tag" onClick={() => props.onTagClick(tag)}>
                {tag}
              </span>
            )}
          </For>
          <For each={props.series.genre}>
            {(genre) => (
              <span class="hero-tag" onClick={() => props.onTagClick(genre.name)}>
                {genre.name}
              </span>
            )}
          </For>
        </div>

        <p class="hero-description">{props.series.description}</p>

        <button class="hero-play-button" onClick={props.onPlayClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          {props.playText}
        </button>
      </div>
    </div>
  </section>
)

export default Home
