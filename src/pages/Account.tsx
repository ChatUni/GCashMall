import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import SeriesCard from '../components/SeriesCard'
import { useLanguage } from '../context/LanguageContext'
import { useAccountStore, accountStoreActions, navItems, topUpAmounts, type AccountTab } from '../stores/accountStore'
import {
  initializeAccountData,
  fetchAccountUserData,
  handleLogout,
  saveProfile,
  changePassword,
  setPassword,
  uploadAvatar,
  clearWatchHistory,
  removeFromWatchList,
  removeFromFavorites,
  clearFavorites,
  topUp,
  hasProfileChanges,
} from '../services/accountService'
import { toastStoreActions, useToastStore } from '../stores'
import type { User } from '../types'
import './Account.css'

// Track initialization
let accountInitialized = false
let userDataFetched = false

const Account: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const state = useAccountStore()
  const toastState = useToastStore()

  // Initialize data (not in useEffect)
  if (!accountInitialized) {
    accountInitialized = true
    initializeAccountData(searchParams, (params) => setSearchParams(params))
  }

  // Fetch user data when logged in (only once)
  if (state.isLoggedIn && !userDataFetched) {
    userDataFetched = true
    fetchAccountUserData()
  }

  // Handle tab from URL
  const tabFromUrl = searchParams.get('tab')
  if (tabFromUrl && navItems.some((item) => item.key === tabFromUrl) && state.activeTab !== tabFromUrl) {
    accountStoreActions.setActiveTab(tabFromUrl as AccountTab)
  }

  // Event handlers
  const handleTabClick = (tab: AccountTab) => {
    accountStoreActions.setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleTabClickWithConfirm = (tab: AccountTab) => {
    if (state.activeTab === 'overview' && hasProfileChanges(state.profileForm, state.originalProfile)) {
      const confirmed = window.confirm(t.account.overview.unsavedChanges || 'You have unsaved changes. Do you want to discard them?')
      if (confirmed) {
        accountStoreActions.resetProfileForm()
      } else {
        return
      }
    }
    handleTabClick(tab)
  }

  const onLogout = () => {
    handleLogout()
    navigate('/')
  }

  const handleLoginClose = () => {
    accountStoreActions.setShowLoginModal(false)
    if (!state.isLoggedIn) {
      navigate('/')
    }
  }

  const handleLoginSuccess = async (user: User) => {
    // Initialize user data (sets loading: false, isLoggedIn: true)
    accountStoreActions.initializeUserData(user)
    // Fetch additional user data
    userDataFetched = false
    await fetchAccountUserData()
    userDataFetched = true
    // Hide the modal after loading is complete
    accountStoreActions.setShowLoginModal(false)
  }

  const onSaveProfile = async () => {
    const result = await saveProfile(state.profileForm, t.account.overview)
    if (result.success) {
      toastStoreActions.show(t.account.overview.saveSuccess || 'Profile updated successfully', 'success')
    } else if (result.error) {
      toastStoreActions.show(result.error, 'error')
    }
  }

  const onChangePassword = async () => {
    const result = await changePassword(state.passwordForm, t.account.overview)
    if (result.success) {
      toastStoreActions.show(t.account.overview.passwordChangeSuccess || 'Password changed successfully', 'success')
    } else if (result.error) {
      toastStoreActions.show(result.error, 'error')
    }
  }

  const onSetPassword = async () => {
    const result = await setPassword(state.passwordForm, t.account.overview)
    if (result.success) {
      toastStoreActions.show((t.login as Record<string, string>).setPasswordSuccess || 'Password set successfully', 'success')
    } else if (result.error) {
      toastStoreActions.show(result.error, 'error')
    }
  }

  const onAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const result = await uploadAvatar(file, t.account.overview)
    if (result.success) {
      toastStoreActions.show(t.account.overview.avatarUpdateSuccess || 'Avatar updated successfully', 'success')
    } else if (result.error) {
      toastStoreActions.show(result.error, 'error')
    }
  }

  const onTopUpClick = (amount: number) => {
    accountStoreActions.setSelectedTopUpAmount(amount)
    accountStoreActions.setShowTopUpPopup(true)
  }

  const onConfirmTopUp = () => {
    if (state.selectedTopUpAmount) {
      topUp(state.selectedTopUpAmount)
    }
  }

  if (state.loading) {
    return (
      <div className="account-page">
        <TopBar />
        <div className="loading">Loading...</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="account-page">
      <TopBar />
      <div className="account-layout">
        <AccountSidebar
          user={state.user}
          activeTab={state.activeTab}
          onTabClick={handleTabClickWithConfirm}
          onLogout={onLogout}
          t={t}
        />
        <main className="account-content">
          {state.activeTab === 'overview' && (
            <OverviewSection
              user={state.user}
              hasPassword={state.user?.hasPassword ?? true}
              profileForm={state.profileForm}
              profileErrors={state.profileErrors}
              profileSaving={state.profileSaving}
              originalProfile={state.originalProfile}
              passwordForm={state.passwordForm}
              passwordErrors={state.passwordErrors}
              passwordChanging={state.passwordChanging}
              avatarError={state.avatarError}
              avatarUploading={state.avatarUploading}
              onSaveProfile={onSaveProfile}
              onChangePassword={onChangePassword}
              onSetPassword={onSetPassword}
              onAvatarUpload={onAvatarUpload}
              t={t}
            />
          )}
          {state.activeTab === 'watchHistory' && (
            <WatchHistorySection
              items={state.user?.watchList || []}
              onClearHistory={clearWatchHistory}
              onRemoveItem={removeFromWatchList}
              onNavigate={navigate}
              t={t}
            />
          )}
          {state.activeTab === 'favorites' && (
            <FavoritesSection
              items={state.user?.favorites || []}
              onClearFavorites={clearFavorites}
              onRemoveItem={removeFromFavorites}
              onNavigate={navigate}
              t={t}
            />
          )}
          {state.activeTab === 'settings' && (
            <SettingsSection
              language={language}
              playbackSpeed={state.playbackSpeed}
              autoplay={state.autoplay}
              notifications={state.notifications}
              onLanguageChange={setLanguage}
              t={t}
            />
          )}
          {state.activeTab === 'wallet' && (
            <WalletSection
              balance={state.balance}
              showTopUpPopup={state.showTopUpPopup}
              selectedTopUpAmount={state.selectedTopUpAmount}
              onTopUpClick={onTopUpClick}
              onConfirmTopUp={onConfirmTopUp}
              onClosePopup={() => accountStoreActions.setShowTopUpPopup(false)}
              t={t}
            />
          )}
        </main>
      </div>
      <BottomBar />

      {state.showLoginModal && (
        <LoginModal onClose={handleLoginClose} onLoginSuccess={handleLoginSuccess} />
      )}

      {toastState.isVisible && (
        <div className={`toast-notification toast-${toastState.type}`}>
          {toastState.message}
        </div>
      )}
    </div>
  )
}

