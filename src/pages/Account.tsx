import { createSignal, Show, For, type Component, createEffect, onMount } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { useNavigate, useSearchParams } from '@solidjs/router'
import paymentMethodsIcon from '../assets/payment-methods2.svg'
import applePayIcon from '../assets/apple-pay-icon.svg'
import { isIOS } from '../utils/cordova'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import { SeriesEditContent } from './SeriesEdit'
import { t } from '../stores/languageStore'
import { languageStore, languageStoreActions } from '../stores/languageStore'
import {
  systemSettingsStore,
  systemSettingsStoreActions,
  PREVIEW_LENGTH_OPTIONS,
  CREATOR_SHARE_OPTIONS,
  EPISODE_COST_OPTIONS,
  NEXT_EPISODE_COST_OPTIONS,
} from '../stores/systemSettingsStore'
import type { Language } from '../i18n'
import {
  accountStore,
  accountStoreActions,
  getFilteredNavItems,
  walletAmounts,
  iapWalletAmounts,
  type AccountTab,
  type PaymentMethod,
  getCombinedTransactions,
  getMaxWithdrawAmount,
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
import { toastStore, toastStoreActions } from '../stores'
import {
  fetchPipelinePrompts,
  savePipelinePrompt,
  deleteProduction,
  fetchMe,
  type PipelinePrompt,
  type ProductionJob,
} from '../services/dataService'
import { isLoggedIn, setStoredUser } from '../utils/api'
import { quickCreateStoreActions } from '../stores/quickCreateStore'
// Default Quick Create cover (Cloudinary — same asset set as the v1 page)
const defaultIdeaCover =
  'https://res.cloudinary.com/daqc8bim3/image/upload/GCash/quick%20create%20v1/banner-hero.webp'
import { renderMarkdown } from '../utils/markdown'
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

  // Refresh the user from the server so permissions (e.g. allowUpload / publisher status)
  // are up to date — drives which My Series tabs and publish actions are available.
  if (isLoggedIn()) {
    fetchMe()
      .then((me) => {
        if (me) {
          accountStoreActions.setUser(me)
          setStoredUser(me)
        }
      })
      .catch(() => {})
  }

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
    <Show when={props.buttonText}>
      <button class="btn-primary" onClick={props.onButtonClick}>
        {props.buttonText}
      </button>
    </Show>
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

      <Show when={accountStore.user?.isAdmin}>
        <SystemSettingsCard />
        <PipelinePromptsCard />
      </Show>
    </div>
  )
}

