import { createSignal, createEffect, Show } from 'solid-js'
import { useParams } from '@solidjs/router'
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

const Series = () => {
  const params = useParams()
  const [series, setSeries] = createSignal<SeriesType | null>(null)
  const [loading, setLoading] = createSignal(true)

  createEffect(() => {
    const id = params.id
    if (!id) return
    const loadSeries = async () => {
      setLoading(true)
      const data = await fetchSeriesById(id)
      setSeries(data)
      setLoading(false)
    }
    loadSeries()
  })

  const videoId = () => series()?.videoId || ''
  const videoEmbedUrl = () => buildVideoEmbedUrl(BUNNY_LIBRARY_ID, videoId())

  return (
    <div class="series-page">
      <TopBar />
      <main class="series-player-container">
        <Show when={!loading()} fallback={<div class="series-loading">Loading...</div>}>
          <Show when={videoId()} fallback={<div class="series-no-video">No video available</div>}>
            <iframe
              class="series-player"
              src={videoEmbedUrl()}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowfullscreen
              title="Series Player"
            />
          </Show>
        </Show>
      </main>
      <BottomBar />
    </div>
  )
}

export default Series
