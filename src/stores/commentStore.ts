import { createStore } from 'solid-js/store'
import type { Comment } from '../types'
import { apiGetWithAuth, apiPostWithAuth } from '../utils/api'

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

// The series' creator has blocked this user from commenting.
const isBlockedError = (error: string) => error.includes('cannot comment on this series')

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
  // Sent with the viewer's token when there is one, so the server can leave out comments from
  // anyone they have blocked. A guest's request goes without it and sees everything.
  const result = await apiGetWithAuth<{
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
  // Re-fetch the open thread even though it is already loaded — after blocking someone, so
  // their comments (filtered out on the server) disappear straight away.
  reload: async () => {
    const seriesId = state.currentSeriesId
    const episodeId = state.currentEpisodeId
    if (!seriesId || !episodeId) return
    setState({ currentSeriesId: null, currentEpisodeId: null })
    await commentStoreActions.load(seriesId, episodeId)
  },

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
      } else if (result.error && isBlockedError(result.error)) {
        setState({ submitError: 'blocked' })
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
