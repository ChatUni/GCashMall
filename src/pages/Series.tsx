import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { apiGet } from '../utils/api'
import type { Series as SeriesType } from '../types'
import './Series.css'

const BUNNY_LIBRARY_ID = import.meta.env.VITE_BUNNY_LIBRARY_ID

const buildVideoEmbedUrl = (libraryId: string, videoId: string): string => {
  return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true`
}

const fetchSeriesById = async (id: string): Promise<SeriesType | null> => {
  const response = await apiGet<SeriesType>('series', { id })
  if (response.success && response.data) {
    return response.data
  }
  return null
}

const Series: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [series, setSeries] = useState<SeriesType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSeries = async () => {
      if (!id) return
      setLoading(true)
      const data = await fetchSeriesById(id)
      setSeries(data)
      setLoading(false)
    }
    loadSeries()
  }, [id])

  const videoId = series?.videoId || ''
  const videoEmbedUrl = buildVideoEmbedUrl(BUNNY_LIBRARY_ID, videoId)

  return (
    <div className="series-page">
      <TopBar />
      <main className="series-player-container">
        {loading ? (
          <div className="series-loading">Loading...</div>
        ) : videoId ? (
          <iframe
            className="series-player"
            src={videoEmbedUrl}
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="Series Player"
          />
        ) : (
          <div className="series-no-video">No video available</div>
        )}
      </main>
      <BottomBar />
    </div>
  )
}

export default Series