// Pure sub-components

interface AccountSidebarProps {
  user: { nickname?: string; email?: string; avatar?: string | null } | null
  activeTab: AccountTab
  onTabClick: (tab: AccountTab) => void
  onLogout: () => void
  t: Record<string, Record<string, unknown>>
}

const AccountSidebar: React.FC<AccountSidebarProps> = ({ user, activeTab, onTabClick, onLogout, t }) => (
  <aside className="account-sidebar">
    <div className="sidebar-profile">
      <div className="sidebar-avatar">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.nickname} />
        ) : (
          <span className="avatar-emoji">👤</span>
        )}
      </div>
      <div className="sidebar-user-info">
        <span className="sidebar-username">{user?.nickname || 'Guest'}</span>
        <span className="sidebar-email">{user?.email || ''}</span>
      </div>
    </div>

    <nav className="account-nav">
      {navItems.map((item) => (
        <button
          key={item.key}
          className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
          onClick={() => onTabClick(item.key)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{(t.account.nav as Record<string, string>)[item.key]}</span>
        </button>
      ))}
    </nav>

    <button className="nav-item logout" onClick={onLogout}>
      <span className="nav-icon">🚪</span>
      <span className="nav-label">{(t.account.nav as Record<string, string>).logout}</span>
    </button>
  </aside>
)

