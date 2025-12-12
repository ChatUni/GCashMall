import React from 'react'
import { useNavigate } from 'react-router-dom'
import './BottomBar.css'

const BottomBar: React.FC = () => {
  const navigate = useNavigate()

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
          About
        </button>
        <button className="bottom-bar-link" onClick={handleContactClick}>
          Contact
        </button>
      </div>
    </div>
  )
}

export default BottomBar