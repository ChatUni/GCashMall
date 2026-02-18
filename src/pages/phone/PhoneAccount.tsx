import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PhoneLayout from '../../layouts/PhoneLayout'
import LoginModal from '../../components/LoginModal'
import { SeriesEditContent } from '../SeriesEdit'
import { useLanguage } from '../../context/LanguageContext'
import {
  useAccountStore,
  accountStoreActions,
  phoneNavItems,
  walletAmounts,
  type AccountTab,
  type Transaction,
  getCombinedTransactions,
  getFilteredTransactions,
  formatTransactionDate,
  getStatusClass,
  hasProfileChanges,
  groupPurchasesBySeries,
  getSortedWatchHistoryItems,
  getSortedFavoritesItems,
} from '../../stores/accountStore'
import {
  initializeAccountPage,
  syncTabFromUrl,
  handleTabClick,
  handleLogoutAndNavigate,
  handleLoginClose,
  handleLoginSuccess,
  handleSaveProfile,
  handleChangePassword,
  handleSetPassword,
  handleAvatarUpload,
  handleTopUpClick,
  handleWithdrawClick,
  handleConfirmTopUp,
  handleConfirmWithdraw,
  closeTopUpPopup,
  closeWithdrawPopup,
  handleCustomAmountClick,
  handleCustomAmountConfirm,
  closeCustomAmountPopup,
  openClearHistoryModal,
  confirmClearHistory,
  cancelClearHistory,
  openDeleteHistoryItemModal,
  confirmDeleteHistoryItem,
  cancelDeleteHistoryItem,
  openClearFavoritesModal,
  confirmClearFavorites,
  cancelClearFavorites,
  openDeleteFavoriteItemModal,
  confirmDeleteFavoriteItem,
  cancelDeleteFavoriteItem,
  handleShelveClick,
  confirmShelve,
  cancelShelve,
  confirmUnshelve,
  cancelUnshelve,
  openDeleteSeriesModal,
  confirmDeleteSeries,
  cancelDeleteSeries,
  handleEditSeries,
  handleAddSeries,
  handleCancelEdit,
  handleSaveComplete,
  getStatusText,
  getPhoneTabTitle,
} from '../../services/accountService'
import { useToastStore } from '../../stores'
import type { User, PurchaseItem, Series } from '../../types'
import './PhoneAccount.css'

