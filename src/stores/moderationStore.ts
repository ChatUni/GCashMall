// Admin manual-moderation queue — state for the Account page's Moderation tab.
// Following Rule #7: state lives outside the component tree and components subscribe here.

import { createStore } from 'solid-js/store'
import { createMemo } from 'solid-js'
import { apiGetWithAuth, apiPostWithAuth } from '../utils/api'
import {
  fetchAdminUsers,
  setUserVerified,
  fetchReviewRequests,
  type AdminUser,
  type ReviewRequestGroup,
} from '../services/dataService'
import type { ModerationGroup, ModerationSeries } from '../types'

interface ModerationState {
  groups: ModerationGroup[]
  loading: boolean
  error: string
  // Which uploader groups are expanded (all collapsed by default — the queue can be long).
  expanded: Record<string, boolean>
  // Which series cards are expanded. Also collapsed by default: a series carries a video
  // player per episode, so opening them all at once would be a wall of iframes.
  expandedSeries: Record<string, boolean>
  // seriesId currently being reviewed, so only that card shows a spinner.
  busySeriesId: string
  // Rejection reason drafts, keyed by seriesId or `${seriesId}:${episodeNumber}`.
  rejectTarget: string
  rejectReason: string
  // Approve is a one-way publish, so it confirms first. Same key scheme; mutually
  // exclusive with rejectTarget so only one prompt is ever open.
  confirmTarget: string
  // ── Users ──
  // Every user, not just those with something pending: the Verified toggle has to be
  // reachable for a creator BEFORE they upload, otherwise it can only ever be granted
  // reactively, once their work is already sitting in the queue.
  users: AdminUser[]
  usersLoading: boolean
  userSearch: string
  // The user whose Verified toggle is awaiting confirmation, and which way it would go.
  verifyTarget: AdminUser | null
  verifyBusyId: string
  // ── Review requests ──
  // Creators appealing an automated rejection. Listed first: someone is waiting on a person,
  // and unlike the ordinary queue no machine will ever resolve it.
  requests: ReviewRequestGroup[]
  requestsLoading: boolean
}

const getInitialState = (): ModerationState => ({
  groups: [],
  loading: false,
  error: '',
  expanded: {},
  expandedSeries: {},
  busySeriesId: '',
  rejectTarget: '',
  rejectReason: '',
  confirmTarget: '',
  users: [],
  usersLoading: false,
  userSearch: '',
  verifyTarget: null,
  verifyBusyId: '',
  requests: [],
  requestsLoading: false,
})

const [state, setState] = createStore<ModerationState>(getInitialState())

export const moderationStore = state

// ── Derived ──

export const rejectKey = (seriesId: string, episodeNumber?: number) =>
  episodeNumber === undefined ? seriesId : `${seriesId}:${episodeNumber}`

// Items still awaiting a decision, for the tab's counter.
export const pendingCount = createMemo(() =>
  state.groups.reduce(
    (total, g) =>
      total +
      g.series.reduce(
        (n, s) =>
          n +
          (s.moderation.status === 'pending' ? 1 : 0) +
          s.episodes.filter((e) => e.moderation.status === 'pending').length,
        0,
      ),
    0,
  ),
)

export const isBusy = (seriesId: string) => state.busySeriesId === seriesId

// Items on one series still awaiting a decision, for the collapsed header.
export const seriesPendingCount = (series: ModerationSeries) =>
  (series.moderation.status === 'pending' ? 1 : 0) +
  series.episodes.filter((e) => e.moderation.status === 'pending').length

// Nothing left to decide on this series.
export const isFullyApproved = (series: ModerationSeries) => seriesUnapprovedCount(series) === 0

// Series still needing attention first, finished ones at the bottom. Array.prototype.sort
// is stable, so within each half the queue keeps the order the server sent (most recently
// updated first). Derived rather than sorted on load, so a series drops to the bottom the
// moment it is approved — without refetching the queue.
export const orderedSeries = (series: ModerationSeries[]) =>
  [...series].sort((a, b) => Number(isFullyApproved(a)) - Number(isFullyApproved(b)))

// What an "Approve All" would decide: everything not already approved, so rejected items
// are swept up too. Used to label the button and its confirmation honestly.
export const seriesUnapprovedCount = (series: ModerationSeries) =>
  (series.moderation.status !== 'approved' ? 1 : 0) +
  series.episodes.filter((e) => e.moderation.status !== 'approved').length