// AI Pipeline Prompts editor - admin only. Edit the markdown system prompt for
// each of the 6 Quick Create production calls, with a live HTML preview.
function PipelinePromptsCard() {
  const settings = () => t().account.settings as Record<string, string>
  const [prompts, setPrompts] = createSignal<PipelinePrompt[]>([])
  const [selectedKey, setSelectedKey] = createSignal<string>('')
  const [draft, setDraft] = createSignal<string>('')
  const [saving, setSaving] = createSignal(false)
  const [status, setStatus] = createSignal<'idle' | 'saved' | 'error'>('idle')

  const selected = () => prompts().find((p) => p.key === selectedKey())

  const selectPrompt = (key: string) => {
    setSelectedKey(key)
    setDraft(prompts().find((p) => p.key === key)?.markdown || '')
    setStatus('idle')
  }

  onMount(async () => {
    try {
      const list = await fetchPipelinePrompts()
      setPrompts(list)
      if (list.length > 0) selectPrompt(list[0].key)
    } catch (error) {
      console.error('Failed to load pipeline prompts:', error)
    }
  })

  const onSave = async () => {
    if (!selectedKey()) return
    setSaving(true)
    setStatus('idle')
    try {
      const updated = await savePipelinePrompt(selectedKey(), draft())
      setPrompts(updated)
      setStatus('saved')
    } catch (error) {
      console.error('Failed to save pipeline prompt:', error)
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class="section-card">
      <h3 class="card-title">{settings().pipelinePrompts}</h3>
      <p class="pipeline-prompts-hint">{settings().pipelinePromptsHint}</p>

      <div class="setting-row">
        <label class="setting-label">{settings().selectCall}</label>
        <select
          class="setting-control"
          value={selectedKey()}
          onChange={(e) => selectPrompt(e.currentTarget.value)}
        >
          <For each={prompts()}>
            {(p) => <option value={p.key}>{p.title}</option>}
          </For>
        </select>
      </div>

      <Show when={selected()}>
        <div class="pipeline-editor">
          <div class="pipeline-editor-pane">
            <div class="pipeline-editor-label">{settings().markdownLabel}</div>
            <textarea
              class="pipeline-editor-textarea"
              value={draft()}
              onInput={(e) => {
                setDraft(e.currentTarget.value)
                setStatus('idle')
              }}
              spellcheck={false}
            />
          </div>
          <div class="pipeline-editor-pane">
            <div class="pipeline-editor-label">{settings().previewLabel}</div>
            <div class="pipeline-editor-preview md-body" innerHTML={renderMarkdown(draft())} />
          </div>
        </div>

        <div class="pipeline-editor-actions">
          <Show when={status() === 'saved'}>
            <span class="pipeline-editor-status ok">✓ {settings().saved}</span>
          </Show>
          <Show when={status() === 'error'}>
            <span class="pipeline-editor-status err">⚠ {settings().saveFailed}</span>
          </Show>
          <button class="btn-primary" disabled={saving()} onClick={onSave}>
            {saving() ? settings().saving : settings().savePrompt}
          </button>
        </div>
      </Show>
    </div>
  )
}

// System Settings - admin only. Renders the three admin-configurable global settings.
function SystemSettingsCard() {
  const settings = () => t().account.settings as Record<string, string>

  onMount(() => systemSettingsStoreActions.load())

  return (
    <div class="section-card">
      <h3 class="card-title">{settings().systemSettings}</h3>

      <div class="setting-row">
        <label class="setting-label">{settings().previewLength}</label>
        <select
          class="setting-control"
          value={systemSettingsStore.previewLength}
          disabled={systemSettingsStore.saving}
          onChange={(e) => systemSettingsStoreActions.save({ previewLength: Number(e.currentTarget.value) })}
        >
          <For each={PREVIEW_LENGTH_OPTIONS}>
            {(secs) => <option value={secs}>{secs} {settings().seconds}</option>}
          </For>
        </select>
      </div>

      <div class="setting-row">
        <label class="setting-label">{settings().creatorShare}</label>
        <select
          class="setting-control"
          value={systemSettingsStore.creatorShare}
          disabled={systemSettingsStore.saving}
          onChange={(e) => systemSettingsStoreActions.save({ creatorShare: Number(e.currentTarget.value) })}
        >
          <For each={CREATOR_SHARE_OPTIONS}>
            {(pct) => <option value={pct}>{pct}%</option>}
          </For>
        </select>
      </div>

      <div class="setting-row">
        <label class="setting-label">{settings().episodeCost}</label>
        <select
          class="setting-control"
          value={systemSettingsStore.episodeCost}
          disabled={systemSettingsStore.saving}
          onChange={(e) => systemSettingsStoreActions.save({ episodeCost: Number(e.currentTarget.value) })}
        >
          <For each={EPISODE_COST_OPTIONS}>
            {(cost) => <option value={cost}>{cost}</option>}
          </For>
        </select>
      </div>

      <div class="setting-row">
        <label class="setting-label">{settings().nextEpisodeCost || 'Next episode cost (GUSD)'}</label>
        <select
          class="setting-control"
          value={systemSettingsStore.nextEpisodeCost}
          disabled={systemSettingsStore.saving}
          onChange={(e) =>
            systemSettingsStoreActions.save({ nextEpisodeCost: Number(e.currentTarget.value) })
          }
        >
          <For each={NEXT_EPISODE_COST_OPTIONS}>
            {(cost) => <option value={cost}>{cost}</option>}
          </For>
        </select>
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
  const maxWithdraw = () => getMaxWithdrawAmount(accountStore.balance, accountStore.transactions)

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
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="gcash-logo" />
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
          <Show when={accountStore.walletTab === 'withdraw' && maxWithdraw() > 0}>
            <button
              class="btn-withdraw-all"
              onClick={() => onWithdrawClick(maxWithdraw())}
            >
              {wallet().withdrawAll || 'Withdraw All'}
            </button>
          </Show>
        </div>
        <Show when={accountStore.walletTab === 'withdraw'}>
          <div class="max-withdraw">
            <span class="max-withdraw-value">
              {wallet().maxWithdraw || 'Max Withdraw'}: {maxWithdraw().toFixed(2)}
            </span>
            <span class="max-withdraw-note">
              {wallet().withdrawHoldNote || 'Transactions within 30 days are not available for withdraw.'}
            </span>
          </div>
        </Show>
        <p class="amount-description">
          {accountStore.walletTab === 'topup'
            ? wallet().topUpDescription
            : (wallet().withdrawDescription || 'Select an amount to withdraw from your wallet')
          }
        </p>
        <div class="amount-grid">
          <For each={isIOS() ? iapWalletAmounts : walletAmounts}>
            {(amount) => (
              <button
                class={`amount-button ${accountStore.walletTab === 'withdraw' && amount > maxWithdraw() ? 'disabled' : ''}`}
                onClick={() => accountStore.walletTab === 'topup' ? onTopUpClick(amount) : onWithdrawClick(amount)}
                disabled={accountStore.walletTab === 'withdraw' && amount > maxWithdraw()}
              >
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="amount-logo" />
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
                          <Show when={transaction.type === 'earning'} fallback={
                            <Show
                              when={transaction.type === 'generate'}
                              fallback={
                                transaction.type === 'topup'
                                  ? (wallet().topUp || 'Top Up')
                                  : (wallet().withdraw || 'Withdraw')
                              }
                            >
                              <div class="purchase-type-cell">
                                <span class="purchase-type-series">
                                  {wallet().quickCreate || 'Quick Create'}
                                  {transaction.source?.seriesName ? ` · ${transaction.source.seriesName}` : ''}
                                </span>
                                <Show when={transaction.source}>
                                  <span class="purchase-type-episode">
                                    EP {transaction.source!.episodeNumber}
                                    {transaction.source!.episodeTitle ? ` ${transaction.source!.episodeTitle}` : ''}
                                  </span>
                                </Show>
                              </div>
                            </Show>
                          }>
                            <div class="purchase-type-cell">
                              <span class="purchase-type-series">{wallet().earning || 'Earning'}</span>
                              <Show when={transaction.source}>
                                <span class="purchase-type-episode">
                                  {transaction.source!.seriesName} · EP {transaction.source!.episodeNumber}
                                </span>
                              </Show>
                            </div>
                          </Show>
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
                        <span class={transaction.type === 'topup' || transaction.type === 'earning' ? 'amount-positive' : transaction.type === 'purchase' ? 'amount-purchase' : 'amount-negative'}>
                          {transaction.type === 'topup' || transaction.type === 'earning' ? '+' : '-'}{transaction.amount.toFixed(2)}
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
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="popup-logo" />
            <h2 class="popup-title">{wallet().confirmTopUp}</h2>
            <p class="popup-message">{wallet().addToWallet}</p>
            <div class="popup-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="popup-amount-logo" />
              <span>{accountStore.selectedTopUpAmount}</span>
            </div>
            <div class="payment-method-section">
              <p class="payment-method-label">{wallet().choosePaymentMethod || 'Choose Payment Method'}</p>
              <div class="payment-method-icons">
                <Show when={isIOS()} fallback={
                  <button
                    class={`payment-method-btn ${accountStore.selectedPaymentMethod === 'creditcard' ? 'selected' : ''}`}
                    onClick={() => accountStoreActions.setSelectedPaymentMethod('creditcard')}
                  >
                    <img src={paymentMethodsIcon} alt="Card" class="payment-method-icon-img" width="32" height="32" />
                    <span class="payment-method-text">{wallet().creditCard || 'Card'}</span>
                  </button>
                }>
                  <button
                    class={`payment-method-btn ${accountStore.selectedPaymentMethod === 'applepay' ? 'selected' : ''}`}
                    onClick={() => accountStoreActions.setSelectedPaymentMethod('applepay')}
                  >
                    <img src={applePayIcon} alt="Apple Pay" class="payment-method-icon-img" width="32" height="32" />
                    <span class="payment-method-text">{wallet().applePay || 'Apple Pay'}</span>
                  </button>
                </Show>
                <button
                  class={`payment-method-btn ${accountStore.selectedPaymentMethod === 'gusd' ? 'selected' : ''}`}
                  onClick={() => accountStoreActions.setSelectedPaymentMethod('gusd')}
                >
                  <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="payment-method-icon-img gusd" />
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
            <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="popup-logo" />
            <h2 class="popup-title">{wallet().confirmWithdraw || 'Confirm Withdraw'}</h2>
            <p class="popup-message">{wallet().withdrawFromWallet || 'Withdraw from your wallet'}</p>
            <div class="popup-amount withdraw-amount">
              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="popup-amount-logo" />
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

// A Quick Create production card (in-progress or completed) in the My Series group
function ProductionCard(props: {
  production: ProductionJob
  translations: Record<string, string>
  published?: boolean
  episodeCount?: number
  readyEpisodes?: number[]
  coverOverride?: string // e.g. the already-published series cover for a grouped card
  onClick: () => void
  onDelete?: () => void | Promise<void>
}) {
  const isProposal = () => props.production.mode === 'v1proposal'
  const percent = () => {
    if (typeof props.production.percent === 'number') return props.production.percent
    const calls = props.production.progress?.calls || []
    if (calls.length === 0) return 0
    return Math.round((calls.filter((c) => c.status === 'done').length / calls.length) * 100)
  }
  const statusText = () => {
    if (props.published) return props.translations.productionPublished || 'Published'
    if (isProposal()) return props.translations.productionDraft || 'Draft — review proposal'
    // Grouped series with 2+ ready episodes → "Episode 1, 2 are ready"
    if (props.readyEpisodes && props.readyEpisodes.length > 1) {
      return (props.translations.episodesReady || 'Episode {list} are ready').replace(
        '{list}',
        props.readyEpisodes.join(', '),
      )
    }
    if (props.production.status === 'done')
      return (props.translations.productionReadyN || 'Episode {n} ready').replace(
        '{n}',
        String(props.production.episode || 1),
      )
    if (props.production.status === 'error') return props.translations.productionFailed || 'Generation failed'
    return `${props.translations.productionGenerating || 'Generating'} ${percent()}%`
  }

  // Inline delete confirm (the whole card is a <button>, so use non-button controls).
  const [confirming, setConfirming] = createSignal(false)
  const [deleting, setDeleting] = createSignal(false)
  const stop = (e: Event) => {
    e.stopPropagation()
    e.preventDefault()
  }
  const doDelete = async (e: Event) => {
    stop(e)
    if (deleting()) return
    setDeleting(true)
    try {
      await props.onDelete?.()
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  // Most recently finished shot's thumbnail (while an episode is still generating).
  const lastShotCover = () => {
    const vids = props.production.videos || []
    for (let i = vids.length - 1; i >= 0; i--) {
      if (vids[i]?.coverUrl) return vids[i].coverUrl as string
    }
    return ''
  }
  // Cover priority: published series cover → the finished video's cover → the last
  // finished shot's thumbnail → a default idea cover.
  const cover = () =>
    props.coverOverride ||
    props.production.seriesCover ||
    props.production.cover ||
    lastShotCover() ||
    defaultIdeaCover
  return (
    <button class="production-card" onClick={props.onClick}>
      <div class="production-card-cover">
        <Show when={cover()} fallback={<div class="production-card-placeholder">✨</div>}>
          <img src={cover()} alt={props.production.title || ''} loading="lazy" />
        </Show>
        <Show when={props.production.status !== 'done' && !isProposal()}>
          <div class="production-card-badge">{percent()}%</div>
        </Show>
        <Show when={(props.episodeCount || 1) > 1}>
          <div class="production-card-eps">
            {props.episodeCount} {props.translations.episodesLabel || 'episodes'}
          </div>
        </Show>
        <Show when={props.onDelete}>
          <Show
            when={confirming()}
            fallback={
              <div
                class="production-card-del"
                title={props.translations.deleteLabel || 'Delete'}
                onClick={(e) => {
                  stop(e)
                  setConfirming(true)
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
            }
          >
            <div class="production-card-confirm" onClick={stop}>
              <span>{props.translations.deleteConfirm || 'Delete?'}</span>
              <span class="pcc-yes" onClick={doDelete}>
                {deleting() ? '…' : props.translations.deleteYes || 'Delete'}
              </span>
              <span
                class="pcc-no"
                onClick={(e) => {
                  stop(e)
                  setConfirming(false)
                }}
              >
                {props.translations.deleteNo || 'Cancel'}
              </span>
            </div>
          </Show>
        </Show>
      </div>
      <div class="production-card-body">
        <span class="production-card-title">{props.production.seriesName || props.production.title || props.production.ideaTitle || 'Untitled Series'}</span>
        <span class={`production-card-status ${props.published ? 'done' : props.production.status}`}>{statusText()}</span>
        <Show when={props.production.status !== 'done'}>
          <div class="production-card-track">
            <div class="production-card-fill" style={{ width: `${percent()}%` }} />
          </div>
        </Show>
      </div>
    </button>
  )
}

function MySeriesSection() {
  const navigate = useNavigate()
  const mySeries = () => (t().account.mySeries || {}) as Record<string, string>
  const [activeSubTab, setActiveSubTab] = createSignal<
    'quickCreate' | 'published' | 'uploaded' | 'revenue'
  >('quickCreate')

  // Show only productions matching the active Quick Create version (v1 docs carry v:1;
  // v0 docs have no v). A production moves from Quick Create → Published once published.
  const isV1 = import.meta.env.VITE_QUICK_CREATE_VERSION === 'v1'
  const versionMatch = (p: ProductionJob) => (isV1 ? p.v === 1 : p.v !== 1)
  // Group all episodes of one series into a single card. Key = the root (episode-1)
  // production's jobId — stable whether or not episodes are published.
  const groupKey = (p: ProductionJob) => `grp:${p.parentJobId || p.jobId}`
  interface SeriesGroup {
    items: ProductionJob[]
    published: ProductionJob[] // episodes added to a series
    unpublished: ProductionJob[] // drafts / not-yet-published episodes
    publishedCover: string // the already-published series cover
  }
  const allGroups = (): SeriesGroup[] => {
    const map = new Map<string, ProductionJob[]>()
    for (const p of accountStore.myProductions.filter(versionMatch)) {
      const k = groupKey(p)
      const arr = map.get(k) || []
      arr.push(p)
      map.set(k, arr)
    }
    return [...map.values()].map((items) => {
      const sorted = [...items].sort((a, b) => (a.episode || 1) - (b.episode || 1))
      const published = sorted.filter((p) => p.seriesId)
      return {
        items: sorted,
        published,
        unpublished: sorted.filter((p) => !p.seriesId),
        publishedCover: published.find((p) => p.seriesCover)?.seriesCover || '',
      }
    })
  }
  // A series shows in Quick Create while it has unpublished episodes, and in Published
  // once it has published episodes — so a mixed series appears in both.
  const quickCreateGroups = () => allGroups().filter((g) => g.unpublished.length > 0)
  const publishedGroups = () => allGroups().filter((g) => g.published.length > 0)
  const readyEpsOf = (list: ProductionJob[]) =>
    list.filter((p) => p.status === 'done').map((p) => p.episode || 1)
  // When a grouped series is clicked, let the user pick which episode/production to open.
  const [chooser, setChooser] = createSignal<ProductionJob[] | null>(null)

  const handleDeleteGroup = async (items: ProductionJob[]) => {
    try {
      await Promise.all(items.map((p) => (p.jobId ? deleteProduction(p.jobId) : null)))
      items.forEach((p) => p.jobId && accountStoreActions.removeProduction(p.jobId))
      toastStoreActions.show(mySeries().deleteSuccess || 'Deleted', 'success')
    } catch (e) {
      toastStoreActions.show(e instanceof Error ? e.message : 'Failed to delete', 'error')
    }
  }

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
          <div class="section-header-row my-series-header">
            <h1 class="page-title">{mySeries().title || 'My Series'}</h1>
            <div class="my-series-actions">
              <Show when={activeSubTab() === 'quickCreate'}>
                <button
                  class="btn-primary create-own-btn"
                  onClick={() => {
                    // Always start a fresh story (never resume the last generation)
                    quickCreateStoreActions.reset()
                    navigate('/quick-create')
                  }}
                >
                  ✨ {mySeries().createOwn || 'Create your own'}
                </button>
              </Show>
              <Show when={activeSubTab() === 'uploaded' && accountStore.user?.allowUpload}>
                <button class="btn-primary upload-series-btn" onClick={handleAddSeries}>
                  {mySeries().uploadSeries || 'Upload Series'}
                </button>
              </Show>
            </div>
          </div>

          {/* Tabs: Quick Create, Uploaded, Revenue */}
          {/* The tab bar (Published / Uploaded / Revenue) is a publisher feature. Non-
              publishers only see their Quick Create productions, so hide the tabs. */}
          <Show when={accountStore.user?.allowUpload}>
            <div class="my-series-tabs">
              <button
                class={`my-series-tab ${activeSubTab() === 'quickCreate' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('quickCreate')}
              >
                ✨ {mySeries().quickCreateGroup || 'Quick Create'}
              </button>
              <button
                class={`my-series-tab ${activeSubTab() === 'published' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('published')}
              >
                🚀 {mySeries().publishedTab || 'Published'}
              </button>
              <button
                class={`my-series-tab ${activeSubTab() === 'uploaded' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('uploaded')}
              >
                {mySeries().uploadedTab || 'Uploaded'}
              </button>
              <button
                class={`my-series-tab ${activeSubTab() === 'revenue' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('revenue')}
              >
                💰 {mySeries().revenueTab || 'Revenue'}
              </button>
            </div>
          </Show>

          {/* Quick Create Tab (unpublished productions) */}
          <Show when={activeSubTab() === 'quickCreate'}>
            <Show when={quickCreateGroups().length > 0} fallback={
              <EmptyState
                icon="✨"
                title={mySeries().quickCreateEmptyTitle || 'No creations yet'}
                subtext={mySeries().quickCreateEmptySubtext || 'Turn your idea into an anime series in minutes'}
                buttonText={mySeries().createOwn || 'Create your own'}
                onButtonClick={() => {
                  quickCreateStoreActions.reset()
                  navigate('/quick-create')
                }}
              />
            }>
              <div class="content-grid">
                <For each={quickCreateGroups()}>
                  {(g) => {
                    const list = g.unpublished
                    const rep = list[list.length - 1]
                    return (
                      <ProductionCard
                        production={rep}
                        translations={mySeries()}
                        episodeCount={list.length}
                        readyEpisodes={readyEpsOf(list)}
                        coverOverride={g.publishedCover}
                        onClick={() =>
                          list.length > 1
                            ? setChooser(list)
                            : navigate(`/quick-create?production=${rep.jobId}`)
                        }
                        onDelete={() => handleDeleteGroup(list)}
                      />
                    )
                  }}
                </For>
              </div>
            </Show>
          </Show>

          {/* Published Tab (series with one or more published episodes) */}
          <Show when={activeSubTab() === 'published'}>
            <Show when={publishedGroups().length > 0} fallback={
              <EmptyState
                icon="🚀"
                title={mySeries().publishedEmptyTitle || 'Nothing published yet'}
                subtext={mySeries().publishedEmptySubtext || 'Publish an episode to share it with the world'}
                buttonText=""
                onButtonClick={() => {}}
              />
            }>
              <div class="content-grid">
                <For each={publishedGroups()}>
                  {(g) => {
                    const list = g.published
                    const rep = list[list.length - 1]
                    return (
                      <ProductionCard
                        production={rep}
                        translations={mySeries()}
                        published
                        episodeCount={list.length}
                        coverOverride={g.publishedCover}
                        onClick={() =>
                          list.length > 1
                            ? setChooser(list)
                            : navigate(`/quick-create?production=${rep.jobId}&view=ready`)
                        }
                      />
                    )
                  }}
                </For>
              </div>
            </Show>
          </Show>

          {/* Uploaded Tab */}
          <Show when={activeSubTab() === 'uploaded'}>
            <Show when={accountStore.mySeries.length > 0} fallback={
              <EmptyState
                icon="🎬"
                title={mySeries().emptyTitle || 'No series yet'}
                subtext={mySeries().emptySubtext || 'Start creating your first series'}
                buttonText={accountStore.user?.allowUpload ? (mySeries().uploadSeries || 'Upload Series') : ''}
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

          {/* Episode chooser for a grouped multi-episode series */}
          <Show when={chooser()}>
            <div class="qc-chooser-overlay" onClick={() => setChooser(null)}>
              <div class="qc-chooser" onClick={(e) => e.stopPropagation()}>
                <h3 class="qc-chooser-title">{mySeries().chooseEpisode || 'Choose an episode'}</h3>
                <div class="qc-chooser-grid">
                  <For each={chooser()!}>
                    {(p) => (
                      <ProductionCard
                        production={p}
                        translations={mySeries()}
                        onClick={() => {
                          setChooser(null)
                          navigate(`/quick-create?production=${p.jobId}`)
                        }}
                      />
                    )}
                  </For>
                </div>
              </div>
            </div>
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
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="revenue-gcash-logo" />
                {accountStore.revenueData!.totalRevenue.toFixed(2)}
              </span>
            </div>
          </div>
          <div class="revenue-card your-share">
            <div class="revenue-card-icon">🎯</div>
            <div class="revenue-card-info">
              <span class="revenue-card-label">{props.translations.yourShare || 'Your Share (50%)'}</span>
              <span class="revenue-card-value highlight">
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="revenue-gcash-logo" />
                {accountStore.revenueData!.totalCreatorShare.toFixed(2)}
              </span>
            </div>
          </div>
          <div class="revenue-card pending-payout">
            <div class="revenue-card-icon">⏳</div>
            <div class="revenue-card-info">
              <span class="revenue-card-label">{props.translations.pendingPayout || 'Pending Payout'}</span>
              <span class="revenue-card-value">
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="revenue-gcash-logo" />
                {accountStore.revenueData!.pendingPayout.toFixed(2)}
              </span>
            </div>
          </div>
          <div class="revenue-card paid-out">
            <div class="revenue-card-icon">✅</div>
            <div class="revenue-card-info">
              <span class="revenue-card-label">{props.translations.paidOut || 'Paid Out'}</span>
              <span class="revenue-card-value">
                <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="revenue-gcash-logo" />
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
                              <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="revenue-stat-logo" />
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
                                    <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="revenue-table-logo" />
                                    {episode.totalRevenue.toFixed(2)}
                                  </td>
                                  <td class="share-cell highlight">
                                    <img src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" alt="GUSD" class="revenue-table-logo" />
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