const PhoneAccount: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useAccountStore()
  const toastState = useToastStore()

  // Initialize data using shared service function
  initializeAccountPage(searchParams, (params) => setSearchParams(params), navigate)

  // Sync tab from URL (phone version includes about/contact tabs)
  syncTabFromUrl(searchParams, true)

  // Event handlers using shared service functions
  const onTabClick = (tab: AccountTab) => {
    handleTabClick(tab, (params) => setSearchParams(params))
  }

  const onLogout = () => handleLogoutAndNavigate(navigate)

  const onLoginClose = () => handleLoginClose(navigate)

  const onLoginSuccess = async (user: User) => handleLoginSuccess(user)

  const onSaveProfile = () => handleSaveProfile(t.account)

  const onChangePassword = () => handleChangePassword(t.account)

  const onSetPassword = () => handleSetPassword(t.account)

  const onAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleAvatarUpload(e, t.account)

  // Check loading FIRST - during OAuth callback processing, show loading state
  // not the login prompt (since isLoggedIn will be false until OAuth completes)
  if (state.loading) {
    return (
      <PhoneLayout showHeader={true} title={(t.account.nav as Record<string, string>).overview}>
        <div className="phone-account-loading">Loading...</div>
      </PhoneLayout>
    )
  }

  // Show login prompt when not logged in (only after loading is complete)
  if (!state.isLoggedIn) {
    return (
      <PhoneLayout showHeader={true} title={(t.account.nav as Record<string, string>).overview || 'Account'}>
        <div className="phone-account-login-prompt">
          <div className="phone-login-icon">👤</div>
          <h2 className="phone-login-title">{t.login.title || 'Login'}</h2>
          <p className="phone-login-message">Please log in to access your account</p>
          <button
            className="phone-login-btn"
            onClick={() => accountStoreActions.setShowLoginModal(true)}
          >
            {t.login.submit || 'Login'}
          </button>
        </div>
        {state.showLoginModal && (
          <LoginModal onClose={onLoginClose} onLoginSuccess={onLoginSuccess} />
        )}
      </PhoneLayout>
    )
  }

  const tabTitle = getPhoneTabTitle(t.account)

  return (
    <PhoneLayout showHeader={true} title={tabTitle}>
      <div className="phone-account">
        {/* User Profile Header - Only visible for overview tab */}
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
          {phoneNavItems.map((item) => (
            <button
              key={item.key}
              className={`phone-account-tab ${state.activeTab === item.key ? 'active' : ''}`}
              onClick={() => onTabClick(item.key)}
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
              hasPassword={state.user?.hasPassword ?? true}
              profileForm={state.profileForm}
              profileErrors={state.profileErrors}
              profileSaving={state.profileSaving}
              originalProfile={state.originalProfile}
              passwordForm={state.passwordForm}
              passwordErrors={state.passwordErrors}
              passwordChanging={state.passwordChanging}
              onSaveProfile={onSaveProfile}
              onChangePassword={onChangePassword}
              onSetPassword={onSetPassword}
              t={t}
            />
          )}

          {state.activeTab === 'watchHistory' && (
            <PhoneWatchHistorySection
              items={state.user?.watchList || []}
              showClearModal={state.showClearHistoryModal}
              showDeleteModal={state.showDeleteHistoryItemModal}
              pendingDeleteSeriesName={state.pendingDeleteHistorySeriesName}
              onNavigate={navigate}
              t={t}
            />
          )}

          {state.activeTab === 'favorites' && (
            <PhoneFavoritesSection
              items={state.user?.favorites || []}
              showClearModal={state.showClearFavoritesModal}
              showDeleteModal={state.showDeleteFavoriteItemModal}
              pendingDeleteSeriesName={state.pendingDeleteFavoriteSeriesName}
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
              transactionFilter={state.transactionFilter}
              showCustomAmountPopup={state.showCustomAmountPopup}
              customAmountInput={state.customAmountInput}
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
              editingSeriesId={state.editingSeriesId}
              showShelveModal={state.showShelveModal}
              pendingShelveSeries={state.pendingShelveSeries}
              showUnshelveModal={state.showUnshelveModal}
              pendingUnshelveSeries={state.pendingUnshelveSeries}
              showDeleteModal={state.showDeleteSeriesModal}
              pendingDeleteSeries={state.pendingDeleteSeries}
              onNavigate={navigate}
              t={t}
            />
          )}

          {state.activeTab === 'about' && (
            <PhoneAboutSection t={t} />
          )}

          {state.activeTab === 'contact' && (
            <PhoneContactSection t={t} />
          )}
        </div>
      </div>

      {state.showLoginModal && (
        <LoginModal onClose={onLoginClose} onLoginSuccess={onLoginSuccess} />
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
  hasPassword: boolean
  profileForm: { nickname: string; email: string; phoneNumber: string; gender: string; birthday: string }
  profileErrors: { emailError: string; phoneError: string; birthdayError: string }
  profileSaving: boolean
  originalProfile: { nickname: string; email: string; phoneNumber: string; gender: string; birthday: string }
  passwordForm: { currentPassword: string; newPassword: string; confirmPassword: string }
  passwordErrors: { currentPasswordError: string; newPasswordError: string; confirmPasswordError: string }
  passwordChanging: boolean
  onSaveProfile: () => void
  onChangePassword: () => void
  onSetPassword: () => void
  t: Record<string, Record<string, unknown>>
}

const PhoneOverviewSection: React.FC<PhoneOverviewSectionProps> = ({
  hasPassword,
  profileForm,
  profileErrors,
  profileSaving,
  originalProfile,
  passwordForm,
  passwordErrors,
  passwordChanging,
  onSaveProfile,
  onChangePassword,
  onSetPassword,
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
          {passwordErrors.newPasswordError ? (
            <span className="phone-field-error">{passwordErrors.newPasswordError}</span>
          ) : (
            <span className="phone-password-hint">{overview.passwordRequirements || 'Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character'}</span>
          )}
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
  showClearModal: boolean
  showDeleteModal: boolean
  pendingDeleteSeriesName: string
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const PhoneWatchHistorySection: React.FC<PhoneWatchHistorySectionProps> = ({
  items,
  showClearModal,
  showDeleteModal,
  pendingDeleteSeriesName,
  onNavigate,
  t,
}) => {
  const watchHistory = t.account.watchHistory as Record<string, string>
  
  // Sort items using shared helper
  const sortedItems = getSortedWatchHistoryItems(items)

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
      <button className="phone-clear-btn" onClick={openClearHistoryModal}>
        {watchHistory.clearHistory}
      </button>
      <div className="phone-history-list">
        {sortedItems.map((item) => (
          <PhoneHistoryCard
            key={item.seriesId}
            seriesId={item.seriesId}
            episodeNumber={item.episodeNumber}
            onClick={() => onNavigate(`/player/${item.seriesId}?episode=${item.episodeNumber}`)}
            onRemove={(e, seriesName) => {
              e.stopPropagation()
              openDeleteHistoryItemModal(item.seriesId, seriesName)
            }}
          />
        ))}
      </div>

      {/* Clear History Confirmation Modal */}
      {showClearModal && (
        <div className="phone-modal-overlay" onClick={cancelClearHistory}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">🗑️</span>
            <h3 className="phone-modal-title">{watchHistory.clearConfirmTitle || 'Clear Watch History'}</h3>
            <p className="phone-modal-message">
              {watchHistory.clearConfirmMessage || 'Are you sure you want to clear all watch history? This action cannot be undone.'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmClearHistory}>
                {watchHistory.clearHistory || 'Clear History'}
              </button>
              <button className="phone-modal-cancel" onClick={cancelClearHistory}>
                {watchHistory.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {showDeleteModal && (
        <div className="phone-modal-overlay" onClick={cancelDeleteHistoryItem}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">🗑️</span>
            <h3 className="phone-modal-title">{watchHistory.deleteConfirmTitle || 'Remove from History'}</h3>
            {pendingDeleteSeriesName && (
              <div className="phone-modal-series">{pendingDeleteSeriesName}</div>
            )}
            <p className="phone-modal-message">
              {watchHistory.deleteConfirmMessage || 'Are you sure you want to remove this item from your watch history?'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmDeleteHistoryItem}>
                {watchHistory.remove || 'Remove'}
              </button>
              <button className="phone-modal-cancel" onClick={cancelDeleteHistoryItem}>
                {watchHistory.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Phone History Card - fetches series data dynamically
interface PhoneHistoryCardProps {
  seriesId: string
  episodeNumber: number
  onClick: () => void
  onRemove: (e: React.MouseEvent, seriesName: string) => void
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

  const handleRemove = (e: React.MouseEvent) => {
    onRemove(e, series?.name || `Series ${seriesId}`)
  }

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
      <button className="phone-remove-btn" onClick={handleRemove}>
        ✕
      </button>
    </div>
  )
}

interface PhoneFavoritesSectionProps {
  items: { seriesId: string; seriesName: string; seriesCover: string; seriesTags?: string[]; addedAt: Date }[]
  showClearModal: boolean
  showDeleteModal: boolean
  pendingDeleteSeriesName: string
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const PhoneFavoritesSection: React.FC<PhoneFavoritesSectionProps> = ({
  items,
  showClearModal,
  showDeleteModal,
  pendingDeleteSeriesName,
  onNavigate,
  t,
}) => {
  const favorites = t.account.favorites as Record<string, string>
  
  // Sort items using shared helper
  const sortedItems = getSortedFavoritesItems(items)

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
      <button className="phone-clear-btn" onClick={openClearFavoritesModal}>
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
                openDeleteFavoriteItemModal(item.seriesId, item.seriesName)
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Clear Favorites Confirmation Modal */}
      {showClearModal && (
        <div className="phone-modal-overlay" onClick={cancelClearFavorites}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">🗑️</span>
            <h3 className="phone-modal-title">{favorites.clearConfirmTitle || 'Clear Favorites'}</h3>
            <p className="phone-modal-message">
              {favorites.clearConfirmMessage || 'Are you sure you want to clear all favorites? This action cannot be undone.'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmClearFavorites}>
                {favorites.clearFavorites || 'Clear Favorites'}
              </button>
              <button className="phone-modal-cancel" onClick={cancelClearFavorites}>
                {favorites.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {showDeleteModal && (
        <div className="phone-modal-overlay" onClick={cancelDeleteFavoriteItem}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">🗑️</span>
            <h3 className="phone-modal-title">{favorites.deleteConfirmTitle || 'Remove from Favorites'}</h3>
            {pendingDeleteSeriesName && (
              <div className="phone-modal-series">{pendingDeleteSeriesName}</div>
            )}
            <p className="phone-modal-message">
              {favorites.deleteConfirmMessage || 'Are you sure you want to remove this item from your favorites?'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmDeleteFavoriteItem}>
                {favorites.remove || 'Remove'}
              </button>
              <button className="phone-modal-cancel" onClick={cancelDeleteFavoriteItem}>
                {favorites.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  transactions: Transaction[]
  purchases: PurchaseItem[]
  transactionFilter: 'all' | 'topup' | 'withdraw' | 'purchase'
  showCustomAmountPopup: boolean
  customAmountInput: string
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
  transactionFilter,
  showCustomAmountPopup,
  customAmountInput,
  t,
}) => {
  const wallet = t.account.wallet as Record<string, string>

  const onTopUpClick = (amount: number) => handleTopUpClick(amount)

  const onWithdrawClick = (amount: number) => handleWithdrawClick(amount, t.account)

  const onConfirmTopUp = () => handleConfirmTopUp(t.account)

  const onConfirmWithdraw = () => handleConfirmWithdraw(t.account)

  const onCustomAmountConfirm = () => handleCustomAmountConfirm(t.account)

  // Use shared helpers for combined transactions
  const combinedTransactions = getCombinedTransactions(transactions, purchases)
  const filteredTransactions = getFilteredTransactions(combinedTransactions, transactionFilter)

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
            onClick={() => onWithdrawClick(parseFloat(balance.toFixed(2)))}
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
              onClick={() => walletTab === 'topup' ? onTopUpClick(amount) : onWithdrawClick(amount)}
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
            onChange={(e) => accountStoreActions.setTransactionFilter(e.target.value as 'all' | 'topup' | 'withdraw' | 'purchase')}
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
                    <span className="phone-transaction-date">{formatTransactionDate(transaction.createdAt)}</span>
                  </div>
                  <div className="phone-transaction-amount-status">
                    <span className={`phone-transaction-amount amount-${transaction.type}`}>
                      {transaction.type === 'topup' ? '+' : '-'}{transaction.amount.toFixed(2)}
                    </span>
                    <span className={`phone-transaction-status ${getStatusClass(transaction.status)}`}>
                      {getStatusText(transaction.status, t.account)}
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
        <div className="phone-popup-overlay" onClick={closeTopUpPopup}>
          <div className="phone-popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-logo" />
            <h3 className="phone-popup-title">{wallet.confirmTopUp || 'Confirm Top Up'}</h3>
            <p className="phone-popup-message">{wallet.topUpMessage || 'Add to your wallet'}</p>
            <div className="phone-popup-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" className="phone-popup-amount-logo" />
              <span>{selectedTopUpAmount}</span>
            </div>
            <div className="phone-popup-buttons">
              <button className="phone-popup-confirm" onClick={onConfirmTopUp}>
                {wallet.confirm || 'Confirm'}
              </button>
              <button className="phone-popup-cancel" onClick={closeTopUpPopup}>
                {wallet.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Popup */}
      {showWithdrawPopup && selectedWithdrawAmount && (
        <div className="phone-popup-overlay" onClick={closeWithdrawPopup}>
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
                onClick={onConfirmWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? '...' : (wallet.confirm || 'Confirm')}
              </button>
              <button
                className="phone-popup-cancel"
                onClick={closeWithdrawPopup}
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
        <div className="phone-popup-overlay" onClick={closeCustomAmountPopup}>
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
                onChange={(e) => accountStoreActions.setCustomAmountInput(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="phone-popup-buttons">
              <button className="phone-popup-confirm" onClick={onCustomAmountConfirm}>
                {wallet.confirm || 'Confirm'}
              </button>
              <button className="phone-popup-cancel" onClick={closeCustomAmountPopup}>
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

  // Group purchases by series using shared helper
  const seriesList = groupPurchasesBySeries(purchases)

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
  editingSeriesId: string | null
  showShelveModal: boolean
  pendingShelveSeries: Series | null
  showUnshelveModal: boolean
  pendingUnshelveSeries: Series | null
  showDeleteModal: boolean
  pendingDeleteSeries: Series | null
  onNavigate: (path: string) => void
  t: Record<string, Record<string, unknown>>
}

const PhoneMySeriesSection: React.FC<PhoneMySeriesSectionProps> = ({
  series,
  loading,
  editingSeriesId,
  showShelveModal,
  pendingShelveSeries,
  showUnshelveModal,
  pendingUnshelveSeries,
  showDeleteModal,
  pendingDeleteSeries,
  onNavigate,
  t,
}) => {
  const mySeries = (t.account.mySeries || {}) as Record<string, string>

  if (loading) {
    return (
      <div className="phone-loading">Loading...</div>
    )
  }

  // Show SeriesEditContent when editing or adding
  if (editingSeriesId) {
    const isAddMode = editingSeriesId === 'new'
    const sectionTitle = isAddMode
      ? (mySeries.addSeriesTitle || 'Add Series')
      : (mySeries.editSeriesTitle || 'Edit Series')
    
    return (
      <div className="phone-my-series">
        <div className="phone-series-edit-header">
          <h2 className="phone-series-edit-title">{sectionTitle}</h2>
        </div>
        <SeriesEditContent
          seriesId={editingSeriesId}
          onCancel={handleCancelEdit}
          onSaveComplete={handleSaveComplete}
        />
      </div>
    )
  }

  if (series.length === 0) {
    return (
      <div className="phone-empty-state">
        <span className="phone-empty-icon">🎬</span>
        <p>{mySeries.emptyTitle || 'No series yet'}</p>
        <p className="phone-empty-subtext">{mySeries.emptySubtext || 'Start creating your first series'}</p>
        <button className="phone-add-series-btn" onClick={handleAddSeries}>
          {mySeries.addSeries || 'Add Series'}
        </button>
      </div>
    )
  }

  return (
    <div className="phone-my-series">
      <div className="phone-series-header">
        <h2 className="phone-series-title">{mySeries.title || 'My Series'}</h2>
        <button className="phone-add-series-btn" onClick={handleAddSeries}>
          {mySeries.addSeries || 'Add Series'}
        </button>
      </div>
      <div className="phone-series-list">
        {series.map((seriesItem) => (
          <div
            key={seriesItem._id}
            className={`phone-series-item ${seriesItem.shelved ? 'shelved' : ''}`}
            onClick={() => onNavigate(`/player/${seriesItem._id}`)}
          >
            <div className="phone-series-item-cover">
              {seriesItem.cover ? (
                <img src={seriesItem.cover} alt={seriesItem.name} />
              ) : (
                <div className="phone-series-item-placeholder">🎬</div>
              )}
              {seriesItem.shelved && (
                <span className="phone-series-item-badge">{mySeries.shelved || 'Shelved'}</span>
              )}
            </div>
            <div className="phone-series-item-info">
              <span className="phone-series-item-name">{seriesItem.name}</span>
              <span className="phone-series-item-tags">
                {seriesItem.tags?.slice(0, 2).join(' • ') || 'No tags'}
              </span>
            </div>
            <div className="phone-series-item-actions">
              <button
                className="phone-series-action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleShelveClick(seriesItem._id, seriesItem.shelved || false, seriesItem)
                }}
                title={seriesItem.shelved ? (mySeries.unshelve || 'Unshelve') : (mySeries.shelve || 'Shelve')}
              >
                {seriesItem.shelved ? '📤' : '📥'}
              </button>
              <button
                className="phone-series-action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditSeries(seriesItem)
                }}
                title={mySeries.edit || 'Edit'}
              >
                ✏️
              </button>
              <button
                className="phone-series-action-btn phone-series-action-btn-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  openDeleteSeriesModal(seriesItem)
                }}
                title={mySeries.delete || 'Delete'}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Shelve Confirmation Modal */}
      {showShelveModal && pendingShelveSeries && (
        <div className="phone-modal-overlay" onClick={cancelShelve}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">📥</span>
            <h3 className="phone-modal-title">{mySeries.shelveConfirmTitle || 'Confirm Shelve'}</h3>
            <div className="phone-modal-series">{pendingShelveSeries.name || 'Untitled Series'}</div>
            <p className="phone-modal-message">
              {mySeries.shelveConfirmMessage || 'Are you sure you want to shelve this series? It will be hidden from users.'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm" onClick={confirmShelve}>
                {mySeries.shelve || 'Shelve'}
              </button>
              <button className="phone-modal-cancel" onClick={cancelShelve}>
                {mySeries.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unshelve Confirmation Modal */}
      {showUnshelveModal && pendingUnshelveSeries && (
        <div className="phone-modal-overlay" onClick={cancelUnshelve}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">📤</span>
            <h3 className="phone-modal-title">{mySeries.unshelveConfirmTitle || 'Confirm Unshelve'}</h3>
            <div className="phone-modal-series">{pendingUnshelveSeries.name || 'Untitled Series'}</div>
            <p className="phone-modal-message">
              {mySeries.unshelveConfirmMessage || 'Are you sure you want to unshelve this series? It will become visible to all users.'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm" onClick={confirmUnshelve}>
                {mySeries.unshelve || 'Unshelve'}
              </button>
              <button className="phone-modal-cancel" onClick={cancelUnshelve}>
                {mySeries.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && pendingDeleteSeries && (
        <div className="phone-modal-overlay" onClick={cancelDeleteSeries}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="phone-modal-icon">🗑️</span>
            <h3 className="phone-modal-title">{mySeries.deleteConfirmTitle || 'Confirm Delete'}</h3>
            <div className="phone-modal-series">{pendingDeleteSeries.name || 'Untitled Series'}</div>
            <p className="phone-modal-message">
              {mySeries.deleteConfirmMessage || 'Are you sure you want to delete this series? This action cannot be undone.'}
            </p>
            <div className="phone-modal-buttons">
              <button className="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmDeleteSeries}>
                {mySeries.delete || 'Delete'}
              </button>
              <button className="phone-modal-cancel" onClick={cancelDeleteSeries}>
                {mySeries.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// About Section Component
interface PhoneAboutSectionProps {
  t: Record<string, Record<string, unknown>>
}

const PhoneAboutSection: React.FC<PhoneAboutSectionProps> = ({ t }) => {
  const about = (t.about || {}) as Record<string, string>

  const features = [
    { icon: '🎬', title: about.feature1Title || 'Exclusive Content', text: about.feature1Text || 'Access a wide variety of exclusive series and movies you won\'t find anywhere else.' },
    { icon: '💰', title: about.feature2Title || 'Easy Payments', text: about.feature2Text || 'Pay for episodes seamlessly with your Gcash wallet. Top up anytime, anywhere.' },
    { icon: '🌍', title: about.feature3Title || 'Multi-Language Support', text: about.feature3Text || 'Enjoy content in multiple languages with our built-in language switching feature.' },
    { icon: '📱', title: about.feature4Title || 'Watch Anywhere', text: about.feature4Text || 'Stream on any device - desktop, tablet, or mobile. Your entertainment, your way.' },
  ]

  const steps = [
    { number: 1, title: about.step1Title || 'Create an Account', text: about.step1Text || 'Sign up for free using your email or social media accounts. It only takes a minute.' },
    { number: 2, title: about.step2Title || 'Top Up Your Wallet', text: about.step2Text || 'Add funds to your Gcash wallet to unlock premium episodes and content.' },
    { number: 3, title: about.step3Title || 'Start Watching', text: about.step3Text || 'Browse our library, unlock episodes, and enjoy unlimited streaming.' },
  ]

  return (
    <div className="phone-about-section">
      {/* Hero Section */}
      <div className="phone-about-hero">
        <img
          src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
          alt="GcashTV Logo"
          className="phone-about-logo"
        />
        <h1 className="phone-about-title">GcashTV</h1>
        <p className="phone-about-tagline">{about.tagline || 'Your premium destination for streaming entertainment'}</p>
      </div>

      {/* Mission Section */}
      <div className="phone-about-card">
        <span className="phone-about-card-icon">🎯</span>
        <h2 className="phone-about-card-title">{about.missionTitle || 'Our Mission'}</h2>
        <p className="phone-about-card-text">{about.missionText || 'GcashTV is dedicated to bringing you the best streaming experience with a vast library of series and movies. We believe in making quality entertainment accessible to everyone, with seamless payment integration through Gcash.'}</p>
      </div>

      {/* Features Section */}
      <div className="phone-about-card">
        <h2 className="phone-about-card-title">{about.featuresTitle || 'Why Choose GcashTV'}</h2>
        <div className="phone-about-features">
          {features.map((feature, index) => (
            <div key={index} className="phone-about-feature">
              <span className="phone-about-feature-icon">{feature.icon}</span>
              <h3 className="phone-about-feature-title">{feature.title}</h3>
              <p className="phone-about-feature-text">{feature.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="phone-about-card">
        <h2 className="phone-about-card-title">{about.howItWorksTitle || 'How It Works'}</h2>
        <div className="phone-about-steps">
          {steps.map((step) => (
            <div key={step.number} className="phone-about-step">
              <span className="phone-about-step-number">{step.number}</span>
              <div className="phone-about-step-content">
                <h3 className="phone-about-step-title">{step.title}</h3>
                <p className="phone-about-step-text">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="phone-about-footer">{about.footerText || 'Thank you for choosing GcashTV. Happy watching!'}</p>
    </div>
  )
}

// Contact Section Component
interface PhoneContactSectionProps {
  t: Record<string, Record<string, unknown>>
}

const PhoneContactSection: React.FC<PhoneContactSectionProps> = ({ t }) => {
  const contact = (t.contact || {}) as Record<string, string>

  return (
    <div className="phone-contact-section">
      {/* Header Section */}
      <div className="phone-contact-header">
        <span className="phone-contact-icon">✉️</span>
        <h1 className="phone-contact-title">{contact.title || 'Contact Us'}</h1>
        <p className="phone-contact-subtitle">{contact.subtitle || "We'd love to hear from you"}</p>
      </div>

      {/* Contact Card */}
      <div className="phone-contact-card">
        {/* Welcome Message */}
        <p className="phone-contact-welcome">{contact.welcomeMessage || 'Your feedback and creative ideas are always welcome.'}</p>

        {/* Contact Info */}
        <div className="phone-contact-info">
          <div className="phone-contact-info-icon">
            <span>📧</span>
          </div>
          <div className="phone-contact-info-details">
            <span className="phone-contact-info-label">{contact.emailLabel || 'Email Address'}</span>
            <a href="mailto:chatuni.ai@gmail.com" className="phone-contact-info-value">chatuni.ai@gmail.com</a>
          </div>
        </div>

        {/* CTA Section */}
        <div className="phone-contact-cta">
          <p className="phone-contact-cta-text">{contact.ctaText || 'Have questions or suggestions? Drop us a line!'}</p>
          <a href="mailto:chatuni.ai@gmail.com" className="phone-contact-send-btn">
            <span>✉️</span>
            {contact.sendEmail || 'Send Email'}
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="phone-contact-footer">{contact.footerText || 'We typically respond within 24-48 hours.'}</p>
    </div>
  )
}

export default PhoneAccount