// ── Actions ──

// Replace one series in place after a review, so the rest of the queue doesn't flicker.
const replaceSeries = (updated: ModerationSeries) => {
  setState('groups', (groups) =>
    groups.map((g) => ({
      ...g,
      series: g.series.map((s) => (s._id === updated._id ? updated : s)),
    })),
  )
}

export const moderationStoreActions = {
  load: async () => {
    setState({ loading: true, error: '' })
    const result = await apiGetWithAuth<ModerationGroup[]>('moderationQueue')
    if (result.success && result.data) {
      setState({ groups: result.data, loading: false })
    } else {
      setState({ loading: false, error: result.error || 'Failed to load the moderation queue' })
    }
  },

  toggleGroup: (uploaderId: string) =>
    setState('expanded', uploaderId, (open) => !open),

  toggleSeries: (seriesId: string) =>
    setState('expandedSeries', seriesId, (open) => !open),

  openReject: (target: string) =>
    setState({ rejectTarget: target, rejectReason: '', confirmTarget: '' }),
  closeReject: () => setState({ rejectTarget: '', rejectReason: '' }),

  openConfirm: (target: string) =>
    setState({ confirmTarget: target, rejectTarget: '', rejectReason: '' }),
  closeConfirm: () => setState({ confirmTarget: '' }),
  setRejectReason: (rejectReason: string) => setState({ rejectReason }),

  approveSeries: (seriesId: string) => review('approveSeries', { seriesId }, seriesId),

  // Series + every episode not already approved, in one server call — see approveAll in
  // handlers.js for why this isn't a loop over the single-item actions.
  approveAll: (seriesId: string) => review('approveAll', { seriesId }, seriesId),

  approveEpisode: (seriesId: string, episodeNumber: number) =>
    review('approveEpisode', { seriesId, episodeNumber }, seriesId),

  rejectSeries: (seriesId: string, reason: string) =>
    review('rejectSeries', { seriesId, reason }, seriesId),

  rejectEpisode: (seriesId: string, episodeNumber: number, reason: string) =>
    review('rejectEpisode', { seriesId, episodeNumber, reason }, seriesId),

  loadRequests: async () => {
    setState({ requestsLoading: true })
    const result = await fetchReviewRequests()
    setState({ requests: result.success && result.data ? result.data : [], requestsLoading: false })
  },

  // ── Users ──

  loadUsers: async () => {
    setState({ usersLoading: true })
    const result = await fetchAdminUsers(state.userSearch)
    setState({ users: result.success && result.data ? result.data : [], usersLoading: false })
  },

  // Typing filters the list. The search runs server-side (the user table is not something to
  // ship to the browser in full), debounced by the caller.
  setUserSearch: (userSearch: string) => {
    setState({ userSearch })
    return moderationStoreActions.loadUsers()
  },

  // Verifying is consequential — it approves everything the creator has waiting and every
  // future upload — so the toggle asks first.
  askVerify: (user: AdminUser) => setState({ verifyTarget: user }),
  cancelVerify: () => setState({ verifyTarget: null }),

  confirmVerify: async () => {
    const user = state.verifyTarget
    if (!user) return
    setState({ verifyBusyId: user._id, verifyTarget: null })
    const result = await setUserVerified(user._id, !user.verified)
    if (result.success) {
      setState('users', (u) => u._id === user._id, 'verified', !user.verified)
      // Approving a backlog empties part of the queue, so both views are now stale.
      if (!user.verified) {
        setState('users', (u) => u._id === user._id, 'pendingCount', 0)
        await moderationStoreActions.load()
      }
    } else {
      setState({ error: result.error || 'Failed to update the user' })
    }
    setState({ verifyBusyId: '' })
  },

  reset: () => setState(getInitialState()),
}

// Every review action is the same shape: post, swap the returned series in, clear the form.
const review = async (
  type: string,
  body: Record<string, unknown>,
  seriesId: string,
): Promise<{ success: boolean; error?: string }> => {
  setState({ busySeriesId: seriesId, error: '' })
  const result = await apiPostWithAuth<ModerationSeries>(type, body)
  if (result.success && result.data) {
    replaceSeries(result.data)
    setState({ busySeriesId: '', rejectTarget: '', rejectReason: '', confirmTarget: '' })
    return { success: true }
  }
  setState({ busySeriesId: '', error: result.error || 'Review failed' })
  return { success: false, error: result.error }
}
