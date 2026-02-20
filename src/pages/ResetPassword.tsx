import { createEffect, Show, Switch, Match } from 'solid-js'
import { useSearchParams, useNavigate } from '@solidjs/router'
import { resetPasswordStore, resetPasswordStoreActions } from '../stores/resetPasswordStore'
import { t } from '../stores/languageStore'
import { syncParamsFromUrl, handleSubmit } from '../services/resetPasswordService'
import './ResetPassword.css'

// ======================
// Sub-components
// ======================

const PageWrapper = (props: { children: any }) => (
  <div class="reset-password-page">
    <div class="reset-password-container">
      <div class="reset-password-card">{props.children}</div>
    </div>
  </div>
)

const InvalidLinkView = (props: { onGoHome: () => void }) => (
  <PageWrapper>
    <h1 class="reset-password-title">{t().resetPassword.title}</h1>
    <div class="reset-password-error-message">
      {t().resetPassword.invalidLink}
    </div>
    <button class="reset-password-button" onClick={props.onGoHome}>
      {t().resetPassword.backToHome}
    </button>
  </PageWrapper>
)

const SuccessView = (props: { onGoLogin: () => void }) => (
  <PageWrapper>
    <div class="reset-password-success-icon">✓</div>
    <h1 class="reset-password-title">{t().resetPassword.success}</h1>
    <p class="reset-password-success-message">
      {t().resetPassword.successMessage}
    </p>
    <button class="reset-password-button" onClick={props.onGoLogin}>
      {t().login.backToLogin}
    </button>
  </PageWrapper>
)

const PasswordField = (props: {
  id: string
  label: string
  value: string
  placeholder: string
  error: string | undefined
  onInput: (value: string) => void
}) => (
  <div class="reset-password-field">
    <label for={props.id}>{props.label}</label>
    <input
      type="password"
      id={props.id}
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      placeholder={props.placeholder}
      class={`reset-password-input ${props.error ? 'error' : ''}`}
    />
    <Show when={props.error}>
      <span class="reset-password-error">{props.error}</span>
    </Show>
  </div>
)

const FormView = () => (
  <PageWrapper>
    <h1 class="reset-password-title">{t().resetPassword.title}</h1>
    <p class="reset-password-subtitle">{t().resetPassword.enterNewPassword}</p>

    <form onSubmit={handleSubmit} class="reset-password-form">
      <div class="reset-password-field">
        <label for="email">{t().resetPassword.email}</label>
        <input
          type="email"
          id="email"
          value={resetPasswordStore.email}
          disabled
          class="reset-password-input disabled"
        />
      </div>

      <PasswordField
        id="newPassword"
        label={t().resetPassword.newPassword}
        value={resetPasswordStore.newPassword}
        placeholder={t().resetPassword.newPasswordPlaceholder}
        error={resetPasswordStore.errors.newPassword}
        onInput={resetPasswordStoreActions.setNewPassword}
      />

      <PasswordField
        id="confirmPassword"
        label={t().resetPassword.confirmNewPassword}
        value={resetPasswordStore.confirmPassword}
        placeholder={t().resetPassword.confirmNewPasswordPlaceholder}
        error={resetPasswordStore.errors.confirmPassword}
        onInput={resetPasswordStoreActions.setConfirmPassword}
      />

      <Show when={resetPasswordStore.apiError}>
        <div class="reset-password-api-error">
          {resetPasswordStore.apiError}
        </div>
      </Show>

      <button
        type="submit"
        class="reset-password-button"
        disabled={resetPasswordStore.isLoading}
      >
        {resetPasswordStore.isLoading
          ? t().resetPassword.resetting
          : t().resetPassword.resetButton}
      </button>
    </form>
  </PageWrapper>
)

// ======================
// Main page component
// ======================

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Sync URL params to store on mount / URL change
  createEffect(() => {
    syncParamsFromUrl(
      searchParams.token as string | undefined,
      searchParams.email as string | undefined,
    )
  })

  const handleGoHome = () => navigate('/')

  return (
    <Switch>
      <Match when={resetPasswordStore.view === 'invalidLink'}>
        <InvalidLinkView onGoHome={handleGoHome} />
      </Match>
      <Match when={resetPasswordStore.view === 'success'}>
        <SuccessView onGoLogin={handleGoHome} />
      </Match>
      <Match when={resetPasswordStore.view === 'form'}>
        <FormView />
      </Match>
    </Switch>
  )
}

export default ResetPassword
