import React, { useState, useEffect } from 'react'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import type { Series } from '../types'
import './SeriesList.css'

const SeriesList: React.FC = () => {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async () => {
    try {
      const response = await fetch('/.netlify/functions/api?type=series')
      const data = await response.json()
      if (data.success) {
        setSeries(data.data)
      }
    } catch (error) {
      console.error('Error fetching series:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderLoading = () => (
    <div className="series-list-page">
      <TopBar />
      <div className="loading">Loading series...</div>
      <BottomBar />
    </div>
  )

  const renderSeriesCard = (seriesItem: Series) => (
    <Card key={seriesItem._id} className="series-card">
      <div className="series-content">
        <img
          src={seriesItem.cover}
          alt={seriesItem.name}
          className="series-cover"
        />
        <div className="series-info">
          <h3 className="series-name">{seriesItem.name}</h3>
          <p className="series-description">{seriesItem.description}</p>
        </div>
      </div>
    </Card>
  )

  const renderSeriesList = () => (
    <div className="series-list-page">
      <TopBar />
      <main className="series-list-content">
        <div className="series-grid card-list">
          {series.map(renderSeriesCard)}
        </div>
        {series.length === 0 && (
          <div className="no-series">No series found.</div>
        )}
      </main>
      <BottomBar />
    </div>
  )

  if (loading) {
    return renderLoading()
  }

  return renderSeriesList()
}

export default SeriesList