interface OverviewSectionProps {
  user: { avatar?: string | null } | null
  hasPassword: boolean
  profileForm: { nickname: string; email: string; phoneNumber: string; gender: string; birthday: string }
  profileErrors: { emailError: string; phoneError: string; birthdayError: string }
  profileSaving: boolean
  originalProfile: { nickname: string; email: string; phoneNumber: string; gender: string; birthday: string }
  passwordForm: { currentPassword: string; newPassword: string; confirmPassword: string }
  passwordErrors: { currentPasswordError: string; newPasswordError: string; confirmPasswordError: string }
  passwordChanging: boolean
  avatarError: string
  avatarUploading: boolean
  onSaveProfile: () => void
  onChangePassword: () => void
  onSetPassword: () => void
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  t: Record<string, Record<string, unknown>>
}

const OverviewSection: React.FC<OverviewSectionProps> = ({
  user,
  hasPassword,
  profileForm,
  profileErrors,
  profileSaving,
  originalProfile,
  passwordForm,
  passwordErrors,
  passwordChanging,
  avatarError,
  avatarUploading,
  onSaveProfile,
  onChangePassword,
  onSetPassword,
  onAvatarUpload,
  t,
}) => {
  const overview = t.account.overview as Record<string, string>
  const login = t.login as Record<string, string>
  const profileHasChanges = hasProfileChanges(profileForm, originalProfile)

  return (
    <div className="content-section overview-section">
      <div className="section-header">
        <h1 className="page-title">{overview.title}</h1>
        <p className="page-subtitle">{overview.subtitle}</p>
      </div>

      <div className="section-card">
        <h3 className="card-title">{overview.profileInfo}</h3>
        <div className="form-grid">
          <ProfileField
            label={overview.nickname}
            type="text"
            name="nickname"
            autoComplete="nickname"
            value={profileForm.nickname}
            onChange={(v) => accountStoreActions.updateProfileField('nickname', v)}
            placeholder={overview.nicknamePlaceholder}
          />
          <ProfileField
            label={overview.email}
            type="email"
            name="email"
            autoComplete="email"
            value={profileForm.email}
            onChange={(v) => {
              accountStoreActions.updateProfileField('email', v)
              if (profileErrors.emailError) accountStoreActions.updateProfileError('emailError', '')
            }}
            placeholder={overview.emailPlaceholder}
            error={profileErrors.emailError}
          />
          <ProfileField
            label={overview.phoneNumber}
            type="tel"
            name="phone"
            autoComplete="tel"
            value={profileForm.phoneNumber}
            onChange={(v) => {
              accountStoreActions.updateProfileField('phoneNumber', v)
              if (profileErrors.phoneError) accountStoreActions.updateProfileError('phoneError', '')
            }}
            placeholder={overview.phonePlaceholder}
            error={profileErrors.phoneError}
          />
          <div className="form-field">
            <label>{overview.gender}</label>
            <select
              name="gender"
              autoComplete="sex"
              value={profileForm.gender}
              onChange={(e) => accountStoreActions.updateProfileField('gender', e.target.value)}
            >
              <option value="not_specified">{overview.genderNotSpecified}</option>
              <option value="male">{overview.genderMale}</option>
              <option value="female">{overview.genderFemale}</option>
              <option value="other">{overview.genderOther}</option>
            </select>
          </div>
          <ProfileField
            label={overview.birthday}
            type="date"
            name="birthday"
            autoComplete="bday"
            value={profileForm.birthday}
            onChange={(v) => {
              accountStoreActions.updateProfileField('birthday', v)
              if (profileErrors.birthdayError) accountStoreActions.updateProfileError('birthdayError', '')
            }}
            error={profileErrors.birthdayError}
          />
        </div>
        <button
          className="btn-primary"
          onClick={onSaveProfile}
          disabled={!profileHasChanges || profileSaving}
        >
          {profileSaving ? '...' : overview.save}
        </button>
      </div>

      <div className="section-card">
        <h3 className="card-title">{overview.profilePicture}</h3>
        <div className="avatar-section">
          <div className="avatar-preview">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" />
            ) : (
              <span className="avatar-emoji-large">👤</span>
            )}
          </div>
          <div className="avatar-actions">
            <label className={`btn-primary upload-btn ${avatarUploading ? 'disabled' : ''}`}>
              {avatarUploading ? '...' : overview.uploadAvatar}
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarUpload}
                hidden
                disabled={avatarUploading}
              />
            </label>
          </div>
          {avatarError && <span className="field-error">{avatarError}</span>}
          <p className="avatar-hint">{overview.avatarHint}</p>
        </div>
      </div>

      <div className="section-card">
        <h3 className="card-title">{hasPassword ? overview.changePassword : login.setPassword || 'Set Password'}</h3>
        <div className="form-grid password-form">
          {hasPassword && (
            <PasswordField
              label={overview.currentPassword}
              value={passwordForm.currentPassword}
              onChange={(v) => {
                accountStoreActions.updatePasswordField('currentPassword', v)
                if (passwordErrors.currentPasswordError) accountStoreActions.updatePasswordError('currentPasswordError', '')
              }}
              placeholder={overview.currentPasswordPlaceholder}
              error={passwordErrors.currentPasswordError}
            />
          )}
          <PasswordField
            label={overview.newPassword}
            value={passwordForm.newPassword}
            onChange={(v) => {
              accountStoreActions.updatePasswordField('newPassword', v)
              if (passwordErrors.newPasswordError) accountStoreActions.updatePasswordError('newPasswordError', '')
            }}
            placeholder={overview.newPasswordPlaceholder}
            error={passwordErrors.newPasswordError}
          />
          <PasswordField
            label={overview.confirmPassword}
            value={passwordForm.confirmPassword}
            onChange={(v) => {
              accountStoreActions.updatePasswordField('confirmPassword', v)
              if (passwordErrors.confirmPasswordError) accountStoreActions.updatePasswordError('confirmPasswordError', '')
            }}
            placeholder={overview.confirmPasswordPlaceholder}
            error={passwordErrors.confirmPasswordError}
          />
        </div>
        <button
          className="btn-primary"
          onClick={hasPassword ? onChangePassword : onSetPassword}
          disabled={passwordChanging}
        >
          {passwordChanging ? '...' : (hasPassword ? overview.changePasswordBtn : (login.setPassword || 'Set Password'))}
        </button>
      </div>
    </div>
  )
}

