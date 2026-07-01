import { onMount, createSignal, Show } from 'solid-js'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { t } from '../stores/languageStore'
import { submitFeedback } from '../services/dataService'
import './Contact.css'

const FEEDBACK_MAX = 5000

const Contact = () => {
  // Scroll to top when page loads
  onMount(() => {
    window.scrollTo(0, 0)
  })

  const contact = () => t().contact as Record<string, string>

  const [feedback, setFeedback] = createSignal('')
  const [submitting, setSubmitting] = createSignal(false)
  const [submitted, setSubmitted] = createSignal(false)
  const [error, setError] = createSignal('')

  const handleSubmit = async () => {
    const text = feedback().trim()
    if (!text) {
      setError(contact().feedbackEmpty)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const result = await submitFeedback(text)
      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error || contact().feedbackError)
      }
    } catch {
      setError(contact().feedbackError)
    } finally {
      setSubmitting(false)
    }
  }

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
              <Show
                when={!submitted()}
                fallback={
                  <div class="contact-thankyou">
                    <span class="contact-thankyou-icon">🎉</span>
                    <p>{contact().thankYou}</p>
                  </div>
                }
              >
                <p class="contact-cta-text">{contact().feedbackPrompt}</p>
                <textarea
                  class="contact-feedback"
                  maxLength={FEEDBACK_MAX}
                  rows={5}
                  placeholder={contact().feedbackPlaceholder}
                  value={feedback()}
                  onInput={(e) => setFeedback(e.currentTarget.value)}
                />
                <div class="contact-feedback-meta">
                  <span class="contact-feedback-error">{error()}</span>
                  <span class="contact-feedback-count">
                    {feedback().length}/{FEEDBACK_MAX}
                  </span>
                </div>
                <button
                  class="contact-btn"
                  disabled={submitting() || feedback().trim().length === 0}
                  onClick={handleSubmit}
                >
                  <span class="contact-btn-icon">✉️</span>
                  {submitting() ? '...' : contact().submit}
                </button>
              </Show>
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
