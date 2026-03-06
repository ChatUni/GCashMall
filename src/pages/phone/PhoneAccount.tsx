import { createSignal, onMount, Show, For } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { useNavigate, useSearchParams } from '@solidjs/router'
import paymentMethodsIcon from '../../assets/payment-methods2.svg'
import PhoneLayout from '../../layouts/PhoneLayout'
import LoginModal from '../../components/LoginModal'
import { SeriesEditContent } from '../SeriesEdit'
import { t } from '../../stores/languageStore'
import { languageStore, languageStoreActions } from '../../stores/languageStore'
import type { Language } from '../../i18n'
import {
  accountStore,
  accountStoreActions,
  getFilteredPhoneNavItems,
  walletAmounts,
  type AccountTab,
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
  handleStripeCallback,
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
import { toastStore } from '../../stores'
import type { User } from '../../types'
import './PhoneAccount.css'

const PhoneAccount = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const getUrlSearchParams = () => {
    const usp = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) usp.set(key, String(value))
    }
    return usp
  }

  initializeAccountPage(getUrlSearchParams(), (params) => setSearchParams(params), navigate)
  handleStripeCallback(getUrlSearchParams(), (params) => setSearchParams(params), t().account)
  syncTabFromUrl(getUrlSearchParams(), true)

  const onTabClick = (tab: AccountTab) => handleTabClick(tab, (params) => setSearchParams(params))
  const onLoginClose = () => handleLoginClose(navigate)
  const onLoginSuccess = async (user: User) => handleLoginSuccess(user)
  const onAvatarUpload = (e: Event & { currentTarget: HTMLInputElement; target: Element }) => handleAvatarUpload(e, t().account)

  const tabComponents: Record<AccountTab, () => any> = {
    overview: PhoneOverviewSection,
    watchHistory: PhoneWatchHistorySection,
    favorites: PhoneFavoritesSection,
    settings: PhoneSettingsSection,
    wallet: PhoneWalletSection,
    myPurchases: PhoneMyPurchasesSection,
    mySeries: PhoneMySeriesSection,
    about: PhoneAboutSection,
    contact: PhoneContactSection,
  }

  return (
    <Show when={!accountStore.loading} fallback={
      <PhoneLayout showHeader={true} title={(t().account.nav as Record<string, string>).overview}>
        <div class="phone-account-loading">Loading...</div>
      </PhoneLayout>
    }>
      <Show when={accountStore.isLoggedIn} fallback={
        <PhoneLayout showHeader={true} title={(t().account.nav as Record<string, string>).overview || 'Account'}>
          <div class="phone-account-login-prompt">
            <div class="phone-login-icon">👤</div>
            <h2 class="phone-login-title">{t().login.title || 'Login'}</h2>
            <p class="phone-login-message">Please log in to access your account</p>
            <button class="phone-login-btn" onClick={() => accountStoreActions.setShowLoginModal(true)}>
              {t().login.submit || 'Login'}
            </button>
          </div>
          <Show when={accountStore.showLoginModal}>
            <LoginModal onClose={onLoginClose} onLoginSuccess={onLoginSuccess} />
          </Show>
        </PhoneLayout>
      }>
        <PhoneLayout showHeader={true} title={getPhoneTabTitle(t().account)}>
          <div class="phone-account">
            <Show when={accountStore.activeTab === 'overview'}>
              <div class="phone-account-header">
                <div class="phone-account-avatar">
                  <Show when={accountStore.user?.avatar} fallback={<span class="phone-avatar-emoji">👤</span>}>
                    <img src={accountStore.user!.avatar!} alt={accountStore.user!.nickname} />
                  </Show>
                  <label class="phone-avatar-edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    <input type="file" accept="image/*" onChange={onAvatarUpload} hidden disabled={accountStore.avatarUploading} />
                  </label>
                </div>
                <h2 class="phone-account-name">{accountStore.user?.nickname || 'Guest'}</h2>
                <p class="phone-account-email">{accountStore.user?.email || ''}</p>
              </div>
            </Show>
            <div class="phone-account-tabs">
              <For each={getFilteredPhoneNavItems()}>
                {(item) => (
                  <button class={`phone-account-tab ${accountStore.activeTab === item.key ? 'active' : ''}`} onClick={() => onTabClick(item.key)}>
                    <span class="phone-tab-icon">{item.icon}</span>
                    <span class="phone-tab-label">{(t().account.nav as Record<string, string>)[item.key]}</span>
                  </button>
                )}
              </For>
            </div>
            <div class="phone-account-content">
              <Dynamic component={tabComponents[accountStore.activeTab]} />
            </div>
          </div>
          <Show when={accountStore.showLoginModal}>
            <LoginModal onClose={onLoginClose} onLoginSuccess={onLoginSuccess} />
          </Show>
          <Show when={toastStore.isVisible}>
            <div class={`phone-toast phone-toast-${toastStore.type}`}>{toastStore.message}</div>
          </Show>
        </PhoneLayout>
      </Show>
    </Show>
  )
}

// ── Overview Section ── subscribes directly to accountStore

const PhoneOverviewSection = () => {
  const overview = () => t().account.overview as Record<string, string>
  const login = () => t().login as Record<string, string>
  const profileHasChanges = () => hasProfileChanges(accountStore.profileForm, accountStore.originalProfile)
  const [showCurrentPassword, setShowCurrentPassword] = createSignal(false)
  const [showNewPassword, setShowNewPassword] = createSignal(false)
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false)

  const onSaveProfile = () => handleSaveProfile(t().account)
  const onChangePassword = () => handleChangePassword(t().account)
  const onSetPassword = () => handleSetPassword(t().account)

  const PasswordToggle = (pwProps: { show: boolean }) => (
    <Show when={pwProps.show} fallback={
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    }>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </Show>
  )

  return (
    <div class="phone-overview">
      <div class="phone-section-card">
        <h3 class="phone-section-title">{overview().profileInfo}</h3>
        <div class="phone-form-group">
          <label>{overview().nickname}</label>
          <input type="text" value={accountStore.profileForm.nickname} onInput={(e) => accountStoreActions.updateProfileField('nickname', e.currentTarget.value)} placeholder={overview().nicknamePlaceholder} />
        </div>
        <div class="phone-form-group">
          <label>{overview().email}</label>
          <input type="email" value={accountStore.profileForm.email} onInput={(e) => { accountStoreActions.updateProfileField('email', e.currentTarget.value); if (accountStore.profileErrors.emailError) accountStoreActions.updateProfileError('emailError', '') }} placeholder={overview().emailPlaceholder} class={accountStore.profileErrors.emailError ? 'error' : ''} />
          <Show when={accountStore.profileErrors.emailError}><span class="phone-field-error">{accountStore.profileErrors.emailError}</span></Show>
        </div>
        <div class="phone-form-group">
          <label>{overview().phoneNumber}</label>
          <input type="tel" value={accountStore.profileForm.phoneNumber} onInput={(e) => { accountStoreActions.updateProfileField('phoneNumber', e.currentTarget.value); if (accountStore.profileErrors.phoneError) accountStoreActions.updateProfileError('phoneError', '') }} placeholder={overview().phonePlaceholder} class={accountStore.profileErrors.phoneError ? 'error' : ''} />
          <Show when={accountStore.profileErrors.phoneError}><span class="phone-field-error">{accountStore.profileErrors.phoneError}</span></Show>
        </div>
        <div class="phone-form-group">
          <label>{overview().gender}</label>
          <select value={accountStore.profileForm.gender} onChange={(e) => accountStoreActions.updateProfileField('gender', e.currentTarget.value)}>
            <option value="not_specified">{overview().genderNotSpecified}</option>
            <option value="male">{overview().genderMale}</option>
            <option value="female">{overview().genderFemale}</option>
            <option value="other">{overview().genderOther}</option>
          </select>
        </div>
        <div class="phone-form-group">
          <label>{overview().birthday}</label>
          <input type="date" value={accountStore.profileForm.birthday} onInput={(e) => { accountStoreActions.updateProfileField('birthday', e.currentTarget.value); if (accountStore.profileErrors.birthdayError) accountStoreActions.updateProfileError('birthdayError', '') }} class={accountStore.profileErrors.birthdayError ? 'error' : ''} />
          <Show when={accountStore.profileErrors.birthdayError}><span class="phone-field-error">{accountStore.profileErrors.birthdayError}</span></Show>
        </div>
        <button class="phone-save-btn" onClick={onSaveProfile} disabled={!profileHasChanges() || accountStore.profileSaving}>
          {accountStore.profileSaving ? '...' : overview().save}
        </button>
      </div>
      <div class="phone-section-card">
        <h3 class="phone-section-title">{(accountStore.user?.hasPassword ?? true) ? overview().changePassword : (login().setPassword || 'Set Password')}</h3>
        <Show when={accountStore.user?.hasPassword ?? true}>
          <div class="phone-form-group">
            <label>{overview().currentPassword}</label>
            <div class="phone-password-input">
              <input type={showCurrentPassword() ? 'text' : 'password'} value={accountStore.passwordForm.currentPassword} onInput={(e) => { accountStoreActions.updatePasswordField('currentPassword', e.currentTarget.value); if (accountStore.passwordErrors.currentPasswordError) accountStoreActions.updatePasswordError('currentPasswordError', '') }} placeholder={overview().currentPasswordPlaceholder} class={accountStore.passwordErrors.currentPasswordError ? 'error' : ''} />
              <button type="button" class="phone-password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword())}><PasswordToggle show={showCurrentPassword()} /></button>
            </div>
            <Show when={accountStore.passwordErrors.currentPasswordError}><span class="phone-field-error">{accountStore.passwordErrors.currentPasswordError}</span></Show>
          </div>
        </Show>
        <div class="phone-form-group">
          <label>{overview().newPassword}</label>
          <div class="phone-password-input">
            <input type={showNewPassword() ? 'text' : 'password'} value={accountStore.passwordForm.newPassword} onInput={(e) => { accountStoreActions.updatePasswordField('newPassword', e.currentTarget.value); if (accountStore.passwordErrors.newPasswordError) accountStoreActions.updatePasswordError('newPasswordError', '') }} placeholder={overview().newPasswordPlaceholder} class={accountStore.passwordErrors.newPasswordError ? 'error' : ''} />
            <button type="button" class="phone-password-toggle" onClick={() => setShowNewPassword(!showNewPassword())}><PasswordToggle show={showNewPassword()} /></button>
          </div>
          <Show when={accountStore.passwordErrors.newPasswordError} fallback={<span class="phone-password-hint">{overview().passwordRequirements || 'Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character'}</span>}>
            <span class="phone-field-error">{accountStore.passwordErrors.newPasswordError}</span>
          </Show>
        </div>
        <div class="phone-form-group">
          <label>{overview().confirmPassword}</label>
          <div class="phone-password-input">
            <input type={showConfirmPassword() ? 'text' : 'password'} value={accountStore.passwordForm.confirmPassword} onInput={(e) => { accountStoreActions.updatePasswordField('confirmPassword', e.currentTarget.value); if (accountStore.passwordErrors.confirmPasswordError) accountStoreActions.updatePasswordError('confirmPasswordError', '') }} placeholder={overview().confirmPasswordPlaceholder} class={accountStore.passwordErrors.confirmPasswordError ? 'error' : ''} />
            <button type="button" class="phone-password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword())}><PasswordToggle show={showConfirmPassword()} /></button>
          </div>
          <Show when={accountStore.passwordErrors.confirmPasswordError}><span class="phone-field-error">{accountStore.passwordErrors.confirmPasswordError}</span></Show>
        </div>
        <button class="phone-save-btn" onClick={(accountStore.user?.hasPassword ?? true) ? onChangePassword : onSetPassword} disabled={accountStore.passwordChanging || !accountStore.passwordForm.newPassword || !accountStore.passwordForm.confirmPassword}>
          {accountStore.passwordChanging ? '...' : ((accountStore.user?.hasPassword ?? true) ? overview().changePasswordBtn : (login().setPassword || 'Set Password'))}
        </button>
      </div>
    </div>
  )
}

// ── Watch History Section ── subscribes directly to accountStore

const PhoneWatchHistorySection = () => {
  const navigate = useNavigate()
  const wh = () => t().account.watchHistory as Record<string, string>
  const sortedItems = () => getSortedWatchHistoryItems(accountStore.user?.watchList || [])

  return (
    <Show when={sortedItems().length > 0} fallback={
      <div class="phone-empty-state">
        <span class="phone-empty-icon">📺</span>
        <p>{wh().emptyTitle}</p>
        <button class="phone-explore-btn" onClick={() => navigate('/genre')}>{wh().exploreButton}</button>
      </div>
    }>
      <div class="phone-history-section">
        <button class="phone-clear-btn" onClick={openClearHistoryModal}>{wh().clearHistory}</button>
        <div class="phone-history-list">
          <For each={sortedItems()}>
            {(item) => (
              <PhoneHistoryCard seriesId={item.seriesId} episodeNumber={item.episodeNumber} onClick={() => navigate(`/player/${item.seriesId}?episode=${item.episodeNumber}`)} onRemove={(e: MouseEvent, name: string) => { e.stopPropagation(); openDeleteHistoryItemModal(item.seriesId, name) }} />
            )}
          </For>
        </div>
        <Show when={accountStore.showClearHistoryModal}>
          <div class="phone-modal-overlay" onClick={cancelClearHistory}>
            <div class="phone-modal" onClick={(e) => e.stopPropagation()}>
              <span class="phone-modal-icon">🗑️</span>
              <h3 class="phone-modal-title">{wh().clearConfirmTitle || 'Clear Watch History'}</h3>
              <p class="phone-modal-message">{wh().clearConfirmMessage || 'Are you sure you want to clear all watch history? This action cannot be undone.'}</p>
              <div class="phone-modal-buttons">
                <button class="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmClearHistory}>{wh().clearHistory || 'Clear History'}</button>
                <button class="phone-modal-cancel" onClick={cancelClearHistory}>{wh().cancel || 'Cancel'}</button>
              </div>
            </div>
          </div>
        </Show>
        <Show when={accountStore.showDeleteHistoryItemModal}>
          <div class="phone-modal-overlay" onClick={cancelDeleteHistoryItem}>
            <div class="phone-modal" onClick={(e) => e.stopPropagation()}>
              <span class="phone-modal-icon">🗑️</span>
              <h3 class="phone-modal-title">{wh().deleteConfirmTitle || 'Remove from History'}</h3>
              <Show when={accountStore.pendingDeleteHistorySeriesName}><div class="phone-modal-series">{accountStore.pendingDeleteHistorySeriesName}</div></Show>
              <p class="phone-modal-message">{wh().deleteConfirmMessage || 'Are you sure you want to remove this item from your watch history?'}</p>
              <div class="phone-modal-buttons">
                <button class="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmDeleteHistoryItem}>{wh().remove || 'Remove'}</button>
                <button class="phone-modal-cancel" onClick={cancelDeleteHistoryItem}>{wh().cancel || 'Cancel'}</button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}

// ── History Card ──

interface PhoneHistoryCardProps {
  seriesId: string
  episodeNumber: number
  onClick: () => void
  onRemove: (e: MouseEvent, seriesName: string) => void
}

const PhoneHistoryCard = (props: PhoneHistoryCardProps) => {
  const [series, setSeries] = createSignal<{ name: string; cover: string; tags?: string[] } | null>(null)
  const [notFound, setNotFound] = createSignal(false)

  onMount(async () => {
    try {
      const response = await fetch(`${import.meta.env.DEV ? 'http://localhost:8888' : ''}/.netlify/functions/api?type=series&id=${props.seriesId}`)
      const data = await response.json()
      if (data.success && data.data) {
        setSeries(data.data)
      } else {
        setNotFound(true)
      }
    } catch (error) {
      console.error('Failed to fetch series:', error)
      setNotFound(true)
    }
  })

  return (
    <Show when={!notFound()}>
      <div class="phone-history-item" onClick={props.onClick}>
        <div class="phone-history-cover">
          <Show when={series()?.cover} fallback={<div class="phone-history-placeholder">🎬</div>}>
            <img src={series()!.cover} alt={series()!.name || 'Series'} />
          </Show>
          <span class="phone-history-ep">EP {props.episodeNumber}</span>
        </div>
        <span class="phone-history-name">{series()?.name || `Series ${props.seriesId}`}</span>
        <button class="phone-remove-btn" onClick={(e: MouseEvent) => props.onRemove(e, series()?.name || `Series ${props.seriesId}`)}>✕</button>
      </div>
    </Show>
  )
}

// ── Favorites Section ── subscribes directly to accountStore

const PhoneFavoritesSection = () => {
  const navigate = useNavigate()
  const fav = () => t().account.favorites as Record<string, string>
  const sortedItems = () => getSortedFavoritesItems(accountStore.user?.favorites || [])

  return (
    <Show when={sortedItems().length > 0} fallback={
      <div class="phone-empty-state">
        <span class="phone-empty-icon">❤️</span>
        <p>{fav().emptyTitle}</p>
        <button class="phone-explore-btn" onClick={() => navigate('/genre')}>{fav().exploreButton}</button>
      </div>
    }>
      <div class="phone-favorites-section">
        <button class="phone-clear-btn" onClick={openClearFavoritesModal}>{fav().clearFavorites || 'Clear Favorites'}</button>
        <div class="phone-favorites-list">
          <For each={sortedItems()}>
            {(item) => (
              <div class="phone-favorite-item" onClick={() => navigate(`/player/${item.seriesId}`)}>
                <div class="phone-favorite-cover">
                  <Show when={item.seriesCover} fallback={<div class="phone-favorite-placeholder">🎬</div>}>
                    <img src={item.seriesCover} alt={item.seriesName} />
                  </Show>
                </div>
                <span class="phone-favorite-name">{item.seriesName}</span>
                <button class="phone-remove-btn" onClick={(e) => { e.stopPropagation(); openDeleteFavoriteItemModal(item.seriesId, item.seriesName) }}>✕</button>
              </div>
            )}
          </For>
        </div>
        <Show when={accountStore.showClearFavoritesModal}>
          <div class="phone-modal-overlay" onClick={cancelClearFavorites}>
            <div class="phone-modal" onClick={(e) => e.stopPropagation()}>
              <span class="phone-modal-icon">🗑️</span>
              <h3 class="phone-modal-title">{fav().clearConfirmTitle || 'Clear Favorites'}</h3>
              <p class="phone-modal-message">{fav().clearConfirmMessage || 'Are you sure you want to clear all favorites? This action cannot be undone.'}</p>
              <div class="phone-modal-buttons">
                <button class="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmClearFavorites}>{fav().clearFavorites || 'Clear Favorites'}</button>
                <button class="phone-modal-cancel" onClick={cancelClearFavorites}>{fav().cancel || 'Cancel'}</button>
              </div>
            </div>
          </div>
        </Show>
        <Show when={accountStore.showDeleteFavoriteItemModal}>
          <div class="phone-modal-overlay" onClick={cancelDeleteFavoriteItem}>
            <div class="phone-modal" onClick={(e) => e.stopPropagation()}>
              <span class="phone-modal-icon">🗑️</span>
              <h3 class="phone-modal-title">{fav().deleteConfirmTitle || 'Remove from Favorites'}</h3>
              <Show when={accountStore.pendingDeleteFavoriteSeriesName}><div class="phone-modal-series">{accountStore.pendingDeleteFavoriteSeriesName}</div></Show>
              <p class="phone-modal-message">{fav().deleteConfirmMessage || 'Are you sure you want to remove this item from your favorites?'}</p>
              <div class="phone-modal-buttons">
                <button class="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmDeleteFavoriteItem}>{fav().remove || 'Remove'}</button>
                <button class="phone-modal-cancel" onClick={cancelDeleteFavoriteItem}>{fav().cancel || 'Cancel'}</button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}

// ── Settings Section ── subscribes directly to accountStore and languageStore

const PhoneSettingsSection = () => {
  const navigate = useNavigate()
  const settings = () => t().account.settings as Record<string, string>
  const nav = () => t().account.nav as Record<string, string>
  const onLogout = () => handleLogoutAndNavigate(navigate)

  return (
    <div class="phone-settings">
      <div class="phone-setting-item">
        <span class="phone-setting-label">{settings().language}</span>
        <select value={languageStore.language} onChange={(e) => languageStoreActions.setLanguage(e.currentTarget.value as Language)} class="phone-setting-select">
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>
      <div class="phone-setting-item">
        <span class="phone-setting-label">{settings().playbackSpeed}</span>
        <select value={accountStore.playbackSpeed} onChange={(e) => accountStoreActions.setPlaybackSpeed(e.currentTarget.value)} class="phone-setting-select">
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>
      <div class="phone-setting-item">
        <span class="phone-setting-label">{settings().autoplay}</span>
        <label class="phone-toggle">
          <input type="checkbox" checked={accountStore.autoplay} onChange={(e) => accountStoreActions.setAutoplay(e.currentTarget.checked)} />
          <span class="phone-toggle-slider"></span>
        </label>
      </div>
      <div class="phone-setting-item">
        <span class="phone-setting-label">{settings().notifications}</span>
        <label class="phone-toggle">
          <input type="checkbox" checked={accountStore.notifications} onChange={(e) => accountStoreActions.setNotifications(e.currentTarget.checked)} />
          <span class="phone-toggle-slider"></span>
        </label>
      </div>
      <button class="phone-logout-btn" onClick={onLogout}>
        <span>🚪</span>
        {nav().logout}
      </button>
    </div>
  )
}

// ── Wallet Section ── subscribes directly to accountStore

const PhoneWalletSection = () => {
  const wallet = () => t().account.wallet as Record<string, string>
  const onTopUpClick = (amount: number) => handleTopUpClick(amount)
  const onWithdrawClick = (amount: number) => handleWithdrawClick(amount, t().account)
  const onConfirmTopUp = () => handleConfirmTopUp(t().account)
  const onConfirmWithdraw = () => handleConfirmWithdraw(t().account)
  const onCustomAmountConfirm = () => handleCustomAmountConfirm(t().account)
  const combinedTransactions = () => getCombinedTransactions(accountStore.transactions, accountStore.myPurchases)
  const filteredTransactions = () => getFilteredTransactions(combinedTransactions(), accountStore.transactionFilter)

  return (
    <div class="phone-wallet">
      <div class="phone-wallet-balance">
        <span class="phone-balance-label">{wallet().currentBalance}</span>
        <div class="phone-balance-amount">
          <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="phone-balance-logo" />
          <span>{accountStore.balance.toFixed(2)}</span>
        </div>
      </div>
      <div class="phone-wallet-tabs">
        <button class={`phone-wallet-tab ${accountStore.walletTab === 'topup' ? 'active' : ''}`} onClick={() => accountStoreActions.setWalletTab('topup')}>{wallet().topUp}</button>
        <button class={`phone-wallet-tab ${accountStore.walletTab === 'withdraw' ? 'active' : ''}`} onClick={() => accountStoreActions.setWalletTab('withdraw')}>{wallet().withdraw}</button>
      </div>
      <div class="phone-amount-section">
        <div class="phone-amount-header">
          <h3 class="phone-wallet-title">{accountStore.walletTab === 'topup' ? (wallet().selectTopUpAmount || 'Select Top Up Amount') : (wallet().selectWithdrawAmount || 'Select Withdrawal Amount')}</h3>
          <button class={`phone-withdraw-all-btn ${accountStore.walletTab === 'topup' || accountStore.balance <= 0 ? 'invisible' : ''}`} onClick={() => onWithdrawClick(parseFloat(accountStore.balance.toFixed(2)))} disabled={accountStore.walletTab === 'topup' || accountStore.balance <= 0}>{wallet().withdrawAll || 'Withdraw All'}</button>
        </div>
        <div class="phone-wallet-amounts">
          <For each={walletAmounts}>
            {(amount) => (
              <button class={`phone-amount-btn ${accountStore.walletTab === 'withdraw' && amount > accountStore.balance ? 'disabled' : ''}`} onClick={() => accountStore.walletTab === 'topup' ? onTopUpClick(amount) : onWithdrawClick(amount)} disabled={accountStore.walletTab === 'withdraw' && amount > accountStore.balance}>
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="phone-amount-logo" />
                <span>{amount}</span>
              </button>
            )}
          </For>
          <button class="phone-amount-btn phone-custom-amount-btn" onClick={handleCustomAmountClick}>
            <span class="phone-custom-icon">✎</span>
            <span>{wallet().custom || 'Custom'}</span>
          </button>
        </div>
      </div>
      <div class="phone-transaction-section">
        <div class="phone-transaction-header">
          <h3 class="phone-wallet-title">{wallet().transactionHistory || 'Transaction History'}</h3>
          <select class="phone-transaction-filter" value={accountStore.transactionFilter} onChange={(e) => accountStoreActions.setTransactionFilter(e.currentTarget.value as 'all' | 'topup' | 'withdraw' | 'purchase')}>
            <option value="all">{wallet().filterAll || 'All'}</option>
            <option value="topup">{wallet().topUp || 'Top Up'}</option>
            <option value="withdraw">{wallet().withdraw || 'Withdraw'}</option>
            <option value="purchase">{wallet().purchase || 'Purchase'}</option>
          </select>
        </div>
        <Show when={filteredTransactions().length > 0} fallback={<p class="phone-no-transactions">{wallet().noTransactions || 'No transactions yet'}</p>}>
          <div class="phone-transaction-list">
            <For each={filteredTransactions()}>
              {(tx) => (
                <div class="phone-transaction-item">
                  <div class="phone-transaction-row">
                    <div class="phone-transaction-info">
                      <div class={`phone-transaction-type type-${tx.type}`}>
                        <Show when={tx.type === 'purchase' && tx.purchase} fallback={tx.type === 'topup' ? (wallet().topUp || 'Top Up') : (wallet().withdraw || 'Withdraw')}>
                          <div class="phone-purchase-type-cell">
                            <span class="phone-purchase-type-series">{tx.purchase!.seriesName}</span>
                            <span class="phone-purchase-type-episode">EP {tx.purchase!.episodeNumber}{tx.purchase!.episodeTitle ? ` ${tx.purchase!.episodeTitle}` : ''}</span>
                          </div>
                        </Show>
                      </div>
                      <span class="phone-transaction-date">{formatTransactionDate(tx.createdAt)}</span>
                    </div>
                    <div class="phone-transaction-amount-status">
                      <span class={`phone-transaction-amount amount-${tx.type}`}>{tx.type === 'topup' ? '+' : '-'}{tx.amount.toFixed(2)}</span>
                      <span class={`phone-transaction-status ${getStatusClass(tx.status)}`}>{getStatusText(tx.status, t().account)}</span>
                    </div>
                  </div>
                  <div class="phone-transaction-reference">{tx.referenceId}</div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={accountStore.showTopUpPopup && accountStore.selectedTopUpAmount}>
        <div class="phone-popup-overlay" onClick={() => !accountStore.topUpLoading && closeTopUpPopup()}>
          <div class="phone-popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="phone-popup-logo" />
            <h3 class="phone-popup-title">{wallet().confirmTopUp || 'Confirm Top Up'}</h3>
            <p class="phone-popup-message">{wallet().topUpMessage || 'Add to your wallet'}</p>
            <div class="phone-popup-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="phone-popup-amount-logo" />
              <span>{accountStore.selectedTopUpAmount}</span>
            </div>
            <div class="phone-payment-method-section">
              <p class="phone-payment-method-label">{wallet().choosePaymentMethod || 'Choose Payment Method'}</p>
              <div class="phone-payment-method-icons">
                <button
                  class={`phone-payment-method-btn ${accountStore.selectedPaymentMethod === 'creditcard' ? 'selected' : ''}`}
                  onClick={() => accountStoreActions.setSelectedPaymentMethod('creditcard')}
                >
                  <img src={paymentMethodsIcon} alt="Card" class="phone-payment-method-icon-img" width="28" height="28" />
                  <span class="phone-payment-method-text">{wallet().creditCard || 'Card'}</span>
                </button>
                <button
                  class={`phone-payment-method-btn ${accountStore.selectedPaymentMethod === 'gusd' ? 'selected' : ''}`}
                  onClick={() => accountStoreActions.setSelectedPaymentMethod('gusd')}
                >
                  <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="phone-payment-method-icon-img" />
                  <span class="phone-payment-method-text">{wallet().gusd || 'GUSD'}</span>
                </button>
              </div>
            </div>
            <Show when={accountStore.topUpLoading}>
              <div class="phone-popup-loading">
                <div class="phone-popup-spinner" />
                <p class="phone-popup-loading-text">{wallet().processing || 'Processing...'}</p>
              </div>
            </Show>
            <div class="phone-popup-buttons">
              <button class="phone-popup-confirm" onClick={onConfirmTopUp} disabled={!accountStore.selectedPaymentMethod || accountStore.topUpLoading}>{wallet().confirm || 'Confirm'}</button>
              <button class="phone-popup-cancel" onClick={closeTopUpPopup} disabled={accountStore.topUpLoading}>{wallet().cancel || 'Cancel'}</button>
            </div>
          </div>
        </div>
      </Show>
      <Show when={accountStore.showWithdrawPopup && accountStore.selectedWithdrawAmount}>
        <div class="phone-popup-overlay" onClick={closeWithdrawPopup}>
          <div class="phone-popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="phone-popup-logo" />
            <h3 class="phone-popup-title">{wallet().confirmWithdraw || 'Confirm Withdrawal'}</h3>
            <p class="phone-popup-message">{wallet().withdrawMessage || 'Withdraw from your wallet'}</p>
            <div class="phone-popup-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="phone-popup-amount-logo" />
              <span>{accountStore.selectedWithdrawAmount}</span>
            </div>
            <div class="phone-popup-buttons">
              <button class="phone-popup-confirm" onClick={onConfirmWithdraw} disabled={accountStore.withdrawing}>{accountStore.withdrawing ? '...' : (wallet().confirm || 'Confirm')}</button>
              <button class="phone-popup-cancel" onClick={closeWithdrawPopup} disabled={accountStore.withdrawing}>{wallet().cancel || 'Cancel'}</button>
            </div>
          </div>
        </div>
      </Show>
      <Show when={accountStore.showCustomAmountPopup}>
        <div class="phone-popup-overlay" onClick={closeCustomAmountPopup}>
          <div class="phone-popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="phone-popup-logo" />
            <h3 class="phone-popup-title">{accountStore.walletTab === 'topup' ? (wallet().customTopUp || 'Custom Top Up') : (wallet().customWithdraw || 'Custom Withdrawal')}</h3>
            <p class="phone-popup-message">{accountStore.walletTab === 'topup' ? (wallet().enterTopUpAmount || 'Enter the amount to add') : (wallet().enterWithdrawAmount || 'Enter the amount to withdraw')}</p>
            <div class="phone-custom-amount-input-wrapper">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="phone-popup-amount-logo" />
              <input type="number" class="phone-custom-amount-input" value={accountStore.customAmountInput} onInput={(e) => accountStoreActions.setCustomAmountInput(e.currentTarget.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div class="phone-popup-buttons">
              <button class="phone-popup-confirm" onClick={onCustomAmountConfirm}>{wallet().confirm || 'Confirm'}</button>
              <button class="phone-popup-cancel" onClick={closeCustomAmountPopup}>{wallet().cancel || 'Cancel'}</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

// ── My Purchases Section ── subscribes directly to accountStore

const PhoneMyPurchasesSection = () => {
  const navigate = useNavigate()
  const mp = () => (t().account.myPurchases || {}) as Record<string, string>
  const seriesList = () => groupPurchasesBySeries(accountStore.myPurchases)

  return (
    <Show when={!accountStore.myPurchasesLoading} fallback={<div class="phone-loading">Loading...</div>}>
      <Show when={seriesList().length > 0} fallback={
        <div class="phone-empty-state">
          <span class="phone-empty-icon">🛒</span>
          <p>{mp().emptyTitle || 'No purchases yet'}</p>
          <button class="phone-explore-btn" onClick={() => navigate('/genre')}>{mp().exploreButton || 'Explore Series'}</button>
        </div>
      }>
        <div class="phone-purchases">
          <For each={seriesList()}>
            {(sg) => (
              <div class="phone-purchase-group">
                <div class="phone-purchase-header" onClick={() => navigate(`/player/${sg.seriesId}`)}>
                  <div class="phone-purchase-cover">
                    <Show when={sg.seriesCover} fallback={<div class="phone-purchase-placeholder">🎬</div>}>
                      <img src={sg.seriesCover} alt={sg.seriesName} />
                    </Show>
                  </div>
                  <div class="phone-purchase-info">
                    <h3 class="phone-purchase-name">{sg.seriesName}</h3>
                    <span class="phone-purchase-count">{sg.episodes.length} {sg.episodes.length === 1 ? (mp().episode || 'episode') : (mp().episodes || 'episodes')}</span>
                  </div>
                </div>
                <div class="phone-purchase-episodes">
                  <For each={sg.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber)}>
                    {(ep) => (
                      <div class="phone-purchase-episode" onClick={() => navigate(`/player/${sg.seriesId}?episode=${ep.episodeNumber}`)}>
                        <div class="phone-episode-thumbnail">
                          <Show when={ep.episodeThumbnail} fallback={<div class="phone-episode-placeholder">▶️</div>}>
                            <img src={ep.episodeThumbnail} alt={`Episode ${ep.episodeNumber}`} />
                          </Show>
                          <div class="phone-episode-overlay">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                          </div>
                        </div>
                        <div class="phone-episode-info">
                          <span class="phone-episode-number">EP {ep.episodeNumber}</span>
                          <Show when={ep.episodeTitle}><span class="phone-episode-title">{ep.episodeTitle}</span></Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </Show>
  )
}

// ── My Series Section ── subscribes directly to accountStore

const PhoneMySeriesSection = () => {
  const navigate = useNavigate()
  const ms = () => (t().account.mySeries || {}) as Record<string, string>

  return (
    <Show when={!accountStore.mySeriesLoading} fallback={<div class="phone-loading">Loading...</div>}>
      <Show when={!accountStore.editingSeriesId} fallback={
        <div class="phone-my-series">
          <div class="phone-series-edit-header">
            <h2 class="phone-series-edit-title">{accountStore.editingSeriesId === 'new' ? (ms().addSeriesTitle || 'Add Series') : (ms().editSeriesTitle || 'Edit Series')}</h2>
          </div>
          <SeriesEditContent seriesId={accountStore.editingSeriesId!} onCancel={handleCancelEdit} onSaveComplete={handleSaveComplete} />
        </div>
      }>
        <Show when={accountStore.mySeries.length > 0} fallback={
          <div class="phone-empty-state">
            <span class="phone-empty-icon">🎬</span>
            <p>{ms().emptyTitle || 'No series yet'}</p>
            <p class="phone-empty-subtext">{ms().emptySubtext || 'Start creating your first series'}</p>
            <button class="phone-add-series-btn" onClick={handleAddSeries}>{ms().addSeries || 'Add Series'}</button>
          </div>
        }>
          <div class="phone-my-series">
            <div class="phone-series-header">
              <h2 class="phone-series-title">{ms().title || 'My Series'}</h2>
              <button class="phone-add-series-btn" onClick={handleAddSeries}>{ms().addSeries || 'Add Series'}</button>
            </div>
            <div class="phone-series-list">
              <For each={accountStore.mySeries}>
                {(si) => (
                  <div class={`phone-series-item ${si.shelved ? 'shelved' : ''}`} onClick={() => navigate(`/player/${si._id}`)}>
                    <div class="phone-series-item-cover">
                      <Show when={si.cover} fallback={<div class="phone-series-item-placeholder">🎬</div>}>
                        <img src={si.cover!} alt={si.name} />
                      </Show>
                      <Show when={si.shelved}><span class="phone-series-item-badge">{ms().shelved || 'Shelved'}</span></Show>
                    </div>
                    <div class="phone-series-item-info">
                      <span class="phone-series-item-name">{si.name}</span>
                      <span class="phone-series-item-tags">{si.tags?.slice(0, 2).join(' • ') || 'No tags'}</span>
                    </div>
                    <div class="phone-series-item-actions">
                      <button class="phone-series-action-btn" onClick={(e) => { e.stopPropagation(); handleShelveClick(si._id, si.shelved || false, si) }} title={si.shelved ? (ms().unshelve || 'Unshelve') : (ms().shelve || 'Shelve')}>{si.shelved ? '📤' : '📥'}</button>
                      <button class="phone-series-action-btn" onClick={(e) => { e.stopPropagation(); handleEditSeries(si) }} title={ms().edit || 'Edit'}>✏️</button>
                      <button class="phone-series-action-btn phone-series-action-btn-delete" onClick={(e) => { e.stopPropagation(); openDeleteSeriesModal(si) }} title={ms().delete || 'Delete'}>🗑️</button>
                    </div>
                  </div>
                )}
              </For>
            </div>
            <Show when={accountStore.showShelveModal && accountStore.pendingShelveSeries}>
              <div class="phone-modal-overlay" onClick={cancelShelve}>
                <div class="phone-modal" onClick={(e) => e.stopPropagation()}>
                  <span class="phone-modal-icon">📥</span>
                  <h3 class="phone-modal-title">{ms().shelveConfirmTitle || 'Confirm Shelve'}</h3>
                  <div class="phone-modal-series">{accountStore.pendingShelveSeries!.name || 'Untitled Series'}</div>
                  <p class="phone-modal-message">{ms().shelveConfirmMessage || 'Are you sure you want to shelve this series? It will be hidden from users.'}</p>
                  <div class="phone-modal-buttons">
                    <button class="phone-modal-confirm" onClick={confirmShelve}>{ms().shelve || 'Shelve'}</button>
                    <button class="phone-modal-cancel" onClick={cancelShelve}>{ms().cancel || 'Cancel'}</button>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={accountStore.showUnshelveModal && accountStore.pendingUnshelveSeries}>
              <div class="phone-modal-overlay" onClick={cancelUnshelve}>
                <div class="phone-modal" onClick={(e) => e.stopPropagation()}>
                  <span class="phone-modal-icon">📤</span>
                  <h3 class="phone-modal-title">{ms().unshelveConfirmTitle || 'Confirm Unshelve'}</h3>
                  <div class="phone-modal-series">{accountStore.pendingUnshelveSeries!.name || 'Untitled Series'}</div>
                  <p class="phone-modal-message">{ms().unshelveConfirmMessage || 'Are you sure you want to unshelve this series? It will become visible to all users.'}</p>
                  <div class="phone-modal-buttons">
                    <button class="phone-modal-confirm" onClick={confirmUnshelve}>{ms().unshelve || 'Unshelve'}</button>
                    <button class="phone-modal-cancel" onClick={cancelUnshelve}>{ms().cancel || 'Cancel'}</button>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={accountStore.showDeleteSeriesModal && accountStore.pendingDeleteSeries}>
              <div class="phone-modal-overlay" onClick={cancelDeleteSeries}>
                <div class="phone-modal" onClick={(e) => e.stopPropagation()}>
                  <span class="phone-modal-icon">🗑️</span>
                  <h3 class="phone-modal-title">{ms().deleteConfirmTitle || 'Confirm Delete'}</h3>
                  <div class="phone-modal-series">{accountStore.pendingDeleteSeries!.name || 'Untitled Series'}</div>
                  <p class="phone-modal-message">{ms().deleteConfirmMessage || 'Are you sure you want to delete this series? This action cannot be undone.'}</p>
                  <div class="phone-modal-buttons">
                    <button class="phone-modal-confirm phone-modal-confirm-delete" onClick={confirmDeleteSeries}>{ms().delete || 'Delete'}</button>
                    <button class="phone-modal-cancel" onClick={cancelDeleteSeries}>{ms().cancel || 'Cancel'}</button>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </Show>
    </Show>
  )
}

// ── About Section ──

const PhoneAboutSection = () => {
  const about = () => (t().about || {}) as Record<string, string>
  const features = () => [
    { icon: '🎬', title: about().feature1Title || 'Exclusive Content', text: about().feature1Text || 'Access a wide variety of exclusive series and movies you won\'t find anywhere else.' },
    { icon: '💰', title: about().feature2Title || 'Easy Payments', text: about().feature2Text || 'Pay for episodes seamlessly with your Gcash wallet. Top up anytime, anywhere.' },
    { icon: '🌍', title: about().feature3Title || 'Multi-Language Support', text: about().feature3Text || 'Enjoy content in multiple languages with our built-in language switching feature.' },
    { icon: '📱', title: about().feature4Title || 'Watch Anywhere', text: about().feature4Text || 'Stream on any device - desktop, tablet, or mobile. Your entertainment, your way.' },
  ]
  const steps = () => [
    { number: 1, title: about().step1Title || 'Create an Account', text: about().step1Text || 'Sign up for free using your email or social media accounts. It only takes a minute.' },
    { number: 2, title: about().step2Title || 'Top Up Your Wallet', text: about().step2Text || 'Add funds to your Gcash wallet to unlock premium episodes and content.' },
    { number: 3, title: about().step3Title || 'Start Watching', text: about().step3Text || 'Browse our library, unlock episodes, and enjoy unlimited streaming.' },
  ]

  return (
    <div class="phone-about-section">
      <div class="phone-about-hero">
        <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GcashTV Logo" class="phone-about-logo" />
        <h1 class="phone-about-title">GcashTV</h1>
        <p class="phone-about-tagline">{about().tagline || 'Your premium destination for streaming entertainment'}</p>
      </div>
      <div class="phone-about-card">
        <span class="phone-about-card-icon">🎯</span>
        <h2 class="phone-about-card-title">{about().missionTitle || 'Our Mission'}</h2>
        <p class="phone-about-card-text">{about().missionText || 'GcashTV is dedicated to bringing you the best streaming experience with a vast library of series and movies.'}</p>
      </div>
      <div class="phone-about-card">
        <h2 class="phone-about-card-title">{about().featuresTitle || 'Why Choose GcashTV'}</h2>
        <div class="phone-about-features">
          <For each={features()}>
            {(feature) => (
              <div class="phone-about-feature">
                <span class="phone-about-feature-icon">{feature.icon}</span>
                <h3 class="phone-about-feature-title">{feature.title}</h3>
                <p class="phone-about-feature-text">{feature.text}</p>
              </div>
            )}
          </For>
        </div>
      </div>
      <div class="phone-about-card">
        <h2 class="phone-about-card-title">{about().howItWorksTitle || 'How It Works'}</h2>
        <div class="phone-about-steps">
          <For each={steps()}>
            {(step) => (
              <div class="phone-about-step">
                <span class="phone-about-step-number">{step.number}</span>
                <div class="phone-about-step-content">
                  <h3 class="phone-about-step-title">{step.title}</h3>
                  <p class="phone-about-step-text">{step.text}</p>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
      <p class="phone-about-footer">{about().footerText || 'Thank you for choosing GcashTV. Happy watching!'}</p>
    </div>
  )
}

// ── Contact Section ──

const PhoneContactSection = () => {
  const contact = () => (t().contact || {}) as Record<string, string>

  return (
    <div class="phone-contact-section">
      <div class="phone-contact-header">
        <span class="phone-contact-icon">✉️</span>
        <h1 class="phone-contact-title">{contact().title || 'Contact Us'}</h1>
        <p class="phone-contact-subtitle">{contact().subtitle || "We'd love to hear from you"}</p>
      </div>
      <div class="phone-contact-card">
        <p class="phone-contact-welcome">{contact().welcomeMessage || 'Your feedback and creative ideas are always welcome.'}</p>
        <div class="phone-contact-info">
          <div class="phone-contact-info-icon"><span>📧</span></div>
          <div class="phone-contact-info-details">
            <span class="phone-contact-info-label">{contact().emailLabel || 'Email Address'}</span>
            <a href="mailto:chatuni.ai@gmail.com" class="phone-contact-info-value">chatuni.ai@gmail.com</a>
          </div>
        </div>
        <div class="phone-contact-cta">
          <p class="phone-contact-cta-text">{contact().ctaText || 'Have questions or suggestions? Drop us a line!'}</p>
          <a href="mailto:chatuni.ai@gmail.com" class="phone-contact-send-btn">
            <span>✉️</span>
            {contact().sendEmail || 'Send Email'}
          </a>
        </div>
      </div>
      <p class="phone-contact-footer">{contact().footerText || 'We typically respond within 24-48 hours.'}</p>
    </div>
  )
}

export default PhoneAccount
