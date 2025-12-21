import React, { useState, useEffect } from 'react'
import SeriesCard from './SeriesCard'
import { useLanguage } from '../context/LanguageContext'
import { apiGet } from '../utils/api'
import type { Series } from '../types'
import './RecommendationSection.css'

const NewReleasesSection: React.FC = () => {
  const { t } = useLanguage()
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNewReleases()
  }, [])

  const fetchNewReleases = async () => {
    const data = await apiGet<Series[]>('newReleases')
    if (data.success && data.data) {
      setSeries(data.data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="recommendation-section loading">Loading...</div>
  }

  return (
    <section className="recommendation-section">
      <h2 className="recommendation-title">{t.home.newReleases}</h2>
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

export default NewReleasesSection