// Navigation into the Quick Create wizard.
//
// Two things make this more than a plain navigate():
//  • Two wizard versions share the /quick-create route (VITE_QUICK_CREATE_VERSION), each
//    with its own store — clearing the wrong one leaves the live wizard untouched.
//  • "Create your own" is reachable from /quick-create itself (e.g. the Episode Ready page
//    opened from My Series). The router keeps the same route component mounted, so nothing
//    re-runs on navigate and the wizard would stay on the previous run's step. Resetting the
//    store here is what actually returns the user to Page 1.

import { quickCreateStoreActions } from '../stores/quickCreateStore'
import { quickCreateV1Actions } from '../stores/quickCreateV1Store'

export const isQuickCreateV1 = import.meta.env.VITE_QUICK_CREATE_VERSION === 'v1'

// Always start a fresh story — never resume the last generation.
export const startFreshQuickCreate = (navigate: (path: string) => void) => {
  if (isQuickCreateV1) {
    quickCreateV1Actions.reset()
  } else {
    quickCreateStoreActions.reset()
  }
  navigate('/quick-create')
}
