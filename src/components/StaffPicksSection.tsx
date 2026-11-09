import { Show } from 'solid-js'
import SeriesCarousel from './SeriesCarousel'
import { t } from '../stores/languageStore'
import { staffPicksStore } from '../stores'
import { fetchStaffPicks } from '../services/dataService'

interface StaffPicksSectionProps {
  excludeSeriesId?: string
}

// Initialize data fetch outside component (not in createEffect)
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchStaffPicks()
  }
}

// Hidden until an admin has picked at least one series.
const StaffPicksSection = (props: StaffPicksSectionProps) => {
  initializeData()

  return (
    <Show when={staffPicksStore.series.length > 0}>
      <SeriesCarousel
        title={t().home.staffPicks}
        series={staffPicksStore.series}
        loading={staffPicksStore.loading}
        excludeSeriesId={props.excludeSeriesId}
      />
    </Show>
  )
}

export default StaffPicksSection
