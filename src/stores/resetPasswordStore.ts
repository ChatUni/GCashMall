// Reset Password page store
// Following Rule #7: States shared by 2+ components must be defined outside the component tree

import { createStore } from 'solid-js/store'

// ======================
// State
// ======================

type PageView = 'invalidLink' | 'form' | 'success'

interface ResetPasswordState {
  email: string
  token: string
  newPassword: string
  confirmPassword: string
  errors: Record<string, string>
  isLoading: boolean
  apiError: string
  view: PageView
}

const getInitialState = (): ResetPasswordState => ({
  email: '',
  token: '',
  newPassword: '',
  confirmPassword: '',
  errors: {},
  isLoading: false,
  apiError: '',
  view: 'invalidLink',
})

const [resetPasswordState, setResetPasswordState] =
  createStore<ResetPasswordState>(getInitialState())

export const resetPasswordStore = resetPasswordState

// ======================
// Actions
// ======================

export const resetPasswordStoreActions = {
  setEmail: (email: string) => setResetPasswordState({ email }),
  setToken: (token: string) => setResetPasswordState({ token }),
  setNewPassword: (newPassword: string) => setResetPasswordState({ newPassword }),
  setConfirmPassword: (confirmPassword: string) =>
    setResetPasswordState({ confirmPassword }),
  setErrors: (errors: Record<string, string>) =>
    setResetPasswordState({ errors }),
  setIsLoading: (isLoading: boolean) => setResetPasswordState({ isLoading }),
  setApiError: (apiError: string) => setResetPasswordState({ apiError }),
  setView: (view: PageView) => setResetPasswordState({ view }),
  reset: () => setResetPasswordState(getInitialState()),
  getState: () => resetPasswordState,
}
