import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import './PhoneNavBar.css'

interface NavItem {
  key: string
  path: string
  icon: React.ReactNode
  activeIcon: React.ReactNode
}

const PhoneNavBar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const navItems: NavItem[] = [
    {
      key: 'home',
      path: '/',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
    },
    {
      key: 'genre',
      path: '/genre',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      key: 'account',
      path: '/account',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ]

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const getLabel = (key: string): string => {
    const labels: Record<string, string> = {
      home: t.topBar?.home || 'Home',
      genre: t.topBar?.genre || 'Genre',
      account: 'Account',
    }
    return labels[key] || key
  }

  return (
    <nav className="phone-nav-bar">
      {navItems.map((item) => (
        <button
          key={item.key}
          className={`phone-nav-item ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => handleNavClick(item.path)}
        >
          <span className="phone-nav-icon">
            {isActive(item.path) ? item.activeIcon : item.icon}
          </span>
          <span className="phone-nav-label">{getLabel(item.key)}</span>
        </button>
      ))}
    </nav>
  )
}

export default PhoneNavBar
