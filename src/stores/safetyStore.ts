// Reporting content and blocking users — the two safety controls the App Store requires of an
// app with user-generated content (Guideline 1.2). One store drives the whole flow:
//
//   sheet   — the "Report or block" choices for a comment
//   report  — the reason form for whatever is being reported
//   block   — the confirmation before blocking someone
//
// Block is offered on comments only — a series can be reported but its creator is never
// blocked. Blocking takes effect at once: the open comment thread is reloaded without theirs.

import { createStore } from 'solid-js/store'
import {
  reportContent,
  blockUser,
  unblockUser,
  fetchBlockedUsers,
  type ReportTarget,
  type ReportReason,
  type BlockedUser,
} from '../services/dataService'
import { isLoggedIn } from '../utils/api'
import { toastStoreActions, loginModalStoreActions } from './index'
import { commentStoreActions } from './commentStore'
import { t } from './languageStore'

export interface SafetyTarget {
  // What the "Report" option reports.
  targetType: ReportTarget
  seriesId: string
  episodeNumber?: number
  commentId?: string
  // Whose content it is — the person the "Block" option blocks.
  userId: string
  userName: string
}

interface SafetyState {
  sheet: SafetyTarget | null
  report: SafetyTarget | null
  reason: ReportReason | ''
  details: string
  submitting: boolean
  block: SafetyTarget | null
  blocking: boolean
  // The settings screen's list.
  blocked: BlockedUser[]
  blockedLoading: boolean
}

const getInitialState = (): SafetyState => ({
  sheet: null,
  report: null,
  reason: '',
  details: '',
  submitting: false,
  block: null,
  blocking: false,
  blocked: [],
  blockedLoading: false,
})

const [state, setState] = createStore<SafetyState>(getInitialState())

export const safetyStore = state

const s = () => t().safety as unknown as Record<string, string>

// Reporting and blocking both need an account: anonymous reports can't be followed up, and a
// block list has to belong to someone.
const requireSignIn = (): boolean => {
  if (isLoggedIn()) return true
  loginModalStoreActions.open()
  return false
}

export const safetyActions = {
  openSheet: (target: SafetyTarget) => {
    if (!requireSignIn()) return
    setState({ sheet: target })
  },
  closeSheet: () => setState({ sheet: null }),

  // ── Report ──
  // A series or episode has nothing to block, so its button goes straight to the form.
  openReport: (target: SafetyTarget) => {
    if (!requireSignIn()) return
    setState({ report: target, reason: '', details: '' })
  },
  startReport: () => {
    const target = state.sheet
    setState({ sheet: null, report: target, reason: '', details: '' })
  },
  setReason: (reason: ReportReason) => setState({ reason }),
  setDetails: (details: string) => setState({ details }),
  cancelReport: () => setState({ report: null, reason: '', details: '' }),

  submitReport: async () => {
    const target = state.report
    if (!target || !state.reason) return
    setState({ submitting: true })
    const result = await reportContent({
      targetType: target.targetType,
      seriesId: target.seriesId,
      episodeNumber: target.episodeNumber,
      commentId: target.commentId,
      reason: state.reason,
      details: state.details.trim() || undefined,
    })
    setState({ submitting: false })
    if (result.success) {
      setState({ report: null, reason: '', details: '' })
      toastStoreActions.show(s().reportThanks, 'success')
    } else {
      toastStoreActions.show(result.error || s().reportFailed, 'error')
    }
  },

  // ── Block ──
  startBlock: () => {
    const target = state.sheet
    setState({ sheet: null, block: target })
  },
  cancelBlock: () => setState({ block: null }),

  confirmBlock: async () => {
    const target = state.block
    if (!target) return
    setState({ blocking: true })
    const result = await blockUser(target.userId)
    setState({ blocking: false, block: null })
    if (!result.success || !result.data) {
      toastStoreActions.show(result.error || s().blockFailed, 'error')
      return
    }
    // Comments are filtered on the server, so reload the open thread to drop theirs.
    await commentStoreActions.reload()
    toastStoreActions.show(s().blockedToast.replace('{name}', target.userName), 'success')
  },

  // ── Settings: the block list ──
  loadBlocked: async () => {
    setState({ blockedLoading: true })
    const result = await fetchBlockedUsers()
    setState({ blocked: result.success && result.data ? result.data : [], blockedLoading: false })
  },

  unblock: async (user: BlockedUser) => {
    const result = await unblockUser(user._id)
    if (!result.success || !result.data) {
      toastStoreActions.show(result.error || s().blockFailed, 'error')
      return
    }
    setState('blocked', (list) => list.filter((u) => u._id !== user._id))
    toastStoreActions.show(s().unblockedToast.replace('{name}', user.nickname), 'success')
  },
}
