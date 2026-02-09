import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PhoneLayout from '../../layouts/PhoneLayout'
import LoginModal from '../../components/LoginModal'
import { useLanguage } from '../../context/LanguageContext'
import { useAccountStore, accountStoreActions, navItems, walletAmounts, type AccountTab } from '../../stores/accountStore'
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
} from '../../services/accountService'
import { toastStoreActions, useToastStore } from '../../stores'
import type { User, PurchaseItem, Series } from '../../types'
import './PhoneAccount.css'

// Track initialization
let accountInitialized = false
let userDataFetched = false
let myPurchasesFetched = false
let mySeriesFetched = false

const PhoneAccount: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useAccountStore()
  const toastState = useToastStore()

  // Initialize data
  if (!accountInitialized) {
    accountInitialized = true
    initializeAccountData(searchParams, (params) => setSearchParams(params), navigate)
  }

  if (state.isLoggedIn && !userDataFetched) {
    userDataFetched = true
    fetchAccountUserData()
  }

  if (state.isLoggedIn && !myPurchasesFetched) {
    myPurchasesFetched = true
    fetchMyPurchases()
  }

  if (state.isLoggedIn && !mySeriesFetched) {
    mySeriesFetched = true
    fetchMySeries()
  }

  const tabFromUrl = searchParams.get('tab')
  if (tabFromUrl && navItems.some((item) => item.key === tabFromUrl) && state.activeTab !== tabFromUrl) {
    accountStoreActions.setActiveTab(tabFromUrl as AccountTab)
  }

  const handleTabClick = (tab: AccountTab) => {
    accountStoreActions.setActiveTab(tab)
    setSearchParams({ tab })
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
    accountStoreActions.initializeUserData(user)
    userDataFetched = false
    myPurchasesFetched = false
    mySeriesFetched = false
    await fetchAccountUserData()
    userDataFetched = true
    await fetchMyPurchases()
    myPurchasesFetched = true
    await fetchMySeries()
    mySeriesFetched = true
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
      toastStoreActions.show(t.account.overview.passwordChangeSuccess || 'Password set successfully', 'success')
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
      <PhoneLayout showHeader={true} title={(t.account.nav as Record<string, string>).overview}>
        <div className="phone-account-loading">Loading...</div>
      </PhoneLayout>
    )
  }

  const getTabTitle = (): string => {
    const nav = t.account.nav as Record<string, string>
    return nav[state.activeTab] || 'Account'
  }

  return (
    <PhoneLayout showHeader={true} title={getTabTitle()}>
      <div className="phone-account">
        {/* User Profile Header */}
        {state.activeTab === 'overview' && (
          <div className="phone-account-header">
            <div className="phone-account-avatar">
              {state.user?.avatar ? (
                <img src={state.user.avatar} alt={state.user.nickname} />
              ) : (
                <span className="phone-avatar-emoji">👤</span>
              )}
              <label className="phone-avatar-edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarUpload}
                  hidden
                  disabled={state.avatarUploading}
                />
              </label>
            </div>
            <h2 className="phone-account-name">{state.user?.nickname || 'Guest'}</h2>
            <p className="phone-account-email">{state.user?.email || ''}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="phone-account-tabs">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`phone-account-tab ${state.activeTab === item.key ? 'active' : ''}`}
              onClick={() => handleTabClick(item.key)}
            >
              <span className="phone-tab-icon">{item.icon}</span>
              <span className="phone-tab-label">{(t.account.nav as Record<string, string>)[item.key]}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="phone-account-content">
          {state.activeTab === 'overview' && (
            <PhoneOverviewSection
              user={state.user}
              hasPassword={state.user?.hasPassword ?? true}
              profileForm={state.profileForm}
              profileErrors={state.profileErrors}
              profileSaving={state.profileSaving}
              originalProfile={state.originalProfile}
              passwordForm={state.passwordForm}
              passwordErrors={state.passwordErrors}
              passwordChanging={state.passwordChanging}
              avatarUploading={state.avatarUploading}
              avatarError={state.avatarError}
              onSaveProfile={onSaveProfile}
              onChangePassword={onChangePassword}
              onSetPassword={onSetPassword}
              onAvatarUpload={onAvatarUpload}
              t={t}
            />
          )}

          {state.activeTab === 'watchHistory' && (
            <PhoneWatchHistorySection
              items={state.user?.watchList || []}
              onClearHistory={clearWatchHistory}
              onRemoveItem={removeFromWatchList}
              onNavigate={navigate}
              t={t}
            />
          )}

          {state.activeTab === 'favorites' && (
            <PhoneFavoritesSection
              items={state.user?.favorites || []}
              onClearFavorites={clearFavorites}
              onRemoveItem={removeFromFavorites}
              onNavigate={navigate}
              t={t}
            />
          )}

          {state.activeTab === 'settings' && (
            <PhoneSettingsSection
              language={language}
              playbackSpeed={state.playbackSpeed}
              autoplay={state.autoplay}
              notifications={state.notifications}
              onLanguageChange={setLanguage}
              onLogout={onLogout}
              t={t}
            />
          )}

          {state.activeTab === 'wallet' && (
            <PhoneWalletSection
              balance={state.balance}
              walletTab={state.walletTab}
              showTopUpPopup={state.showTopUpPopup}
              selectedTopUpAmount={state.selectedTopUpAmount}
              showWithdrawPopup={state.showWithdrawPopup}
              selectedWithdrawAmount={state.selectedWithdrawAmount}
              withdrawing={state.withdrawing}
              transactions={state.transactions}
              purchases={state.myPurchases}
              t={t}
            />
          )}

          {state.activeTab === 'myPurchases' && (
            <PhoneMyPurchasesSection
              purchases={state.myPurchases}
              loading={state.myPurchasesLoading}
              onNavigate={navigate}
              t={t}
            />
          )}

          {state.activeTab === 'mySeries' && (
            <PhoneMySeriesSection
              series={state.mySeries}
              loading={state.mySeriesLoading}
              onNavigate={navigate}
              t={t}
            />
          )}
        </div>
      </div>

      {state.showLoginModal && (
        <LoginModal onClose={handleLoginClose} onLoginSuccess={handleLoginSuccess} />
      )}

      {toastState.isVisible && (
        <div className={`phone-toast phone-toast-${toastState.type}`}>
          {toastState.message}
        </div>
      )}
    </PhoneLayout>
  )
}

