import React, { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { apiPost } from '../utils/api'
import './LoginModal.css'

interface LoginModalProps {
  isOpen?: boolean
  onClose: () => void
  onSuccess: () => void
}

interface User {
  _id: string
  username: string
  email: string
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen = true, onClose, onSuccess }) => {
  const { t } = useLanguage()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (mode === 'register') {
      if (!nickname.trim()) {
        setError('Please enter a nickname')
        return
      }
      if (!validateEmail(email)) {
        setError('Please enter a valid email address')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        const data = await apiPost<User>('login', { email, password })
        if (data.success) {
          localStorage.setItem('gcashtv-user', JSON.stringify(data.data))
          onSuccess()
        } else {
          setError(data.error || 'Invalid email or password')
        }
      } else {
        const data = await apiPost<User>('register', { nickname, email, password })
        if (data.success) {
          localStorage.setItem('gcashtv-user', JSON.stringify(data.data))
          onSuccess()
        } else {
          setError(data.error || 'Email already registered')
        }
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setNickname('')
    setError('')
    setMode('login')
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  if (!isOpen) return null

  return (
    <div className="login-modal-overlay" onClick={handleOverlayClick}>
      <div className="login-modal">
        <button className="login-modal-close" onClick={handleClose}>
          ✕
        </button>

        {/* Brand Section */}
        <div className="login-modal-brand">
          <img
            src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
            alt="GcashTV"
            className="login-modal-logo"
          />
          <span className="login-modal-brand-name">GcashTV</span>
        </div>

        {/* Header Section */}
        <div className="login-modal-header">
          <h2 className="login-modal-title">
            {mode === 'login' ? t.login.welcomeBack : t.login.createAccount}
          </h2>
          <p className="login-modal-subtitle">
            {mode === 'login' ? t.login.signInSubtitle : t.login.registerSubtitle}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">{t.login.nickname || 'Nickname'}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t.login.nicknamePlaceholder || 'Enter your nickname'}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t.login.email}</label>
            <input
              type="email"
              className="form-input"
              placeholder={t.login.emailPlaceholder || 'Enter your email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.login.password}</label>
            <input
              type="password"
              className="form-input"
              placeholder={t.login.passwordPlaceholder || 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">{t.login.confirmPassword || 'Confirm Password'}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t.login.confirmPasswordPlaceholder || 'Confirm your password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? '...' : mode === 'login' ? t.login.signIn : t.login.signUp}
          </button>
        </form>

        {/* Footer Section */}
        <div className="login-modal-footer">
          <span className="login-switch-text">
            {mode === 'login' ? t.login.noAccount : t.login.haveAccount}
          </span>
          <button type="button" className="login-switch-btn" onClick={switchMode}>
            {mode === 'login' ? t.login.register : t.login.signInLink}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
