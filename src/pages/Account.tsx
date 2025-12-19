import React, { useState } from 'react'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import Card from '../components/Card'
import { useLanguage } from '../context/LanguageContext'
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

interface WatchHistoryItem {
  id: string
  title: string
  episode: string
  thumbnail: string
}

interface FavoriteItem {
  id: string
  title: string
  thumbnail: string
}

const Account: React.FC = () => {
  const { t } = useLanguage()
  const [activeNav, setActiveNav] = useState<NavItem>('overview')

  // Mock data for demonstration
  const mockWatchHistory: WatchHistoryItem[] = [
    { id: '1', title: 'Drama Series A', episode: 'Episode 12', thumbnail: 'https://via.placeholder.com/80x60' },
    { id: '2', title: 'Action Movie B', episode: 'Episode 5', thumbnail: 'https://via.placeholder.com/80x60' },
    { id: '3', title: 'Comedy Show C', episode: 'Episode 8', thumbnail: 'https://via.placeholder.com/80x60' },
  ]

  const mockFavorites: FavoriteItem[] = [
    { id: '1', title: 'Favorite Series 1', thumbnail: 'https://via.placeholder.com/80x60' },
    { id: '2', title: 'Favorite Movie 2', thumbnail: 'https://via.placeholder.com/80x60' },
    { id: '3', title: 'Favorite Show 3', thumbnail: 'https://via.placeholder.com/80x60' },
  ]

  const navItems: { key: NavItem; icon: string; label: string }[] = [
    { key: 'overview', icon: '👤', label: t.account.nav.overview },
    { key: 'watchHistory', icon: '📺', label: t.account.nav.watchHistory },
    { key: 'favorites', icon: '❤️', label: t.account.nav.favorites },
    { key: 'downloads', icon: '⬇️', label: t.account.nav.downloads },
    { key: 'settings', icon: '⚙️', label: t.account.nav.settings },
    { key: 'wallet', icon: '💰', label: t.account.nav.wallet },
    { key: 'payment', icon: '💳', label: t.account.nav.payment },
    { key: 'membership', icon: '⭐', label: t.account.nav.membership },
  ]

  const handleNavClick = (navKey: NavItem) => {
    setActiveNav(navKey)
  }

  const handleLogout = () => {
    console.log('Logout clicked')
    // TODO: Implement logout logic
  }

  const handleEditProfile = () => {
    console.log('Edit profile clicked')
    // TODO: Implement edit profile logic
  }

  const handleChangeLanguage = () => {
    console.log('Change language clicked')
    // TODO: Implement language change logic
  }

  const handleResume = (itemId: string) => {
    console.log(`Resume item: ${itemId}`)
    // TODO: Navigate to player page
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

      {/* Profile Summary Card */}
      <div className="section-card profile-summary">
        <div className="profile-summary-content">
          <div className="profile-avatar-large">
            <span>👤</span>
          </div>
          <div className="profile-details">
            <h2 className="profile-display-name">John Doe</h2>
            <p className="profile-email">john.doe@example.com</p>
            <p className="profile-status">{t.account.overview.loggedIn}</p>
          </div>
          <div className="profile-actions">
            <button className="btn-primary" onClick={handleEditProfile}>
              {t.account.overview.editProfile}
            </button>
            <button className="btn-secondary" onClick={handleChangeLanguage}>
              {t.account.overview.changeLanguage}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title">{t.account.overview.recentActivity}</h3>
          <button className="link-button" onClick={() => setActiveNav('watchHistory')}>
            {t.account.overview.viewAll}
          </button>
        </div>
        <div className="activity-list">
          {mockWatchHistory.map((item) => (
            <div key={item.id} className="activity-row" onClick={() => handleResume(item.id)}>
              <img src={item.thumbnail} alt={item.title} className="activity-thumbnail" />
              <div className="activity-info">
                <span className="activity-title">{item.title}</span>
                <span className="activity-episode">{item.episode}</span>
              </div>
              <button className="resume-button" onClick={(e) => { e.stopPropagation(); handleResume(item.id); }}>
                ▶
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Favorites Preview Section */}
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title">{t.account.overview.savedFavorites}</h3>
          <button className="link-button" onClick={() => setActiveNav('favorites')}>
            {t.account.overview.viewAll}
          </button>
        </div>
        <div className="activity-list">
          {mockFavorites.map((item) => (
            <div key={item.id} className="activity-row">
              <img src={item.thumbnail} alt={item.title} className="activity-thumbnail" />
              <div className="activity-info">
                <span className="activity-title">{item.title}</span>
              </div>
            </div>
          ))}
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
          <button className="btn-secondary">{t.account.watchHistory.clearHistory}</button>
          <label className="toggle-label">
            <span>{t.account.watchHistory.syncHistory}</span>
            <input type="checkbox" className="toggle-input" />
          </label>
        </div>
      </div>

      {mockWatchHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📺</div>
          <p className="empty-text">{t.account.watchHistory.emptyTitle}</p>
          <p className="empty-subtext">{t.account.watchHistory.emptySubtext}</p>
          <button className="btn-primary">{t.account.watchHistory.exploreSeries}</button>
        </div>
      ) : (
        <div className="history-grid">
          {mockWatchHistory.map((item) => (
            <Card key={item.id} className="history-card" onClick={() => handleResume(item.id)}>
              <img src={item.thumbnail} alt={item.title} className="history-thumbnail" />
              <div className="history-info">
                <span className="history-title">{item.title}</span>
                <span className="history-episode">{item.episode}</span>
              </div>
              <button className="resume-button" onClick={(e) => { e.stopPropagation(); handleResume(item.id); }}>
                ▶
              </button>
            </Card>
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

  const renderPlaceholderContent = (title: string) => (
    <>
      <div className="content-header">
        <div className="header-text">
          <h1 className="content-title">{title}</h1>
        </div>
      </div>
      <div className="section-card">
        <p className="placeholder-text">{t.account.comingSoon}</p>
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
        return renderPlaceholderContent(t.account.nav.favorites)
      case 'downloads':
        return renderPlaceholderContent(t.account.nav.downloads)
      case 'wallet':
        return renderPlaceholderContent(t.account.nav.wallet)
      case 'payment':
        return renderPlaceholderContent(t.account.nav.payment)
      case 'membership':
        return renderPlaceholderContent(t.account.nav.membership)
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
              <span>👤</span>
            </div>
            <div className="profile-info">
              <span className="profile-name">John Doe</span>
              <span className="profile-email-small">john.doe@example.com</span>
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
          </nav>

          <button className="nav-item logout-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">{t.account.nav.logout}</span>
          </button>
        </aside>

        {/* Account Content Panel */}
        <div className="account-content">
          {renderContent()}
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default Account