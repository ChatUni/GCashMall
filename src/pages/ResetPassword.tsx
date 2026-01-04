import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { apiPost } from '../utils/api'
import { validatePassword } from '../utils/validation'
import './ResetPassword.css'

const ResetPassword = () => {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    extractParamsFromUrl()
  }, [searchParams])

  const extractParamsFromUrl = () => {
    const tokenParam = searchParams.get('token')
    const emailParam = searchParams.get('email')

    if (tokenParam) setToken(tokenParam)
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

  const validateForm = () => {
    const validationErrors: { [key: string]: string } = {}

    if (!newPassword) {
      validationErrors.newPassword = t.resetPassword.newPasswordRequired
    } else {
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.valid) {
        validationErrors.newPassword = passwordValidation.error || t.resetPassword.newPasswordRequired
      }
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword = t.resetPassword.confirmPasswordRequired
    } else if (newPassword !== confirmPassword) {
      validationErrors.confirmPassword = t.resetPassword.passwordsDoNotMatch
    }

    return validationErrors
  }

  const submitResetPassword = async () => {
    setIsLoading(true)

    try {
      const response = await apiPost('confirmResetPassword', {
        email,
        token,
        newPassword,
      })

      if (response.success) {
        setIsSuccess(true)
      } else {
        setApiError(response.error || t.resetPassword.failed)
      }
    } catch {
      setApiError(t.resetPassword.failed)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToLogin = () => {
    navigate('/')
  }

  if (!token || !email) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <h1 className="reset-password-title">{t.resetPassword.title}</h1>
            <div className="reset-password-error-message">
              {t.resetPassword.invalidLink}
            </div>
            <button
              className="reset-password-button"
              onClick={handleGoToLogin}
            >
              {t.resetPassword.backToHome}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="reset-password-success-icon">✓</div>
            <h1 className="reset-password-title">{t.resetPassword.success}</h1>
            <p className="reset-password-success-message">
              {t.resetPassword.successMessage}
            </p>
            <button
              className="reset-password-button"
              onClick={handleGoToLogin}
            >
              {t.login.backToLogin}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-card">
          <h1 className="reset-password-title">{t.resetPassword.title}</h1>
          <p className="reset-password-subtitle">
            {t.resetPassword.enterNewPassword}
          </p>

          <form onSubmit={handleSubmit} className="reset-password-form">
            <div className="reset-password-field">
              <label htmlFor="email">{t.resetPassword.email}</label>
              <input
                type="email"
                id="email"
                value={email}
                disabled
                className="reset-password-input disabled"
              />
            </div>

            <div className="reset-password-field">
              <label htmlFor="newPassword">{t.resetPassword.newPassword}</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.resetPassword.newPasswordPlaceholder}
                className={`reset-password-input ${errors.newPassword ? 'error' : ''}`}
              />
              {errors.newPassword && (
                <span className="reset-password-error">{errors.newPassword}</span>
              )}
            </div>

            <div className="reset-password-field">
              <label htmlFor="confirmPassword">{t.resetPassword.confirmNewPassword}</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.resetPassword.confirmNewPasswordPlaceholder}
                className={`reset-password-input ${errors.confirmPassword ? 'error' : ''}`}
              />
              {errors.confirmPassword && (
                <span className="reset-password-error">{errors.confirmPassword}</span>
              )}
            </div>

            {apiError && (
              <div className="reset-password-api-error">{apiError}</div>
            )}

            <button
              type="submit"
              className="reset-password-button"
              disabled={isLoading}
            >
              {isLoading ? t.resetPassword.resetting : t.resetPassword.resetButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
