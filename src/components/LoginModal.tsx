import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import './LoginModal.css'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register } = useAuth()
  const { t } = useLanguage()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const success = await login(email, password)
        if (success) {
          onSuccess()
          onClose()
          resetForm()
        } else {
          setError('Invalid email or password')
        }
      } else {
        // Register mode
        if (!nickname.trim()) {
          setError('Please enter a nickname')
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          setError('Please enter a valid email address')
          setLoading(false)
          return
        }

        const success = await register(email, password, nickname)
        if (success) {
          onSuccess()
          onClose()
          resetForm()
        } else {
          setError('Email already registered')
        }
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setNickname('')
    setError('')
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="login-modal-overlay" onClick={handleOverlayClick}>
      <div className="login-modal">
        <button className="login-modal-close" onClick={onClose}>
          ✕
        </button>

        {/* Logo and Brand */}
        <div className="login-modal-brand">
          <img
            src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
            alt="GcashTV Logo"
            className="login-modal-logo"
          />
          <span className="login-modal-brand-name">GcashTV</span>
        </div>

        <div className="login-modal-header">
          <h2 className="login-modal-title">
            {mode === 'login' ? t.login.welcomeBack : t.login.createAccount}
          </h2>
          <p className="login-modal-subtitle">
            {mode === 'login'
              ? t.login.signInSubtitle
              : t.login.registerSubtitle}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">{t.account.profile.nickname}</label>
              <input
                type="text"
                className="form-input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t.account.profile.nicknamePlaceholder}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t.login.email}</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPlaceholder}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.login.password}</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.login.passwordPlaceholder}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">{t.login.confirmPassword}</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.login.confirmPasswordPlaceholder}
                required
              />
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading
              ? '...'
              : mode === 'login'
              ? t.login.signIn
              : t.login.signUp}
          </button>
        </form>

        <div className="login-modal-footer">
          <span className="login-switch-text">
            {mode === 'login'
              ? t.login.noAccount
              : t.login.haveAccount}
          </span>
          <button className="login-switch-btn" onClick={switchMode}>
            {mode === 'login' ? t.login.register : t.login.signInLink}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
