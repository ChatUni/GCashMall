import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import { useLanguage } from '../context/LanguageContext'
import {
  apiGet,
  apiPost,
  apiPostWithAuth,
  isLoggedIn as checkIsLoggedIn,
  getStoredUser,
  clearAuthData,
  saveAuthData,
  checkEmail,
  emailRegister,
  login,
} from '../utils/api'
import type { WatchHistoryItem, FavoriteItem, User, DownloadItem } from '../types'
import './Account.css'

type AccountTab =
  | 'overview'
  | 'watchHistory'
  | 'favorites'
  | 'downloads'
  | 'settings'
  | 'wallet'

const navItems: { key: AccountTab; icon: string }[] = [
  { key: 'overview', icon: '👤' },
  { key: 'watchHistory', icon: '📺' },
  { key: 'favorites', icon: '❤️' },
  { key: 'downloads', icon: '⬇️' },
  { key: 'settings', icon: '⚙️' },
  { key: 'wallet', icon: '💰' },
]

const topUpAmounts = [5, 10, 20, 50, 100, 200]

const Account: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<AccountTab>('overview')
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)

  // Profile form state
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gender, setGender] = useState('not_specified')
  const [birthday, setBirthday] = useState('')

  // Original profile values (to track changes)
  const originalProfileRef = useRef({
    nickname: '',
    email: '',
    phoneNumber: '',
    gender: 'not_specified',
    birthday: '',
  })

  // Profile validation errors
  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [birthdayError, setBirthdayError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [showToast, setShowToast] = useState(false)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPasswordError, setCurrentPasswordError] = useState('')
  const [newPasswordError, setNewPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)

  // Avatar upload state
  const [avatarError, setAvatarError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Settings state
  const [playbackSpeed, setPlaybackSpeed] = useState('1x')
  const [autoplay, setAutoplay] = useState(true)
  const [notifications, setNotifications] = useState(true)

  // Wallet state
  const [balance, setBalance] = useState(0)
  const [showTopUpPopup, setShowTopUpPopup] = useState(false)
  const [selectedTopUpAmount, setSelectedTopUpAmount] = useState<number | null>(null)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && navItems.some((item) => item.key === tab)) {
      setActiveTab(tab as AccountTab)
    }
  }, [searchParams])

  // Generate a random password that meets validation requirements
  const generateRandomPassword = (): string => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*'
    
    // Ensure at least one of each required character type
    let password = ''
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]
    
    // Add more random characters to reach 12 chars
    const allChars = uppercase + lowercase + numbers + special
    for (let i = 0; i < 8; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  useEffect(() => {
    // Handle Google OAuth callback
    const handleGoogleCallback = async () => {
      const code = searchParams.get('code')
      console.log('[Google OAuth] Code from URL:', code ? 'present' : 'not present')
      
      if (code) {
        setLoading(true)
        // Clear any existing auth data before processing new Google login
        clearAuthData()
        setUser(null)
        setIsLoggedIn(false)
        
        try {
          console.log('[Google OAuth] Exchanging code for user info...')
          console.log('[Google OAuth] Redirect URI:', `${window.location.origin}/account`)
          
          // Exchange code for tokens via backend
          const response = await apiPost<{
            name: string
            email: string
            picture: string
          }>('googleAuth', { code, redirectUri: `${window.location.origin}/account` })

          console.log('[Google OAuth] googleAuth API response:', response)

          if (response.success && response.data) {
            const { name, email, picture } = response.data
            console.log('[Google OAuth] User profile from Google:', { name, email, picture })

            // Check if email exists
            console.log('[Google OAuth] Checking if email exists:', email)
            const checkResponse = await checkEmail(email)
            console.log('[Google OAuth] checkEmail response:', checkResponse)
            
            if (checkResponse.success && checkResponse.data?.exists) {
              console.log('[Google OAuth] User exists, calling googleLogin...')
              // User exists, login using Google login endpoint (no password required)
              const loginResponse = await apiPost<{ user: User; token: string }>('googleLogin', {
                email,
              })
              console.log('[Google OAuth] googleLogin response:', loginResponse)
              
              if (loginResponse.success && loginResponse.data) {
                saveAuthData(loginResponse.data.token, loginResponse.data.user)
                setUser(loginResponse.data.user)
                setIsLoggedIn(true)
                setProfileData(loginResponse.data.user)
                setBalance(loginResponse.data.user.balance || 0)
                console.log('[Google OAuth] Login successful!')
              } else {
                console.error('[Google OAuth] Login failed:', loginResponse.error)
                setShowLoginModal(true)
              }
            } else {
              console.log('[Google OAuth] User does not exist, registering new user...')
              // User doesn't exist, register with a valid random password
              const generatedPassword = generateRandomPassword()
              console.log('[Google OAuth] Generated password (for debugging):', generatedPassword)
              
              const registerPayload = {
                email,
                password: generatedPassword,
                nickname: name,
                photoUrl: picture,
              }
              console.log('[Google OAuth] Register payload:', { ...registerPayload, password: '***hidden***' })
              
              const registerResponse = await emailRegister(registerPayload)
              console.log('[Google OAuth] emailRegister response:', registerResponse)
              
              if (registerResponse.success && registerResponse.data) {
                saveAuthData(registerResponse.data.token, registerResponse.data.user)
                setUser(registerResponse.data.user)
                setIsLoggedIn(true)
                setProfileData(registerResponse.data.user)
                setBalance(registerResponse.data.user.balance || 0)
                console.log('[Google OAuth] Registration successful!')
              } else {
                console.error('[Google OAuth] Registration failed:', registerResponse.error)
                setShowLoginModal(true)
              }
            }
          } else {
            console.error('[Google OAuth] googleAuth API failed:', response.error)
            setShowLoginModal(true)
          }
        } catch (error) {
          console.error('[Google OAuth] Exception:', error)
          setShowLoginModal(true)
        } finally {
          // Clear the code from URL
          setSearchParams({})
          setLoading(false)
        }
        return
      }

      // Normal login check
      checkLoginStatus()
    }

    handleGoogleCallback()
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserData()
    }
  }, [isLoggedIn])

  const setProfileData = (userData: User) => {
    const profileValues = {
      nickname: userData.nickname || '',
      email: userData.email || '',
      phoneNumber: userData.phone || '',
      gender: userData.sex || 'not_specified',
      birthday: userData.dob || '',
    }
    setNickname(profileValues.nickname)
    setEmail(profileValues.email)
    setPhoneNumber(profileValues.phoneNumber)
    setGender(profileValues.gender)
    setBirthday(profileValues.birthday)
    originalProfileRef.current = { ...profileValues }
  }

  const checkLoginStatus = async () => {
    // First check local storage for logged in user
    if (checkIsLoggedIn()) {
      const storedUser = getStoredUser()
      if (storedUser) {
        setUser(storedUser)
        setIsLoggedIn(true)
        setProfileData(storedUser)
        setBalance(storedUser.balance || 0)
        setLoading(false)
        return
      }
    }

    // Fall back to API call
    try {
      const response = await apiGet<User>('user')
      if (response.success && response.data) {
        setUser(response.data)
        setIsLoggedIn(true)
        setProfileData(response.data)
        setBalance(response.data.balance || 0)
      } else {
        setShowLoginModal(true)
      }
    } catch {
      setShowLoginModal(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserData = async () => {
    try {
      const [historyResponse, favoritesResponse, downloadsResponse] = await Promise.all([
        apiGet<WatchHistoryItem[]>('watchHistory'),
        apiGet<FavoriteItem[]>('favorites'),
        apiGet<DownloadItem[]>('downloads'),
      ])

      if (historyResponse.success && historyResponse.data) {
        setWatchHistory(historyResponse.data)
      }
      if (favoritesResponse.success && favoritesResponse.data) {
        setFavorites(favoritesResponse.data)
      }
      if (downloadsResponse.success && downloadsResponse.data) {
        setDownloads(downloadsResponse.data)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const handleTabClick = (tab: AccountTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleLogout = () => {
    clearAuthData()
    setIsLoggedIn(false)
    setUser(null)
    navigate('/')
  }

  const handleLoginClose = () => {
    setShowLoginModal(false)
    if (!isLoggedIn) {
      navigate('/')
    }
  }

  const handleLoginSuccess = async () => {
    setShowLoginModal(false)
    setIsLoggedIn(true)
    await checkLoginStatus()
  }

  // Check if profile has changes
  const hasProfileChanges = useCallback(() => {
    const original = originalProfileRef.current
    return (
      nickname !== original.nickname ||
      email !== original.email ||
      phoneNumber !== original.phoneNumber ||
      gender !== original.gender ||
      birthday !== original.birthday
    )
  }, [nickname, email, phoneNumber, gender, birthday])

  // Show toast notification
  const showToastNotification = (message: string, type: 'success' | 'error') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  // Validate email format
  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) {
      setEmailError('')
      return true
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      setEmailError(t.account.overview.invalidEmail || 'Invalid email format')
      return false
    }
    setEmailError('')
    return true
  }

  // Validate phone number
  const validatePhone = (phoneValue: string): boolean => {
    if (!phoneValue) {
      setPhoneError('')
      return true
    }
    const phoneRegex = /^[\d\s\-\(\)\+]+$/
    if (phoneValue.length < 10 || !phoneRegex.test(phoneValue)) {
      setPhoneError(t.account.overview.invalidPhone || 'Invalid phone number')
      return false
    }
    setPhoneError('')
    return true
  }

  // Validate birthday
  const validateBirthday = (birthdayValue: string): boolean => {
    if (!birthdayValue) {
      setBirthdayError('')
      return true
    }
    const date = new Date(birthdayValue)
    if (isNaN(date.getTime()) || date >= new Date()) {
      setBirthdayError(t.account.overview.invalidBirthday || 'Invalid date of birth')
      return false
    }
    setBirthdayError('')
    return true
  }

  // Clear profile changes
  const clearProfileChanges = () => {
    const original = originalProfileRef.current
    setNickname(original.nickname)
    setEmail(original.email)
    setPhoneNumber(original.phoneNumber)
    setGender(original.gender)
    setBirthday(original.birthday)
    setEmailError('')
    setPhoneError('')
    setBirthdayError('')
  }

  const handleSaveProfile = async () => {
    // Validate all fields
    const isEmailValid = validateEmail(email)
    const isPhoneValid = validatePhone(phoneNumber)
    const isBirthdayValid = validateBirthday(birthday)

    if (!isEmailValid || !isPhoneValid || !isBirthdayValid) {
      return
    }

    setProfileSaving(true)

    try {
      const response = await apiPostWithAuth<User>('updateProfile', {
        nickname,
        email,
        phone: phoneNumber,
        sex: gender === 'not_specified' ? null : gender,
        dob: birthday || null,
      })

      if (response.success && response.data) {
        // Update local storage with new user data
        const token = localStorage.getItem('gcashmall_token')
        if (token) {
          saveAuthData(token, response.data)
        }

        // Update original profile ref
        originalProfileRef.current = {
          nickname,
          email,
          phoneNumber,
          gender,
          birthday,
        }

        // Update user state
        setUser(response.data)

        showToastNotification(
          t.account.overview.saveSuccess || 'Profile updated successfully',
          'success',
        )
      } else {
        showToastNotification(response.error || 'Failed to update profile', 'error')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      showToastNotification('Failed to update profile', 'error')
    } finally {
      setProfileSaving(false)
    }
  }

  // Confirm dialog for unsaved changes
  const handleTabClickWithConfirm = (tab: AccountTab) => {
    if (activeTab === 'overview' && hasProfileChanges()) {
      const confirmed = window.confirm(
        t.account.overview.unsavedChanges ||
          'You have unsaved changes. Do you want to discard them?',
      )
      if (confirmed) {
        clearProfileChanges()
      } else {
        return
      }
    }
    handleTabClick(tab)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset error
    setAvatarError('')

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(t.account.overview.avatarSizeError || 'File size must be less than 5MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError(t.account.overview.avatarTypeError || 'Only image files are allowed')
      return
    }

    setAvatarUploading(true)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Image = reader.result as string

        // Upload to cloud
        const uploadResponse = await apiPost<{ url: string; public_id: string }>(
          'uploadImage',
          { image: base64Image, folder: 'avatars' },
        )

        if (uploadResponse.success && uploadResponse.data) {
          // Call updateProfilePicture API
          const updateResponse = await apiPostWithAuth<User>('updateProfilePicture', {
            photoUrl: uploadResponse.data.url,
          })

          if (updateResponse.success && updateResponse.data) {
            // Update local storage
            const token = localStorage.getItem('gcashmall_token')
            if (token) {
              saveAuthData(token, updateResponse.data)
            }

            // Update user state
            setUser(updateResponse.data)

            showToastNotification(
              t.account.overview.avatarUpdateSuccess || 'Avatar updated successfully',
              'success',
            )
          } else {
            showToastNotification(
              updateResponse.error || 'Failed to update avatar',
              'error',
            )
          }
        } else {
          showToastNotification(
            uploadResponse.error || 'Failed to upload image',
            'error',
          )
        }

        setAvatarUploading(false)
      }

      reader.onerror = () => {
        setAvatarError(t.account.overview.avatarReadError || 'Failed to read file')
        setAvatarUploading(false)
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      showToastNotification('Failed to upload avatar', 'error')
      setAvatarUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await apiPost('removeAvatar', {})
      setUser((prev) => (prev ? { ...prev, avatar: undefined } : null))
    } catch (error) {
      console.error('Error removing avatar:', error)
    }
  }

  // Validate password according to spec
  const validatePasswordFormat = (password: string): boolean => {
    const minLength = password.length >= 6
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial
  }

  const validatePasswordFields = (): boolean => {
    let isValid = true

    // Clear previous errors
    setCurrentPasswordError('')
    setNewPasswordError('')
    setConfirmPasswordError('')

    // Validate current password not empty
    if (!currentPassword) {
      setCurrentPasswordError(
        t.account.overview.currentPasswordRequired || 'Current password is required',
      )
      isValid = false
    }

    // Validate new password not empty
    if (!newPassword) {
      setNewPasswordError(t.account.overview.newPasswordRequired || 'New password is required')
      isValid = false
    } else if (!validatePasswordFormat(newPassword)) {
      setNewPasswordError(
        t.account.overview.newPasswordInvalid ||
          'Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
      )
      isValid = false
    }

    // Validate confirm password not empty
    if (!confirmPassword) {
      setConfirmPasswordError(
        t.account.overview.confirmPasswordRequired || 'Please confirm your new password',
      )
      isValid = false
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError(
        t.account.overview.passwordMismatch || 'Passwords do not match',
      )
      isValid = false
    }

    return isValid
  }

  const handleChangePassword = async () => {
    if (!validatePasswordFields()) return

    setPasswordChanging(true)

    try {
      const response = await apiPostWithAuth<User>('updatePassword', {
        oldPassword: currentPassword,
        newPassword,
      })

      if (response.success) {
        // Clear form
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')

        showToastNotification(
          t.account.overview.passwordChangeSuccess || 'Password changed successfully',
          'success',
        )
      } else {
        // Show error - might be wrong current password
        if (response.error?.includes('incorrect')) {
          setCurrentPasswordError(
            t.account.overview.currentPasswordIncorrect || 'Current password is incorrect',
          )
        } else {
          showToastNotification(response.error || 'Failed to change password', 'error')
        }
      }
    } catch (error) {
      console.error('Error changing password:', error)
      showToastNotification('Failed to change password', 'error')
    } finally {
      setPasswordChanging(false)
    }
  }

  const handleClearHistory = async () => {
    try {
      await apiPost('clearWatchHistory', {})
      setWatchHistory([])
    } catch (error) {
      console.error('Error clearing history:', error)
    }
  }

  const handleRemoveHistoryItem = async (itemId: string) => {
    try {
      await apiPost('removeWatchHistoryItem', { itemId })
      setWatchHistory((prev) => prev.filter((item) => item._id !== itemId))
    } catch (error) {
      console.error('Error removing history item:', error)
    }
  }

  const handleRemoveFavorite = async (itemId: string) => {
    try {
      await apiPost('removeFavorite', { itemId })
      setFavorites((prev) => prev.filter((item) => item._id !== itemId))
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  const handleClearDownloads = async () => {
    try {
      await apiPost('clearDownloads', {})
      setDownloads([])
    } catch (error) {
      console.error('Error clearing downloads:', error)
    }
  }

  const handleRemoveDownload = async (itemId: string) => {
    try {
      await apiPost('removeDownload', { itemId })
      setDownloads((prev) => prev.filter((item) => item._id !== itemId))
    } catch (error) {
      console.error('Error removing download:', error)
    }
  }

  const handleTopUpClick = (amount: number) => {
    setSelectedTopUpAmount(amount)
    setShowTopUpPopup(true)
  }

  const handleConfirmTopUp = async () => {
    if (!selectedTopUpAmount) return
    try {
      await apiPost('topUp', { amount: selectedTopUpAmount })
      setBalance((prev) => prev + selectedTopUpAmount)
      setShowTopUpPopup(false)
      setSelectedTopUpAmount(null)
    } catch (error) {
      console.error('Error topping up:', error)
    }
  }

  const renderSidebar = () => (
    <aside className="account-sidebar">
      <div className="sidebar-profile">
        <div className="sidebar-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.nickname} />
          ) : (
            <span className="avatar-emoji">👤</span>
          )}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-username">{user?.nickname || 'Guest'}</span>
          <span className="sidebar-email">{user?.email || ''}</span>
        </div>
      </div>

      <nav className="account-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => handleTabClickWithConfirm(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{t.account.nav[item.key]}</span>
          </button>
        ))}
      </nav>

      <button className="nav-item logout" onClick={handleLogout}>
        <span className="nav-icon">🚪</span>
        <span className="nav-label">{t.account.nav.logout}</span>
      </button>
    </aside>
  )

  const renderOverview = () => (
    <div className="content-section overview-section">
      <div className="section-header">
        <h1 className="page-title">{t.account.overview.title}</h1>
        <p className="page-subtitle">{t.account.overview.subtitle}</p>
      </div>

      <div className="section-card">
        <h3 className="card-title">{t.account.overview.profileInfo}</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>{t.account.overview.nickname}</label>
            <input
              type="text"
              name="nickname"
              autoComplete="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t.account.overview.nicknamePlaceholder}
            />
          </div>
          <div className="form-field">
            <label>{t.account.overview.email}</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError('')
              }}
              placeholder={t.account.overview.emailPlaceholder}
              className={emailError ? 'input-error' : ''}
            />
            {emailError && <span className="field-error">{emailError}</span>}
          </div>
          <div className="form-field">
            <label>{t.account.overview.phoneNumber}</label>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                if (phoneError) setPhoneError('')
              }}
              placeholder={t.account.overview.phonePlaceholder}
              className={phoneError ? 'input-error' : ''}
            />
            {phoneError && <span className="field-error">{phoneError}</span>}
          </div>
          <div className="form-field">
            <label>{t.account.overview.gender}</label>
            <select name="gender" autoComplete="sex" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="not_specified">{t.account.overview.genderNotSpecified}</option>
              <option value="male">{t.account.overview.genderMale}</option>
              <option value="female">{t.account.overview.genderFemale}</option>
              <option value="other">{t.account.overview.genderOther}</option>
            </select>
          </div>
          <div className="form-field">
            <label>{t.account.overview.birthday}</label>
            <input
              type="date"
              name="birthday"
              autoComplete="bday"
              value={birthday}
              onChange={(e) => {
                setBirthday(e.target.value)
                if (birthdayError) setBirthdayError('')
              }}
              className={birthdayError ? 'input-error' : ''}
            />
            {birthdayError && <span className="field-error">{birthdayError}</span>}
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={handleSaveProfile}
          disabled={!hasProfileChanges() || profileSaving}
        >
          {profileSaving ? '...' : t.account.overview.save}
        </button>
      </div>

      <div className="section-card">
        <h3 className="card-title">{t.account.overview.profilePicture}</h3>
        <div className="avatar-section">
          <div className="avatar-preview">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" />
            ) : (
              <span className="avatar-emoji-large">👤</span>
            )}
          </div>
          <div className="avatar-actions">
            <label className={`btn-primary upload-btn ${avatarUploading ? 'disabled' : ''}`}>
              {avatarUploading ? '...' : t.account.overview.uploadAvatar}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                hidden
                disabled={avatarUploading}
              />
            </label>
            {user?.avatar && (
              <button className="btn-secondary" onClick={handleRemoveAvatar}>
                {t.account.overview.removeAvatar}
              </button>
            )}
          </div>
          {avatarError && <span className="field-error">{avatarError}</span>}
          <p className="avatar-hint">{t.account.overview.avatarHint}</p>
        </div>
      </div>

      <div className="section-card">
        <h3 className="card-title">{t.account.overview.changePassword}</h3>
        <div className="form-grid password-form">
          <div className="form-field">
            <label>{t.account.overview.currentPassword}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value)
                if (currentPasswordError) setCurrentPasswordError('')
              }}
              placeholder={t.account.overview.currentPasswordPlaceholder}
              className={currentPasswordError ? 'input-error' : ''}
            />
            {currentPasswordError && <span className="field-error">{currentPasswordError}</span>}
          </div>
          <div className="form-field">
            <label>{t.account.overview.newPassword}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                if (newPasswordError) setNewPasswordError('')
              }}
              placeholder={t.account.overview.newPasswordPlaceholder}
              className={newPasswordError ? 'input-error' : ''}
            />
            {newPasswordError && <span className="field-error">{newPasswordError}</span>}
          </div>
          <div className="form-field">
            <label>{t.account.overview.confirmPassword}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (confirmPasswordError) setConfirmPasswordError('')
              }}
              placeholder={t.account.overview.confirmPasswordPlaceholder}
              className={confirmPasswordError ? 'input-error' : ''}
            />
            {confirmPasswordError && <span className="field-error">{confirmPasswordError}</span>}
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={handleChangePassword}
          disabled={passwordChanging}
        >
          {passwordChanging ? '...' : t.account.overview.changePasswordBtn}
        </button>
      </div>
    </div>
  )

  const renderWatchHistory = () => (
    <div className="content-section history-section">
      <div className="section-header-row">
        <h1 className="page-title">{t.account.watchHistory.title}</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleClearHistory}>
            {t.account.watchHistory.clearHistory}
          </button>
          <label className="toggle-label">
            <span>{t.account.watchHistory.syncHistory}</span>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </label>
        </div>
      </div>

      {watchHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📺</div>
          <h3 className="empty-title">{t.account.watchHistory.emptyTitle}</h3>
          <p className="empty-subtext">{t.account.watchHistory.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/series')}>
            {t.account.watchHistory.exploreButton}
          </button>
        </div>
      ) : (
        <div className="content-grid">
          {watchHistory.map((item) => (
            <div
              key={item._id}
              className="history-card"
              onClick={() => navigate(`/player/${item.seriesId}?episode=${item.episodeId}`)}
            >
              <div className="poster-container">
                <img src={item.thumbnail} alt={item.seriesTitle} />
                <span className="episode-badge">EP {item.episodeNumber}</span>
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveHistoryItem(item._id)
                  }}
                >
                  ✕
                </button>
              </div>
              <h4 className="card-title">{item.seriesTitle}</h4>
              {item.tag && <span className="tag-pill">{item.tag}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderFavorites = () => (
    <div className="content-section favorites-section">
      <div className="section-header-row">
        <h1 className="page-title">{t.account.favorites.title}</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❤️</div>
          <h3 className="empty-title">{t.account.favorites.emptyTitle}</h3>
          <p className="empty-subtext">{t.account.favorites.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/series')}>
            {t.account.favorites.exploreButton}
          </button>
        </div>
      ) : (
        <div className="content-grid">
          {favorites.map((item) => (
            <div
              key={item._id}
              className="favorite-card"
              onClick={() => navigate(`/player/${item.seriesId}`)}
            >
              <div className="poster-container">
                <img src={item.thumbnail} alt={item.seriesTitle} />
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFavorite(item._id)
                  }}
                >
                  ✕
                </button>
              </div>
              <h4 className="card-title">{item.seriesTitle}</h4>
              {item.tag && <span className="tag-pill">{item.tag}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderDownloads = () => (
    <div className="content-section downloads-section">
      <div className="section-header-row">
        <h1 className="page-title">{t.account.downloads.title}</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleClearDownloads}>
            {t.account.downloads.clearAll}
          </button>
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⬇️</div>
          <h3 className="empty-title">{t.account.downloads.emptyTitle}</h3>
          <p className="empty-subtext">{t.account.downloads.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/series')}>
            {t.account.downloads.exploreButton}
          </button>
        </div>
      ) : (
        <div className="content-grid">
          {downloads.map((item) => (
            <div key={item._id} className="download-card">
              <div className="poster-container">
                <img src={item.thumbnail} alt={item.seriesTitle} />
                <span className="episode-badge">EP {item.episodeNumber}</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveDownload(item._id)}
                >
                  ✕
                </button>
              </div>
              <div className="download-info">
                <h4 className="card-title">{item.seriesTitle}</h4>
                <span className="episode-label">Episode {item.episodeNumber}</span>
                {item.fileSize && <span className="file-size">{item.fileSize}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSettings = () => (
    <div className="content-section settings-section">
      <h1 className="page-title">{t.account.settings.title}</h1>

      <div className="section-card">
        <h3 className="card-title">{t.account.settings.preferences}</h3>

        <div className="setting-row">
          <label className="setting-label">{t.account.settings.language}</label>
          <select
            className="setting-control"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="setting-row">
          <label className="setting-label">{t.account.settings.playbackSpeed}</label>
          <select
            className="setting-control"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(e.target.value)}
          >
            <option value="0.5x">0.5x</option>
            <option value="1x">1x</option>
            <option value="1.5x">1.5x</option>
            <option value="2x">2x</option>
          </select>
        </div>

        <div className="setting-row">
          <label className="setting-label">{t.account.settings.autoplay}</label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <label className="setting-label">{t.account.settings.notifications}</label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  )

  const renderWallet = () => (
    <div className="content-section wallet-section">
      <div className="section-header">
        <h1 className="page-title">{t.account.wallet.title}</h1>
        <p className="page-subtitle">{t.account.wallet.subtitle}</p>
      </div>

      <div className="balance-card">
        <div className="balance-icon">💰</div>
        <div className="balance-info">
          <span className="balance-label">{t.account.wallet.currentBalance}</span>
          <div className="balance-amount">
            <img src="/gcash-logo.png" alt="GCash" className="gcash-logo" />
            <span>{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="section-card topup-section">
        <h3 className="card-title">{t.account.wallet.topUp}</h3>
        <p className="topup-description">{t.account.wallet.topUpDescription}</p>
        <div className="topup-grid">
          {topUpAmounts.map((amount) => (
            <button
              key={amount}
              className="topup-button"
              onClick={() => handleTopUpClick(amount)}
            >
              <img src="/gcash-logo.png" alt="GCash" className="topup-logo" />
              <span className="topup-amount">{amount}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h3 className="card-title">{t.account.wallet.transactionHistory}</h3>
        <p className="empty-text">{t.account.wallet.noTransactions}</p>
      </div>

      {showTopUpPopup && selectedTopUpAmount && (
        <div className="popup-overlay" onClick={() => setShowTopUpPopup(false)}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src="/gcash-logo.png" alt="GCash" className="popup-logo" />
            <h2 className="popup-title">{t.account.wallet.confirmTopUp}</h2>
            <p className="popup-message">{t.account.wallet.addToWallet}</p>
            <div className="popup-amount">
              <img src="/gcash-logo.png" alt="GCash" className="popup-amount-logo" />
              <span>{selectedTopUpAmount}</span>
            </div>
            <div className="popup-buttons">
              <button className="btn-confirm" onClick={handleConfirmTopUp}>
                {t.account.wallet.confirm}
              </button>
              <button className="btn-cancel" onClick={() => setShowTopUpPopup(false)}>
                {t.account.wallet.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'watchHistory':
        return renderWatchHistory()
      case 'favorites':
        return renderFavorites()
      case 'downloads':
        return renderDownloads()
      case 'settings':
        return renderSettings()
      case 'wallet':
        return renderWallet()
      default:
        return renderOverview()
    }
  }

  if (loading) {
    return (
      <div className="account-page">
        <TopBar />
        <div className="loading">Loading...</div>
        <BottomBar />
      </div>
    )
  }

  return (
    <div className="account-page">
      <TopBar />
      <div className="account-layout">
        {renderSidebar()}
        <main className="account-content">{renderContent()}</main>
      </div>
      <BottomBar />

      {showLoginModal && (
        <LoginModal onClose={handleLoginClose} onLoginSuccess={handleLoginSuccess} />
      )}

      {showToast && (
        <div className={`toast-notification toast-${toastType}`}>
          {toastMessage}
        </div>
      )}
    </div>
  )
}

export default Account
