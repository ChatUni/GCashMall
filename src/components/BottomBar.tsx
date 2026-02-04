import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './BottomBar.css'

const BottomBar: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const bottomBar = t.bottomBar as Record<string, string>

  const handleAboutClick = () => {
    navigate('/about')
  }

  const handleContactClick = () => {
    navigate('/contact')
  }

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-content">
        <button className="bottom-bar-link" onClick={handleAboutClick}>
          {bottomBar.about}
        </button>
        <button className="bottom-bar-link" onClick={handleContactClick}>
          {bottomBar.contact}
        </button>
      </div>
    </div>
  )
}

export default BottomBar