// Sub-components

interface PhoneOverviewSectionProps {
  user: { avatar?: string | null; hasPassword?: boolean } | null
  hasPassword: boolean
  profileForm: { nickname: string; email: string; phoneNumber: string; gender: string; birthday: string }
  profileErrors: { emailError: string; phoneError: string; birthdayError: string }
  profileSaving: boolean
  originalProfile: { nickname: string; email: string; phoneNumber: string; gender: string; birthday: string }
  passwordForm: { currentPassword: string; newPassword: string; confirmPassword: string }
  passwordErrors: { currentPasswordError: string; newPasswordError: string; confirmPasswordError: string }
  passwordChanging: boolean
  avatarUploading: boolean
  avatarError: string
  onSaveProfile: () => void
  onChangePassword: () => void
  onSetPassword: () => void
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  t: Record<string, Record<string, unknown>>
}

const PhoneOverviewSection: React.FC<PhoneOverviewSectionProps> = ({
  user,
  hasPassword,
  profileForm,
  profileErrors,
  profileSaving,
  originalProfile,
  passwordForm,
  passwordErrors,
  passwordChanging,
  avatarUploading,
  avatarError,
  onSaveProfile,
  onChangePassword,
  onSetPassword,
  onAvatarUpload,
  t,
}) => {
  const overview = t.account.overview as Record<string, string>
  const login = t.login as Record<string, string>
  const profileHasChanges = hasProfileChanges(profileForm, originalProfile)
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  return (
    <div className="phone-overview">
      {/* Profile Section */}
      <div className="phone-section-card">
        <h3 className="phone-section-title">{overview.profileInfo}</h3>
        
        <div className="phone-form-group">
          <label>{overview.nickname}</label>
          <input
            type="text"
            value={profileForm.nickname}
            onChange={(e) => accountStoreActions.updateProfileField('nickname', e.target.value)}
            placeholder={overview.nicknamePlaceholder}
          />
        </div>

        <div className="phone-form-group">
          <label>{overview.email}</label>
          <input
            type="email"
            value={profileForm.email}
            onChange={(e) => {
              accountStoreActions.updateProfileField('email', e.target.value)
              if (profileErrors.emailError) accountStoreActions.updateProfileError('emailError', '')
            }}
            placeholder={overview.emailPlaceholder}
            className={profileErrors.emailError ? 'error' : ''}
          />
          {profileErrors.emailError && <span className="phone-field-error">{profileErrors.emailError}</span>}
        </div>

        <div className="phone-form-group">
          <label>{overview.phoneNumber}</label>
          <input
            type="tel"
            value={profileForm.phoneNumber}
            onChange={(e) => {
              accountStoreActions.updateProfileField('phoneNumber', e.target.value)
              if (profileErrors.phoneError) accountStoreActions.updateProfileError('phoneError', '')
            }}
            placeholder={overview.phonePlaceholder}
            className={profileErrors.phoneError ? 'error' : ''}
          />
          {profileErrors.phoneError && <span className="phone-field-error">{profileErrors.phoneError}</span>}
        </div>

        <div className="phone-form-group">
          <label>{overview.gender}</label>
          <select
            value={profileForm.gender}
            onChange={(e) => accountStoreActions.updateProfileField('gender', e.target.value)}
          >
            <option value="not_specified">{overview.genderNotSpecified}</option>
            <option value="male">{overview.genderMale}</option>
            <option value="female">{overview.genderFemale}</option>
            <option value="other">{overview.genderOther}</option>
          </select>
        </div>

        <div className="phone-form-group">
          <label>{overview.birthday}</label>
          <input
            type="date"
            value={profileForm.birthday}
            onChange={(e) => {
              accountStoreActions.updateProfileField('birthday', e.target.value)
              if (profileErrors.birthdayError) accountStoreActions.updateProfileError('birthdayError', '')
            }}
            className={profileErrors.birthdayError ? 'error' : ''}
          />
          {profileErrors.birthdayError && <span className="phone-field-error">{profileErrors.birthdayError}</span>}
        </div>

        <button
          className="phone-save-btn"
          onClick={onSaveProfile}
          disabled={!profileHasChanges || profileSaving}
        >
          {profileSaving ? '...' : overview.save}
        </button>
      </div>

      {/* Password Section */}
      <div className="phone-section-card">
        <h3 className="phone-section-title">{hasPassword ? overview.changePassword : login.setPassword || 'Set Password'}</h3>
        
        {hasPassword && (
          <div className="phone-form-group">
            <label>{overview.currentPassword}</label>
            <div className="phone-password-input">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => {
                  accountStoreActions.updatePasswordField('currentPassword', e.target.value)
                  if (passwordErrors.currentPasswordError) accountStoreActions.updatePasswordError('currentPasswordError', '')
                }}
                placeholder={overview.currentPasswordPlaceholder}
                className={passwordErrors.currentPasswordError ? 'error' : ''}
              />
              <button
                type="button"
                className="phone-password-toggle"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
            {passwordErrors.currentPasswordError && <span className="phone-field-error">{passwordErrors.currentPasswordError}</span>}
          </div>
        )}

        <div className="phone-form-group">
          <label>{overview.newPassword}</label>
          <div className="phone-password-input">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={passwordForm.newPassword}
              onChange={(e) => {
                accountStoreActions.updatePasswordField('newPassword', e.target.value)
                if (passwordErrors.newPasswordError) accountStoreActions.updatePasswordError('newPasswordError', '')
              }}
              placeholder={overview.newPasswordPlaceholder}
              className={passwordErrors.newPasswordError ? 'error' : ''}
            />
            <button
              type="button"
              className="phone-password-toggle"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
          {passwordErrors.newPasswordError && <span className="phone-field-error">{passwordErrors.newPasswordError}</span>}
        </div>

        <div className="phone-form-group">
          <label>{overview.confirmPassword}</label>
          <div className="phone-password-input">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={(e) => {
                accountStoreActions.updatePasswordField('confirmPassword', e.target.value)
                if (passwordErrors.confirmPasswordError) accountStoreActions.updatePasswordError('confirmPasswordError', '')
              }}
              placeholder={overview.confirmPasswordPlaceholder}
              className={passwordErrors.confirmPasswordError ? 'error' : ''}
            />
            <button
              type="button"
              className="phone-password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
          {passwordErrors.confirmPasswordError && <span className="phone-field-error">{passwordErrors.confirmPasswordError}</span>}
        </div>

        <button
          className="phone-save-btn"
          onClick={hasPassword ? onChangePassword : onSetPassword}
          disabled={passwordChanging}
        >
          {passwordChanging ? '...' : (hasPassword ? overview.changePasswordBtn : (login.setPassword || 'Set Password'))}
        </button>
      </div>
    </div>
  )
}

