import React, { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import './LoginModal.css'

interface LoginModalProps {
  onClose: () => void
  onLoginSuccess: () => void
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError('Email is required')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format')
      return false
    }
    setEmailError('')
    return true
  }

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required')
      return false
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return false
    }
    setPasswordError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid || !isPasswordValid) {
      setLoading(false)
      return
    }

    // If validation passes, do nothing as per spec
    setLoading(false)
    onLoginSuccess()
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setEmailError('')
    setPasswordError('')
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const handleGoogleSignIn = () => {
    const redirectUrl = `${window.location.origin}/account`
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=email%20profile`
    window.location.href = googleAuthUrl
  }

  const handleForgetPassword = () => {
    // Do nothing as per spec
  }

  const handleSignUp = () => {
    // Do nothing as per spec
  }

  return (
    <div className="login-modal-overlay" onClick={handleOverlayClick}>
      <div className="login-modal">
        <button className="login-modal-close" onClick={handleClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        
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
            {emailError && <span className="login-field-error">{emailError}</span>}
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
            {passwordError && <span className="login-field-error">{passwordError}</span>}
          </div>
          
          <button
            type="button"
            className="login-forget-password"
            onClick={handleForgetPassword}
          >
            {t.login.forgetPassword}
          </button>
          
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '...' : t.login.submit}
          </button>
        </form>
        
        <div className="login-divider">
          <span className="login-divider-text">{t.login.orContinueWith}</span>
        </div>
        
        <button className="login-google-btn" onClick={handleGoogleSignIn}>
          <svg className="login-google-icon" viewBox="0 0 24 24" width="24" height="24">
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
        
        <div className="login-signup">
          <span>{t.login.noAccount}</span>
          <button type="button" className="login-signup-link" onClick={handleSignUp}>
            {t.login.signUp}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
