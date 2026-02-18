import SeriesCarousel from './SeriesCarousel'
import { t } from '../stores/languageStore'
import { newReleasesStore } from '../stores'
import { fetchNewReleases } from '../services/dataService'

interface NewReleasesSectionProps {
  excludeSeriesId?: string
}

// Initialize data fetch outside component (not in createEffect)
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchNewReleases()
  }
}

const NewReleasesSection = (props: NewReleasesSectionProps) => {
  // Initialize data on first render (avoiding createEffect for API calls)
  initializeData()

  return (
    <SeriesCarousel
      title={t().home.newReleases}
      series={newReleasesStore.series}
      loading={newReleasesStore.loading}
      excludeSeriesId={props.excludeSeriesId}
    />
  )
}

export default NewReleasesSection
