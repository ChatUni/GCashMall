import React, { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import {
  login,
  emailRegister,
  checkEmail,
  saveAuthData,
  apiPost,
} from '../utils/api'
import type { OAuthType, ResetPasswordResponse, User } from '../types'
import './LoginModal.css'

interface LoginModalProps {
  onClose: () => void
  onLoginSuccess: (user: User) => void
}

type ModalMode = 'login' | 'signup' | 'reset'

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
  const { t } = useLanguage()
  const [mode, setMode] = useState<ModalMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) {
      setEmailError(t.login.emailRequired || 'Email is required')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      setEmailError(t.login.invalidEmail || 'Invalid email format')
      return false
    }
    setEmailError('')
    return true
  }

  const validateLoginPassword = (passwordValue: string): boolean => {
    if (!passwordValue) {
      setPasswordError(t.login.passwordRequired || 'Password is required')
      return false
    }
    setPasswordError('')
    return true
  }

  const validateSignupPassword = (passwordValue: string): boolean => {
    if (!passwordValue) {
      setPasswordError(t.login.passwordRequired || 'Password is required')
      return false
    }
    if (passwordValue.length < 6) {
      setPasswordError(
        t.login.passwordMinLength ||
          'Password must be at least 6 characters',
      )
      return false
    }
    if (!/[A-Z]/.test(passwordValue)) {
      setPasswordError(
        t.login.passwordUppercase ||
          'Password must contain at least 1 uppercase letter',
      )
      return false
    }
    if (!/[a-z]/.test(passwordValue)) {
      setPasswordError(
        t.login.passwordLowercase ||
          'Password must contain at least 1 lowercase letter',
      )
      return false
    }
    if (!/[0-9]/.test(passwordValue)) {
      setPasswordError(
        t.login.passwordNumber || 'Password must contain at least 1 number',
      )
      return false
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordValue)) {
      setPasswordError(
        t.login.passwordSpecial ||
          'Password must contain at least 1 special character',
      )
      return false
    }
    setPasswordError('')
    return true
  }

  const handleLogin = async () => {
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validateLoginPassword(password)

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setLoading(true)

    const response = await login({ email, password })

    if (response.success && response.data) {
      saveAuthData(response.data.token, response.data.user)
      onLoginSuccess(response.data.user)
    } else {
      setPasswordError(response.error || 'Invalid email or password')
    }

    setLoading(false)
  }

  const handleSignup = async () => {
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validateSignupPassword(password)

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setLoading(true)

    // Check if email exists
    const checkResponse = await checkEmail(email)
    if (checkResponse.success && checkResponse.data?.exists) {
      setEmailError(t.login.emailExists || 'Email already exists')
      setLoading(false)
      return
    }

    // Register the user
    const response = await emailRegister({ email, password })

    if (response.success && response.data) {
      saveAuthData(response.data.token, response.data.user)
      onLoginSuccess(response.data.user)
    } else {
      setPasswordError(response.error || 'Registration failed')
    }

    setLoading(false)
  }

  const handleResetPassword = async () => {
    const isEmailValid = validateEmail(email)

    if (!isEmailValid) {
      return
    }

    setLoading(true)
    setResetMessage('')

    try {
      const response = await apiPost<ResetPasswordResponse>('resetPassword', { email })

      if (response.success) {
        setResetMessage(
          t.login.resetEmailSent?.replace('{email}', email) ||
            `An email has been sent to ${email} with password reset instruction.`
        )
      } else {
        setEmailError(response.error || 'Failed to send reset email')
      }
    } catch {
      setEmailError('Failed to send reset email')
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'login') {
      await handleLogin()
    } else if (mode === 'signup') {
      await handleSignup()
    } else if (mode === 'reset') {
      await handleResetPassword()
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const getOAuthRedirectUrl = () => `${window.location.origin}/account`

  const handleOAuthSignIn = (provider: OAuthType) => {
    const redirectUrl = getOAuthRedirectUrl()

    const oauthConfigs: Record<OAuthType, { clientIdEnv: string; authUrl: string; scope: string }> = {
      google: {
        clientIdEnv: 'VITE_GOOGLE_CLIENT_ID',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scope: 'email profile',
      },
      facebook: {
        clientIdEnv: 'VITE_FACEBOOK_CLIENT_ID',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        scope: 'email,public_profile',
      },
      twitter: {
        clientIdEnv: 'VITE_TWITTER_CLIENT_ID',
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        scope: 'users.read tweet.read offline.access',
      },
      linkedin: {
        clientIdEnv: 'VITE_LINKEDIN_CLIENT_ID',
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        scope: 'r_liteprofile r_emailaddress',
      },
    }

    const config = oauthConfigs[provider]
    const clientId = import.meta.env[config.clientIdEnv]

    if (!clientId) {
      console.error(`${provider} client ID not configured`)
      return
    }

    let authUrl = `${config.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=${encodeURIComponent(config.scope)}`

    // Twitter requires state and code_challenge parameters
    if (provider === 'twitter') {
      const state = Math.random().toString(36).substring(7)
      authUrl += `&state=${state}&code_challenge=challenge&code_challenge_method=plain`
    }

    window.location.href = authUrl
  }

  const handleForgetPassword = () => {
    switchMode('reset')
  }

  const renderLoginForm = () => (
    <>
      <h2 className="login-modal-title">{t.login.title}</h2>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-field">
          <input
            type="email"
            className={`login-input ${emailError ? 'login-input-error' : ''}`}
            placeholder={t.login.email}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError('')
            }}
            required
          />
          {emailError && (
            <span className="login-field-error">{emailError}</span>
          )}
        </div>

        <div className="login-field">
          <input
            type="password"
            className={`login-input ${passwordError ? 'login-input-error' : ''}`}
            placeholder={t.login.password}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError) setPasswordError('')
            }}
            required
          />
          {passwordError && (
            <span className="login-field-error">{passwordError}</span>
          )}
        </div>

        <button
          type="button"
          className="login-forget-password"
          onClick={handleForgetPassword}
        >
          {t.login.forgetPassword}
        </button>

        <button
          type="submit"
          className="login-submit"
          disabled={loading}
        >
          {loading ? '...' : t.login.submit}
        </button>
      </form>

      <div className="login-divider">
        <span className="login-divider-text">{t.login.orContinueWith}</span>
      </div>

      <div className="login-oauth-buttons">
        <button
          className="login-oauth-btn"
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
        <button
          className="login-oauth-btn"
          onClick={() => handleOAuthSignIn('facebook')}
          title="Facebook"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#1877F2"
              d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
            />
          </svg>
        </button>
        <button
          className="login-oauth-btn"
          onClick={() => handleOAuthSignIn('twitter')}
          title="Twitter"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#1DA1F2"
              d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
            />
          </svg>
        </button>
        <button
          className="login-oauth-btn"
          onClick={() => handleOAuthSignIn('linkedin')}
          title="LinkedIn"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#0A66C2"
              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
            />
          </svg>
        </button>
      </div>

      <div className="login-signup">
        <span>{t.login.noAccount}</span>
        <button
          type="button"
          className="login-signup-link"
          onClick={() => switchMode('signup')}
        >
          {t.login.signUp}
        </button>
      </div>
    </>
  )

  const renderSignupForm = () => (
    <>
      <h2 className="login-modal-title">{t.login.signUpTitle || 'Sign Up'}</h2>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-field">
          <input
            type="email"
            className={`login-input ${emailError ? 'login-input-error' : ''}`}
            placeholder={t.login.email}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError('')
            }}
            required
          />
          {emailError && (
            <span className="login-field-error">{emailError}</span>
          )}
        </div>

        <div className="login-field">
          <input
            type="password"
            className={`login-input ${passwordError ? 'login-input-error' : ''}`}
            placeholder={t.login.password}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError) setPasswordError('')
            }}
            required
          />
          {passwordError && (
            <span className="login-field-error">{passwordError}</span>
          )}
        </div>

        <button
          type="submit"
          className="login-submit login-submit-signup"
          disabled={loading}
        >
          {loading ? '...' : t.login.createAccount || 'Create an Account'}
        </button>
      </form>

      <div className="login-divider">
        <span className="login-divider-text">{t.login.orContinueWith}</span>
      </div>

      <div className="login-oauth-buttons">
        <button
          className="login-oauth-btn"
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
        <button
          className="login-oauth-btn"
          onClick={() => handleOAuthSignIn('facebook')}
          title="Facebook"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#1877F2"
              d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
            />
          </svg>
        </button>
        <button
          className="login-oauth-btn"
          onClick={() => handleOAuthSignIn('twitter')}
          title="Twitter"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#1DA1F2"
              d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
            />
          </svg>
        </button>
        <button
          className="login-oauth-btn"
          onClick={() => handleOAuthSignIn('linkedin')}
          title="LinkedIn"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#0A66C2"
              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
            />
          </svg>
        </button>
      </div>

      <div className="login-signup">
        <span>{t.login.hasAccount || 'Already have an account?'}</span>
        <button
          type="button"
          className="login-signup-link"
          onClick={() => switchMode('login')}
        >
          {t.login.logIn || 'Log in'}
        </button>
      </div>
    </>
  )

  const renderResetForm = () => (
    <>
      <h2 className="login-modal-title">{t.login.resetPasswordTitle || 'Reset Password'}</h2>

      {resetMessage ? (
        <div className="login-reset-success">
          <p>{resetMessage}</p>
          <button
            type="button"
            className="login-submit"
            onClick={() => switchMode('login')}
          >
            {t.login.backToLogin || 'Back to Login'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <input
              type="email"
              className={`login-input ${emailError ? 'login-input-error' : ''}`}
              placeholder={t.login.email}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError('')
              }}
              required
            />
            {emailError && (
              <span className="login-field-error">{emailError}</span>
            )}
          </div>

          <button
            type="submit"
            className="login-submit login-submit-reset"
            disabled={loading}
          >
            {loading ? '...' : t.login.resetPassword || 'Reset Password'}
          </button>
        </form>
      )}

      {!resetMessage && (
        <div className="login-signup">
          <span>{t.login.rememberPassword || 'Remember your password?'}</span>
          <button
            type="button"
            className="login-signup-link"
            onClick={() => switchMode('login')}
          >
            {t.login.logIn || 'Log in'}
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="login-modal-overlay" onClick={handleOverlayClick}>
      <div className="login-modal">
        <button className="login-modal-close" onClick={handleClose}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {mode === 'login' && renderLoginForm()}
        {mode === 'signup' && renderSignupForm()}
        {mode === 'reset' && renderResetForm()}
      </div>
    </div>
  )
}

export default LoginModal
