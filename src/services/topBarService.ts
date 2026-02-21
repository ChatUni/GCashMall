// TopBar data service - handles search suggestions fetching
// Following Rule #7: Data fetching via service pattern, not useEffect

import { apiGet, isLoggedIn, getStoredUser } from '../utils/api'
import { topBarStoreActions } from '../stores/topBarStore'
import type { SearchSuggestion } from '../types'

export const fetchSuggestions = async (query: string) => {
  if (query.length < 1) {
    topBarStoreActions.setSuggestions([])
    return
  }

  const data = await apiGet<SearchSuggestion[]>('searchSuggestions', {
    q: query,
  })
  if (data.success && data.data) {
    topBarStoreActions.setSuggestions(data.data)
  }
}

export const syncAuthState = () => {
  const loggedIn = isLoggedIn()
  const user = loggedIn ? getStoredUser() : null
  topBarStoreActions.syncAuthState(loggedIn, user)
}
