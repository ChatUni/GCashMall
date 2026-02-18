import { createSignal, createEffect, Show } from 'solid-js'
import { useSearchParams, useNavigate } from '@solidjs/router'
import { t } from '../stores/languageStore'
import { apiPost } from '../utils/api'
import { validatePassword } from '../utils/validation'
import './ResetPassword.css'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = createSignal('')
  const [token, setToken] = createSignal('')
  const [newPassword, setNewPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [errors, setErrors] = createSignal<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = createSignal(false)
  const [isSuccess, setIsSuccess] = createSignal(false)
  const [apiError, setApiError] = createSignal('')

  createEffect(() => {
    extractParamsFromUrl()
  })

  const extractParamsFromUrl = () => {
    const tokenParam = searchParams.token as string | undefined
    const emailParam = searchParams.email as string | undefined

    if (tokenParam) setToken(tokenParam)
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }

  const validateForm = () => {
    const validationErrors: { [key: string]: string } = {}

    if (!newPassword()) {
      validationErrors.newPassword = t().resetPassword.newPasswordRequired
    } else {
      const passwordValidation = validatePassword(newPassword())
      if (!passwordValidation.valid) {
        validationErrors.newPassword = passwordValidation.error || t().resetPassword.newPasswordRequired
      }
    }

    if (!confirmPassword()) {
      validationErrors.confirmPassword = t().resetPassword.confirmPasswordRequired
    } else if (newPassword() !== confirmPassword()) {
      validationErrors.confirmPassword = t().resetPassword.passwordsDoNotMatch
    }

    return validationErrors
  }

  const submitResetPassword = async () => {
    setIsLoading(true)

    try {
      const response = await apiPost('confirmResetPassword', {
        email: email(),
        token: token(),
        newPassword: newPassword(),
      })

      if (response.success) {
        setIsSuccess(true)
      } else {
        setApiError(response.error || t().resetPassword.failed)
      }
    } catch {
      setApiError(t().resetPassword.failed)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setApiError('')

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    await submitResetPassword()
  }

  const handleGoToLogin = () => {
    navigate('/')
  }

  return (
    <Show when={token() && email()} fallback={
      <div class="reset-password-page">
        <div class="reset-password-container">
          <div class="reset-password-card">
            <h1 class="reset-password-title">{t().resetPassword.title}</h1>
            <div class="reset-password-error-message">
              {t().resetPassword.invalidLink}
            </div>
            <button
              class="reset-password-button"
              onClick={handleGoToLogin}
            >
              {t().resetPassword.backToHome}
            </button>
          </div>
        </div>
      </div>
    }>
      <Show when={!isSuccess()} fallback={
        <div class="reset-password-page">
          <div class="reset-password-container">
            <div class="reset-password-card">
              <div class="reset-password-success-icon">✓</div>
              <h1 class="reset-password-title">{t().resetPassword.success}</h1>
              <p class="reset-password-success-message">
                {t().resetPassword.successMessage}
              </p>
              <button
                class="reset-password-button"
                onClick={handleGoToLogin}
              >
                {t().login.backToLogin}
              </button>
            </div>
          </div>
        </div>
      }>
        <div class="reset-password-page">
          <div class="reset-password-container">
            <div class="reset-password-card">
              <h1 class="reset-password-title">{t().resetPassword.title}</h1>
              <p class="reset-password-subtitle">
                {t().resetPassword.enterNewPassword}
              </p>

              <form onSubmit={handleSubmit} class="reset-password-form">
                <div class="reset-password-field">
                  <label for="email">{t().resetPassword.email}</label>
                  <input
                    type="email"
                    id="email"
                    value={email()}
                    disabled
                    class="reset-password-input disabled"
                  />
                </div>

                <div class="reset-password-field">
                  <label for="newPassword">{t().resetPassword.newPassword}</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword()}
                    onInput={(e) => setNewPassword(e.currentTarget.value)}
                    placeholder={t().resetPassword.newPasswordPlaceholder}
                    class={`reset-password-input ${errors().newPassword ? 'error' : ''}`}
                  />
                  <Show when={errors().newPassword}>
                    <span class="reset-password-error">{errors().newPassword}</span>
                  </Show>
                </div>

                <div class="reset-password-field">
                  <label for="confirmPassword">{t().resetPassword.confirmNewPassword}</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword()}
                    onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                    placeholder={t().resetPassword.confirmNewPasswordPlaceholder}
                    class={`reset-password-input ${errors().confirmPassword ? 'error' : ''}`}
                  />
                  <Show when={errors().confirmPassword}>
                    <span class="reset-password-error">{errors().confirmPassword}</span>
                  </Show>
                </div>

                <Show when={apiError()}>
                  <div class="reset-password-api-error">{apiError()}</div>
                </Show>

                <button
                  type="submit"
                  class="reset-password-button"
                  disabled={isLoading()}
                >
                  {isLoading() ? t().resetPassword.resetting : t().resetPassword.resetButton}
                </button>
              </form>
            </div>
          </div>
        </div>
      </Show>
    </Show>
  )
}

export default ResetPassword
