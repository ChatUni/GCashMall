import { onMount } from 'solid-js'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { APP_DISPLAY_NAME } from '../utils/config'
import { t } from '../stores/languageStore'
import './About.css'

const About = () => {
  // Scroll to top when page loads
  onMount(() => {
    window.scrollTo(0, 0)
  })

  const about = () => t().about as Record<string, string>

  return (
    <div class="about-page">
      <TopBar />
      <main class="about-content">
        <div class="about-container">
          {/* Hero Section */}
          <div class="about-hero">
            <div class="about-logo">
              <img
                src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
                alt={APP_DISPLAY_NAME}
                class="about-logo-image"
              />
            </div>
            <h1 class="about-title">{APP_DISPLAY_NAME}</h1>
            <p class="about-tagline">{about().tagline}</p>
          </div>

          {/* Mission Section */}
          <div class="about-card">
            <div class="about-section">
              <div class="about-section-icon">🎯</div>
              <h2 class="about-section-title">{about().missionTitle}</h2>
              <p class="about-section-text">{about().missionText}</p>
            </div>
          </div>

          {/* Features Section */}
          <div class="about-card">
            <h2 class="about-card-title">{about().featuresTitle}</h2>
            <div class="about-features-grid">
              <div class="about-feature">
                <div class="about-feature-icon">🎬</div>
                <h3 class="about-feature-title">{about().feature1Title}</h3>
                <p class="about-feature-text">{about().feature1Text}</p>
              </div>
              <div class="about-feature">
                <div class="about-feature-icon">💰</div>
                <h3 class="about-feature-title">{about().feature2Title}</h3>
                <p class="about-feature-text">{about().feature2Text}</p>
              </div>
              <div class="about-feature">
                <div class="about-feature-icon">🌍</div>
                <h3 class="about-feature-title">{about().feature3Title}</h3>
                <p class="about-feature-text">{about().feature3Text}</p>
              </div>
              <div class="about-feature">
                <div class="about-feature-icon">📱</div>
                <h3 class="about-feature-title">{about().feature4Title}</h3>
                <p class="about-feature-text">{about().feature4Text}</p>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div class="about-card">
            <h2 class="about-card-title">{about().howItWorksTitle}</h2>
            <div class="about-steps">
              <div class="about-step">
                <div class="about-step-number">1</div>
                <div class="about-step-content">
                  <h3 class="about-step-title">{about().step1Title}</h3>
                  <p class="about-step-text">{about().step1Text}</p>
                </div>
              </div>
              <div class="about-step">
                <div class="about-step-number">2</div>
                <div class="about-step-content">
                  <h3 class="about-step-title">{about().step2Title}</h3>
                  <p class="about-step-text">{about().step2Text}</p>
                </div>
              </div>
              <div class="about-step">
                <div class="about-step-number">3</div>
                <div class="about-step-content">
                  <h3 class="about-step-title">{about().step3Title}</h3>
                  <p class="about-step-text">{about().step3Text}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div class="about-footer">
            <p>{about().footerText}</p>
          </div>
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default About
