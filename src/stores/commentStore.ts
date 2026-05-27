import { createStore } from 'solid-js/store'
import type { Comment } from '../types'
import { apiGet, apiPostWithAuth } from '../utils/api'

// ── State ──

interface CommentState {
  comments: Comment[]
  totalCount: number
  loading: boolean
  loadingMore: boolean
  collapsed: boolean
  inputText: string
  submitting: boolean
  submitError: string | null
  currentSeriesId: string | null
  currentEpisodeId: string | null
  page: number
  hasMore: boolean
}

const PAGE_SIZE = 20

const getInitialState = (): CommentState => ({
  comments: [],
  totalCount: 0,
  loading: false,
  loadingMore: false,
  collapsed: false,
  inputText: '',
  submitting: false,
  submitError: null,
  currentSeriesId: null,
  currentEpisodeId: null,
  page: 1,
  hasMore: true,
})

const [state, setState] = createStore<CommentState>(getInitialState())

export const commentStore = state

// ── Derived ──

export const commentCount = () => state.totalCount

// ── Validation ──

const validateIds = (
  seriesId: string | null,
  episodeId: string | null,
): boolean => {
  if (!seriesId || !episodeId) {
    console.error('seriesId and episodeId are required')
    return false
  }
  return true
}

const validateCommentBody = (text: string): boolean => {
  if (!text.trim()) {
    console.error('Comment body cannot be empty')
    return false
  }
  return true
}

const isProfanityError = (error: string): boolean =>
  error.toLowerCase().includes('profane')

// ── Actions ──

const resetForNewEpisode = (seriesId: string, episodeId: string) => {
  setState({
    ...getInitialState(),
    currentSeriesId: seriesId,
    currentEpisodeId: episodeId,
  })
}

const fetchComments = async (
  seriesId: string,
  episodeId: string,
  page: number,
) => {
  const result = await apiGet<{
    comments: Comment[]
    totalCount: number
    hasMore: boolean
  }>('comments', {
    seriesId,
    episodeId,
    page,
    pageSize: PAGE_SIZE,
  })

  if (result.success && result.data) {
    return result.data
  }
  return null
}

const applyFetchedComments = (
  data: { comments: Comment[]; totalCount: number; hasMore: boolean },
  isLoadMore: boolean,
) => {
  if (isLoadMore) {
    setState('comments', (prev) => [...prev, ...data.comments])
  } else {
    setState('comments', data.comments)
  }
  setState({
    totalCount: data.totalCount,
    hasMore: data.hasMore,
  })
}

export const commentStoreActions = {
  // Load initial comments for a series/episode
  load: async (seriesId: string, episodeId: string) => {
    if (!validateIds(seriesId, episodeId)) return

    // If same episode, skip re-fetch
    if (
      state.currentSeriesId === seriesId &&
      state.currentEpisodeId === episodeId
    ) {
      return
    }

    resetForNewEpisode(seriesId, episodeId)
    setState({ loading: true })

    try {
      const data = await fetchComments(seriesId, episodeId, 1)
      if (data) {
        applyFetchedComments(data, false)
        setState({ page: 1 })
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setState({ loading: false })
    }
  },

  // Load next page of comments (infinite scroll)
  loadMore: async () => {
    if (state.loadingMore || !state.hasMore) return
    if (!validateIds(state.currentSeriesId, state.currentEpisodeId)) return

    setState({ loadingMore: true })
    const nextPage = state.page + 1

    try {
      const data = await fetchComments(
        state.currentSeriesId!,
        state.currentEpisodeId!,
        nextPage,
      )
      if (data) {
        applyFetchedComments(data, true)
        setState({ page: nextPage })
      }
    } catch (error) {
      console.error('Failed to load more comments:', error)
    } finally {
      setState({ loadingMore: false })
    }
  },

  // Submit a new comment
  submit: async () => {
    if (!validateCommentBody(state.inputText)) return
    if (!validateIds(state.currentSeriesId, state.currentEpisodeId)) return

    setState({ submitting: true, submitError: null })

    try {
      const result = await apiPostWithAuth<{ comment: Comment }>(
        'addComment',
        {
          seriesId: state.currentSeriesId!,
          episodeId: state.currentEpisodeId!,
          body: state.inputText.trim(),
        },
      )

      if (result.success && result.data) {
        setState('comments', (prev) => [result.data!.comment, ...prev])
        setState({
          totalCount: state.totalCount + 1,
          inputText: '',
        })
      } else if (result.error && isProfanityError(result.error)) {
        setState({ submitError: 'profane' })
      }
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setState({ submitting: false })
    }
  },

  clearSubmitError: () => setState({ submitError: null }),

  // UI actions
  setInputText: (text: string) => setState({ inputText: text }),
  clearInput: () => setState({ inputText: '' }),
  toggleCollapsed: () => setState('collapsed', (prev) => !prev),

  // Reset when leaving player page
  reset: () => setState(getInitialState()),
}
