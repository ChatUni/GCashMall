import React from 'react'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import './About.css'

const About: React.FC = () => {
  const { t } = useLanguage()
  const about = t.about as Record<string, string>

  return (
    <div className="about-page">
      <TopBar />
      <main className="about-content">
        <div className="about-container">
          {/* Hero Section */}
          <div className="about-hero">
            <div className="about-logo">
              <img 
                src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png" 
                alt="GCashTV" 
                className="about-logo-image"
              />
            </div>
            <h1 className="about-title">GcashTV</h1>
            <p className="about-tagline">{about.tagline}</p>
          </div>

          {/* Mission Section */}
          <div className="about-card">
            <div className="about-section">
              <div className="about-section-icon">🎯</div>
              <h2 className="about-section-title">{about.missionTitle}</h2>
              <p className="about-section-text">{about.missionText}</p>
            </div>
          </div>

          {/* Features Section */}
          <div className="about-card">
            <h2 className="about-card-title">{about.featuresTitle}</h2>
            <div className="about-features-grid">
              <div className="about-feature">
                <div className="about-feature-icon">🎬</div>
                <h3 className="about-feature-title">{about.feature1Title}</h3>
                <p className="about-feature-text">{about.feature1Text}</p>
              </div>
              <div className="about-feature">
                <div className="about-feature-icon">💰</div>
                <h3 className="about-feature-title">{about.feature2Title}</h3>
                <p className="about-feature-text">{about.feature2Text}</p>
              </div>
              <div className="about-feature">
                <div className="about-feature-icon">🌍</div>
                <h3 className="about-feature-title">{about.feature3Title}</h3>
                <p className="about-feature-text">{about.feature3Text}</p>
              </div>
              <div className="about-feature">
                <div className="about-feature-icon">📱</div>
                <h3 className="about-feature-title">{about.feature4Title}</h3>
                <p className="about-feature-text">{about.feature4Text}</p>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="about-card">
            <h2 className="about-card-title">{about.howItWorksTitle}</h2>
            <div className="about-steps">
              <div className="about-step">
                <div className="about-step-number">1</div>
                <div className="about-step-content">
                  <h3 className="about-step-title">{about.step1Title}</h3>
                  <p className="about-step-text">{about.step1Text}</p>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">2</div>
                <div className="about-step-content">
                  <h3 className="about-step-title">{about.step2Title}</h3>
                  <p className="about-step-text">{about.step2Text}</p>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">3</div>
                <div className="about-step-content">
                  <h3 className="about-step-title">{about.step3Title}</h3>
                  <p className="about-step-text">{about.step3Text}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="about-footer">
            <p>{about.footerText}</p>
          </div>
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default About
