import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import { SeriesEditContent } from './SeriesEdit'
import { useLanguage } from '../context/LanguageContext'
import { useAccountStore, accountStoreActions, navItems, walletAmounts, type AccountTab, type Transaction } from '../stores/accountStore'
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
  withdraw,
  hasProfileChanges,
  fetchMyPurchases,
  fetchMySeries,
  shelveSeries,
  setEditingSeries,
} from '../services/accountService'
import { toastStoreActions, useToastStore } from '../stores'
import type { PurchaseItem, Series, User } from '../types'
import './Account.css'

// Track initialization
let accountInitialized = false
let userDataFetched = false
let myPurchasesFetched = false
let mySeriesFetched = false

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

  // Fetch my purchases when logged in (only once)
  if (state.isLoggedIn && !myPurchasesFetched) {
    myPurchasesFetched = true
    fetchMyPurchases()
  }

  // Fetch my series when logged in (only once)
  if (state.isLoggedIn && !mySeriesFetched) {
    mySeriesFetched = true
    fetchMySeries()
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
              walletTab={state.walletTab}
              showTopUpPopup={state.showTopUpPopup}
              selectedTopUpAmount={state.selectedTopUpAmount}
              showWithdrawPopup={state.showWithdrawPopup}
              selectedWithdrawAmount={state.selectedWithdrawAmount}
              withdrawing={state.withdrawing}
              transactions={state.transactions}
              t={t}
            />
          )}
          {state.activeTab === 'myPurchases' && (
            <MyPurchasesSection
              purchases={state.myPurchases}
              loading={state.myPurchasesLoading}
              onNavigate={navigate}
              t={t}
            />
          )}
          {state.activeTab === 'mySeries' && (
            <MySeriesSection
              series={state.mySeries}
              loading={state.mySeriesLoading}
              editingSeriesId={state.editingSeriesId}
              onNavigate={navigate}
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
  walletTab: 'topup' | 'withdraw'
  showTopUpPopup: boolean
  selectedTopUpAmount: number | null
  showWithdrawPopup: boolean
  selectedWithdrawAmount: number | null
  withdrawing: boolean
  transactions: Transaction[]
  t: Record<string, Record<string, unknown>>
}

const WalletSection: React.FC<WalletSectionProps> = ({
  balance,
  walletTab,
  showTopUpPopup,
  selectedTopUpAmount,
  showWithdrawPopup,
  selectedWithdrawAmount,
  withdrawing,
  transactions,
  t,
}) => {
  const wallet = t.account.wallet as Record<string, string>

  const handleTopUpClick = (amount: number) => {
    accountStoreActions.setSelectedTopUpAmount(amount)
    accountStoreActions.setShowTopUpPopup(true)
  }

  const handleWithdrawClick = (amount: number) => {
    if (amount > balance) {
      toastStoreActions.show(wallet.insufficientBalance || 'Insufficient balance', 'error')
      return
    }
    accountStoreActions.setSelectedWithdrawAmount(amount)
    accountStoreActions.setShowWithdrawPopup(true)
  }

  const handleConfirmTopUp = () => {
    if (selectedTopUpAmount) {
      topUp(selectedTopUpAmount)
      toastStoreActions.show(wallet.topUpSuccess || 'Top up successful', 'success')
    }
  }

  const handleConfirmWithdraw = async () => {
    if (selectedWithdrawAmount) {
      const result = await withdraw(selectedWithdrawAmount)
      if (result.success) {
        toastStoreActions.show(wallet.withdrawSuccess || 'Withdrawal successful', 'success')
      } else {
        toastStoreActions.show(result.error || wallet.withdrawFailed || 'Failed to withdraw', 'error')
      }
    }
  }

  const handleCloseTopUpPopup = () => {
    accountStoreActions.setShowTopUpPopup(false)
    accountStoreActions.setSelectedTopUpAmount(null)
  }

  const handleCloseWithdrawPopup = () => {
    accountStoreActions.setShowWithdrawPopup(false)
    accountStoreActions.setSelectedWithdrawAmount(null)
  }

  // Format date for display
  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleString()
  }

  // Get status display class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'status-success'
      case 'failed':
        return 'status-failed'
      case 'processing':
        return 'status-processing'
      default:
        return ''
    }
  }

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return wallet.statusSuccess || 'Success'
      case 'failed':
        return wallet.statusFailed || 'Failed'
      case 'processing':
        return wallet.statusProcessing || 'Processing'
      default:
        return status
    }
  }

  // Get type display text
  const getTypeText = (type: string) => {
    switch (type) {
      case 'topup':
        return wallet.topUp || 'Top Up'
      case 'withdraw':
        return wallet.withdraw || 'Withdraw'
      default:
        return type
    }
  }

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
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="gcash-logo" />
            <span>{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Wallet Tabs */}
      <div className="wallet-tabs">
        <button
          className={`wallet-tab ${walletTab === 'topup' ? 'active' : ''}`}
          onClick={() => accountStoreActions.setWalletTab('topup')}
        >
          {wallet.topUp}
        </button>
        <button
          className={`wallet-tab ${walletTab === 'withdraw' ? 'active' : ''}`}
          onClick={() => accountStoreActions.setWalletTab('withdraw')}
        >
          {wallet.withdraw || 'Withdraw'}
        </button>
      </div>

      {/* Amount Selection Section */}
      <div className="section-card amount-section">
        <h3 className="card-title">
          {walletTab === 'topup'
            ? (wallet.selectTopUpAmount || 'Select Top Up Amount')
            : (wallet.selectWithdrawAmount || 'Select Withdraw Amount')
          }
        </h3>
        <p className="amount-description">
          {walletTab === 'topup'
            ? wallet.topUpDescription
            : (wallet.withdrawDescription || 'Select an amount to withdraw from your wallet')
          }
        </p>
        <div className="amount-grid">
          {walletAmounts.map((amount) => (
            <button
              key={amount}
              className={`amount-button ${walletTab === 'withdraw' && amount > balance ? 'disabled' : ''}`}
              onClick={() => walletTab === 'topup' ? handleTopUpClick(amount) : handleWithdrawClick(amount)}
              disabled={walletTab === 'withdraw' && amount > balance}
            >
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="amount-logo" />
              <span className="amount-value">{amount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="section-card transaction-history-section">
        <h3 className="card-title">{wallet.transactionHistory || 'Transaction History'}</h3>
        {transactions.length === 0 ? (
          <p className="no-transactions">{wallet.noTransactions || 'No transactions yet'}</p>
        ) : (
          <div className="transaction-table-container">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>{wallet.time || 'Time'}</th>
                  <th>{wallet.type || 'Type'}</th>
                  <th>{wallet.amount || 'Amount'}</th>
                  <th>{wallet.status || 'Status'}</th>
                  <th>{wallet.referenceId || 'Reference ID'}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="transaction-time">{formatDate(transaction.createdAt)}</td>
                    <td className={`transaction-type type-${transaction.type}`}>
                      {getTypeText(transaction.type)}
                    </td>
                    <td className="transaction-amount">
                      <span className={transaction.type === 'topup' ? 'amount-positive' : 'amount-negative'}>
                        {transaction.type === 'topup' ? '+' : '-'}{transaction.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className={`transaction-status ${getStatusClass(transaction.status)}`}>
                      {getStatusText(transaction.status)}
                    </td>
                    <td className="transaction-reference">{transaction.referenceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Up Confirmation Popup */}
      {showTopUpPopup && selectedTopUpAmount && (
        <div className="popup-overlay" onClick={handleCloseTopUpPopup}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="popup-logo" />
            <h2 className="popup-title">{wallet.confirmTopUp}</h2>
            <p className="popup-message">{wallet.addToWallet}</p>
            <div className="popup-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="popup-amount-logo" />
              <span>{selectedTopUpAmount}</span>
            </div>
            <div className="popup-buttons">
              <button className="btn-confirm" onClick={handleConfirmTopUp}>
                {wallet.confirm}
              </button>
              <button className="btn-cancel" onClick={handleCloseTopUpPopup}>
                {wallet.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Popup */}
      {showWithdrawPopup && selectedWithdrawAmount && (
        <div className="popup-overlay" onClick={handleCloseWithdrawPopup}>
          <div className="popup-modal withdraw-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="popup-logo" />
            <h2 className="popup-title">{wallet.confirmWithdraw || 'Confirm Withdraw'}</h2>
            <p className="popup-message">{wallet.withdrawFromWallet || 'Withdraw from your wallet'}</p>
            <div className="popup-amount withdraw-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="popup-amount-logo" />
              <span>{selectedWithdrawAmount}</span>
            </div>
            <div className="popup-buttons">
              <button
                className="btn-withdraw-confirm"
                onClick={handleConfirmWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? '...' : (wallet.confirm || 'Confirm')}
              </button>
              <button className="btn-cancel" onClick={handleCloseWithdrawPopup} disabled={withdrawing}>
                {wallet.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MyPurchasesSectionProps {
  purchases: PurchaseItem[]
  loading: boolean
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const MyPurchasesSection: React.FC<MyPurchasesSectionProps> = ({
  purchases,
  loading,
  onNavigate,
  t,
}) => {
  const myPurchases = (t.account.myPurchases || {}) as Record<string, string>

  if (loading) {
    return (
      <div className="content-section my-purchases-section">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  // Group purchases by series
  const purchasesBySeries = purchases.reduce((acc, purchase) => {
    if (!acc[purchase.seriesId]) {
      acc[purchase.seriesId] = {
        seriesId: purchase.seriesId,
        seriesName: purchase.seriesName,
        seriesCover: purchase.seriesCover,
        episodes: [],
      }
    }
    acc[purchase.seriesId].episodes.push(purchase)
    return acc
  }, {} as Record<string, { seriesId: string; seriesName: string; seriesCover: string; episodes: PurchaseItem[] }>)

  const seriesList = Object.values(purchasesBySeries)

  return (
    <div className="content-section my-purchases-section">
      <div className="section-header">
        <h1 className="page-title">{myPurchases.title || 'My Purchases'}</h1>
        <p className="page-subtitle">{myPurchases.subtitle || 'Episodes you have purchased'}</p>
      </div>

      {seriesList.length === 0 ? (
        <EmptyState
          icon="🛒"
          title={myPurchases.emptyTitle || 'No purchases yet'}
          subtext={myPurchases.emptySubtext || 'Browse series and purchase episodes to watch'}
          buttonText={myPurchases.exploreButton || 'Explore Series'}
          onButtonClick={() => onNavigate('/series')}
        />
      ) : (
        <div className="purchases-list">
          {seriesList.map((seriesGroup) => (
            <div key={seriesGroup.seriesId} className="purchase-series-group">
              <div className="purchase-series-header" onClick={() => onNavigate(`/player/${seriesGroup.seriesId}`)}>
                <div className="purchase-series-cover">
                  {seriesGroup.seriesCover ? (
                    <img src={seriesGroup.seriesCover} alt={seriesGroup.seriesName} />
                  ) : (
                    <div className="purchase-series-placeholder">🎬</div>
                  )}
                </div>
                <div className="purchase-series-info">
                  <h3 className="purchase-series-name">{seriesGroup.seriesName}</h3>
                  <span className="purchase-episode-count">
                    {seriesGroup.episodes.length} {seriesGroup.episodes.length === 1 ? (myPurchases.episode || 'episode') : (myPurchases.episodes || 'episodes')}
                  </span>
                </div>
              </div>
              <div className="purchase-episodes-grid">
                {seriesGroup.episodes
                  .sort((a, b) => a.episodeNumber - b.episodeNumber)
                  .map((episode) => (
                    <div
                      key={episode.episodeId}
                      className="purchase-episode-card"
                      onClick={() => onNavigate(`/player/${seriesGroup.seriesId}?episode=${episode.episodeNumber}`)}
                    >
                      <div className="purchase-episode-thumbnail">
                        {episode.episodeThumbnail ? (
                          <img src={episode.episodeThumbnail} alt={`Episode ${episode.episodeNumber}`} />
                        ) : (
                          <div className="purchase-episode-placeholder">▶️</div>
                        )}
                        <div className="purchase-episode-overlay">
                          <svg className="purchase-play-icon" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </div>
                      </div>
                      <div className="purchase-episode-info">
                        <span className="purchase-episode-number">EP {episode.episodeNumber}</span>
                        {episode.episodeTitle && (
                          <span className="purchase-episode-title">{episode.episodeTitle}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface MySeriesSectionProps {
  series: Series[]
  loading: boolean
  editingSeriesId: string | null
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const MySeriesSection: React.FC<MySeriesSectionProps> = ({
  series,
  loading,
  editingSeriesId,
  onNavigate,
  t,
}) => {
  const mySeries = (t.account.mySeries || {}) as Record<string, string>

  const handleShelve = async (seriesId: string) => {
    const result = await shelveSeries(seriesId)
    if (!result.success && result.error) {
      toastStoreActions.show(result.error, 'error')
    }
  }

  const handleEdit = (seriesItem: Series) => {
    setEditingSeries(seriesItem)
    accountStoreActions.setEditingSeriesId(seriesItem._id)
  }

  const handleAddSeries = () => {
    setEditingSeries(null)
    accountStoreActions.setEditingSeriesId('new')
  }

  const handleCancelEdit = () => {
    accountStoreActions.setEditingSeriesId(null)
    setEditingSeries(null)
  }

  const handleSaveComplete = () => {
    accountStoreActions.setEditingSeriesId(null)
    setEditingSeries(null)
    // Refresh the series list
    fetchMySeries()
  }

  if (loading) {
    return (
      <div className="content-section my-series-section">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  // Show SeriesEditContent when editing or adding
  if (editingSeriesId) {
    const isAddMode = editingSeriesId === 'new'
    const sectionTitle = isAddMode
      ? (mySeries.addSeriesTitle || 'Add Series')
      : (mySeries.editSeriesTitle || 'Edit Series')
    
    return (
      <div className="content-section my-series-section">
        <h1 className="page-title">{sectionTitle}</h1>
        <SeriesEditContent
          seriesId={editingSeriesId}
          onCancel={handleCancelEdit}
          onSaveComplete={handleSaveComplete}
        />
      </div>
    )
  }

  return (
    <div className="content-section my-series-section">
      <div className="section-header-row">
        <h1 className="page-title">{mySeries.title || 'My Series'}</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddSeries}>
            {mySeries.addSeries || 'Add Series'}
          </button>
        </div>
      </div>

      {series.length === 0 ? (
        <EmptyState
          icon="🎬"
          title={mySeries.emptyTitle || 'No series yet'}
          subtext={mySeries.emptySubtext || 'Start creating your first series'}
          buttonText={mySeries.addSeries || 'Add Series'}
          onButtonClick={handleAddSeries}
        />
      ) : (
        <div className="content-grid">
          {series.map((seriesItem) => (
            <MySeriesCard
              key={seriesItem._id}
              series={seriesItem}
              onShelve={() => handleShelve(seriesItem._id)}
              onEdit={() => handleEdit(seriesItem)}
              onClick={() => onNavigate(`/player/${seriesItem._id}`)}
              translations={mySeries}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface MySeriesCardProps {
  series: Series
  onShelve: () => void
  onEdit: () => void
  onClick: () => void
  translations: Record<string, string>
}

const MySeriesCard: React.FC<MySeriesCardProps> = ({
  series,
  onShelve,
  onEdit,
  onClick,
  translations,
}) => {
  const [showActions, setShowActions] = React.useState(false)

  return (
    <div
      className={`my-series-card series-card ${series.shelved ? 'shelved' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="series-card-poster">
        {series.cover ? (
          <img src={series.cover} alt={series.name || 'Series'} className="series-card-image" />
        ) : (
          <div className="series-card-placeholder" />
        )}
        <div className="series-card-overlay">
          <svg className="series-card-play-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
        {series.shelved && (
          <span className="shelved-badge">{translations.shelved || 'Shelved'}</span>
        )}
        {showActions && (
          <div className="series-action-icons">
            <button
              className="action-icon-btn"
              onClick={(e) => { e.stopPropagation(); onShelve(); }}
              title={series.shelved ? (translations.unshelve || 'Unshelve') : (translations.shelve || 'Shelve')}
            >
              {series.shelved ? '📤' : '📥'}
            </button>
            <button
              className="action-icon-btn"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title={translations.edit || 'Edit'}
            >
              ✏️
            </button>
          </div>
        )}
      </div>
      <div className="series-card-info">
        <h3 className="series-card-title">{series.name || 'Untitled Series'}</h3>
        {series.genre && series.genre.length > 0 && (
          <span className="series-card-tag">{series.genre[0].name}</span>
        )}
      </div>
    </div>
  )
}

export default Account
