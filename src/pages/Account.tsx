import { createSignal, Show, For, type Component, createEffect } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { useNavigate, useSearchParams } from '@solidjs/router'
import paymentMethodsIcon from '../assets/payment-methods2.svg'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import { SeriesEditContent } from './SeriesEdit'
import { t } from '../stores/languageStore'
import { languageStore, languageStoreActions } from '../stores/languageStore'
import type { Language } from '../i18n'
import {
  accountStore,
  accountStoreActions,
  getFilteredNavItems,
  walletAmounts,
  type AccountTab,
  type PaymentMethod,
  getCombinedTransactions,
  formatTransactionDateTime,
  getStatusClass,
  hasProfileChanges,
  groupPurchasesBySeries,
  getSortedWatchHistoryItems,
  getSortedFavoritesItems,
} from '../stores/accountStore'
import {
  initializeAccountPage,
  syncTabFromUrl,
  handleTabClickWithConfirm,
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
  clearWatchHistory,
  removeFromWatchList,
  clearFavorites,
  removeFromFavorites,
  handleShelveClick,
  confirmShelve,
  cancelShelve,
  confirmUnshelve,
  cancelUnshelve,
  handleEditSeries,
  handleAddSeries,
  handleCancelEdit,
  handleSaveComplete,
  getStatusText,
  fetchRevenueData,
} from '../services/accountService'
import { toastStore } from '../stores'
import type { Series, User } from '../types'
import './Account.css'

const tabComponents: Record<string, Component> = {
  overview: OverviewSection,
  watchHistory: WatchHistorySection,
  favorites: FavoritesSection,
  settings: SettingsSection,
  wallet: WalletSection,
  myPurchases: MyPurchasesSection,
  mySeries: MySeriesSection,
}

const Account = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Create URLSearchParams wrapper for service functions
  const getUrlSearchParams = () => {
    const usp = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) usp.set(key, String(value))
    }
    return usp
  }

  // Initialize data using shared service function
  initializeAccountPage(getUrlSearchParams(), (params) => setSearchParams(params), navigate)

  // Handle Stripe payment callback if present
  handleStripeCallback(getUrlSearchParams(), (params) => setSearchParams(params), t().account)

  // Sync tab from URL
  syncTabFromUrl(getUrlSearchParams(), false)

  // Event handlers using shared service functions
  const onTabClick = (tab: AccountTab) => {
    handleTabClickWithConfirm(tab, (params) => setSearchParams(params), t().account)
  }

  const onLogout = () => handleLogoutAndNavigate(navigate)

  const onLoginClose = () => handleLoginClose(navigate)

  const onLoginSuccess = async (user: User) => handleLoginSuccess(user)

  return (
    <div class="account-page">
      <TopBar />
      <Show when={!accountStore.loading} fallback={<div class="loading">Loading...</div>}>
        <div class="account-layout">
          <AccountSidebar onTabClick={onTabClick} onLogout={onLogout} />
          <main class="account-content">
            <Dynamic component={tabComponents[accountStore.activeTab]} />
          </main>
        </div>
      </Show>
      <BottomBar />

      <Show when={accountStore.showLoginModal}>
        <LoginModal onClose={onLoginClose} onLoginSuccess={onLoginSuccess} />
      </Show>

      <Show when={toastStore.isVisible}>
        <div class={`toast-notification toast-${toastStore.type}`}>
          {toastStore.message}
        </div>
      </Show>
    </div>
  )
}

// Sub-components that subscribe directly to stores

interface AccountSidebarProps {
  onTabClick: (tab: AccountTab) => void
  onLogout: () => void
}

const AccountSidebar = (props: AccountSidebarProps) => (
  <aside class="account-sidebar">
    <div class="sidebar-profile">
      <div class="sidebar-avatar">
        <Show when={accountStore.user?.avatar} fallback={<span class="avatar-emoji">👤</span>}>
          <img src={accountStore.user!.avatar!} alt={accountStore.user?.nickname} />
        </Show>
      </div>
      <div class="sidebar-user-info">
        <span class="sidebar-username">{accountStore.user?.nickname || 'Guest'}</span>
        <span class="sidebar-email">{accountStore.user?.email || ''}</span>
      </div>
    </div>

    <nav class="account-nav">
      <For each={getFilteredNavItems()}>
        {(item) => (
          <button
            class={`nav-item ${accountStore.activeTab === item.key ? 'active' : ''}`}
            onClick={() => props.onTabClick(item.key)}
          >
            <span class="nav-icon">{item.icon}</span>
            <span class="nav-label">{(t().account.nav as Record<string, string>)[item.key]}</span>
          </button>
        )}
      </For>
    </nav>

    <button class="nav-item logout" onClick={props.onLogout}>
      <span class="nav-icon">🚪</span>
      <span class="nav-label">{(t().account.nav as Record<string, string>).logout}</span>
    </button>
  </aside>
)

