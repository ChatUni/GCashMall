import React, { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { apiPost } from '../utils/api'
import './LoginModal.css'

interface LoginModalProps {
  onClose: () => void
  onLoginSuccess: () => void
}

interface UserResponse {
  _id: string
  username: string
  email: string
  nickname?: string
}

type ModalMode = 'login' | 'register'

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
  const { t } = useLanguage()
  const [mode, setMode] = useState<ModalMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): string | null => {
    if (!email.trim()) {
      return t.login.errors.emailRequired
    }
    if (!validateEmail(email)) {
      return t.login.errors.invalidEmail
    }
    if (!password) {
      return t.login.errors.passwordRequired
    }
    
    if (mode === 'register') {
      if (!nickname.trim()) {
        return t.login.errors.nicknameRequired
      }
      if (password.length < 6) {
        return t.login.errors.passwordTooShort
      }
      if (password !== confirmPassword) {
        return t.login.errors.passwordMismatch
      }
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    
    setLoading(true)
    setError('')

    const endpoint = mode === 'login' ? 'login' : 'register'
    const payload = mode === 'login' 
      ? { email, password }
      : { email, password, nickname }

    const data = await apiPost<UserResponse>(endpoint, payload)

    if (data.success && data.data) {
      // Save user data to localStorage
      const userData = {
        _id: data.data._id,
        username: data.data.username,
        email: data.data.email,
        nickname: data.data.nickname || data.data.username,
      }
      localStorage.setItem('gcashtv-user', JSON.stringify(userData))
      onLoginSuccess()
    } else {
      setError(data.error || (mode === 'login' ? t.login.errors.loginFailed : t.login.errors.registerFailed))
    }
    setLoading(false)
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setNickname('')
    setError('')
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

  return (
    <div className="login-modal-overlay" onClick={handleOverlayClick}>
      <div className="login-modal">
        <button className="login-modal-close" onClick={handleClose} aria-label={t.login.close}>
          ✕
        </button>
        
        {/* Brand Section */}
        <div className="login-brand">
          <img
            src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
            alt="GCashTV Logo"
            className="login-brand-logo"
          />
          <span className="login-brand-name">GcashTV</span>
        </div>
        
        {/* Header Section */}
        <div className="login-header">
          <h2 className="login-modal-title">
            {mode === 'login' ? t.login.welcomeBack : t.login.createAccount}
          </h2>
          <p className="login-modal-subtitle">
            {mode === 'login' ? t.login.signInSubtitle : t.login.signUpSubtitle}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          
          {mode === 'register' && (
            <div className="login-field">
              <label className="login-label">{t.login.nickname}</label>
              <input
                type="text"
                className="login-input"
                placeholder={t.login.nicknamePlaceholder}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          )}
          
          <div className="login-field">
            <label className="login-label">{t.login.email}</label>
            <input
              type="email"
              className="login-input"
              placeholder={t.login.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="login-field">
            <label className="login-label">{t.login.password}</label>
            <input
              type="password"
              className="login-input"
              placeholder={t.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {mode === 'register' && (
            <div className="login-field">
              <label className="login-label">{t.login.confirmPassword}</label>
              <input
                type="password"
                className="login-input"
                placeholder={t.login.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}
          
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '...' : (mode === 'login' ? t.login.signIn : t.login.signUp)}
          </button>
        </form>
        
        {/* Footer Section */}
        <div className="login-footer">
          <span className="login-footer-text">
            {mode === 'login' ? t.login.noAccount : t.login.hasAccount}
          </span>
          <button type="button" className="login-switch-btn" onClick={switchMode}>
            {mode === 'login' ? t.login.signUp : t.login.signIn}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
