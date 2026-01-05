import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import { useLanguage } from '../context/LanguageContext'
import { apiGet, apiPost } from '../utils/api'
import type { WatchHistoryItem, FavoriteItem, User, Series } from '../types'
import './Account.css'

type AccountTab =
  | 'overview'
  | 'watchHistory'
  | 'favorites'
  | 'settings'
  | 'wallet'

const navItems: { key: AccountTab; icon: string }[] = [
  { key: 'overview', icon: '👤' },
  { key: 'watchHistory', icon: '📺' },
  { key: 'favorites', icon: '❤️' },
  { key: 'settings', icon: '⚙️' },
  { key: 'wallet', icon: '💰' },
]

interface ProfileForm {
  nickname: string
  email: string
  phone: string
  gender: string
  birthday: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const Account: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<AccountTab>('overview')
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    nickname: '',
    email: '',
    phone: '',
    gender: '',
    birthday: '',
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Settings state
  const [playbackSpeed, setPlaybackSpeed] = useState('1')
  const [autoplay, setAutoplay] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [syncHistory, setSyncHistory] = useState(true)

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletAction, setWalletAction] = useState<'topup' | 'withdraw'>('topup')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [transactions, setTransactions] = useState<{ type: 'topup' | 'withdraw'; amount: number; date: string }[]>([])

  const walletAmounts = [10, 20, 50, 100, 200, 500]

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && navItems.some((item) => item.key === tab)) {
      setActiveTab(tab as AccountTab)
    }
  }, [searchParams])

  useEffect(() => {
    // Check if user is logged in and load user data from localStorage
    const checkAuth = () => {
      const storedUser = localStorage.getItem('gcashtv-user')
      if (!storedUser) {
        setIsLoggedIn(false)
        setShowLoginModal(true)
      } else {
        setIsLoggedIn(true)
        // Load user data from localStorage
        try {
          const userData = JSON.parse(storedUser)
          // Use nickname first, then username, to ensure registration nickname is used
          const displayName = userData.nickname || userData.username || ''
          setUser({
            _id: userData._id || '',
            username: displayName,
            email: userData.email || '',
            avatar: userData.avatar,
            isLoggedIn: true,
          })
          setProfileForm({
            nickname: displayName,
            email: userData.email || '',
            phone: userData.phone || '',
            gender: userData.gender || '',
            birthday: userData.birthday || '',
          })
        } catch (e) {
          console.error('Error parsing user data:', e)
        }
      }
    }
    checkAuth()
    fetchUserData()
    loadWalletBalance()
  }, [])

  const loadWalletBalance = () => {
    const stored = localStorage.getItem('gcashtv-wallet-balance')
    if (stored) {
      setWalletBalance(parseFloat(stored))
    }
  }

  const saveWalletBalance = (balance: number) => {
    localStorage.setItem('gcashtv-wallet-balance', balance.toString())
    setWalletBalance(balance)
  }

  const fetchUserData = async () => {
    try {
      // Load watch history from localStorage
      const storedHistory = localStorage.getItem('gcashtv-watch-history')
      if (storedHistory) {
        try {
          const historyData = JSON.parse(storedHistory)
          setWatchHistory(historyData)
        } catch {
          setWatchHistory([])
        }
      }
      
      // Load favorites from localStorage
      const storedFavorites = localStorage.getItem('gcashtv-favorites')
      if (storedFavorites) {
        try {
          const favoritesData = JSON.parse(storedFavorites)
          setFavorites(favoritesData)
        } catch {
          setFavorites([])
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTabClick = (tab: AccountTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleLogout = () => {
    localStorage.removeItem('gcashtv-user')
    setIsLoggedIn(false)
    navigate('/')
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    setIsLoggedIn(true)
    // Reload user data from localStorage after successful login
    const storedUser = localStorage.getItem('gcashtv-user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        // Use nickname first, then username, to ensure registration nickname is used
        const displayName = userData.nickname || userData.username || ''
        setUser({
          _id: userData._id || '',
          username: displayName,
          email: userData.email || '',
          avatar: userData.avatar,
          isLoggedIn: true,
        })
        setProfileForm({
          nickname: displayName,
          email: userData.email || '',
          phone: userData.phone || '',
          gender: userData.gender || '',
          birthday: userData.birthday || '',
        })
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
    fetchUserData()
  }

  const handleLoginClose = () => {
    setShowLoginModal(false)
    if (!isLoggedIn) {
      navigate('/')
    }
  }

  const handleHistoryItemClick = (item: WatchHistoryItem) => {
    // Navigate to player with series and episode
    navigate(`/player/${item.seriesId}/${item.episodeNumber}`)
  }

  const handleRemoveFromHistory = (e: React.MouseEvent, seriesId: string) => {
    e.stopPropagation()
    const updatedHistory = watchHistory.filter(item => item.seriesId !== seriesId)
    setWatchHistory(updatedHistory)
    localStorage.setItem('gcashtv-watch-history', JSON.stringify(updatedHistory))
  }

  const handleClearHistory = () => {
    setWatchHistory([])
    localStorage.removeItem('gcashtv-watch-history')
  }

  const handleRemoveFavorite = (e: React.MouseEvent, seriesId: string) => {
    e.stopPropagation()
    const updatedFavorites = favorites.filter(item => item.seriesId !== seriesId)
    setFavorites(updatedFavorites)
    localStorage.setItem('gcashtv-favorites', JSON.stringify(updatedFavorites))
  }

  const handleProfileSave = async () => {
    try {
      await apiPost('updateProfile', { ...profileForm })
      // Update local user state
      if (user) {
        setUser({ ...user, username: profileForm.nickname, email: profileForm.email })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Handle upload - in real app, upload to server
      const reader = new FileReader()
      reader.onload = (event) => {
        if (user && event.target?.result) {
          setUser({ ...user, avatar: event.target.result as string })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    if (user) {
      setUser({ ...user, avatar: undefined })
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match')
      return
    }
    try {
      await apiPost('changePassword', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      alert('Password changed successfully')
    } catch (error) {
      console.error('Error changing password:', error)
    }
  }

  const handleAmountClick = (amount: number) => {
    setSelectedAmount(amount)
    setShowWalletPopup(true)
  }

  const handleConfirmWalletAction = () => {
    if (selectedAmount) {
      let newBalance: number
      const newTransaction = {
        type: walletAction,
        amount: selectedAmount,
        date: new Date().toLocaleDateString(),
      }
      
      if (walletAction === 'topup') {
        newBalance = walletBalance + selectedAmount
      } else {
        // Withdraw
        if (selectedAmount > walletBalance) {
          alert('Insufficient balance')
          return
        }
        newBalance = walletBalance - selectedAmount
      }
      
      saveWalletBalance(newBalance)
      setTransactions([newTransaction, ...transactions])
      setShowWalletPopup(false)
      setSelectedAmount(null)
    }
  }

  const renderSidebarNav = () => (
    <nav className="account-nav">
      {navItems.map((item) => (
        <button
          key={item.key}
          className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
          onClick={() => handleTabClick(item.key)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{t.account.nav[item.key]}</span>
        </button>
      ))}
      <button className="nav-item logout" onClick={handleLogout}>
        <span className="nav-icon">🚪</span>
        <span className="nav-label">{t.account.nav.logout}</span>
      </button>
    </nav>
  )

  const renderOverview = () => (
    <div className="account-overview">
      <div className="section-header">
        <h1 className="page-title">Account Overview</h1>
        <p className="page-subtitle">Manage your profile and preferences</p>
      </div>

      {/* Profile Information Section */}
      <div className="section-card">
        <h3 className="section-card-title">Profile Information</h3>
        <div className="profile-form">
          <div className="form-group">
            <label className="form-label">Nickname</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your nickname"
              value={profileForm.nickname}
              onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="Enter your phone number"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select
              className="form-input"
              value={profileForm.gender}
              onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Birthday</label>
            <input
              type="date"
              className="form-input"
              value={profileForm.birthday}
              onChange={(e) => setProfileForm({ ...profileForm, birthday: e.target.value })}
            />
          </div>
          <button className="btn-primary" onClick={handleProfileSave}>
            Save Changes
          </button>
        </div>
      </div>

      {/* Profile Picture Section */}
      <div className="section-card">
        <h3 className="section-card-title">Profile Picture</h3>
        <div className="avatar-section">
          <div className="current-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder-large">👤</div>
            )}
          </div>
          <div className="avatar-actions">
            <label className="btn-primary avatar-upload-btn">
              Upload New Avatar
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </label>
            {user?.avatar && (
              <button className="btn-danger" onClick={handleRemoveAvatar}>
                Remove Avatar
              </button>
            )}
          </div>
          <p className="avatar-hint">
            Recommended: Square image, at least 200x200px. Max size: 5MB
          </p>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="section-card">
        <h3 className="section-card-title">Change Password</h3>
        <div className="password-form">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter current password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter new password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
          </div>
          <button className="btn-primary" onClick={handlePasswordChange}>
            Change Password
          </button>
        </div>
      </div>
    </div>
  )

  const renderWatchHistory = () => (
    <div className="watch-history-page">
      <div className="section-header-row">
        <h1 className="page-title">Watch History</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleClearHistory}>
            Clear History
          </button>
          <label className="toggle-label">
            <span>Sync History</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={syncHistory}
                onChange={(e) => setSyncHistory(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </label>
        </div>
      </div>

      {watchHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📺</div>
          <h3 className="empty-title">No watch history yet</h3>
          <p className="empty-subtext">Start watching to build your history</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Explore Series
          </button>
        </div>
      ) : (
        <div className="content-grid">
          {watchHistory.map((item) => (
            <div
              key={item._id}
              className="history-card"
              onClick={() => handleHistoryItemClick(item)}
            >
              <div className="card-poster">
                <img src={item.thumbnail} alt={item.seriesTitle} />
                <div className="episode-badge">EP {item.episodeNumber}</div>
                <button
                  className="remove-btn"
                  onClick={(e) => handleRemoveFromHistory(e, item.seriesId)}
                >
                  ✕
                </button>
              </div>
              <div className="card-info">
                <h4 className="card-title">{item.seriesTitle}</h4>
                <span className="card-tag">{item.tag || 'Drama'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderFavorites = () => (
    <div className="favorites-page">
      <div className="section-header-row">
        <h1 className="page-title">Favorites</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❤️</div>
          <h3 className="empty-title">No favorites yet</h3>
          <p className="empty-subtext">Add series to your favorites to see them here</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Explore Series
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
              <div className="card-poster">
                <img src={item.thumbnail} alt={item.seriesTitle} />
                <button
                  className="remove-btn"
                  onClick={(e) => handleRemoveFavorite(e, item.seriesId)}
                >
                  ✕
                </button>
              </div>
              <div className="card-info">
                <h4 className="card-title">{item.seriesTitle}</h4>
                <span className="card-tag">{item.tag || 'Drama'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSettings = () => (
    <div className="settings-page">
      <h1 className="page-title">Settings</h1>

      <div className="section-card">
        <h3 className="section-card-title">Preferences</h3>
        <div className="settings-section">
          <div className="setting-row">
            <label className="setting-label">Language</label>
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
            <label className="setting-label">Playback Speed</label>
            <select
              className="setting-control"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(e.target.value)}
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          <div className="setting-row">
            <label className="setting-label">Autoplay</label>
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
            <label className="setting-label">Notifications</label>
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
    </div>
  )

  const GCASH_LOGO = 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png'

  const renderWallet = () => (
    <div className="wallet-page">
      <div className="section-header">
        <h1 className="page-title">{t.account.wallet.title}</h1>
        <p className="page-subtitle">Manage your GCash balance</p>
      </div>

      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-icon">💰</div>
        <div className="balance-info">
          <span className="balance-label">{t.account.wallet.balance}</span>
          <div className="balance-amount">
            <img src={GCASH_LOGO} alt="GCash" className="gcash-logo" />
            <span className="amount-value">{walletBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Toggle Buttons */}
      <div className="wallet-actions">
        <button
          className={`wallet-action-btn ${walletAction === 'topup' ? 'active' : ''}`}
          onClick={() => setWalletAction('topup')}
        >
          {t.account.wallet.topUp}
        </button>
        <button
          className={`wallet-action-btn ${walletAction === 'withdraw' ? 'active' : ''}`}
          onClick={() => setWalletAction('withdraw')}
        >
          {t.account.wallet.withdraw}
        </button>
      </div>

      {/* Amount Selection Section */}
      <div className="section-card">
        <h3 className="section-card-title">
          {walletAction === 'topup' ? t.account.wallet.topUpTitle : t.account.wallet.withdrawTitle}
        </h3>
        <p className="topup-description">
          {walletAction === 'topup'
            ? 'Select an amount to add to your wallet'
            : 'Select an amount to withdraw from your wallet'}
        </p>
        <div className="topup-grid">
          {walletAmounts.map((amount) => (
            <button
              key={amount}
              className="topup-btn"
              onClick={() => handleAmountClick(amount)}
            >
              <img src={GCASH_LOGO} alt="GCash" className="topup-logo" />
              <span className="topup-amount">{amount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="section-card">
        <h3 className="section-card-title">{t.account.wallet.transactionHistory}</h3>
        {transactions.length === 0 ? (
          <p className="empty-text">{t.account.wallet.noTransactions}</p>
        ) : (
          <div className="transaction-list">
            {transactions.map((tx, index) => (
              <div key={index} className={`transaction-item ${tx.type}`}>
                <div className="transaction-info">
                  <span className="transaction-type">
                    {tx.type === 'topup' ? 'Top up' : 'Withdraw'} {tx.amount}
                  </span>
                  <span className="transaction-date">{tx.date}</span>
                </div>
                <span className={`transaction-amount ${tx.type}`}>
                  {tx.type === 'topup' ? '+' : '-'}
                  <img src={GCASH_LOGO} alt="GCash" className="transaction-logo" />
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wallet Action Confirmation Popup */}
      {showWalletPopup && (
        <div className="popup-overlay" onClick={() => setShowWalletPopup(false)}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <img src={GCASH_LOGO} alt="GCash" className="popup-logo" />
            <h2 className="popup-title">
              {walletAction === 'topup' ? t.account.wallet.confirmTopUp : t.account.wallet.confirmWithdraw}
            </h2>
            <p className="popup-message">
              {walletAction === 'topup'
                ? t.account.wallet.confirmMessage
                : t.account.wallet.confirmWithdrawMessage}
            </p>
            <div className="popup-amount">
              <img src={GCASH_LOGO} alt="GCash" className="popup-amount-logo" />
              <span className="popup-amount-value">{selectedAmount}</span>
            </div>
            <div className="popup-buttons">
              <button className="btn-confirm" onClick={handleConfirmWalletAction}>
                {t.account.wallet.confirm}
              </button>
              <button className="btn-cancel" onClick={() => setShowWalletPopup(false)}>
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
      {showLoginModal && (
        <LoginModal onClose={handleLoginClose} onSuccess={handleLoginSuccess} />
      )}
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <div className="avatar-placeholder">👤</div>
              )}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-username">{user?.username || 'Guest'}</span>
              <span className="sidebar-email">{user?.email || ''}</span>
            </div>
          </div>
          {renderSidebarNav()}
        </aside>
        <main className="account-content">{renderContent()}</main>
      </div>
      <BottomBar />
    </div>
  )
}

export default Account
