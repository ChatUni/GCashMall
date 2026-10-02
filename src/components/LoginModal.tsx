import { signInWithOAuthCode, signInWithApple, isAppleSignInAvailable } from '../utils/oauthSignIn'
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
import { isCordova, openOAuthSystemBrowser, getWebOrigin, MOBILE_OAUTH_REDIRECT } from '../utils/cordova'
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
      const response = await apiPost<ResetPasswordResponse>('resetPassword', { email: email(), origin: getWebOrigin() })

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

  // Get OAuth redirect URL
  // In Cordova: use mobile OAuth redirect page (hosted on production)
  //   which bridges Google callback → gcashmall:// custom URL scheme
  // In web: use current origin /account
  const getOAuthRedirectUrl = () => {
    // Store the redirect destination in sessionStorage so we can retrieve it after OAuth callback
    const redirectTo = loginModalStore.redirectPath || location.pathname + location.search
    sessionStorage.setItem('oauth_redirect', redirectTo)

    if (isCordova()) {
      // Cordova: redirect to the mobile bridge page
      return MOBILE_OAUTH_REDIRECT
    }
    // Web: OAuth callback goes to /account which handles the OAuth flow
    return `${window.location.origin}/account`
  }

  // Build the OAuth authorization URL
  const buildOAuthUrl = (provider: OAuthType, redirectUrl: string): string | null => {
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
      return null
    }

    const clientId = import.meta.env[config.clientIdEnv]
    if (!clientId) {
      console.error(`${provider} client ID not configured`)
      return null
    }

    return `${config.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=${encodeURIComponent(config.scope)}`
  }

  // Process OAuth code received from InAppBrowser (Cordova only)
  const processOAuthCode = async (code: string, provider: OAuthType, redirectUrl: string) => {
    setEmailError('')
    setLoading(true)

    try {
      const result = await signInWithOAuthCode(provider, code, redirectUrl)
      if (result.success && result.data) {
        saveAuthData(result.data.token, result.data.user)
        props.onLoginSuccess(result.data.user)
      } else {
        setEmailError(result.error || 'OAuth authentication failed')
      }
    } catch (error) {
      console.error('OAuth processing error:', error)
      setEmailError('OAuth authentication failed')
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Apple — native sheet in the iOS app; the server verifies Apple's token.
  const handleAppleSignIn = async () => {
    setEmailError('')
    setLoading(true)
    try {
      const result = await signInWithApple()
      if (result.success && result.data) {
        saveAuthData(result.data.token, result.data.user)
        props.onLoginSuccess(result.data.user)
      } else if (result.error) {
        setEmailError(result.error)
      }
    } catch (error) {
      setEmailError((error as Error).message || 'Apple sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = (provider: OAuthType) => {
    const redirectUrl = getOAuthRedirectUrl()
    const authUrl = buildOAuthUrl(provider, redirectUrl)
    if (!authUrl) return

    if (isCordova()) {
      // Cordova: open in system browser (Safari/Chrome), receive code via custom URL scheme
      openOAuthSystemBrowser(authUrl)
        .then((code: string) => processOAuthCode(code, provider, redirectUrl))
        .catch((err: Error) => {
          if (err.message !== 'OAuth timed out') {
            console.error('OAuth system browser error:', err)
            setEmailError('OAuth authentication failed')
          }
        })
    } else {
      // Web: redirect to OAuth provider, /account page handles the callback
      window.location.href = authUrl
    }
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
        <Show when={isAppleSignInAvailable()}>
          <button class="login-oauth-btn login-apple-btn" onClick={handleAppleSignIn} title="Sign in with Apple" aria-label="Sign in with Apple">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" aria-hidden="true">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
            </svg>
          </button>
        </Show>
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
        <Show when={isAppleSignInAvailable()}>
          <button class="login-oauth-btn login-apple-btn" onClick={handleAppleSignIn} title="Sign in with Apple" aria-label="Sign in with Apple">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" aria-hidden="true">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
            </svg>
          </button>
        </Show>
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
