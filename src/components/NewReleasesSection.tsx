import React from 'react'
import SeriesCarousel from './SeriesCarousel'
import { useLanguage } from '../context/LanguageContext'
import { useNewReleasesStore } from '../stores'
import { fetchNewReleases } from '../services/dataService'

interface NewReleasesSectionProps {
  excludeSeriesId?: string
}

// Initialize data fetch outside component (not in useEffect)
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchNewReleases()
  }
}

const NewReleasesSection: React.FC<NewReleasesSectionProps> = ({ excludeSeriesId }) => {
  const { t } = useLanguage()
  const { series, loading } = useNewReleasesStore()

  // Initialize data on first render (avoiding useEffect for API calls)
  initializeData()

  return (
    <SeriesCarousel
      title={t.home.newReleases}
      series={series}
      loading={loading}
      excludeSeriesId={excludeSeriesId}
    />
  )
}

export default NewReleasesSection
