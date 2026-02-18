import { onMount } from 'solid-js'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { t } from '../stores/languageStore'
import './Contact.css'

const Contact = () => {
  // Scroll to top when page loads
  onMount(() => {
    window.scrollTo(0, 0)
  })

  const contact = () => t().contact as Record<string, string>

  return (
    <div class="contact-page">
      <TopBar />
      <main class="contact-content">
        <div class="contact-container">
          <div class="contact-header">
            <div class="contact-icon">✉️</div>
            <h1 class="contact-title">{contact().title}</h1>
            <p class="contact-subtitle">{contact().subtitle}</p>
          </div>

          <div class="contact-card">
            <div class="contact-message">
              <p>{contact().welcomeMessage}</p>
            </div>

            <div class="contact-info">
              <div class="contact-info-item">
                <span class="contact-info-icon">📧</span>
                <div class="contact-info-details">
                  <span class="contact-info-label">{contact().emailLabel}</span>
                  <a href="mailto:chatuni.ai@gmail.com" class="contact-info-value">
                    chatuni.ai@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div class="contact-cta">
              <p class="contact-cta-text">{contact().ctaText}</p>
              <a href="mailto:chatuni.ai@gmail.com" class="contact-btn">
                <span class="contact-btn-icon">✉️</span>
                {contact().sendEmail}
              </a>
            </div>
          </div>

          <div class="contact-footer">
            <p>{contact().footerText}</p>
          </div>
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default Contact
