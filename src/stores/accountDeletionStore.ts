// Deleting your own account (Settings → Delete account), which the App Store requires of any
// app that lets people sign up. The server removes the account and its data; here we confirm
// first — warning that any credit balance is lost — then sign out.

import { createStore } from 'solid-js/store'
import { apiPostWithAuth } from '../utils/api'
import { handleLogoutAndNavigate } from '../services/accountService'
import { toastStoreActions } from './index'
import { t } from './languageStore'

interface AccountDeletionState {
  confirming: boolean
  deleting: boolean
}

const getInitialState = (): AccountDeletionState => ({ confirming: false, deleting: false })

const [state, setState] = createStore<AccountDeletionState>(getInitialState())

export const accountDeletionStore = state

const d = () => t().account.deleteAccount as unknown as Record<string, string>

export const accountDeletionActions = {
  open: () => setState({ confirming: true }),
  close: () => setState({ confirming: false }),

  confirm: async (navigate: (path: string) => void) => {
    setState({ deleting: true })
    const result = await apiPostWithAuth<{ deletedSeries: number }>('deleteAccount', { confirm: true })
    setState(getInitialState())
    if (!result.success) {
      toastStoreActions.show(result.error || d().failed, 'error')
      return
    }
    handleLogoutAndNavigate(navigate)
    toastStoreActions.show(d().done, 'success')
  },
}