interface ProfileFieldProps {
  label: string
  type: string
  name: string
  autoComplete: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  type,
  name,
  autoComplete,
  value,
  onChange,
  placeholder,
  error,
}) => (
  <div className="form-field">
    <label>{label}</label>
    <input
      type={type}
      name={name}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={error ? 'input-error' : ''}
    />
    {error && <span className="field-error">{error}</span>}
  </div>
)

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error: string
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
}) => (
  <div className="form-field">
    <label>{label}</label>
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={error ? 'input-error' : ''}
    />
    {error && <span className="field-error">{error}</span>}
  </div>
)

interface WatchHistorySectionProps {
  items: { seriesId: string; episodeNumber: number; addedAt: Date; updatedAt: Date }[]
  onClearHistory: () => Promise<{ success: boolean; error?: string }>
  onRemoveItem: (seriesId: string) => Promise<{ success: boolean; error?: string }>
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const WatchHistorySection: React.FC<WatchHistorySectionProps> = ({
  items,
  onClearHistory,
  onRemoveItem,
  onNavigate,
  t,
}) => {
  const watchHistory = t.account.watchHistory as Record<string, string>

  // Sort items by updatedAt descending (most recent first)
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return (
    <div className="content-section history-section">
      <div className="section-header-row">
        <h1 className="page-title">{watchHistory.title}</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={onClearHistory}>
            {watchHistory.clearHistory}
          </button>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <EmptyState
          icon="📺"
          title={watchHistory.emptyTitle}
          subtext={watchHistory.emptySubtext}
          buttonText={watchHistory.exploreButton}
          onButtonClick={() => onNavigate('/series')}
        />
      ) : (
        <div className="content-grid">
          {sortedItems.map((item) => (
            <HistoryCard
              key={item.seriesId}
              seriesId={item.seriesId}
              episodeNumber={item.episodeNumber}
              onClick={() => onNavigate(`/player/${item.seriesId}?episode=${item.episodeNumber}`)}
              onRemove={(e) => {
                e.stopPropagation()
                onRemoveItem(item.seriesId)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface HistoryCardProps {
  seriesId: string
  episodeNumber: number
  onClick: () => void
  onRemove: (e: React.MouseEvent) => void
}

const HistoryCard: React.FC<HistoryCardProps> = ({
  seriesId,
  episodeNumber,
  onClick,
  onRemove,
}) => {
  // Fetch series data for display
  const [series, setSeries] = React.useState<{ name: string; cover: string; tags?: string[] } | null>(null)

  React.useEffect(() => {
    const fetchSeries = async () => {
      try {
        const response = await fetch(`${import.meta.env.DEV ? 'http://localhost:8888' : ''}/.netlify/functions/api?type=series&id=${seriesId}`)
        const data = await response.json()
        if (data.success && data.data) {
          setSeries(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch series:', error)
      }
    }
    fetchSeries()
  }, [seriesId])

  return (
    <div className="history-card series-card" onClick={onClick}>
      <div className="series-card-poster">
        {series?.cover ? (
          <img src={series.cover} alt={series.name || 'Series'} className="series-card-image" />
        ) : (
          <div className="series-card-placeholder" />
        )}
        <div className="series-card-overlay">
          <svg className="series-card-play-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
        <span className="episode-badge">EP {episodeNumber}</span>
        <button className="remove-btn" onClick={onRemove}>
          ✕
        </button>
      </div>
      <div className="series-card-info">
        <h3 className="series-card-title">{series?.name || `Series ${seriesId}`}</h3>
        {series?.tags && series.tags.length > 0 && (
          <span className="series-card-tag">{series.tags[0]}</span>
        )}
      </div>
    </div>
  )
}

interface FavoritesSectionProps {
  items: { seriesId: string; seriesName: string; seriesCover: string; seriesTags?: string[]; addedAt: Date }[]
  onClearFavorites: () => Promise<{ success: boolean; error?: string }>
  onRemoveItem: (seriesId: string) => Promise<{ success: boolean; error?: string }>
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const FavoritesSection: React.FC<FavoritesSectionProps> = ({
  items,
  onClearFavorites,
  onRemoveItem,
  onNavigate,
  t,
}) => {
  const favorites = t.account.favorites as Record<string, string>

  // Sort items by addedAt descending (most recent first)
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  )

  return (
    <div className="content-section favorites-section">
      <div className="section-header-row">
        <h1 className="page-title">{favorites.title}</h1>
        {sortedItems.length > 0 && (
          <div className="header-actions">
            <button className="btn-secondary" onClick={onClearFavorites}>
              {favorites.clearFavorites || 'Clear Favorites'}
            </button>
          </div>
        )}
      </div>

      {sortedItems.length === 0 ? (
        <EmptyState
          icon="❤️"
          title={favorites.emptyTitle}
          subtext={favorites.emptySubtext}
          buttonText={favorites.exploreButton}
          onButtonClick={() => onNavigate('/series')}
        />
      ) : (
        <div className="content-grid">
          {sortedItems.map((item) => (
            <FavoriteCard
              key={item.seriesId}
              seriesId={item.seriesId}
              seriesName={item.seriesName}
              seriesCover={item.seriesCover}
              seriesTags={item.seriesTags}
              onClick={() => onNavigate(`/player/${item.seriesId}`)}
              onRemove={(e) => {
                e.stopPropagation()
                onRemoveItem(item.seriesId)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FavoriteCardProps {
  seriesId: string
  seriesName: string
  seriesCover: string
  seriesTags?: string[]
  onClick: () => void
  onRemove: (e: React.MouseEvent) => void
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  seriesId,
  seriesName,
  seriesCover,
  seriesTags,
  onClick,
  onRemove,
}) => {
  return (
    <div className="favorite-card series-card" onClick={onClick}>
      <div className="series-card-poster">
        {seriesCover ? (
          <img src={seriesCover} alt={seriesName || 'Series'} className="series-card-image" />
        ) : (
          <div className="series-card-placeholder" />
        )}
        <div className="series-card-overlay">
          <svg className="series-card-play-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
        <button className="remove-btn" onClick={onRemove}>
          ✕
        </button>
      </div>
      <div className="series-card-info">
        <h3 className="series-card-title">{seriesName || `Series ${seriesId}`}</h3>
        {seriesTags && seriesTags.length > 0 && (
          <span className="series-card-tag">{seriesTags[0]}</span>
        )}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon: string
  title: string
  subtext: string
  buttonText: string
  onButtonClick: () => void
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtext,
  buttonText,
  onButtonClick,
}) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <h3 className="empty-title">{title}</h3>
    <p className="empty-subtext">{subtext}</p>
    <button className="btn-primary" onClick={onButtonClick}>
      {buttonText}
    </button>
  </div>
)

interface SettingsSectionProps {
  language: string
  playbackSpeed: string
  autoplay: boolean
  notifications: boolean
  onLanguageChange: (lang: 'en' | 'zh') => void
  t: Record<string, Record<string, unknown>>
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  language,
  playbackSpeed,
  autoplay,
  notifications,
  onLanguageChange,
  t,
}) => {
  const settings = t.account.settings as Record<string, string>

  return (
    <div className="content-section settings-section">
      <h1 className="page-title">{settings.title}</h1>

      <div className="section-card">
        <h3 className="card-title">{settings.preferences}</h3>

        <div className="setting-row">
          <label className="setting-label">{settings.language}</label>
          <select
            className="setting-control"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as 'en' | 'zh')}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="setting-row">
          <label className="setting-label">{settings.playbackSpeed}</label>
          <select
            className="setting-control"
            value={playbackSpeed}
            onChange={(e) => accountStoreActions.setPlaybackSpeed(e.target.value)}
          >
            <option value="0.5x">0.5x</option>
            <option value="1x">1x</option>
            <option value="1.5x">1.5x</option>
            <option value="2x">2x</option>
          </select>
        </div>

        <div className="setting-row">
          <label className="setting-label">{settings.autoplay}</label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => accountStoreActions.setAutoplay(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <label className="setting-label">{settings.notifications}</label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => accountStoreActions.setNotifications(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  )
}

interface WalletSectionProps {
  balance: number
  showTopUpPopup: boolean
  selectedTopUpAmount: number | null
  onTopUpClick: (amount: number) => void
  onConfirmTopUp: () => void
  onClosePopup: () => void
  t: Record<string, Record<string, unknown>>
}

const WalletSection: React.FC<WalletSectionProps> = ({
  balance,
  showTopUpPopup,
  selectedTopUpAmount,
  onTopUpClick,
  onConfirmTopUp,
  onClosePopup,
  t,
}) => {
  const wallet = t.account.wallet as Record<string, string>

  return (
    <div className="content-section wallet-section">
      <div className="section-header">
        <h1 className="page-title">{wallet.title}</h1>
        <p className="page-subtitle">{wallet.subtitle}</p>
      </div>

      <div className="balance-card">
        <div className="balance-icon">💰</div>
        <div className="balance-info">
          <span className="balance-label">{wallet.currentBalance}</span>
          <div className="balance-amount">
            <img src="/gcash-logo.png" alt="GCash" className="gcash-logo" />
            <span>{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="section-card topup-section">
        <h3 className="card-title">{wallet.topUp}</h3>
        <p className="topup-description">{wallet.topUpDescription}</p>
        <div className="topup-grid">
          {topUpAmounts.map((amount) => (
            <button
              key={amount}
              className="topup-button"
              onClick={() => onTopUpClick(amount)}
            >
              <img src="/gcash-logo.png" alt="GCash" className="topup-logo" />
              <span className="topup-amount">{amount}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h3 className="card-title">{wallet.transactionHistory}</h3>
        <p className="empty-text">{wallet.noTransactions}</p>
      </div>

      {showTopUpPopup && selectedTopUpAmount && (
        <div className="popup-overlay" onClick={onClosePopup}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="/gcash-logo.png" alt="GCash" className="popup-logo" />
            <h2 className="popup-title">{wallet.confirmTopUp}</h2>
            <p className="popup-message">{wallet.addToWallet}</p>
            <div className="popup-amount">
              <img src="/gcash-logo.png" alt="GCash" className="popup-amount-logo" />
              <span>{selectedTopUpAmount}</span>
            </div>
            <div className="popup-buttons">
              <button className="btn-confirm" onClick={onConfirmTopUp}>
                {wallet.confirm}
              </button>
              <button className="btn-cancel" onClick={onClosePopup}>
                {wallet.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Account