interface PhoneWatchHistorySectionProps {
  items: { seriesId: string; episodeNumber: number; addedAt: Date; updatedAt: Date }[]
  onClearHistory: () => Promise<{ success: boolean; error?: string }>
  onRemoveItem: (seriesId: string) => Promise<{ success: boolean; error?: string }>
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const PhoneWatchHistorySection: React.FC<PhoneWatchHistorySectionProps> = ({
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

  if (sortedItems.length === 0) {
    return (
      <div className="phone-empty-state">
        <span className="phone-empty-icon">📺</span>
        <p>{watchHistory.emptyTitle}</p>
        <button className="phone-explore-btn" onClick={() => onNavigate('/genre')}>
          {watchHistory.exploreButton}
        </button>
      </div>
    )
  }

  return (
    <div className="phone-history-section">
      <button className="phone-clear-btn" onClick={onClearHistory}>
        {watchHistory.clearHistory}
      </button>
      <div className="phone-history-list">
        {sortedItems.map((item) => (
          <PhoneHistoryCard
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
    </div>
  )
}

// Phone History Card - fetches series data dynamically
interface PhoneHistoryCardProps {
  seriesId: string
  episodeNumber: number
  onClick: () => void
  onRemove: (e: React.MouseEvent) => void
}

const PhoneHistoryCard: React.FC<PhoneHistoryCardProps> = ({
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
    <div className="phone-history-item" onClick={onClick}>
      <div className="phone-history-cover">
        {series?.cover ? (
          <img src={series.cover} alt={series.name || 'Series'} />
        ) : (
          <div className="phone-history-placeholder">🎬</div>
        )}
        <span className="phone-history-ep">EP {episodeNumber}</span>
      </div>
      <span className="phone-history-name">{series?.name || `Series ${seriesId}`}</span>
      <button className="phone-remove-btn" onClick={onRemove}>
        ✕
      </button>
    </div>
  )
}

interface PhoneFavoritesSectionProps {
  items: { seriesId: string; seriesName: string; seriesCover: string; seriesTags?: string[]; addedAt: Date }[]
  onClearFavorites: () => Promise<{ success: boolean; error?: string }>
  onRemoveItem: (seriesId: string) => Promise<{ success: boolean; error?: string }>
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const PhoneFavoritesSection: React.FC<PhoneFavoritesSectionProps> = ({
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

  if (sortedItems.length === 0) {
    return (
      <div className="phone-empty-state">
        <span className="phone-empty-icon">❤️</span>
        <p>{favorites.emptyTitle}</p>
        <button className="phone-explore-btn" onClick={() => onNavigate('/genre')}>
          {favorites.exploreButton}
        </button>
      </div>
    )
  }

  return (
    <div className="phone-favorites-section">
      <button className="phone-clear-btn" onClick={onClearFavorites}>
        {favorites.clearFavorites || 'Clear Favorites'}
      </button>
      <div className="phone-favorites-list">
        {sortedItems.map((item) => (
          <div
            key={item.seriesId}
            className="phone-favorite-item"
            onClick={() => onNavigate(`/player/${item.seriesId}`)}
          >
            <div className="phone-favorite-cover">
              {item.seriesCover ? (
                <img src={item.seriesCover} alt={item.seriesName} />
              ) : (
                <div className="phone-favorite-placeholder">🎬</div>
              )}
            </div>
            <span className="phone-favorite-name">{item.seriesName}</span>
            <button
              className="phone-remove-btn"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveItem(item.seriesId)
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface PhoneSettingsSectionProps {
  language: string
  playbackSpeed: string
  autoplay: boolean
  notifications: boolean
  onLanguageChange: (lang: 'en' | 'zh') => void
  onLogout: () => void
  t: Record<string, Record<string, unknown>>
}

const PhoneSettingsSection: React.FC<PhoneSettingsSectionProps> = ({
  language,
  playbackSpeed,
  autoplay,
  notifications,
  onLanguageChange,
  onLogout,
  t,
}) => {
  const settings = t.account.settings as Record<string, string>
  const nav = t.account.nav as Record<string, string>

  return (
    <div className="phone-settings">
      <div className="phone-setting-item">
        <span className="phone-setting-label">{settings.language}</span>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as 'en' | 'zh')}
          className="phone-setting-select"
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>

      <div className="phone-setting-item">
        <span className="phone-setting-label">{settings.playbackSpeed}</span>
        <select
          value={playbackSpeed}
          onChange={(e) => accountStoreActions.setPlaybackSpeed(e.target.value)}
          className="phone-setting-select"
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>

      <div className="phone-setting-item">
        <span className="phone-setting-label">{settings.autoplay}</span>
        <label className="phone-toggle">
          <input
            type="checkbox"
            checked={autoplay}
            onChange={(e) => accountStoreActions.setAutoplay(e.target.checked)}
          />
          <span className="phone-toggle-slider"></span>
        </label>
      </div>

      <div className="phone-setting-item">
        <span className="phone-setting-label">{settings.notifications}</span>
        <label className="phone-toggle">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => accountStoreActions.setNotifications(e.target.checked)}
          />
          <span className="phone-toggle-slider"></span>
        </label>
      </div>

      <button className="phone-logout-btn" onClick={onLogout}>
        <span>🚪</span>
        {nav.logout}
      </button>
    </div>
  )
}

interface PhoneWalletSectionProps {
  balance: number
  walletTab: 'topup' | 'withdraw'
  showTopUpPopup: boolean
  selectedTopUpAmount: number | null
  showWithdrawPopup: boolean
  selectedWithdrawAmount: number | null
  withdrawing: boolean
  transactions: { id: string; type: 'topup' | 'withdraw'; amount: number; status: string; referenceId: string; createdAt: Date }[]
  purchases: PurchaseItem[]
  t: Record<string, Record<string, unknown>>
}

const PhoneWalletSection: React.FC<PhoneWalletSectionProps> = ({
  balance,
  walletTab,
  showTopUpPopup,
  selectedTopUpAmount,
  showWithdrawPopup,
  selectedWithdrawAmount,
  withdrawing,
  transactions,
  purchases,
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

  const handleConfirmTopUp = async () => {
    if (selectedTopUpAmount) {
      const result = await topUp(selectedTopUpAmount)
      if (result.success) {
        toastStoreActions.show(wallet.topUpSuccess || 'Top up successful', 'success')
      } else {
        toastStoreActions.show(result.error || wallet.topUpFailed || 'Failed to top up', 'error')
      }
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
    return d.toLocaleDateString()
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

  // Transaction filter state
  const [transactionFilter, setTransactionFilter] = React.useState<'all' | 'topup' | 'withdraw' | 'purchase'>('all')

  // Custom amount state
  const [showCustomAmountPopup, setShowCustomAmountPopup] = React.useState(false)
  const [customAmountInput, setCustomAmountInput] = React.useState('')

  const handleCustomAmountClick = () => {
    setCustomAmountInput('')
    setShowCustomAmountPopup(true)
  }

  const handleCustomAmountConfirm = () => {
    const amount = parseFloat(customAmountInput)
    if (isNaN(amount) || amount <= 0) {
      toastStoreActions.show(wallet.invalidAmount || 'Please enter a valid amount', 'error')
      return
    }
    if (walletTab === 'withdraw' && amount > balance) {
      toastStoreActions.show(wallet.insufficientBalance || 'Insufficient balance', 'error')
      return
    }
    setShowCustomAmountPopup(false)
    if (walletTab === 'topup') {
      handleTopUpClick(amount)
    } else {
      handleWithdrawClick(amount)
    }
  }

  const handleCloseCustomAmountPopup = () => {
    setShowCustomAmountPopup(false)
    setCustomAmountInput('')
  }

  // Combine transactions and purchases into a single list
  type CombinedTransaction = {
    id: string
    type: 'topup' | 'withdraw' | 'purchase'
    amount: number
    status: string
    referenceId: string
    createdAt: Date
    purchase?: PurchaseItem
  }

  const combinedTransactions: CombinedTransaction[] = [
    ...transactions.map((t) => ({
      id: t.id,
      type: t.type as 'topup' | 'withdraw',
      amount: t.amount,
      status: t.status,
      referenceId: t.referenceId,
      createdAt: t.createdAt,
    })),
    ...purchases.map((p) => ({
      id: p._id,
      type: 'purchase' as const,
      amount: p.price,
      status: p.status || 'success',
      referenceId: p.referenceId || '-',
      createdAt: new Date(p.purchasedAt),
      purchase: p,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Filter transactions based on selected filter
  const filteredTransactions = transactionFilter === 'all'
    ? combinedTransactions
    : combinedTransactions.filter((t) => t.type === transactionFilter)

  return (
    <div className="phone-wallet">
      {/* Balance Card */}
      <div className="phone-wallet-balance">
        <span className="phone-balance-label">{wallet.currentBalance}</span>
        <div className="phone-balance-amount">
          <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-balance-logo" />
          <span>{balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Wallet Tabs */}
      <div className="phone-wallet-tabs">
        <button
          className={`phone-wallet-tab ${walletTab === 'topup' ? 'active' : ''}`}
          onClick={() => accountStoreActions.setWalletTab('topup')}
        >
          {wallet.topUp}
        </button>
        <button
          className={`phone-wallet-tab ${walletTab === 'withdraw' ? 'active' : ''}`}
          onClick={() => accountStoreActions.setWalletTab('withdraw')}
        >
          {wallet.withdraw}
        </button>
      </div>

      {/* Amount Selection */}
      <div className="phone-amount-section">
        <div className="phone-amount-header">
          <h3 className="phone-wallet-title">
            {walletTab === 'topup'
              ? (wallet.selectTopUpAmount || 'Select Top Up Amount')
              : (wallet.selectWithdrawAmount || 'Select Withdrawal Amount')}
          </h3>
          <button
            className={`phone-withdraw-all-btn ${walletTab === 'topup' || balance <= 0 ? 'invisible' : ''}`}
            onClick={() => handleWithdrawClick(parseFloat(balance.toFixed(2)))}
            disabled={walletTab === 'topup' || balance <= 0}
          >
            {wallet.withdrawAll || 'Withdraw All'}
          </button>
        </div>
        <div className="phone-wallet-amounts">
          {walletAmounts.map((amount) => (
            <button
              key={amount}
              className={`phone-amount-btn ${walletTab === 'withdraw' && amount > balance ? 'disabled' : ''}`}
              onClick={() => walletTab === 'topup' ? handleTopUpClick(amount) : handleWithdrawClick(amount)}
              disabled={walletTab === 'withdraw' && amount > balance}
            >
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-amount-logo" />
              <span>{amount}</span>
            </button>
          ))}
          {/* Custom Amount Button */}
          <button
            className="phone-amount-btn phone-custom-amount-btn"
            onClick={handleCustomAmountClick}
          >
            <span className="phone-custom-icon">✎</span>
            <span>{wallet.custom || 'Custom'}</span>
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="phone-transaction-section">
        <div className="phone-transaction-header">
          <h3 className="phone-wallet-title">{wallet.transactionHistory || 'Transaction History'}</h3>
          <select
            className="phone-transaction-filter"
            value={transactionFilter}
            onChange={(e) => setTransactionFilter(e.target.value as 'all' | 'topup' | 'withdraw' | 'purchase')}
          >
            <option value="all">{wallet.filterAll || 'All'}</option>
            <option value="topup">{wallet.topUp || 'Top Up'}</option>
            <option value="withdraw">{wallet.withdraw || 'Withdraw'}</option>
            <option value="purchase">{wallet.purchase || 'Purchase'}</option>
          </select>
        </div>
        {filteredTransactions.length === 0 ? (
          <p className="phone-no-transactions">{wallet.noTransactions || 'No transactions yet'}</p>
        ) : (
          <div className="phone-transaction-list">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="phone-transaction-item">
                <div className="phone-transaction-row">
                  <div className="phone-transaction-info">
                    <div className={`phone-transaction-type type-${transaction.type}`}>
                      {transaction.type === 'purchase' && transaction.purchase ? (
                        <div className="phone-purchase-type-cell">
                          <span className="phone-purchase-type-series">{transaction.purchase.seriesName}</span>
                          <span className="phone-purchase-type-episode">
                            EP {transaction.purchase.episodeNumber}{transaction.purchase.episodeTitle ? ` ${transaction.purchase.episodeTitle}` : ''}
                          </span>
                        </div>
                      ) : (
                        transaction.type === 'topup' ? (wallet.topUp || 'Top Up') : (wallet.withdraw || 'Withdraw')
                      )}
                    </div>
                    <span className="phone-transaction-date">{formatDate(transaction.createdAt)}</span>
                  </div>
                  <div className="phone-transaction-amount-status">
                    <span className={`phone-transaction-amount amount-${transaction.type}`}>
                      {transaction.type === 'topup' ? '+' : '-'}{transaction.amount.toFixed(2)}
                    </span>
                    <span className={`phone-transaction-status ${getStatusClass(transaction.status)}`}>
                      {getStatusText(transaction.status)}
                    </span>
                  </div>
                </div>
                <div className="phone-transaction-reference">
                  {transaction.referenceId}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Up Confirmation Popup */}
      {showTopUpPopup && selectedTopUpAmount && (
        <div className="phone-popup-overlay" onClick={handleCloseTopUpPopup}>
          <div className="phone-popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-logo" />
            <h3 className="phone-popup-title">{wallet.confirmTopUp || 'Confirm Top Up'}</h3>
            <p className="phone-popup-message">{wallet.topUpMessage || 'Add to your wallet'}</p>
            <div className="phone-popup-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-amount-logo" />
              <span>{selectedTopUpAmount}</span>
            </div>
            <div className="phone-popup-buttons">
              <button className="phone-popup-confirm" onClick={handleConfirmTopUp}>
                {wallet.confirm || 'Confirm'}
              </button>
              <button className="phone-popup-cancel" onClick={handleCloseTopUpPopup}>
                {wallet.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Popup */}
      {showWithdrawPopup && selectedWithdrawAmount && (
        <div className="phone-popup-overlay" onClick={handleCloseWithdrawPopup}>
          <div className="phone-popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-logo" />
            <h3 className="phone-popup-title">{wallet.confirmWithdraw || 'Confirm Withdrawal'}</h3>
            <p className="phone-popup-message">{wallet.withdrawMessage || 'Withdraw from your wallet'}</p>
            <div className="phone-popup-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-amount-logo" />
              <span>{selectedWithdrawAmount}</span>
            </div>
            <div className="phone-popup-buttons">
              <button
                className="phone-popup-confirm"
                onClick={handleConfirmWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? '...' : (wallet.confirm || 'Confirm')}
              </button>
              <button
                className="phone-popup-cancel"
                onClick={handleCloseWithdrawPopup}
                disabled={withdrawing}
              >
                {wallet.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Amount Popup */}
      {showCustomAmountPopup && (
        <div className="phone-popup-overlay" onClick={handleCloseCustomAmountPopup}>
          <div className="phone-popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-logo" />
            <h3 className="phone-popup-title">
              {walletTab === 'topup'
                ? (wallet.customTopUp || 'Custom Top Up')
                : (wallet.customWithdraw || 'Custom Withdrawal')}
            </h3>
            <p className="phone-popup-message">
              {walletTab === 'topup'
                ? (wallet.enterTopUpAmount || 'Enter the amount to add')
                : (wallet.enterWithdrawAmount || 'Enter the amount to withdraw')}
            </p>
            <div className="phone-custom-amount-input-wrapper">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-amount-logo" />
              <input
                type="number"
                className="phone-custom-amount-input"
                value={customAmountInput}
                onChange={(e) => setCustomAmountInput(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="phone-popup-buttons">
              <button className="phone-popup-confirm" onClick={handleCustomAmountConfirm}>
                {wallet.confirm || 'Confirm'}
              </button>
              <button className="phone-popup-cancel" onClick={handleCloseCustomAmountPopup}>
                {wallet.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// My Purchases Section
interface PhoneMyPurchasesSectionProps {
  purchases: PurchaseItem[]
  loading: boolean
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const PhoneMyPurchasesSection: React.FC<PhoneMyPurchasesSectionProps> = ({
  purchases,
  loading,
  onNavigate,
  t,
}) => {
  const myPurchases = (t.account.myPurchases || {}) as Record<string, string>

  if (loading) {
    return (
      <div className="phone-loading">Loading...</div>
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

  if (seriesList.length === 0) {
    return (
      <div className="phone-empty-state">
        <span className="phone-empty-icon">🛒</span>
        <p>{myPurchases.emptyTitle || 'No purchases yet'}</p>
        <button className="phone-explore-btn" onClick={() => onNavigate('/genre')}>
          {myPurchases.exploreButton || 'Explore Series'}
        </button>
      </div>
    )
  }

  return (
    <div className="phone-purchases">
      {seriesList.map((seriesGroup) => (
        <div key={seriesGroup.seriesId} className="phone-purchase-group">
          <div
            className="phone-purchase-header"
            onClick={() => onNavigate(`/player/${seriesGroup.seriesId}`)}
          >
            <div className="phone-purchase-cover">
              {seriesGroup.seriesCover ? (
                <img src={seriesGroup.seriesCover} alt={seriesGroup.seriesName} />
              ) : (
                <div className="phone-purchase-placeholder">🎬</div>
              )}
            </div>
            <div className="phone-purchase-info">
              <h3 className="phone-purchase-name">{seriesGroup.seriesName}</h3>
              <span className="phone-purchase-count">
                {seriesGroup.episodes.length} {seriesGroup.episodes.length === 1 ? (myPurchases.episode || 'episode') : (myPurchases.episodes || 'episodes')}
              </span>
            </div>
          </div>
          <div className="phone-purchase-episodes">
            {seriesGroup.episodes
              .sort((a, b) => a.episodeNumber - b.episodeNumber)
              .map((episode) => (
                <div
                  key={episode.episodeId}
                  className="phone-purchase-episode"
                  onClick={() => onNavigate(`/player/${seriesGroup.seriesId}?episode=${episode.episodeNumber}`)}
                >
                  <div className="phone-episode-thumbnail">
                    {episode.episodeThumbnail ? (
                      <img src={episode.episodeThumbnail} alt={`Episode ${episode.episodeNumber}`} />
                    ) : (
                      <div className="phone-episode-placeholder">▶️</div>
                    )}
                    <div className="phone-episode-overlay">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                  </div>
                  <div className="phone-episode-info">
                    <span className="phone-episode-number">EP {episode.episodeNumber}</span>
                    {episode.episodeTitle && (
                      <span className="phone-episode-title">{episode.episodeTitle}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// My Series Section
interface PhoneMySeriesSectionProps {
  series: Series[]
  loading: boolean
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const PhoneMySeriesSection: React.FC<PhoneMySeriesSectionProps> = ({
  series,
  loading,
  onNavigate,
  t,
}) => {
  const mySeries = (t.account.mySeries || {}) as Record<string, string>
  
  // Shelve confirmation modal state
  const [showShelveModal, setShowShelveModal] = React.useState(false)
  const [pendingShelveSeriesId, setPendingShelveSeriesId] = React.useState<string | null>(null)
  const [pendingShelveSeries, setPendingShelveSeries] = React.useState<Series | null>(null)
  
  // Unshelve confirmation modal state
  const [showUnshelveModal, setShowUnshelveModal] = React.useState(false)
  const [pendingUnshelveSeriesId, setPendingUnshelveSeriesId] = React.useState<string | null>(null)
  const [pendingUnshelveSeries, setPendingUnshelveSeries] = React.useState<Series | null>(null)

  const handleShelve = async (seriesId: string, isShelved: boolean, seriesItem: Series) => {
    if (isShelved) {
      setPendingUnshelveSeriesId(seriesId)
      setPendingUnshelveSeries(seriesItem)
      setShowUnshelveModal(true)
      return
    }
    
    setPendingShelveSeriesId(seriesId)
    setPendingShelveSeries(seriesItem)
    setShowShelveModal(true)
  }

  const handleShelveConfirm = async () => {
    if (!pendingShelveSeriesId) return
    
    const result = await shelveSeries(pendingShelveSeriesId, true)
    if (!result.success && result.error) {
      toastStoreActions.show(result.error, 'error')
    }
    
    setShowShelveModal(false)
    setPendingShelveSeriesId(null)
    setPendingShelveSeries(null)
  }

  const handleShelveCancel = () => {
    setShowShelveModal(false)
    setPendingShelveSeriesId(null)
    setPendingShelveSeries(null)
  }

  const handleUnshelveConfirm = async () => {
    if (!pendingUnshelveSeriesId) return
    
    const result = await shelveSeries(pendingUnshelveSeriesId, true)
    if (!result.success && result.error) {
      toastStoreActions.show(result.error, 'error')
    }
    
    setShowUnshelveModal(false)
    setPendingUnshelveSeriesId(null)
    setPendingUnshelveSeries(null)
  }

  const handleUnshelveCancel = () => {
    setShowUnshelveModal(false)
    setPendingUnshelveSeriesId(null)
    setPendingUnshelveSeries(null)
  }

  if (loading) {
    return (
      <div className="phone-loading">Loading...</div>
    )
  }

  if (series.length === 0) {
    return (
      <div className="phone-empty-state">
        <span className="phone-empty-icon">🎬</span>
        <p>{mySeries.emptyTitle || 'No series yet'}</p>
        <p className="phone-empty-subtext">{mySeries.emptySubtext || 'Start creating your first series'}</p>
      </div>
    )
  }

  return (
    <div className="phone-my-series">
      <div className="phone-series-grid">
        {series.map((seriesItem) => (
          <div
            key={seriesItem._id}
            className={`phone-series-card ${seriesItem.shelved ? 'shelved' : ''}`}
          >
            <div
              className="phone-series-cover"
              onClick={() => onNavigate(`/player/${seriesItem._id}`)}
            >
              {seriesItem.cover ? (
                <img src={seriesItem.cover} alt={seriesItem.name} />
              ) : (
                <div className="phone-series-placeholder">🎬</div>
              )}
              {seriesItem.shelved && (
                <span className="phone-shelved-badge">{mySeries.shelved || 'Shelved'}</span>
              )}
              <div className="phone-series-actions">
                <button
                  className="phone-action-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleShelve(seriesItem._id, seriesItem.shelved || false, seriesItem)
                  }}
                >
                  {seriesItem.shelved ? '📤' : '📥'}
                </button>
              </div>
            </div>
            <span className="phone-series-name">{seriesItem.name}</span>
          </div>
        ))}
      </div>

      {/* Shelve Confirmation Modal */}
      {showShelveModal && pendingShelveSeries && (
        <div className="phone-modal-overlay" onClick={handleShelveCancel}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">📥</span>
            <h3 className="phone-modal-title">{mySeries.shelveConfirmTitle || 'Confirm Shelve'}</h3>
            <div className="phone-modal-series">{pendingShelveSeries.name || 'Untitled Series'}</div>
            <p className="phone-modal-message">
              {mySeries.shelveConfirmMessage || 'Are you sure you want to shelve this series? It will be hidden from users.'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm" onClick={handleShelveConfirm}>
                {mySeries.shelve || 'Shelve'}
              </button>
              <button className="phone-modal-cancel" onClick={handleShelveCancel}>
                {mySeries.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unshelve Confirmation Modal */}
      {showUnshelveModal && pendingUnshelveSeries && (
        <div className="phone-modal-overlay" onClick={handleUnshelveCancel}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">📤</span>
            <h3 className="phone-modal-title">{mySeries.unshelveConfirmTitle || 'Confirm Unshelve'}</h3>
            <div className="phone-modal-series">{pendingUnshelveSeries.name || 'Untitled Series'}</div>
            <p className="phone-modal-message">
              {mySeries.unshelveConfirmMessage || 'Are you sure you want to unshelve this series? It will become visible to all users.'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm" onClick={handleUnshelveConfirm}>
                {mySeries.unshelve || 'Unshelve'}
              </button>
              <button className="phone-modal-cancel" onClick={handleUnshelveCancel}>
                {mySeries.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhoneAccount
