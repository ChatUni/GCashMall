import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import LoginModal from '../components/LoginModal'
import SeriesCard from '../components/SeriesCard'
import { useLanguage } from '../context/LanguageContext'
import type { WatchHistoryItem, FavoriteItem, Series } from '../types'
import './Account.css'

type AccountTab = 'overview' | 'watchHistory' | 'favorites' | 'settings' | 'wallet'

interface LocalUser {
  _id: string
  username: string
  email: string
  nickname?: string
  avatar?: string
  phone?: string
  gender?: string
  birthday?: string
}

interface Transaction {
  id: string
  type: 'topup' | 'withdraw' | 'purchase'
  amount: number
  date: string
  description: string
}

type WalletAction = 'topup' | 'withdraw'

const navItems: { key: AccountTab; icon: string }[] = [
  { key: 'overview', icon: '👤' },
  { key: 'watchHistory', icon: '📺' },
  { key: 'favorites', icon: '❤️' },
  { key: 'settings', icon: '⚙️' },
  { key: 'wallet', icon: '💰' },
]

const topUpAmounts = [10, 20, 50, 100, 200, 500]

const GCASH_LOGO = 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png'

// Currency icon component to replace ₱ with G logo
const CurrencyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <img
    src={GCASH_LOGO}
    alt="G"
    className={`currency-icon ${className}`}
    style={{ width: size, height: size, verticalAlign: 'middle', display: 'inline-block' }}
  />
)

