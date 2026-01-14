import React from 'react'
import SeriesCarousel from './SeriesCarousel'
import { useLanguage } from '../context/LanguageContext'
import { useRecommendationsStore } from '../stores'
import { fetchRecommendations } from '../services/dataService'

interface RecommendationSectionProps {
  title?: string
  excludeSeriesId?: string
}

// Initialize data fetch outside component (not in useEffect)
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchRecommendations()
  }
}

const RecommendationSection: React.FC<RecommendationSectionProps> = ({ title, excludeSeriesId }) => {
  const { t } = useLanguage()
  const { series, loading } = useRecommendationsStore()

  // Initialize data on first render (avoiding useEffect for API calls)
  initializeData()

  return (
    <SeriesCarousel
      title={title || t.home.youMightLike}
      series={series}
      loading={loading}
      excludeSeriesId={excludeSeriesId}
    />
  )
}

export default RecommendationSection
