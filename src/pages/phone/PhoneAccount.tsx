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
} from '../../services/accountService'
import { toastStoreActions, useToastStore } from '../../stores'
import type { User } from '../../types'
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
              profileForm={state.profileForm}
              profileErrors={state.profileErrors}
              profileSaving={state.profileSaving}
              originalProfile={state.originalProfile}
              onSaveProfile={onSaveProfile}
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
              onLanguageChange={setLanguage}
              onLogout={onLogout}
              t={t}
            />
          )}

          {state.activeTab === 'wallet' && (
            <PhoneWalletSection
              balance={state.balance}
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
  profileForm: { nickname: string; email: string; phoneNumber: string; gender: string; birthday: string }
  profileErrors: { emailError: string; phoneError: string; birthdayError: string }
  profileSaving: boolean
  originalProfile: { nickname: string; email: string; phoneNumber: string; gender: string; birthday: string }
  onSaveProfile: () => void
  t: Record<string, Record<string, unknown>>
}

const PhoneOverviewSection: React.FC<PhoneOverviewSectionProps> = ({
  profileForm,
  profileErrors,
  profileSaving,
  originalProfile,
  onSaveProfile,
  t,
}) => {
  const overview = t.account.overview as Record<string, string>
  const profileHasChanges = hasProfileChanges(profileForm, originalProfile)

  return (
    <div className="phone-overview">
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
  )
}

interface PhoneWatchHistorySectionProps {
  items: { seriesId: string; episodeNumber: number; seriesName?: string; seriesCover?: string }[]
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

  if (items.length === 0) {
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
        {items.map((item) => (
          <div
            key={item.seriesId}
            className="phone-history-item"
            onClick={() => onNavigate(`/player/${item.seriesId}?episode=${item.episodeNumber}`)}
          >
            <div className="phone-history-cover">
              {item.seriesCover ? (
                <img src={item.seriesCover} alt={item.seriesName} />
              ) : (
                <div className="phone-history-placeholder">🎬</div>
              )}
              <span className="phone-history-ep">EP {item.episodeNumber}</span>
            </div>
            <span className="phone-history-name">{item.seriesName || `Series ${item.seriesId}`}</span>
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

interface PhoneFavoritesSectionProps {
  items: { seriesId: string; seriesName: string; seriesCover: string }[]
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

  if (items.length === 0) {
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
      <div className="phone-favorites-grid">
        {items.map((item) => (
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
            <span className="phone-favorite-name">{item.seriesName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface PhoneSettingsSectionProps {
  language: string
  onLanguageChange: (lang: 'en' | 'zh') => void
  onLogout: () => void
  t: Record<string, Record<string, unknown>>
}

const PhoneSettingsSection: React.FC<PhoneSettingsSectionProps> = ({
  language,
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

      <button className="phone-logout-btn" onClick={onLogout}>
        <span>🚪</span>
        {nav.logout}
      </button>
    </div>
  )
}

interface PhoneWalletSectionProps {
  balance: number
  t: Record<string, Record<string, unknown>>
}

const PhoneWalletSection: React.FC<PhoneWalletSectionProps> = ({
  balance,
  t,
}) => {
  const wallet = t.account.wallet as Record<string, string>

  const handleTopUp = (amount: number) => {
    topUp(amount)
    toastStoreActions.show(wallet.topUpSuccess || 'Top up successful', 'success')
  }

  return (
    <div className="phone-wallet">
      <div className="phone-wallet-balance">
        <span className="phone-balance-label">{wallet.currentBalance}</span>
        <div className="phone-balance-amount">
          <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-balance-logo" />
          <span>{balance.toFixed(2)}</span>
        </div>
      </div>

      <h3 className="phone-wallet-title">{wallet.selectTopUpAmount || 'Select Amount'}</h3>
      <div className="phone-wallet-amounts">
        {walletAmounts.map((amount) => (
          <button
            key={amount}
            className="phone-amount-btn"
            onClick={() => handleTopUp(amount)}
          >
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-amount-logo" />
            <span>{amount}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PhoneAccount