const Account: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<AccountTab>('overview')
  const [user, setUser] = useState<LocalUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  // Settings state
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0')
  const [autoplay, setAutoplay] = useState(true)
  const [notifications, setNotifications] = useState(true)

  // Profile edit state
  const [editNickname, setEditNickname] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editBirthday, setEditBirthday] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [walletAction, setWalletAction] = useState<WalletAction>('topup')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)

  // Check URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && navItems.some((item) => item.key === tab)) {
      setActiveTab(tab as AccountTab)
    }
  }, [searchParams])

  // Check login status on mount
  useEffect(() => {
    checkLoginStatus()
  }, [])

  const checkLoginStatus = () => {
    const storedUser = localStorage.getItem('gcashtv-user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser) as LocalUser
        setUser(userData)
        loadUserData(userData)
        initializeEditFields(userData)
      } catch {
        // Invalid stored data, show login
        setShowLoginModal(true)
      }
    } else {
      setShowLoginModal(true)
    }
    setLoading(false)
  }

  const initializeEditFields = (userData: LocalUser) => {
    setEditNickname(userData.nickname || userData.username || '')
    setEditEmail(userData.email || '')
    setEditPhone(userData.phone || '')
    setEditGender(userData.gender || '')
    setEditBirthday(userData.birthday || '')
    setAvatarPreview(userData.avatar || null)
  }

  const loadUserData = (userData: LocalUser) => {
    // Load watch history from localStorage
    const storedHistory = localStorage.getItem(`gcashtv-history-${userData._id}`)
    if (storedHistory) {
      try {
        setWatchHistory(JSON.parse(storedHistory))
      } catch {
        setWatchHistory([])
      }
    }

    // Load favorites from localStorage
    const storedFavorites = localStorage.getItem(`gcashtv-favorites-${userData._id}`)
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites))
      } catch {
        setFavorites([])
      }
    }

    // Load wallet balance from localStorage
    const storedBalance = localStorage.getItem(`gcashtv-wallet-${userData._id}`)
    if (storedBalance) {
      setWalletBalance(parseFloat(storedBalance) || 0)
    }

    // Load transactions from localStorage
    const storedTransactions = localStorage.getItem(`gcashtv-transactions-${userData._id}`)
    if (storedTransactions) {
      try {
        setTransactions(JSON.parse(storedTransactions))
      } catch {
        setTransactions([])
      }
    }
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    checkLoginStatus()
  }

  const handleLoginClose = () => {
    setShowLoginModal(false)
    // Redirect to home if user closes login without logging in
    if (!user) {
      navigate('/')
    }
  }

  const handleTabClick = (tab: AccountTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleLogout = () => {
    localStorage.removeItem('gcashtv-user')
    setUser(null)
    navigate('/')
  }

  const handleHistoryItemClick = (item: WatchHistoryItem) => {
    navigate(`/series/${item.seriesId}?episode=${item.episodeId}`)
  }

  const handleRemoveHistoryItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    const updatedHistory = watchHistory.filter((item) => item._id !== itemId)
    setWatchHistory(updatedHistory)
    localStorage.setItem(`gcashtv-history-${user._id}`, JSON.stringify(updatedHistory))
  }

  const handleClearHistory = () => {
    if (!user) return
    setWatchHistory([])
    localStorage.setItem(`gcashtv-history-${user._id}`, JSON.stringify([]))
  }

  const handleRemoveFavorite = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    const updatedFavorites = favorites.filter((item) => item._id !== itemId)
    setFavorites(updatedFavorites)
    localStorage.setItem(`gcashtv-favorites-${user._id}`, JSON.stringify(updatedFavorites))
  }

  const handleSaveProfile = () => {
    if (!user) return
    const updatedUser: LocalUser = {
      ...user,
      nickname: editNickname,
      email: editEmail,
      phone: editPhone,
      gender: editGender,
      birthday: editBirthday,
      avatar: avatarPreview || undefined,
    }
    localStorage.setItem('gcashtv-user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleChangePassword = () => {
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmNewPassword) {
      alert('Passwords do not match')
      return
    }
    // In a real app, this would call an API
    alert('Password updated successfully')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
  }

  const handleWalletAction = (action: WalletAction, amount: number) => {
    setWalletAction(action)
    setSelectedAmount(amount)
    setShowWalletModal(true)
  }

  const confirmWalletAction = () => {
    if (!user || !selectedAmount) return
    
    if (walletAction === 'withdraw' && selectedAmount > walletBalance) {
      alert('Insufficient balance')
      return
    }

    const newBalance = walletAction === 'topup'
      ? walletBalance + selectedAmount
      : walletBalance - selectedAmount
    setWalletBalance(newBalance)
    localStorage.setItem(`gcashtv-wallet-${user._id}`, newBalance.toString())

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: walletAction,
      amount: selectedAmount,
      date: new Date().toISOString(),
      description: walletAction === 'topup'
        ? `Top up ${selectedAmount}`
        : `Withdraw ${selectedAmount}`,
    }
    const updatedTransactions = [newTransaction, ...transactions]
    setTransactions(updatedTransactions)
    localStorage.setItem(`gcashtv-transactions-${user._id}`, JSON.stringify(updatedTransactions))

    setShowWalletModal(false)
    setSelectedAmount(null)
  }

  const getDisplayName = () => {
    if (!user) return 'Guest'
    return user.nickname || user.username || 'Guest'
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
        <h1 className="page-title">{t.account.overview.title}</h1>
        <p className="page-subtitle">{t.account.overview.subtitle}</p>
      </div>

      {/* Profile Information Section */}
      <section className="profile-section">
        <h3 className="section-title">{t.account.overview.profileInfo}</h3>
        <div className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t.account.overview.nickname}</label>
              <input
                type="text"
                className="form-input"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t.account.overview.email}</label>
              <input
                type="email"
                className="form-input"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t.account.overview.phone}</label>
              <input
                type="tel"
                className="form-input"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t.account.overview.gender}</label>
              <select
                className="form-input"
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
              >
                <option value="">--</option>
                <option value="male">{t.account.overview.male}</option>
                <option value="female">{t.account.overview.female}</option>
                <option value="other">{t.account.overview.other}</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t.account.overview.birthday}</label>
              <input
                type="date"
                className="form-input"
                value={editBirthday}
                onChange={(e) => setEditBirthday(e.target.value)}
              />
            </div>
          </div>
          <button className="btn-primary" onClick={handleSaveProfile}>
            {t.account.overview.save}
          </button>
        </div>
      </section>

      {/* Profile Picture Section */}
      <section className="profile-section">
        <h3 className="section-title">{t.account.overview.profilePicture}</h3>
        <div className="avatar-upload-section">
          <div className="avatar-preview-large">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" />
            ) : (
              <div className="avatar-placeholder-large">👤</div>
            )}
          </div>
          <div className="avatar-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            <button
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              {t.account.overview.uploadImage}
            </button>
            {avatarPreview && (
              <button className="btn-danger" onClick={handleRemoveAvatar}>
                {t.account.overview.removeImage}
              </button>
            )}
            <p className="avatar-guidelines">{t.account.overview.imageGuidelines}</p>
          </div>
        </div>
      </section>

      {/* Change Password Section */}
      <section className="profile-section">
        <h3 className="section-title">{t.account.overview.changePassword}</h3>
        <div className="password-form">
          <div className="form-group">
            <label className="form-label">{t.account.overview.currentPassword}</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t.account.overview.newPassword}</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t.account.overview.confirmNewPassword}</label>
            <input
              type="password"
              className="form-input"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handleChangePassword}>
            {t.account.overview.updatePassword}
          </button>
        </div>
      </section>
    </div>
  )

  const renderWatchHistory = () => (
    <div className="watch-history-page">
      <div className="section-header-row">
        <h1 className="page-title">{t.account.watchHistory.title}</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleClearHistory}>
            {t.account.watchHistory.clearHistory}
          </button>
          <label className="toggle-label">
            <span>{t.account.watchHistory.syncHistory}</span>
            <input type="checkbox" defaultChecked />
          </label>
        </div>
      </div>

      {watchHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{t.account.watchHistory.emptyIcon}</div>
          <h3 className="empty-title">{t.account.watchHistory.emptyTitle}</h3>
          <p className="empty-subtext">{t.account.watchHistory.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            {t.account.watchHistory.exploreButton}
          </button>
        </div>
      ) : (
        <div className="history-grid">
          {watchHistory.map((item) => (
            <div
              key={item._id}
              className="history-card"
              onClick={() => handleHistoryItemClick(item)}
            >
              <div className="history-card-image">
                <img src={item.thumbnail} alt={item.seriesTitle} />
                <span className="episode-badge">EP {item.episodeNumber}</span>
                <button
                  className="remove-btn"
                  onClick={(e) => handleRemoveHistoryItem(item._id, e)}
                >
                  ✕
                </button>
              </div>
              <div className="history-card-info">
                <span className="history-card-title">{item.seriesTitle}</span>
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
        <h1 className="page-title">{t.account.favorites.title}</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❤️</div>
          <h3 className="empty-title">{t.account.favorites.emptyTitle}</h3>
          <p className="empty-subtext">{t.account.favorites.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            {t.account.favorites.exploreButton}
          </button>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map((item) => (
            <div
              key={item._id}
              className="favorite-card"
              onClick={() => navigate(`/series/${item.seriesId}`)}
            >
              <div className="favorite-card-image">
                <img src={item.thumbnail} alt={item.seriesTitle} />
                <button
                  className="remove-btn"
                  onClick={(e) => handleRemoveFavorite(item._id, e)}
                >
                  ✕
                </button>
              </div>
              <div className="favorite-card-info">
                <span className="favorite-card-title">{item.seriesTitle}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSettings = () => (
    <div className="settings-page">
      <h1 className="page-title">{t.account.settings.preferences}</h1>

      <div className="settings-section">
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
            <option value="0.5">0.5x</option>
            <option value="1.0">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
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
    <div className="wallet-page">
      <h1 className="page-title">{t.account.wallet.title}</h1>

      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-card-content">
          <span className="balance-label">{t.account.wallet.balance}</span>
          <span className="balance-amount">
            <CurrencyIcon size={36} className="balance-currency" />
            {walletBalance.toFixed(2)}
          </span>
        </div>
        <div className="balance-card-logo">💰</div>
      </div>

      {/* Action Buttons */}
      <div className="wallet-action-buttons">
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
      <section className="wallet-section">
        <h3 className="section-title">
          {walletAction === 'topup' ? t.account.wallet.topUpTitle : t.account.wallet.withdrawTitle}
        </h3>
        <div className="topup-grid">
          {topUpAmounts.map((amount) => (
            <button
              key={amount}
              className="topup-option"
              onClick={() => handleWalletAction(walletAction, amount)}
            >
              <CurrencyIcon size={20} />{amount}
            </button>
          ))}
        </div>
      </section>

      {/* Transaction History */}
      <section className="wallet-section">
        <h3 className="section-title">{t.account.wallet.transactionHistory}</h3>
        {transactions.length === 0 ? (
          <p className="empty-text">{t.account.wallet.noTransactions}</p>
        ) : (
          <div className="transaction-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="transaction-item">
                <div className="transaction-info">
                  <span className="transaction-desc">{tx.description}</span>
                  <span className="transaction-date">
                    {new Date(tx.date).toLocaleDateString()}
                  </span>
                </div>
                <span className={`transaction-amount ${tx.type}`}>
                  {tx.type === 'topup' ? '+' : '-'}<CurrencyIcon size={16} />{tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Wallet Action Confirmation Modal */}
      {showWalletModal && (
        <div className="topup-modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="topup-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="topup-modal-title">
              {walletAction === 'topup' ? t.account.wallet.confirmTopUp : t.account.wallet.confirmWithdraw}
            </h3>
            <p className="topup-modal-message">
              <span>{walletAction === 'topup' ? t.account.wallet.confirmMessage : t.account.wallet.confirmWithdrawMessage}</span>
              <CurrencyIcon size={18} />
              <span>{selectedAmount}?</span>
            </p>
            <div className="topup-modal-actions">
              <button className="btn-secondary" onClick={() => setShowWalletModal(false)}>
                {t.account.wallet.cancel}
              </button>
              <button className="btn-primary" onClick={confirmWalletAction}>
                {t.account.wallet.confirm}
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
        <LoginModal onClose={handleLoginClose} onLoginSuccess={handleLoginSuccess} />
      )}
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={getDisplayName()} />
              ) : (
                <div className="avatar-placeholder">👤</div>
              )}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-username">{getDisplayName()}</span>
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
