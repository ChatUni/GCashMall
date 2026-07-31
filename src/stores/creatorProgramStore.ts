// Creator Program store — the marketing landing page + the 4-step "Join" wizard.
// UI-only flow (Rule #7: shared state lives outside the component tree).

import { createStore } from 'solid-js/store'
import { joinCreatorProgram } from '../services/dataService'
import { setStoredUser } from '../utils/api'
import { accountStoreActions } from './accountStore'

export type PayoutMethod = 'stripe' | 'gusd'
export type CreatorView = 'landing' | 'join'

// The 2 wizard steps (redesign): accept agreement, then create profile.
export const JOIN_STEPS = ['agreement', 'profile'] as const
export const JOIN_STEP_COUNT = 2

export interface CreatorSocials {
  youtube: string
  x: string
  instagram: string
  tiktok: string
}

export interface CreatorProfile {
  creatorName: string
  email: string
  displayName: string
  bio: string
  avatar: string
  socials: CreatorSocials
}

export const BIO_MAX = 300

interface CreatorProgramState {
  view: CreatorView
  step: number // 1..4
  agreementAccepted: boolean
  payoutMethod: PayoutMethod | null
  payoutDeferred: boolean // chose "I'll do it later"
  profile: CreatorProfile
  joined: boolean
  submitting: boolean
  submitError: string
}

const getInitialProfile = (): CreatorProfile => ({
  creatorName: '',
  email: '',
  displayName: '',
  bio: '',
  avatar: '',
  socials: { youtube: '', x: '', instagram: '', tiktok: '' },
})

const getInitialState = (): CreatorProgramState => ({
  view: 'landing',
  step: 1,
  agreementAccepted: false,
  payoutMethod: 'gusd', // default payout is GUSD in the redesign
  payoutDeferred: true, // KYC/payout is deferred until the first payout request
  profile: getInitialProfile(),
  joined: false,
  submitting: false,
  submitError: '',
})

const [state, setState] = createStore<CreatorProgramState>(getInitialState())

export const creatorProgramStore = state

export const creatorProgramStoreActions = {
  startJoin: () => setState({ view: 'join', step: 1, joined: false }),
  cancel: () => setState({ view: 'landing' }),
  goToStep: (step: number) => {
    if (step >= 1 && step <= state.step) setState({ step })
  },
  next: () => setState('step', (s) => Math.min(s + 1, JOIN_STEP_COUNT)),
  back: () => setState('step', (s) => Math.max(s - 1, 1)),

  setAgreement: (agreementAccepted: boolean) => setState({ agreementAccepted }),
  setPayout: (payoutMethod: PayoutMethod) => setState({ payoutMethod, payoutDeferred: false }),
  deferPayout: () => setState({ payoutDeferred: true }),

  setProfileField: <K extends keyof CreatorProfile>(key: K, value: CreatorProfile[K]) =>
    setState('profile', key, value),
  setSocial: (key: keyof CreatorSocials, value: string) => setState('profile', 'socials', key, value),

  complete: () => setState({ joined: true, step: JOIN_STEP_COUNT }),

  // Finalize joining: grant publish permission on the server, refresh the account store +
  // cached login user (so allowUpload is fresh everywhere), then show the success step.
  submitJoin: async () => {
    if (state.submitting) return
    setState({ submitting: true, submitError: '' })
    try {
      const user = await joinCreatorProgram({
        profile: state.profile,
        payoutMethod: state.payoutMethod,
      })
      if (user) {
        accountStoreActions.setUser(user)
        setStoredUser(user)
      }
      setState({ joined: true, step: JOIN_STEP_COUNT })
    } catch (e) {
      setState({ submitError: e instanceof Error ? e.message : 'Failed to join' })
    } finally {
      setState({ submitting: false })
    }
  },
  reset: () => setState(getInitialState()),

  // Prefill the profile from the logged-in user (called on mount)
  prefill: (name: string, email: string, avatar: string) =>
    setState('profile', (p) => ({
      ...p,
      creatorName: p.creatorName || name,
      displayName: p.displayName || name,
      email: p.email || email,
      avatar: p.avatar || avatar,
    })),
}

// Whether the current step has what it needs to advance
export const canAdvanceJoin = (): boolean => {
  switch (state.step) {
    case 1:
      return state.agreementAccepted
    case 2:
      return state.profile.displayName.trim().length > 0
    default:
      return true
  }
}
