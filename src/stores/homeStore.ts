// Home page stores - Featured series and Video Feed
// Following Rule #7: States shared by 2+ components must be defined outside the component tree

import { createStore } from 'solid-js/store'
import type { Series } from '../types'

// ======================
// Featured series store
// ======================

interface FeaturedState {
  series: Series | null
  loading: boolean
}

const [featuredState, setFeaturedState] = createStore<FeaturedState>({
  series: null,
  loading: true,
})

export const featuredStore = featuredState

export const featuredStoreActions = {
  setSeries: (series: Series | null) => setFeaturedState({ series }),
  setLoading: (loading: boolean) => setFeaturedState({ loading }),
  getState: () => featuredState,
}

// ======================
// Video Feed store (for TikTok-style home page)
// ======================

interface VideoFeedState {
  videos: Series[]
  currentIndex: number
  loading: boolean
  hasMore: boolean
  page: number
  isMuted: boolean
}

const getVideoFeedInitialState = (): VideoFeedState => ({
  videos: [],
  currentIndex: 0,
  loading: true,
  hasMore: true,
  page: 1,
  isMuted: true,
})

const [videoFeedState, setVideoFeedState] = createStore<VideoFeedState>(getVideoFeedInitialState())

export const videoFeedStore = videoFeedState

export const videoFeedStoreActions = {
  setVideos: (videos: Series[]) => setVideoFeedState({ videos }),
  appendVideos: (videos: Series[]) => setVideoFeedState('videos', (prev) => [...prev, ...videos]),
  setCurrentIndex: (currentIndex: number) => setVideoFeedState({ currentIndex }),
  setLoading: (loading: boolean) => setVideoFeedState({ loading }),
  setHasMore: (hasMore: boolean) => setVideoFeedState({ hasMore }),
  setPage: (page: number) => setVideoFeedState({ page }),
  setIsMuted: (isMuted: boolean) => setVideoFeedState({ isMuted }),
  toggleMute: () => setVideoFeedState('isMuted', (prev) => !prev),
  reset: () => setVideoFeedState(getVideoFeedInitialState()),
  getState: () => videoFeedState,
}
