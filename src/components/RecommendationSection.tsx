import React from 'react'
import SeriesCard from './SeriesCard'
import { useLanguage } from '../context/LanguageContext'
import { useRecommendationsStore } from '../stores'
import { fetchRecommendations } from '../services/dataService'
import './RecommendationSection.css'

interface RecommendationSectionProps {
  title?: string
}

// Initialize data fetch outside component (not in useEffect)
let dataFetched = false
const initializeData = () => {
  if (!dataFetched) {
    dataFetched = true
    fetchRecommendations()
  }
}

const RecommendationSection: React.FC<RecommendationSectionProps> = ({ title }) => {
  const { t } = useLanguage()
  const { series, loading } = useRecommendationsStore()

  // Initialize data on first render (avoiding useEffect for API calls)
  initializeData()

  if (loading) {
    return <div className="recommendation-section loading">Loading...</div>
  }

  return (
    <section className="recommendation-section">
      <h2 className="recommendation-title">{title || t.home.youMightLike}</h2>
      <div className="recommendation-carousel">
        <div className="recommendation-list">
          {series.map((item) => (
            <div key={item._id} className="recommendation-item">
              <SeriesCard series={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default RecommendationSection
