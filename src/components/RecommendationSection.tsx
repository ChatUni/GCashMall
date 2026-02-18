import SeriesCarousel from './SeriesCarousel'
import { t } from '../stores/languageStore'
import { recommendationsStore } from '../stores'
import { fetchRecommendations } from '../services/dataService'

interface RecommendationSectionProps {
  title?: string
  excludeSeriesId?: string
}

// Initialize data fetch outside component (not in createEffect)
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchRecommendations()
  }
}

const RecommendationSection = (props: RecommendationSectionProps) => {
  // Initialize data on first render (avoiding createEffect for API calls)
  initializeData()

  return (
    <SeriesCarousel
      title={props.title || t().home.youMightLike}
      series={recommendationsStore.series}
      loading={recommendationsStore.loading}
      excludeSeriesId={props.excludeSeriesId}
    />
  )
}

export default RecommendationSection
