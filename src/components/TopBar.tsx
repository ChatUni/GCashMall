import { createEffect, Show } from 'solid-js'
import { useNavigate, useLocation } from '@solidjs/router'
import { APP_DISPLAY_NAME } from '../utils/config'
import { t } from '../stores/languageStore'
import { accountStore, accountStoreActions } from '../stores/accountStore'
import { startFreshQuickCreate } from '../services/quickCreateNav'
import { currentTheme, themeStoreActions } from '../stores/themeStore'
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

  // The "Create" link always starts a fresh Quick Create (never resumes the last one)
  const handleCreateClick = () => startFreshQuickCreate(navigate)

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
              src={
                currentTheme() === 'light'
                  ? 'https://res.cloudinary.com/daqc8bim3/image/upload/e_negate/v1764702233/logo.png'
                  : 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png'
              }
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
              <a
                class={`nav-link create-link ${isActiveRoute('/quick-create') ? 'active' : ''}`}
                onClick={handleCreateClick}
              >
                <span class="create-link-icon">✨</span>
                {t().topBar.create}
              </a>
            </nav>
          </div>

          <SearchBar />

          <div class="top-bar-right">
            <HistoryPopover />

            <div
              class="icon-button theme-toggle"
              onClick={() => themeStoreActions.toggle()}
              title="Toggle theme"
            >
              <Show
                when={currentTheme() === 'dark'}
                fallback={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  </svg>
                }
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </Show>
            </div>

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
