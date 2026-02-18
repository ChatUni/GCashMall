import { createSignal, Show, Switch, Match } from 'solid-js'
import { useLocation } from '@solidjs/router'
import { t } from '../stores/languageStore'
import {
  login,
  emailRegister,
  checkEmail,
  saveAuthData,
  apiPost,
} from '../utils/api'
import { loginModalStore } from '../stores'
import type { OAuthType, ResetPasswordResponse, User } from '../types'
import './LoginModal.css'

interface LoginModalProps {
  onClose: () => void
  onLoginSuccess: (user: User) => void
}

type ModalMode = 'login' | 'signup' | 'reset'

const LoginModal = (props: LoginModalProps) => {
  const location = useLocation()
  const [mode, setMode] = createSignal<ModalMode>('login')
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [emailError, setEmailError] = createSignal('')
  const [passwordError, setPasswordError] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [resetMessage, setResetMessage] = createSignal('')

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) {
      setEmailError(t().login.emailRequired || 'Email is required')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      setEmailError(t().login.invalidEmail || 'Invalid email format')
      return false
    }
    setEmailError('')
    return true
  }

  const validateLoginPassword = (passwordValue: string): boolean => {
    if (!passwordValue) {
      setPasswordError(t().login.passwordRequired || 'Password is required')
      return false
    }
    setPasswordError('')
    return true
  }

  const validateSignupPassword = (passwordValue: string): boolean => {
    if (!passwordValue) {
      setPasswordError(t().login.passwordRequired || 'Password is required')
      return false
    }
    if (passwordValue.length < 6) {
      setPasswordError(
        t().login.passwordMinLength ||
          'Password must be at least 6 characters',
      )
      return false
    }
    if (!/[A-Z]/.test(passwordValue)) {
      setPasswordError(
        t().login.passwordUppercase ||
          'Password must contain at least 1 uppercase letter',
      )
      return false
    }
    if (!/[a-z]/.test(passwordValue)) {
      setPasswordError(
        t().login.passwordLowercase ||
          'Password must contain at least 1 lowercase letter',
      )
      return false
    }
    if (!/[0-9]/.test(passwordValue)) {
      setPasswordError(
        t().login.passwordNumber || 'Password must contain at least 1 number',
      )
      return false
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordValue)) {
      setPasswordError(
        t().login.passwordSpecial ||
          'Password must contain at least 1 special character',
      )
      return false
    }
    setPasswordError('')
    return true
  }

  const handleLogin = async () => {
    const isEmailValid = validateEmail(email())
    const isPasswordValid = validateLoginPassword(password())

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setLoading(true)

    const response = await login({ email: email(), password: password() })

    if (response.success && response.data) {
      saveAuthData(response.data.token, response.data.user)
      props.onLoginSuccess(response.data.user)
    } else {
      setPasswordError(response.error || 'Invalid email or password')
    }

    setLoading(false)
  }

  const handleSignup = async () => {
    const isEmailValid = validateEmail(email())
    const isPasswordValid = validateSignupPassword(password())

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setLoading(true)

    // Check if email exists
    const checkResponse = await checkEmail(email())
    if (checkResponse.success && checkResponse.data?.exists) {
      setEmailError(t().login.emailExists || 'Email already exists')
      setLoading(false)
      return
    }

    // Register the user
    const response = await emailRegister({ email: email(), password: password() })

    if (response.success && response.data) {
      saveAuthData(response.data.token, response.data.user)
      props.onLoginSuccess(response.data.user)
    } else {
      setPasswordError(response.error || 'Registration failed')
    }

    setLoading(false)
  }

  const handleResetPassword = async () => {
    const isEmailValid = validateEmail(email())

    if (!isEmailValid) {
      return
    }

    setLoading(true)
    setResetMessage('')

    try {
      const response = await apiPost<ResetPasswordResponse>('resetPassword', { email: email() })

      if (response.success) {
        setResetMessage(
          t().login.resetEmailSent?.replace('{email}', email()) ||
            `An email has been sent to ${email()} with password reset instruction.`
        )
      } else {
        setEmailError(response.error || 'Failed to send reset email')
      }
    } catch {
      setEmailError('Failed to send reset email')
    }

    setLoading(false)
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    if (mode() === 'login') {
      await handleLogin()
    } else if (mode() === 'signup') {
      await handleSignup()
    } else if (mode() === 'reset') {
      await handleResetPassword()
    }
  }

  const handleClose = () => {
    resetForm()
    props.onClose()
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setEmailError('')
    setPasswordError('')
    setResetMessage('')
  }

  const switchMode = (newMode: ModalMode) => {
    resetForm()
    setMode(newMode)
  }

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  // Get OAuth redirect URL - use stored redirectPath or current location
  const getOAuthRedirectUrl = () => {
    // Store the redirect destination in sessionStorage so we can retrieve it after OAuth callback
    const redirectTo = loginModalStore.redirectPath || location.pathname + location.search
    sessionStorage.setItem('oauth_redirect', redirectTo)
    // OAuth callback always goes to /account which handles the OAuth flow
    return `${window.location.origin}/account`
  }

  const handleOAuthSignIn = (provider: OAuthType) => {
    const redirectUrl = getOAuthRedirectUrl()

    const oauthConfigs: Record<OAuthType, { clientIdEnv: string; authUrl: string; scope: string }> = {
      google: {
        clientIdEnv: 'VITE_GOOGLE_CLIENT_ID',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scope: 'email profile',
      },
    }

    const config = oauthConfigs[provider]
    if (!config) {
      console.error(`${provider} OAuth not supported`)
      return
    }

    const clientId = import.meta.env[config.clientIdEnv]

    if (!clientId) {
      console.error(`${provider} client ID not configured`)
      return
    }

    const authUrl = `${config.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=${encodeURIComponent(config.scope)}`

    window.location.href = authUrl
  }

  const handleForgetPassword = () => {
    switchMode('reset')
  }

  const renderLoginForm = () => (
    <>
      <h2 class="login-modal-title">{t().login.title}</h2>

      <form onSubmit={handleSubmit} class="login-form">
        <div class="login-field">
          <input
            type="email"
            class={`login-input ${emailError() ? 'login-input-error' : ''}`}
            placeholder={t().login.email}
            value={email()}
            onInput={(e) => {
              setEmail(e.currentTarget.value)
              if (emailError()) setEmailError('')
            }}
            required
          />
          <Show when={emailError()}>
            <span class="login-field-error">{emailError()}</span>
          </Show>
        </div>

        <div class="login-field">
          <input
            type="password"
            class={`login-input ${passwordError() ? 'login-input-error' : ''}`}
            placeholder={t().login.password}
            value={password()}
            onInput={(e) => {
              setPassword(e.currentTarget.value)
              if (passwordError()) setPasswordError('')
            }}
            required
          />
          <Show when={passwordError()}>
            <span class="login-field-error">{passwordError()}</span>
          </Show>
        </div>

        <button
          type="button"
          class="login-forget-password"
          onClick={handleForgetPassword}
        >
          {t().login.forgetPassword}
        </button>

        <button
          type="submit"
          class="login-submit"
          disabled={loading()}
        >
          {loading() ? '...' : t().login.submit}
        </button>
      </form>

      <div class="login-divider">
        <span class="login-divider-text">{t().login.orContinueWith}</span>
      </div>

      <div class="login-oauth-buttons">
        <button
          class="login-oauth-btn"
          onClick={() => handleOAuthSignIn('google')}
          title="Google"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </button>
      </div>

      <div class="login-signup">
        <span>{t().login.noAccount}</span>
        <button
          type="button"
          class="login-signup-link"
          onClick={() => switchMode('signup')}
        >
          {t().login.signUp}
        </button>
      </div>
    </>
  )

  const renderSignupForm = () => (
    <>
      <h2 class="login-modal-title">{t().login.signUpTitle || 'Sign Up'}</h2>

      <form onSubmit={handleSubmit} class="login-form">
        <div class="login-field">
          <input
            type="email"
            class={`login-input ${emailError() ? 'login-input-error' : ''}`}
            placeholder={t().login.email}
            value={email()}
            onInput={(e) => {
              setEmail(e.currentTarget.value)
              if (emailError()) setEmailError('')
            }}
            required
          />
          <Show when={emailError()}>
            <span class="login-field-error">{emailError()}</span>
          </Show>
        </div>

        <div class="login-field">
          <input
            type="password"
            class={`login-input ${passwordError() ? 'login-input-error' : ''}`}
            placeholder={t().login.password}
            value={password()}
            onInput={(e) => {
              setPassword(e.currentTarget.value)
              if (passwordError()) setPasswordError('')
            }}
            required
          />
          <Show when={passwordError()}>
            <span class="login-field-error">{passwordError()}</span>
          </Show>
        </div>

        <button
          type="submit"
          class="login-submit login-submit-signup"
          disabled={loading()}
        >
          {loading() ? '...' : t().login.createAccount || 'Create an Account'}
        </button>
      </form>

      <div class="login-divider">
        <span class="login-divider-text">{t().login.orContinueWith}</span>
      </div>

      <div class="login-oauth-buttons">
        <button
          class="login-oauth-btn"
          onClick={() => handleOAuthSignIn('google')}
          title="Google"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </button>
      </div>

      <div class="login-signup">
        <span>{t().login.hasAccount || 'Already have an account?'}</span>
        <button
          type="button"
          class="login-signup-link"
          onClick={() => switchMode('login')}
        >
          {t().login.logIn || 'Log in'}
        </button>
      </div>
    </>
  )

  const renderResetForm = () => (
    <>
      <h2 class="login-modal-title">{t().login.resetPasswordTitle || 'Reset Password'}</h2>

      <Show
        when={resetMessage()}
        fallback={
          <>
            <form onSubmit={handleSubmit} class="login-form">
              <div class="login-field">
                <input
                  type="email"
                  class={`login-input ${emailError() ? 'login-input-error' : ''}`}
                  placeholder={t().login.email}
                  value={email()}
                  onInput={(e) => {
                    setEmail(e.currentTarget.value)
                    if (emailError()) setEmailError('')
                  }}
                  required
                />
                <Show when={emailError()}>
                  <span class="login-field-error">{emailError()}</span>
                </Show>
              </div>

              <button
                type="submit"
                class="login-submit login-submit-reset"
                disabled={loading()}
              >
                {loading() ? '...' : t().login.resetPassword || 'Reset Password'}
              </button>
            </form>

            <div class="login-signup">
              <span>{t().login.rememberPassword || 'Remember your password?'}</span>
              <button
                type="button"
                class="login-signup-link"
                onClick={() => switchMode('login')}
              >
                {t().login.logIn || 'Log in'}
              </button>
            </div>
          </>
        }
      >
        <div class="login-reset-success">
          <p>{resetMessage()}</p>
          <button
            type="button"
            class="login-submit"
            onClick={() => switchMode('login')}
          >
            {t().login.backToLogin || 'Back to Login'}
          </button>
        </div>
      </Show>
    </>
  )

  return (
    <div class="login-modal-overlay" onClick={handleOverlayClick}>
      <div class="login-modal">
        <button class="login-modal-close" onClick={handleClose}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <Switch>
          <Match when={mode() === 'login'}>{renderLoginForm()}</Match>
          <Match when={mode() === 'signup'}>{renderSignupForm()}</Match>
          <Match when={mode() === 'reset'}>{renderResetForm()}</Match>
        </Switch>
      </div>
    </div>
  )
}

export default LoginModal
