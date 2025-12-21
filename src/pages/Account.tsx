import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import { useLanguage } from '../context/LanguageContext'
import { useFavorites } from '../context/FavoritesContext'
import { useWatchHistory } from '../context/WatchHistoryContext'
import { useDownloads } from '../context/DownloadsContext'
import { useAuth } from '../context/AuthContext'
import './Account.css'

type NavItem =
  | 'overview'
  | 'watchHistory'
  | 'favorites'
  | 'downloads'
  | 'settings'
  | 'wallet'
  | 'payment'
  | 'membership'

const Account: React.FC = () => {
  const { t } = useLanguage()
  const { favorites, removeFavorite } = useFavorites()
  const { watchHistory, removeFromHistory, clearHistory } = useWatchHistory()
  const { downloads, removeDownload, clearAllDownloads } = useDownloads()
  const { user, isLoggedIn, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeNav, setActiveNav] = useState<NavItem>('overview')
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Read tab from URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const tab = searchParams.get('tab')
    if (tab && ['overview', 'watchHistory', 'favorites', 'downloads', 'settings', 'wallet', 'payment', 'membership'].includes(tab)) {
      setActiveNav(tab as NavItem)
    }
  }, [location.search])
  
  // Profile state - initialized from user context
  const [nickname, setNickname] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [gender, setGender] = useState<string>('Not specified')
  const [birthday, setBirthday] = useState<string>('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Sync profile state with user context
  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setGender(user.gender || 'Not specified')
      setBirthday(user.birthday || '')
      setAvatarUrl(user.avatarUrl || null)
    }
  }, [user])

  // Show login modal if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setShowLoginModal(true)
    }
  }, [isLoggedIn])
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('gcashtv-wallet-balance')
    return saved ? parseFloat(saved) : 0
  })
  const [selectedTopUpAmount, setSelectedTopUpAmount] = useState<number | null>(null)
  const [showTopUpConfirm, setShowTopUpConfirm] = useState(false)
  
  const topUpAmounts = [5, 10, 20, 50, 100, 200]
  const gcashLogoUrl = 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png'

  const navItems: { key: NavItem; icon: string; label: string }[] = [
    { key: 'overview', icon: '👤', label: t.account.nav.overview },
    { key: 'watchHistory', icon: '📺', label: t.account.nav.watchHistory },
    { key: 'favorites', icon: '❤️', label: t.account.nav.favorites },
    { key: 'downloads', icon: '⬇️', label: t.account.nav.downloads },
    { key: 'settings', icon: '⚙️', label: t.account.nav.settings },
    { key: 'wallet', icon: '💰', label: t.account.nav.wallet },
  ]

  const handleNavClick = (navKey: NavItem) => {
    setActiveNav(navKey)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
  }

  const handleLoginClose = () => {
    if (!isLoggedIn) {
      navigate('/')
    }
    setShowLoginModal(false)
  }

  const handleResume = (seriesId: string, episodeNumber?: number) => {
    if (episodeNumber) {
      navigate(`/player/${seriesId}/${episodeNumber}`)
    } else {
      navigate(`/player/${seriesId}`)
    }
  }

  const handleRemoveFromHistory = (e: React.MouseEvent, seriesId: string) => {
    e.stopPropagation()
    removeFromHistory(seriesId)
  }

  const handleClearHistory = () => {
    clearHistory()
  }

  const handleFavoriteClick = (seriesId: string) => {
    navigate(`/player/${seriesId}`)
  }

  const handleRemoveFavorite = (e: React.MouseEvent, seriesId: string) => {
    e.stopPropagation()
    removeFavorite(seriesId)
  }

  const handleDownloadClick = (seriesId: string, episodeNumber: number) => {
    navigate(`/player/${seriesId}/${episodeNumber}`)
  }

  const handleRemoveDownload = (e: React.MouseEvent, seriesId: string, episodeNumber: number) => {
    e.stopPropagation()
    removeDownload(seriesId, episodeNumber)
  }

  const handleClearDownloads = () => {
    clearAllDownloads()
  }

  const handleTopUpSelect = (amount: number) => {
    setSelectedTopUpAmount(amount)
    setShowTopUpConfirm(true)
  }

  const handleConfirmTopUp = () => {
    if (selectedTopUpAmount) {
      const newBalance = walletBalance + selectedTopUpAmount
      setWalletBalance(newBalance)
      localStorage.setItem('gcashtv-wallet-balance', newBalance.toString())
      setShowTopUpConfirm(false)
      setSelectedTopUpAmount(null)
    }
  }

  const handleCancelTopUp = () => {
    setShowTopUpConfirm(false)
    setSelectedTopUpAmount(null)
  }

  const handleSaveProfile = () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      alert('Please enter a valid email address')
      return
    }
    // Validate phone format (optional, basic validation)
    if (phone && !/^[\d\s\-+()]+$/.test(phone)) {
      alert('Please enter a valid phone number')
      return
    }
    
    // Update user in context
    updateUser({
      nickname,
      email,
      phone,
      gender,
      birthday
    })
    alert('Profile saved successfully!')
  }

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    // In a real app, this would call an API
    alert('Password changed successfully!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }
      // Convert to base64 and save
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setAvatarUrl(base64String)
        updateUser({ avatarUrl: base64String })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl(null)
    updateUser({ avatarUrl: null })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const renderOverviewContent = () => (
    <>
      {/* Header Section */}
      <div className="content-header">
        <div className="header-text">
          <h1 className="content-title">{t.account.overview.title}</h1>
          <p className="content-subtitle">{t.account.overview.subtitle}</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="section-card">
        <h3 className="section-title">{t.account.profile.title}</h3>
        
        <div className="profile-form">
          <div className="form-row">
            <label className="form-label">{t.account.profile.nickname}</label>
            <input
              type="text"
              className="form-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t.account.profile.nicknamePlaceholder}
            />
          </div>

          <div className="form-row">
            <label className="form-label">{t.account.profile.email}</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.account.profile.emailPlaceholder}
            />
          </div>

          <div className="form-row">
            <label className="form-label">{t.account.profile.phoneNumber}</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.account.profile.phonePlaceholder}
            />
          </div>

          <div className="form-row">
            <label className="form-label">{t.account.profile.gender}</label>
            <select
              className="form-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="Not specified">{t.account.profile.genderNotSpecified}</option>
              <option value="Male">{t.account.profile.genderMale}</option>
              <option value="Female">{t.account.profile.genderFemale}</option>
              <option value="Other">{t.account.profile.genderOther}</option>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">{t.account.profile.birthday}</label>
            <input
              type="date"
              className="form-input"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>

          <button className="btn-primary save-profile-btn" onClick={handleSaveProfile}>
            {t.account.profile.saveProfile}
          </button>
        </div>
      </div>

      {/* Change Profile Picture Section */}
      <div className="section-card">
        <h3 className="section-title">{t.account.profile.changeProfilePicture}</h3>
        
        <div className="avatar-change-section">
          <div className="current-avatar">
            <div className="avatar-preview" onClick={handleAvatarClick}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="avatar-image" />
              ) : (
                <span>👤</span>
              )}
            </div>
            <span className="avatar-label">{t.account.profile.currentAvatar}</span>
          </div>
          <div className="avatar-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button className="btn-secondary" onClick={handleAvatarClick}>
              {t.account.profile.uploadNewAvatar}
            </button>
            {avatarUrl && (
              <button className="btn-danger" onClick={handleRemoveAvatar}>
                {t.account.profile.removeAvatar}
              </button>
            )}
          </div>
        </div>
        <p className="avatar-hint">{t.account.profile.avatarHint}</p>
      </div>

      {/* Change Password Section */}
      <div className="section-card">
        <h3 className="section-title">{t.account.profile.changePassword}</h3>
        
        <div className="password-form">
          <div className="form-row">
            <label className="form-label">{t.account.profile.currentPassword}</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t.account.profile.currentPasswordPlaceholder}
            />
          </div>

          <div className="form-row">
            <label className="form-label">{t.account.profile.newPassword}</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.account.profile.newPasswordPlaceholder}
            />
          </div>

          <div className="form-row">
            <label className="form-label">{t.account.profile.confirmNewPassword}</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.account.profile.confirmPasswordPlaceholder}
            />
          </div>

          <button className="btn-primary change-password-btn" onClick={handleChangePassword}>
            {t.account.profile.changePasswordBtn}
          </button>
        </div>
      </div>
    </>
  )

  const renderWatchHistoryContent = () => (
    <>
      <div className="content-header">
        <div className="header-text">
          <h1 className="content-title">{t.account.watchHistory.title}</h1>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleClearHistory}>{t.account.watchHistory.clearHistory}</button>
          <label className="toggle-label">
            <span>{t.account.watchHistory.syncHistory}</span>
            <input type="checkbox" className="toggle-input" />
          </label>
        </div>
      </div>

      {watchHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📺</div>
          <p className="empty-text">{t.account.watchHistory.emptyTitle}</p>
          <p className="empty-subtext">{t.account.watchHistory.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>{t.account.watchHistory.exploreSeries}</button>
        </div>
      ) : (
        <div className="favorites-grid">
          {watchHistory.map((item) => (
            <div
              key={item.seriesId}
              className="favorite-card"
              onClick={() => handleResume(item.seriesId, item.episodeNumber)}
            >
              <div className="favorite-poster-container">
                <img src={item.poster} alt={item.seriesTitle} className="favorite-poster" />
                <button
                  className="favorite-remove-btn"
                  onClick={(e) => handleRemoveFromHistory(e, item.seriesId)}
                  title="Remove from history"
                >
                  ✕
                </button>
                <div className="history-episode-badge">EP {item.episodeNumber}</div>
              </div>
              <h3 className="favorite-title">{item.seriesTitle}</h3>
              <span className="favorite-tag">{item.tag}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )

  const renderSettingsContent = () => (
    <>
      <div className="content-header">
        <div className="header-text">
          <h1 className="content-title">{t.account.settings.title}</h1>
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">{t.account.settings.preferences}</h3>
        
        <div className="settings-row">
          <span className="settings-label">{t.account.settings.language}</span>
          <select className="settings-select">
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-label">{t.account.settings.playbackSpeed}</span>
          <select className="settings-select">
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-label">{t.account.settings.autoplay}</span>
          <input type="checkbox" className="toggle-input" defaultChecked />
        </div>

        <div className="settings-row">
          <span className="settings-label">{t.account.settings.notifications}</span>
          <input type="checkbox" className="toggle-input" defaultChecked />
        </div>
      </div>
    </>
  )

  const renderFavoritesContent = () => (
    <>
      <div className="content-header">
        <div className="header-text">
          <h1 className="content-title">{t.account.nav.favorites}</h1>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❤️</div>
          <p className="empty-text">{t.account.favorites.emptyTitle}</p>
          <p className="empty-subtext">{t.account.favorites.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            {t.account.favorites.exploreSeries}
          </button>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map((item) => (
            <div
              key={item.id}
              className="favorite-card"
              onClick={() => handleFavoriteClick(item.id)}
            >
              <div className="favorite-poster-container">
                <img src={item.poster} alt={item.title} className="favorite-poster" />
                <button
                  className="favorite-remove-btn"
                  onClick={(e) => handleRemoveFavorite(e, item.id)}
                  title={t.player.removeFromFavorites}
                >
                  ✕
                </button>
              </div>
              <h3 className="favorite-title">{item.title}</h3>
              <span className="favorite-tag">{item.tag}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )

  const renderDownloadsContent = () => (
    <>
      <div className="content-header">
        <div className="header-text">
          <h1 className="content-title">{t.account.nav.downloads}</h1>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleClearDownloads}>{t.account.downloads.clearAll}</button>
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⬇️</div>
          <p className="empty-text">{t.account.downloads.emptyTitle}</p>
          <p className="empty-subtext">{t.account.downloads.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            {t.account.downloads.exploreSeries}
          </button>
        </div>
      ) : (
        <div className="downloads-grid">
          {downloads.map((item) => (
            <div
              key={`${item.seriesId}-${item.episodeNumber}`}
              className="download-card"
              onClick={() => handleDownloadClick(item.seriesId, item.episodeNumber)}
            >
              <div className="download-poster-container">
                <img src={item.poster} alt={item.seriesTitle} className="download-poster" />
                <button
                  className="download-remove-btn"
                  onClick={(e) => handleRemoveDownload(e, item.seriesId, item.episodeNumber)}
                  title={t.player.download}
                >
                  ✕
                </button>
                <div className="download-episode-badge">EP {item.episodeNumber}</div>
              </div>
              <div className="download-info">
                <h3 className="download-title">{item.seriesTitle}</h3>
                <span className="download-episode">{t.account.downloads.episode} {item.episodeNumber}</span>
                {item.fileSize && <span className="download-size">{item.fileSize}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  const renderWalletContent = () => (
    <>
      <div className="content-header">
        <div className="header-text">
          <h1 className="content-title">{t.account.wallet.title}</h1>
          <p className="content-subtitle">{t.account.wallet.subtitle}</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="section-card wallet-balance-card">
        <div className="wallet-balance-content">
          <div className="wallet-icon">💰</div>
          <div className="wallet-balance-info">
            <span className="wallet-balance-label">{t.account.wallet.currentBalance}</span>
            <span className="wallet-balance-amount">
              <img src={gcashLogoUrl} alt="GCash" className="currency-logo" />
              {walletBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Up Section */}
      <div className="section-card">
        <h3 className="section-title">{t.account.wallet.topUp}</h3>
        <p className="topup-description">{t.account.wallet.topUpDescription}</p>
        
        <div className="topup-grid">
          {topUpAmounts.map((amount) => (
            <button
              key={amount}
              className="topup-amount-btn"
              onClick={() => handleTopUpSelect(amount)}
            >
              <img src={gcashLogoUrl} alt="GCash" className="topup-currency-logo" />
              <span className="topup-value">{amount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="section-card">
        <h3 className="section-title">{t.account.wallet.transactionHistory}</h3>
        <p className="empty-message">{t.account.wallet.noTransactions}</p>
      </div>
    </>
  )

  const renderContent = () => {
    switch (activeNav) {
      case 'overview':
        return renderOverviewContent()
      case 'watchHistory':
        return renderWatchHistoryContent()
      case 'settings':
        return renderSettingsContent()
      case 'favorites':
        return renderFavoritesContent()
      case 'downloads':
        return renderDownloadsContent()
      case 'wallet':
        return renderWalletContent()
      default:
        return renderOverviewContent()
    }
  }

  return (
    <div className="account-page">
      <TopBar />
      <main className="account-main">
        {/* Account Sidebar */}
        <aside className="account-sidebar">
          <div className="sidebar-profile">
            <div className="profile-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="sidebar-avatar-image" />
              ) : (
                <span>👤</span>
              )}
            </div>
            <div className="profile-info">
              <span className="profile-name">{nickname}</span>
              <span className="profile-email-small">{email}</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${activeNav === item.key ? 'active' : ''}`}
                onClick={() => handleNavClick(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
            <button className="nav-item logout-item" onClick={handleLogout}>
              <span className="nav-icon">🚪</span>
              <span className="nav-label">{t.account.nav.logout}</span>
            </button>
          </nav>
        </aside>

        {/* Account Content Panel */}
        <div className="account-content">
          {renderContent()}
        </div>
      </main>
      <BottomBar />

      {/* Top Up Confirmation Popup */}
      {showTopUpConfirm && selectedTopUpAmount && (
        <div className="topup-popup-overlay" onClick={handleCancelTopUp}>
          <div className="topup-popup" onClick={(e) => e.stopPropagation()}>
            <img src={gcashLogoUrl} alt="GCash" className="topup-popup-logo" />
            <h3 className="topup-popup-title">{t.account.wallet.confirmTopUp}</h3>
            <p className="topup-popup-message">
              {t.account.wallet.addToWallet}
            </p>
            <div className="topup-popup-amount">
              <img src={gcashLogoUrl} alt="GCash" className="popup-amount-logo" />
              {selectedTopUpAmount}.00
            </div>
            <div className="topup-popup-buttons">
              <button className="topup-popup-btn topup-popup-btn-yes" onClick={handleConfirmTopUp}>
                {t.account.wallet.confirm}
              </button>
              <button className="topup-popup-btn topup-popup-btn-no" onClick={handleCancelTopUp}>
                {t.account.wallet.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleLoginClose}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}

export default Account