function OverviewSection() {
  const overview = () => t().account.overview as Record<string, string>
  const login = () => t().login as Record<string, string>
  const profileHasChanges = () => hasProfileChanges(accountStore.profileForm, accountStore.originalProfile)

  const onSaveProfile = () => handleSaveProfile(t().account)
  const onChangePassword = () => handleChangePassword(t().account)
  const onSetPassword = () => handleSetPassword(t().account)
  const onAvatarUpload = (e: Event & { currentTarget: HTMLInputElement; target: Element }) => handleAvatarUpload(e, t().account)

  return (
    <div class="content-section overview-section">
      <div class="section-header">
        <h1 class="page-title">{overview().title}</h1>
        <p class="page-subtitle">{overview().subtitle}</p>
      </div>

      <div class="section-card">
        <h3 class="card-title">{overview().profileInfo}</h3>
        <div class="form-grid">
          <ProfileField
            label={overview().nickname}
            type="text"
            name="nickname"
            autoComplete="nickname"
            value={accountStore.profileForm.nickname}
            onChange={(v) => accountStoreActions.updateProfileField('nickname', v)}
            placeholder={overview().nicknamePlaceholder}
          />
          <ProfileField
            label={overview().email}
            type="email"
            name="email"
            autoComplete="email"
            value={accountStore.profileForm.email}
            onChange={(v) => {
              accountStoreActions.updateProfileField('email', v)
              if (accountStore.profileErrors.emailError) accountStoreActions.updateProfileError('emailError', '')
            }}
            placeholder={overview().emailPlaceholder}
            error={accountStore.profileErrors.emailError}
          />
          <ProfileField
            label={overview().phoneNumber}
            type="tel"
            name="phone"
            autoComplete="tel"
            value={accountStore.profileForm.phoneNumber}
            onChange={(v) => {
              accountStoreActions.updateProfileField('phoneNumber', v)
              if (accountStore.profileErrors.phoneError) accountStoreActions.updateProfileError('phoneError', '')
            }}
            placeholder={overview().phonePlaceholder}
            error={accountStore.profileErrors.phoneError}
          />
          <div class="form-field">
            <label>{overview().gender}</label>
            <select
              name="gender"
              autocomplete="sex"
              value={accountStore.profileForm.gender}
              onChange={(e) => accountStoreActions.updateProfileField('gender', e.currentTarget.value)}
            >
              <option value="not_specified">{overview().genderNotSpecified}</option>
              <option value="male">{overview().genderMale}</option>
              <option value="female">{overview().genderFemale}</option>
              <option value="other">{overview().genderOther}</option>
            </select>
          </div>
          <ProfileField
            label={overview().birthday}
            type="date"
            name="birthday"
            autoComplete="bday"
            value={accountStore.profileForm.birthday}
            onChange={(v) => {
              accountStoreActions.updateProfileField('birthday', v)
              if (accountStore.profileErrors.birthdayError) accountStoreActions.updateProfileError('birthdayError', '')
            }}
            error={accountStore.profileErrors.birthdayError}
          />
        </div>
        <button
          class="btn-primary"
          onClick={onSaveProfile}
          disabled={!profileHasChanges() || accountStore.profileSaving}
        >
          {accountStore.profileSaving ? '...' : overview().save}
        </button>
      </div>

      <div class="section-card">
        <h3 class="card-title">{overview().profilePicture}</h3>
        <div class="avatar-section">
          <div class="avatar-preview">
            <Show when={accountStore.user?.avatar} fallback={<span class="avatar-emoji-large">👤</span>}>
              <img src={accountStore.user!.avatar!} alt="Avatar" />
            </Show>
          </div>
          <div class="avatar-actions">
            <label class={`btn-primary upload-btn ${accountStore.avatarUploading ? 'disabled' : ''}`}>
              {accountStore.avatarUploading ? '...' : overview().uploadAvatar}
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarUpload}
                hidden
                disabled={accountStore.avatarUploading}
              />
            </label>
          </div>
          <Show when={accountStore.avatarError}>
            <span class="field-error">{accountStore.avatarError}</span>
          </Show>
          <p class="avatar-hint">{overview().avatarHint}</p>
        </div>
      </div>

      <div class="section-card">
        <h3 class="card-title">{(accountStore.user?.hasPassword ?? true) ? overview().changePassword : login().setPassword || 'Set Password'}</h3>
        <div class="form-grid password-form">
          <Show when={accountStore.user?.hasPassword ?? true}>
            <PasswordField
              label={overview().currentPassword}
              value={accountStore.passwordForm.currentPassword}
              onChange={(v) => {
                accountStoreActions.updatePasswordField('currentPassword', v)
                if (accountStore.passwordErrors.currentPasswordError) accountStoreActions.updatePasswordError('currentPasswordError', '')
              }}
              placeholder={overview().currentPasswordPlaceholder}
              error={accountStore.passwordErrors.currentPasswordError}
            />
          </Show>
          <PasswordField
            label={overview().newPassword}
            value={accountStore.passwordForm.newPassword}
            onChange={(v) => {
              accountStoreActions.updatePasswordField('newPassword', v)
              if (accountStore.passwordErrors.newPasswordError) accountStoreActions.updatePasswordError('newPasswordError', '')
            }}
            placeholder={overview().newPasswordPlaceholder}
            error={accountStore.passwordErrors.newPasswordError}
          />
          <PasswordField
            label={overview().confirmPassword}
            value={accountStore.passwordForm.confirmPassword}
            onChange={(v) => {
              accountStoreActions.updatePasswordField('confirmPassword', v)
              if (accountStore.passwordErrors.confirmPasswordError) accountStoreActions.updatePasswordError('confirmPasswordError', '')
            }}
            placeholder={overview().confirmPasswordPlaceholder}
            error={accountStore.passwordErrors.confirmPasswordError}
          />
        </div>
        <button
          class="btn-primary"
          onClick={(accountStore.user?.hasPassword ?? true) ? onChangePassword : onSetPassword}
          disabled={accountStore.passwordChanging || !accountStore.passwordForm.newPassword || !accountStore.passwordForm.confirmPassword}
        >
          {accountStore.passwordChanging ? '...' : ((accountStore.user?.hasPassword ?? true) ? overview().changePasswordBtn : (login().setPassword || 'Set Password'))}
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

const ProfileField = (props: ProfileFieldProps) => (
  <div class="form-field">
    <label>{props.label}</label>
    <input
      type={props.type}
      name={props.name}
      autocomplete={props.autoComplete}
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)}
      placeholder={props.placeholder}
      class={props.error ? 'input-error' : ''}
    />
    <Show when={props.error}>
      <span class="field-error">{props.error}</span>
    </Show>
  </div>
)

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error: string
}

