// Public share/watch page (/watch/:jobId). Plays a Quick Create episode at full length
// with no preview/trial limit — this is what the Page 4 "Share" link points at in the
// s1 storage flow. Works for anyone with the link (no auth).

import { Show, createSignal, onMount } from 'solid-js'
import { useParams } from '@solidjs/router'
import TopBar from '../components/TopBar'
import { fetchSharedEpisode, type SharedEpisode } from '../services/dataService'
import './WatchEpisode.css'

const WatchEpisode = () => {
  const params = useParams()
  const [ep, setEp] = createSignal<SharedEpisode | null>(null)
  const [loading, setLoading] = createSignal(true)

  onMount(async () => {
    try {
      setEp(await fetchSharedEpisode(params.jobId))
    } finally {
      setLoading(false)
    }
  })

  return (
    <div class="watch-page">
      <TopBar />
      <div class="watch-content">
        <Show
          when={!loading()}
          fallback={
            <div class="watch-loading">
              <div class="watch-spinner" />
            </div>
          }
        >
          <Show
            when={ep() && (ep()!.embedUrl || ep()!.mp4Url)}
            fallback={<div class="watch-empty">This episode is not available.</div>}
          >
            <h1 class="watch-title">{ep()!.title}</h1>
            <div class="watch-player">
              <Show
                when={ep()!.embedUrl}
                fallback={<video src={ep()!.mp4Url} controls playsinline poster={ep()!.cover} />}
              >
                <iframe
                  src={`${ep()!.embedUrl}?autoplay=false&preload=true`}
                  loading="lazy"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowfullscreen
                />
              </Show>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}

export default WatchEpisode
