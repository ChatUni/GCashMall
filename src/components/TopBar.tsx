import { createEffect, Show } from 'solid-js'
import { useNavigate, useLocation } from '@solidjs/router'
import { APP_DISPLAY_NAME } from '../utils/config'
import { t } from '../stores/languageStore'
import { accountStore, accountStoreActions } from '../stores/accountStore'
import { topBarStore, topBarStoreActions } from '../stores/topBarStore'
import { syncAuthState } from '../services/topBarService'
import type { User } from '../types'
import SearchBar from './topbar/SearchBar'
import HistoryPopover from './topbar/HistoryPopover'
import LanguageSwitch from './topbar/LanguageSwitch'
import LoginModal from './LoginModal'
import './TopBar.css'

const TopBar = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isActiveRoute = (path: string): boolean => location.pathname === path

  // Sync login status when location or accountStore login state changes
  createEffect(() => {
    const _path = location.pathname
    const _storeLoggedIn = accountStore.isLoggedIn
    syncAuthState()
  })

  const handleLogoClick = () => navigate('/')

  const handleNavClick = (path: string) => navigate(path)

  const handleAccountClick = () => {
    if (topBarStore.isLoggedIn) {
      navigate('/account')
    } else {
      topBarStoreActions.setShowLoginModal(true)
    }
  }

  const handleLoginSuccess = (user: User) => {
    accountStoreActions.initializeUserData(user)
    topBarStoreActions.setShowLoginModal(false)
    navigate('/')
  }

  return (
    <>
      <div class="top-bar">
        <div class="top-bar-content">
          <div class="top-bar-left">
            <img
              src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
              alt="App Logo"
              class="app-logo"
              onClick={handleLogoClick}
            />
            <span class="app-name" onClick={handleLogoClick}>
              {APP_DISPLAY_NAME}
            </span>

            {/* Genre Icon - Shown on tablet/mobile when nav-links are hidden */}
            <div
              class={`icon-button genre-icon ${isActiveRoute('/genre') ? 'active' : ''}`}
              onClick={() => handleNavClick('/genre')}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>

            <nav class="nav-links">
              <a
                class={`nav-link ${isActiveRoute('/') ? 'active' : ''}`}
                onClick={() => handleNavClick('/')}
              >
                {t().topBar.home}
              </a>
              <a
                class={`nav-link ${isActiveRoute('/genre') ? 'active' : ''}`}
                onClick={() => handleNavClick('/genre')}
              >
                {t().topBar.genre}
              </a>
            </nav>
          </div>

          <SearchBar />

          <div class="top-bar-right">
            <HistoryPopover />

            <div
              class={`icon-button account-icon ${isActiveRoute('/account') ? 'active' : ''}`}
              onClick={handleAccountClick}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <LanguageSwitch />
          </div>
        </div>
      </div>

      <Show when={topBarStore.showLoginModal}>
        <LoginModal
          onClose={() => topBarStoreActions.setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </Show>
    </>
  )
}

export default TopBar