const PasswordField = (props: PasswordFieldProps) => (
  <div class="form-field">
    <label>{props.label}</label>
    <input
      type="password"
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)}
      placeholder={props.placeholder}
      class={props.error ? 'input-error' : ''}
    />
    <Show when={props.error}>
      <span class="field-error">{props.error}</span>
    </Show>
  </div>
)

function WatchHistorySection() {
  const navigate = useNavigate()
  const watchHistory = () => t().account.watchHistory as Record<string, string>
  const sortedItems = () => getSortedWatchHistoryItems(accountStore.user?.watchList || [])

  return (
    <div class="content-section history-section">
      <div class="section-header-row">
        <h1 class="page-title">{watchHistory().title}</h1>
        <div class="header-actions">
          <button class="btn-secondary" onClick={clearWatchHistory}>
            {watchHistory().clearHistory}
          </button>
        </div>
      </div>

      <Show when={sortedItems().length > 0} fallback={
        <EmptyState
          icon="📺"
          title={watchHistory().emptyTitle}
          subtext={watchHistory().emptySubtext}
          buttonText={watchHistory().exploreButton}
          onButtonClick={() => navigate('/series')}
        />
      }>
        <div class="content-grid">
          <For each={sortedItems()}>
            {(item) => (
              <HistoryCard
                seriesName={item.seriesName}
                seriesCover={item.seriesCover}
                episodeNumber={item.episodeNumber}
                onClick={() => navigate(`/player/${item.seriesId}?episode=${item.episodeNumber}`)}
                onRemove={(e) => {
                  e.stopPropagation()
                  removeFromWatchList(item.seriesId)
                }}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

interface HistoryCardProps {
  seriesName: string
  seriesCover: string
  episodeNumber: number
  onClick: () => void
  onRemove: (e: MouseEvent) => void
}

const HistoryCard = (props: HistoryCardProps) => (
  <div class="history-card series-card" onClick={props.onClick}>
    <div class="series-card-poster">
      <Show when={props.seriesCover} fallback={<div class="series-card-placeholder" />}>
        <img src={props.seriesCover} alt={props.seriesName || 'Series'} class="series-card-image" />
      </Show>
      <div class="series-card-overlay">
        <svg class="series-card-play-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </div>
      <span class="episode-badge">EP {props.episodeNumber}</span>
      <button class="remove-btn" onClick={props.onRemove}>
        ✕
      </button>
    </div>
    <div class="series-card-info">
      <h3 class="series-card-title">{props.seriesName || 'Series'}</h3>
    </div>
  </div>
)

function FavoritesSection() {
  const navigate = useNavigate()
  const favorites = () => t().account.favorites as Record<string, string>
  const sortedItems = () => getSortedFavoritesItems(accountStore.user?.favorites || [])

  return (
    <div class="content-section favorites-section">
      <div class="section-header-row">
        <h1 class="page-title">{favorites().title}</h1>
        <Show when={sortedItems().length > 0}>
          <div class="header-actions">
            <button class="btn-secondary" onClick={clearFavorites}>
              {favorites().clearFavorites || 'Clear Favorites'}
            </button>
          </div>
        </Show>
      </div>

      <Show when={sortedItems().length > 0} fallback={
        <EmptyState
          icon="❤️"
          title={favorites().emptyTitle}
          subtext={favorites().emptySubtext}
          buttonText={favorites().exploreButton}
          onButtonClick={() => navigate('/series')}
        />
      }>
        <div class="content-grid">
          <For each={sortedItems()}>
            {(item) => (
              <FavoriteCard
                seriesId={item.seriesId}
                seriesName={item.seriesName}
                seriesCover={item.seriesCover}
                seriesTags={item.seriesTags}
                onClick={() => navigate(`/player/${item.seriesId}`)}
                onRemove={(e) => {
                  e.stopPropagation()
                  removeFromFavorites(item.seriesId)
                }}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

interface FavoriteCardProps {
  seriesId: string
  seriesName: string
  seriesCover: string
  seriesTags?: string[]
  onClick: () => void
  onRemove: (e: MouseEvent) => void
}

const FavoriteCard = (props: FavoriteCardProps) => (
  <div class="favorite-card series-card" onClick={props.onClick}>
    <div class="series-card-poster">
      <Show when={props.seriesCover} fallback={<div class="series-card-placeholder" />}>
        <img src={props.seriesCover} alt={props.seriesName || 'Series'} class="series-card-image" />
      </Show>
      <div class="series-card-overlay">
        <svg class="series-card-play-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </div>
      <button class="remove-btn" onClick={props.onRemove}>
        ✕
      </button>
    </div>
    <div class="series-card-info">
      <h3 class="series-card-title">{props.seriesName || `Series ${props.seriesId}`}</h3>
      <Show when={props.seriesTags && props.seriesTags.length > 0}>
        <span class="series-card-tag">{props.seriesTags![0]}</span>
      </Show>
    </div>
  </div>
)

interface EmptyStateProps {
  icon: string
  title: string
  subtext: string
  buttonText: string
  onButtonClick: () => void
}

const EmptyState = (props: EmptyStateProps) => (
  <div class="empty-state">
    <div class="empty-icon">{props.icon}</div>
    <h3 class="empty-title">{props.title}</h3>
    <p class="empty-subtext">{props.subtext}</p>
    <button class="btn-primary" onClick={props.onButtonClick}>
      {props.buttonText}
    </button>
  </div>
)

function SettingsSection() {
  const settings = () => t().account.settings as Record<string, string>

  return (
    <div class="content-section settings-section">
      <h1 class="page-title">{settings().title}</h1>

      <div class="section-card">
        <h3 class="card-title">{settings().preferences}</h3>

        <div class="setting-row">
          <label class="setting-label">{settings().language}</label>
          <select
            class="setting-control"
            value={languageStore.language}
            onChange={(e) => languageStoreActions.setLanguage(e.currentTarget.value as Language)}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div class="setting-row">
          <label class="setting-label">{settings().playbackSpeed}</label>
          <select
            class="setting-control"
            value={accountStore.playbackSpeed}
            onChange={(e) => accountStoreActions.setPlaybackSpeed(e.currentTarget.value)}
          >
            <option value="0.5x">0.5x</option>
            <option value="1x">1x</option>
            <option value="1.5x">1.5x</option>
            <option value="2x">2x</option>
          </select>
        </div>

        <div class="setting-row">
          <label class="setting-label">{settings().autoplay}</label>
          <label class="toggle">
            <input
              type="checkbox"
              checked={accountStore.autoplay}
              onChange={(e) => accountStoreActions.setAutoplay(e.currentTarget.checked)}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <label class="setting-label">{settings().notifications}</label>
          <label class="toggle">
            <input
              type="checkbox"
              checked={accountStore.notifications}
              onChange={(e) => accountStoreActions.setNotifications(e.currentTarget.checked)}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  )
}

function WalletSection() {
  const wallet = () => t().account.wallet as Record<string, string>

  const onTopUpClick = (amount: number) => handleTopUpClick(amount)
  const onWithdrawClick = (amount: number) => handleWithdrawClick(amount, t().account)
  const onConfirmTopUp = () => handleConfirmTopUp(t().account)
  const onConfirmWithdraw = () => handleConfirmWithdraw(t().account)

  const combinedTransactions = () => getCombinedTransactions(accountStore.transactions, accountStore.myPurchases)

  return (
    <div class="content-section wallet-section">
      <div class="section-header">
        <h1 class="page-title">{wallet().title}</h1>
        <p class="page-subtitle">{wallet().subtitle}</p>
      </div>

      <div class="balance-card">
        <div class="balance-icon">💰</div>
        <div class="balance-info">
          <span class="balance-label">{wallet().currentBalance}</span>
          <div class="balance-amount">
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="gcash-logo" />
            <span>{accountStore.balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Wallet Tabs */}
      <div class="wallet-tabs">
        <button
          class={`wallet-tab ${accountStore.walletTab === 'topup' ? 'active' : ''}`}
          onClick={() => accountStoreActions.setWalletTab('topup')}
        >
          {wallet().topUp}
        </button>
        <button
          class={`wallet-tab ${accountStore.walletTab === 'withdraw' ? 'active' : ''}`}
          onClick={() => accountStoreActions.setWalletTab('withdraw')}
        >
          {wallet().withdraw || 'Withdraw'}
        </button>
      </div>

      {/* Amount Selection Section */}
      <div class="section-card amount-section">
        <div class="amount-section-header">
          <h3 class="card-title">
            {accountStore.walletTab === 'topup'
              ? (wallet().selectTopUpAmount || 'Select Top Up Amount')
              : (wallet().selectWithdrawAmount || 'Select Withdrawal Amount')
            }
          </h3>
          <Show when={accountStore.walletTab === 'withdraw' && accountStore.balance > 0}>
            <button
              class="btn-withdraw-all"
              onClick={() => onWithdrawClick(accountStore.balance)}
            >
              {wallet().withdrawAll || 'Withdraw All'}
            </button>
          </Show>
        </div>
        <p class="amount-description">
          {accountStore.walletTab === 'topup'
            ? wallet().topUpDescription
            : (wallet().withdrawDescription || 'Select an amount to withdraw from your wallet')
          }
        </p>
        <div class="amount-grid">
          <For each={walletAmounts}>
            {(amount) => (
              <button
                class={`amount-button ${accountStore.walletTab === 'withdraw' && amount > accountStore.balance ? 'disabled' : ''}`}
                onClick={() => accountStore.walletTab === 'topup' ? onTopUpClick(amount) : onWithdrawClick(amount)}
                disabled={accountStore.walletTab === 'withdraw' && amount > accountStore.balance}
              >
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="amount-logo" />
                <span class="amount-value">{amount}</span>
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Transaction History Section */}
      <div class="section-card transaction-history-section">
        <h3 class="card-title">{wallet().transactionHistory || 'Transaction History'}</h3>
        <Show when={combinedTransactions().length > 0} fallback={
          <p class="no-transactions">{wallet().noTransactions || 'No transactions yet'}</p>
        }>
          <div class="transaction-table-container">
            <table class="transaction-table">
              <thead>
                <tr>
                  <th>{wallet().time || 'Time'}</th>
                  <th>{wallet().type || 'Type'}</th>
                  <th>{wallet().amount || 'Amount'}</th>
                  <th>{wallet().status || 'Status'}</th>
                  <th>{wallet().referenceId || 'Reference ID'}</th>
                </tr>
              </thead>
              <tbody>
                <For each={combinedTransactions()}>
                  {(transaction) => (
                    <tr>
                      <td class="transaction-time">{formatTransactionDateTime(transaction.createdAt)}</td>
                      <td class={`transaction-type type-${transaction.type}`}>
                        <Show when={transaction.type === 'purchase' && transaction.purchase} fallback={
                          transaction.type === 'topup' ? (wallet().topUp || 'Top Up') : (wallet().withdraw || 'Withdraw')
                        }>
                          <div class="purchase-type-cell">
                            <span class="purchase-type-series">{transaction.purchase!.seriesName}</span>
                            <span class="purchase-type-episode">
                              EP {transaction.purchase!.episodeNumber}{transaction.purchase!.episodeTitle ? ` ${transaction.purchase!.episodeTitle}` : ''}
                            </span>
                          </div>
                        </Show>
                      </td>
                      <td class="transaction-amount">
                        <span class={transaction.type === 'topup' ? 'amount-positive' : transaction.type === 'purchase' ? 'amount-purchase' : 'amount-negative'}>
                          {transaction.type === 'topup' ? '+' : '-'}{transaction.amount.toFixed(2)}
                        </span>
                      </td>
                      <td class={`transaction-status ${getStatusClass(transaction.status)}`}>
                        {getStatusText(transaction.status, t().account)}
                      </td>
                      <td class="transaction-reference">{transaction.referenceId}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>

      {/* Top Up Confirmation Popup */}
      <Show when={accountStore.showTopUpPopup && accountStore.selectedTopUpAmount}>
        <div class="popup-overlay" onClick={() => !accountStore.topUpLoading && closeTopUpPopup()}>
          <div class="popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="popup-logo" />
            <h2 class="popup-title">{wallet().confirmTopUp}</h2>
            <p class="popup-message">{wallet().addToWallet}</p>
            <div class="popup-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="popup-amount-logo" />
              <span>{accountStore.selectedTopUpAmount}</span>
            </div>
            <div class="payment-method-section">
              <p class="payment-method-label">{wallet().choosePaymentMethod || 'Choose Payment Method'}</p>
              <div class="payment-method-icons">
                <button
                  class={`payment-method-btn ${accountStore.selectedPaymentMethod === 'creditcard' ? 'selected' : ''}`}
                  onClick={() => accountStoreActions.setSelectedPaymentMethod('creditcard')}
                >
                  <img src={paymentMethodsIcon} alt="Card" class="payment-method-icon-img" width="32" height="32" />
                  <span class="payment-method-text">{wallet().creditCard || 'Card'}</span>
                </button>
                <button
                  class={`payment-method-btn ${accountStore.selectedPaymentMethod === 'gusd' ? 'selected' : ''}`}
                  onClick={() => accountStoreActions.setSelectedPaymentMethod('gusd')}
                >
                  <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="payment-method-icon-img" />
                  <span class="payment-method-text">{wallet().gusd || 'GUSD'}</span>
                </button>
              </div>
            </div>
            <Show when={accountStore.topUpLoading}>
              <div class="popup-loading">
                <div class="popup-spinner" />
                <p class="popup-loading-text">{wallet().processing || 'Processing...'}</p>
              </div>
            </Show>
            <div class="popup-buttons">
              <button class="btn-confirm" onClick={onConfirmTopUp} disabled={!accountStore.selectedPaymentMethod || accountStore.topUpLoading}>
                {wallet().confirm}
              </button>
              <button class="btn-cancel" onClick={closeTopUpPopup} disabled={accountStore.topUpLoading}>
                {wallet().cancel}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Withdraw Confirmation Popup */}
      <Show when={accountStore.showWithdrawPopup && accountStore.selectedWithdrawAmount}>
        <div class="popup-overlay" onClick={closeWithdrawPopup}>
          <div class="popup-modal withdraw-modal" onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="popup-logo" />
            <h2 class="popup-title">{wallet().confirmWithdraw || 'Confirm Withdraw'}</h2>
            <p class="popup-message">{wallet().withdrawFromWallet || 'Withdraw from your wallet'}</p>
            <div class="popup-amount withdraw-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="popup-amount-logo" />
              <span>{accountStore.selectedWithdrawAmount!.toFixed(2)}</span>
            </div>
            <div class="popup-buttons">
              <button
                class="btn-withdraw-confirm"
                onClick={onConfirmWithdraw}
                disabled={accountStore.withdrawing}
              >
                {accountStore.withdrawing ? '...' : (wallet().confirm || 'Confirm')}
              </button>
              <button class="btn-cancel" onClick={closeWithdrawPopup} disabled={accountStore.withdrawing}>
                {wallet().cancel}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

function MyPurchasesSection() {
  const navigate = useNavigate()
  const myPurchases = () => (t().account.myPurchases || {}) as Record<string, string>
  const seriesList = () => groupPurchasesBySeries(accountStore.myPurchases)

  return (
    <Show when={!accountStore.myPurchasesLoading} fallback={
      <div class="content-section my-purchases-section">
        <div class="loading">Loading...</div>
      </div>
    }>
      <div class="content-section my-purchases-section">
        <div class="section-header">
          <h1 class="page-title">{myPurchases().title || 'My Purchases'}</h1>
          <p class="page-subtitle">{myPurchases().subtitle || 'Episodes you have purchased'}</p>
        </div>

        <Show when={seriesList().length > 0} fallback={
          <EmptyState
            icon="🛒"
            title={myPurchases().emptyTitle || 'No purchases yet'}
            subtext={myPurchases().emptySubtext || 'Browse series and purchase episodes to watch'}
            buttonText={myPurchases().exploreButton || 'Explore Series'}
            onButtonClick={() => navigate('/series')}
          />
        }>
          <div class="purchases-list">
            <For each={seriesList()}>
              {(seriesGroup) => (
                <div class="purchase-series-group">
                  <div class="purchase-series-header" onClick={() => navigate(`/player/${seriesGroup.seriesId}`)}>
                    <div class="purchase-series-cover">
                      <Show when={seriesGroup.seriesCover} fallback={<div class="purchase-series-placeholder">🎬</div>}>
                        <img src={seriesGroup.seriesCover} alt={seriesGroup.seriesName} />
                      </Show>
                    </div>
                    <div class="purchase-series-info">
                      <h3 class="purchase-series-name">{seriesGroup.seriesName}</h3>
                      <span class="purchase-episode-count">
                        {seriesGroup.episodes.length} {seriesGroup.episodes.length === 1 ? (myPurchases().episode || 'episode') : (myPurchases().episodes || 'episodes')}
                      </span>
                    </div>
                  </div>
                  <div class="purchase-episodes-grid">
                    <For each={[...seriesGroup.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber)}>
                      {(episode) => (
                        <div
                          class="purchase-episode-card"
                          onClick={() => navigate(`/player/${seriesGroup.seriesId}?episode=${episode.episodeNumber}`)}
                        >
                          <div class="purchase-episode-thumbnail">
                            <Show when={episode.episodeThumbnail} fallback={<div class="purchase-episode-placeholder">▶️</div>}>
                              <img src={episode.episodeThumbnail} alt={`Episode ${episode.episodeNumber}`} />
                            </Show>
                            <div class="purchase-episode-overlay">
                              <svg class="purchase-play-icon" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5,3 19,12 5,21" />
                              </svg>
                            </div>
                          </div>
                          <div class="purchase-episode-info">
                            <span class="purchase-episode-number">EP {episode.episodeNumber}</span>
                            <Show when={episode.episodeTitle}>
                              <span class="purchase-episode-title">{episode.episodeTitle}</span>
                            </Show>
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
      </div>
    </Show>
  )
}

function MySeriesSection() {
  const navigate = useNavigate()
  const mySeries = () => (t().account.mySeries || {}) as Record<string, string>
  const [activeSubTab, setActiveSubTab] = createSignal<'series' | 'revenue'>('series')

  // Fetch revenue data when revenue tab is selected
  createEffect(() => {
    if (activeSubTab() === 'revenue' && !accountStore.revenueFetched && !accountStore.revenueLoading) {
      accountStoreActions.setRevenueFetched(true)
      fetchRevenueData()
    }
  })

  return (
    <Show when={!accountStore.mySeriesLoading} fallback={
      <div class="content-section my-series-section">
        <div class="loading">Loading...</div>
      </div>
    }>
      {/* Show SeriesEditContent when editing or adding */}
      <Show when={accountStore.editingSeriesId} fallback={
        <div class="content-section my-series-section">
          <div class="section-header">
            <h1 class="page-title">{mySeries().title || 'My Series'}</h1>
            <Show when={accountStore.mySeries.length > 0 && activeSubTab() === 'series'}>
              <button class="btn-primary add-series-btn" onClick={handleAddSeries}>
                {mySeries().addSeries || 'Add Series'}
              </button>
            </Show>
          </div>

          {/* Sub-tabs for Series and Revenue */}
          <div class="my-series-tabs">
            <button
              class={`my-series-tab ${activeSubTab() === 'series' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('series')}
            >
              {mySeries().title || 'My Series'}
            </button>
            <button
              class={`my-series-tab ${activeSubTab() === 'revenue' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('revenue')}
            >
              💰 {mySeries().revenueTab || 'Revenue'}
            </button>
          </div>

          {/* Series List Tab */}
          <Show when={activeSubTab() === 'series'}>
            <Show when={accountStore.mySeries.length > 0} fallback={
              <EmptyState
                icon="🎬"
                title={mySeries().emptyTitle || 'No series yet'}
                subtext={mySeries().emptySubtext || 'Start creating your first series'}
                buttonText={mySeries().addSeries || 'Add Series'}
                onButtonClick={handleAddSeries}
              />
            }>
              <div class="content-grid">
                <For each={accountStore.mySeries}>
                  {(seriesItem) => (
                    <MySeriesCard
                      series={seriesItem}
                      onShelve={() => handleShelveClick(seriesItem._id, seriesItem.shelved || false, seriesItem)}
                      onEdit={() => handleEditSeries(seriesItem)}
                      onClick={() => navigate(`/player/${seriesItem._id}`)}
                      translations={mySeries()}
                    />
                  )}
                </For>
              </div>
            </Show>
          </Show>

          {/* Revenue Tab */}
          <Show when={activeSubTab() === 'revenue'}>
            <RevenueSection translations={mySeries()} />
          </Show>

          {/* Shelve Confirmation Modal */}
          <Show when={accountStore.showShelveModal && accountStore.pendingShelveSeries}>
            <ShelveConfirmationModal
              seriesName={accountStore.pendingShelveSeries!.name || 'Untitled Series'}
              title={mySeries().shelveConfirmTitle || 'Confirm Shelve'}
              message={mySeries().shelveConfirmMessage || 'Are you sure you want to shelve this series? It will be hidden from users.'}
              confirmLabel={mySeries().shelve || 'Shelve'}
              cancelLabel={mySeries().cancel || 'Cancel'}
              onConfirm={confirmShelve}
              onCancel={cancelShelve}
            />
          </Show>

          {/* Unshelve Confirmation Modal */}
          <Show when={accountStore.showUnshelveModal && accountStore.pendingUnshelveSeries}>
            <UnshelveConfirmationModal
              seriesName={accountStore.pendingUnshelveSeries!.name || 'Untitled Series'}
              title={mySeries().unshelveConfirmTitle || 'Confirm Unshelve'}
              message={mySeries().unshelveConfirmMessage || 'Are you sure you want to unshelve this series? It will become visible to all users.'}
              confirmLabel={mySeries().unshelve || 'Unshelve'}
              cancelLabel={mySeries().cancel || 'Cancel'}
              onConfirm={confirmUnshelve}
              onCancel={cancelUnshelve}
            />
          </Show>
        </div>
      }>
        <div class="content-section my-series-section">
          <h1 class="page-title">
            {accountStore.editingSeriesId === 'new'
              ? (mySeries().addSeriesTitle || 'Add Series')
              : (mySeries().editSeriesTitle || 'Edit Series')}
          </h1>
          <SeriesEditContent
            seriesId={accountStore.editingSeriesId!}
            onCancel={handleCancelEdit}
            onSaveComplete={handleSaveComplete}
          />
        </div>
      </Show>
    </Show>
  )
}

// Revenue Section Component
interface RevenueSectionProps {
  translations: Record<string, string>
}

const RevenueSection = (props: RevenueSectionProps) => {
  const [expandedSeries, setExpandedSeries] = createSignal<string | null>(null)

  const toggleSeriesExpand = (seriesId: string) => {
    setExpandedSeries(prev => prev === seriesId ? null : seriesId)
  }

  return (
    <Show when={!accountStore.revenueLoading} fallback={
      <div class="loading">Loading...</div>
    }>
      <Show when={accountStore.revenueData} fallback={
        <EmptyState
          icon="💰"
          title={props.translations.noRevenue || 'No revenue yet'}
          subtext={props.translations.noRevenueSubtext || 'Upload series and start earning from episode sales'}
          buttonText={props.translations.addSeries || 'Add Series'}
          onButtonClick={handleAddSeries}
        />
      }>
        {/* Revenue Summary Cards */}
        <div class="revenue-summary">
          <div class="revenue-card total-revenue">
            <div class="revenue-card-icon">💵</div>
            <div class="revenue-card-info">
              <span class="revenue-card-label">{props.translations.totalRevenue || 'Total Revenue'}</span>
              <span class="revenue-card-value">
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="revenue-gcash-logo" />
                {accountStore.revenueData!.totalRevenue.toFixed(2)}
              </span>
            </div>
          </div>
          <div class="revenue-card your-share">
            <div class="revenue-card-icon">🎯</div>
            <div class="revenue-card-info">
              <span class="revenue-card-label">{props.translations.yourShare || 'Your Share (50%)'}</span>
              <span class="revenue-card-value highlight">
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="revenue-gcash-logo" />
                {accountStore.revenueData!.totalCreatorShare.toFixed(2)}
              </span>
            </div>
          </div>
          <div class="revenue-card pending-payout">
            <div class="revenue-card-icon">⏳</div>
            <div class="revenue-card-info">
              <span class="revenue-card-label">{props.translations.pendingPayout || 'Pending Payout'}</span>
              <span class="revenue-card-value">
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="revenue-gcash-logo" />
                {accountStore.revenueData!.pendingPayout.toFixed(2)}
              </span>
            </div>
          </div>
          <div class="revenue-card paid-out">
            <div class="revenue-card-icon">✅</div>
            <div class="revenue-card-info">
              <span class="revenue-card-label">{props.translations.paidOut || 'Paid Out'}</span>
              <span class="revenue-card-value">
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="revenue-gcash-logo" />
                {accountStore.revenueData!.paidOut.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Series Revenue List */}
        <div class="section-card revenue-series-section">
          <h3 class="card-title">{props.translations.seriesRevenue || 'Series Revenue'}</h3>
          <Show when={accountStore.revenueData!.series.length > 0} fallback={
            <p class="no-revenue-text">{props.translations.noRevenue || 'No revenue yet'}</p>
          }>
            <div class="revenue-series-list">
              <For each={accountStore.revenueData!.series}>
                {(seriesRevenue) => (
                  <div class="revenue-series-item">
                    <div class="revenue-series-header" onClick={() => toggleSeriesExpand(seriesRevenue.seriesId)}>
                      <div class="revenue-series-cover">
                        <Show when={seriesRevenue.seriesCover} fallback={<div class="revenue-series-placeholder">🎬</div>}>
                          <img src={seriesRevenue.seriesCover} alt={seriesRevenue.seriesName} />
                        </Show>
                      </div>
                      <div class="revenue-series-info">
                        <h4 class="revenue-series-name">{seriesRevenue.seriesName}</h4>
                        <div class="revenue-series-stats">
                          <span class="revenue-stat">
                            <span class="revenue-stat-label">{props.translations.totalSales || 'Total Sales'}:</span>
                            <span class="revenue-stat-value">{seriesRevenue.totalSales}</span>
                          </span>
                          <span class="revenue-stat">
                            <span class="revenue-stat-label">{props.translations.creatorShare || 'Creator Share'}:</span>
                            <span class="revenue-stat-value highlight">
                              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="revenue-stat-logo" />
                              {seriesRevenue.creatorShare.toFixed(2)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <button class="revenue-expand-btn">
                        {expandedSeries() === seriesRevenue.seriesId
                          ? (props.translations.hideDetails || 'Hide Details')
                          : (props.translations.viewDetails || 'View Details')}
                      </button>
                    </div>
                    
                    {/* Episode Details */}
                    <Show when={expandedSeries() === seriesRevenue.seriesId}>
                      <div class="revenue-episodes-list">
                        <table class="revenue-episodes-table">
                          <thead>
                            <tr>
                              <th>{props.translations.episode || 'Episode'}</th>
                              <th>{props.translations.totalSales || 'Total Sales'}</th>
                              <th>{props.translations.totalRevenue || 'Total Revenue'}</th>
                              <th>{props.translations.creatorShare || 'Creator Share'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={seriesRevenue.episodes}>
                              {(episode) => (
                                <tr>
                                  <td class="episode-cell">
                                    <span class="episode-number">EP {episode.episodeNumber}</span>
                                    <Show when={episode.episodeTitle}>
                                      <span class="episode-title">{episode.episodeTitle}</span>
                                    </Show>
                                  </td>
                                  <td class="sales-cell">{episode.totalSales} {props.translations.sales || 'sales'}</td>
                                  <td class="revenue-cell">
                                    <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="revenue-table-logo" />
                                    {episode.totalRevenue.toFixed(2)}
                                  </td>
                                  <td class="share-cell highlight">
                                    <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GCash" class="revenue-table-logo" />
                                    {episode.creatorShare.toFixed(2)}
                                  </td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </Show>
  )
}

interface MySeriesCardProps {
  series: Series
  onShelve: () => void
  onEdit: () => void
  onClick: () => void
  translations: Record<string, string>
}

const MySeriesCard = (props: MySeriesCardProps) => {
  const [showActions, setShowActions] = createSignal(false)

  return (
    <div
      class={`my-series-card series-card ${props.series.shelved ? 'shelved' : ''}`}
      onClick={props.onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div class="series-card-poster">
        <Show when={props.series.cover} fallback={<div class="series-card-placeholder" />}>
          <img src={props.series.cover} alt={props.series.name || 'Series'} class="series-card-image" />
        </Show>
        <div class="series-card-overlay">
          <svg class="series-card-play-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
        <Show when={props.series.shelved}>
          <span class="shelved-badge">{props.translations.shelved || 'Shelved'}</span>
        </Show>
        <Show when={showActions()}>
          <div class="series-action-icons">
            <button
              class="action-icon-btn"
              onClick={(e) => { e.stopPropagation(); props.onShelve(); }}
              title={props.series.shelved ? (props.translations.unshelve || 'Unshelve') : (props.translations.shelve || 'Shelve')}
            >
              {props.series.shelved ? '📤' : '📥'}
            </button>
            <button
              class="action-icon-btn"
              onClick={(e) => { e.stopPropagation(); props.onEdit(); }}
              title={props.translations.edit || 'Edit'}
            >
              ✏️
            </button>
          </div>
        </Show>
      </div>
      <div class="series-card-info">
        <h3 class="series-card-title">{props.series.name || 'Untitled Series'}</h3>
        <Show when={props.series.genre && props.series.genre.length > 0}>
          <span class="series-card-tag">{props.series.genre![0].name}</span>
        </Show>
      </div>
    </div>
  )
}

interface ShelveConfirmationModalProps {
  seriesName: string
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

const ShelveConfirmationModal = (props: ShelveConfirmationModalProps) => (
  <div class="shelve-modal-overlay" onClick={props.onCancel}>
    <div class="shelve-modal" onClick={(e) => e.stopPropagation()}>
      <div class="shelve-modal-icon">📥</div>
      <h2 class="shelve-modal-title">{props.title}</h2>
      <div class="shelve-modal-series-info">
        <span class="shelve-modal-series-name">{props.seriesName}</span>
      </div>
      <p class="shelve-modal-message">{props.message}</p>
      <div class="shelve-modal-buttons">
        <button class="shelve-modal-btn shelve-modal-btn-confirm" onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
        <button class="shelve-modal-btn shelve-modal-btn-cancel" onClick={props.onCancel}>
          {props.cancelLabel}
        </button>
      </div>
    </div>
  </div>
)

interface UnshelveConfirmationModalProps {
  seriesName: string
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

const UnshelveConfirmationModal = (props: UnshelveConfirmationModalProps) => (
  <div class="unshelve-modal-overlay" onClick={props.onCancel}>
    <div class="unshelve-modal" onClick={(e) => e.stopPropagation()}>
      <div class="unshelve-modal-icon">📤</div>
      <h2 class="unshelve-modal-title">{props.title}</h2>
      <div class="unshelve-modal-series-info">
        <span class="unshelve-modal-series-name">{props.seriesName}</span>
      </div>
      <p class="unshelve-modal-message">{props.message}</p>
      <div class="unshelve-modal-buttons">
        <button class="unshelve-modal-btn unshelve-modal-btn-confirm" onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
        <button class="unshelve-modal-btn unshelve-modal-btn-cancel" onClick={props.onCancel}>
          {props.cancelLabel}
        </button>
      </div>
    </div>
  </div>
)

export default Account
