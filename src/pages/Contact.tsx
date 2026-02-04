import React, { useEffect } from 'react'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import './Contact.css'

const Contact: React.FC = () => {
  const { t } = useLanguage()
  const contact = t.contact as Record<string, string>

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="contact-page">
      <TopBar />
      <main className="contact-content">
        <div className="contact-container">
          <div className="contact-header">
            <div className="contact-icon">✉️</div>
            <h1 className="contact-title">{contact.title}</h1>
            <p className="contact-subtitle">{contact.subtitle}</p>
          </div>

          <div className="contact-card">
            <div className="contact-message">
              <p>{contact.welcomeMessage}</p>
            </div>

            <div className="contact-info">
              <div className="contact-info-item">
                <span className="contact-info-icon">📧</span>
                <div className="contact-info-details">
                  <span className="contact-info-label">{contact.emailLabel}</span>
                  <a href="mailto:chatuni.ai@gmail.com" className="contact-info-value">
                    chatuni.ai@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="contact-cta">
              <p className="contact-cta-text">{contact.ctaText}</p>
              <a href="mailto:chatuni.ai@gmail.com" className="contact-btn">
                <span className="contact-btn-icon">✉️</span>
                {contact.sendEmail}
              </a>
            </div>
          </div>

          <div className="contact-footer">
            <p>{contact.footerText}</p>
          </div>
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default Contact
