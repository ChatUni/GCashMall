import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import SeriesCard from '../components/SeriesCard'
import { useLanguage } from '../context/LanguageContext'
import { apiGet, apiPost } from '../utils/api'
import type { WatchHistoryItem, FavoriteItem, User, Series } from '../types'
import './Account.css'

type AccountTab =
  | 'accountOverview'
  | 'watchHistory'
  | 'favorites'
  | 'downloads'
  | 'settings'
  | 'wallet'
  | 'payment'
  | 'membership'

const navItems: { key: AccountTab; icon: string }[] = [
  { key: 'accountOverview', icon: '👤' },
  { key: 'watchHistory', icon: '🕐' },
  { key: 'favorites', icon: '❤️' },
  { key: 'downloads', icon: '⬇️' },
  { key: 'settings', icon: '⚙️' },
  { key: 'wallet', icon: '💰' },
  { key: 'payment', icon: '💳' },
  { key: 'membership', icon: '⭐' },
]

const Account: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<AccountTab>('accountOverview')
  const [user, setUser] = useState<User | null>(null)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [recentSeries, setRecentSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)

  // Settings state
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0')
  const [autoplay, setAutoplay] = useState(true)
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && navItems.some((item) => item.key === tab)) {
      setActiveTab(tab as AccountTab)
    }
  }, [searchParams])

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const [userResponse, historyResponse, favoritesResponse] = await Promise.all([
        apiGet<User>('user'),
        apiGet<WatchHistoryItem[]>('watchHistory', { limit: 6 }),
        apiGet<FavoriteItem[]>('favorites', { limit: 6 }),
      ])

      if (userResponse.success && userResponse.data) setUser(userResponse.data)
      if (historyResponse.success && historyResponse.data) {
        setWatchHistory(historyResponse.data)
        // Convert history items to partial series for display
        const seriesData: Series[] = historyResponse.data.map((item: WatchHistoryItem) => ({
          _id: item.seriesId,
          id: 0,
          name: item.seriesTitle,
          cover: item.thumbnail,
          description: '',
          genre: [],
        }))
        setRecentSeries(seriesData)
      }
      if (favoritesResponse.success && favoritesResponse.data) setFavorites(favoritesResponse.data)
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
    // Handle logout
    navigate('/')
  }

  const handleHistoryItemClick = (item: WatchHistoryItem) => {
    navigate(`/series/${item.seriesId}?episode=${item.episodeId}`)
  }

  const handleClearHistory = async () => {
    try {
      await apiPost('clearWatchHistory', {})
      setWatchHistory([])
      setRecentSeries([])
    } catch (error) {
      console.error('Error clearing history:', error)
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

  const renderAccountOverview = () => (
    <div className="account-overview">
      <div className="section-header">
        <h1 className="page-title">{t.account.pageTitle}</h1>
        <p className="page-subtitle">{t.account.subtitle}</p>
      </div>

      <div className="profile-summary-card">
        <div className="profile-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} />
          ) : (
            <div className="avatar-placeholder">
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{user?.username || 'Guest'}</h2>
          <p className="profile-email">{user?.email || ''}</p>
          <span className={`profile-status ${user?.isLoggedIn ? 'logged-in' : 'guest'}`}>
            {user?.isLoggedIn ? t.account.loggedIn : t.account.guest}
          </span>
        </div>
        <div className="profile-actions">
          <button className="btn-primary">{t.account.editProfile}</button>
          <button className="btn-secondary">{t.account.changeLanguage}</button>
        </div>
      </div>

      <section className="recent-activity-section">
        <div className="section-header-row">
          <h3 className="section-title">{t.account.recentActivity}</h3>
          <button
            className="view-all-link"
            onClick={() => handleTabClick('watchHistory')}
          >
            {t.account.viewAll}
          </button>
        </div>
        {watchHistory.length === 0 ? (
          <p className="empty-text">{t.account.watchHistory.emptyTitle}</p>
        ) : (
          <div className="activity-list">
            {watchHistory.slice(0, 3).map((item) => (
              <div
                key={item._id}
                className="activity-item"
                onClick={() => handleHistoryItemClick(item)}
              >
                <img
                  src={item.thumbnail}
                  alt={item.seriesTitle}
                  className="activity-thumbnail"
                />
                <div className="activity-info">
                  <span className="activity-title">{item.seriesTitle}</span>
                  <span className="activity-episode">EP {item.episodeNumber}</span>
                </div>
                <button className="resume-button" title={t.account.resume}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="favorites-preview-section">
        <div className="section-header-row">
          <h3 className="section-title">{t.account.savedFavorites}</h3>
          <button
            className="view-all-link"
            onClick={() => handleTabClick('favorites')}
          >
            {t.account.viewAll}
          </button>
        </div>
        {favorites.length === 0 ? (
          <p className="empty-text">No favorites yet</p>
        ) : (
          <div className="activity-list">
            {favorites.slice(0, 3).map((item) => (
              <div
                key={item._id}
                className="activity-item"
                onClick={() => navigate(`/series/${item.seriesId}`)}
              >
                <img
                  src={item.thumbnail}
                  alt={item.seriesTitle}
                  className="activity-thumbnail"
                />
                <div className="activity-info">
                  <span className="activity-title">{item.seriesTitle}</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
          <div className="empty-icon">🕐</div>
          <h3 className="empty-title">{t.account.watchHistory.emptyTitle}</h3>
          <p className="empty-subtext">{t.account.watchHistory.emptySubtext}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            {t.account.watchHistory.exploreButton}
          </button>
        </div>
      ) : (
        <div className="history-grid">
          {recentSeries.map((series) => (
            <SeriesCard key={series._id} series={series as Series} />
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

  const renderContent = () => {
    switch (activeTab) {
      case 'accountOverview':
        return renderAccountOverview()
      case 'watchHistory':
        return renderWatchHistory()
      case 'settings':
        return renderSettings()
      default:
        return (
          <div className="coming-soon">
            <h2>Coming Soon</h2>
            <p>This feature is under development.</p>
          </div>
        )
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
        <aside className="account-sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <div className="avatar-placeholder">
                  {user?.username?.charAt(0).toUpperCase() || '?'}
                </div>
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