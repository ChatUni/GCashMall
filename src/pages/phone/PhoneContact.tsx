import { createSignal, Show } from 'solid-js'
import PhoneLayout from '../../layouts/PhoneLayout'
import { t } from '../../stores/languageStore'
import { submitFeedback } from '../../services/dataService'
import './PhoneContact.css'

const FEEDBACK_MAX = 5000

// Shared contact content (header + card with feedback form + footer).
// Used both by the standalone /contact page and the Account "Contact" tab.
export const PhoneContactContent = () => {
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
    <div class="phone-contact">
        <div class="phone-contact-header">
          <div class="phone-contact-emoji">✉️</div>
          <h1 class="phone-contact-title">{contact().title}</h1>
          <p class="phone-contact-subtitle">{contact().subtitle}</p>
        </div>

        <div class="phone-contact-card">
          <p class="phone-contact-message">{contact().welcomeMessage}</p>

          <div class="phone-contact-info">
            <div class="phone-contact-item">
              <span class="phone-contact-icon">📧</span>
              <div>
                <span class="phone-contact-label">{contact().emailLabel}</span>
                <a href="mailto:chatuni.ai@gmail.com" class="phone-contact-value">
                  chatuni.ai@gmail.com
                </a>
              </div>
            </div>
          </div>

          <Show
            when={!submitted()}
            fallback={
              <div class="phone-contact-thankyou">
                <span class="phone-contact-thankyou-icon">🎉</span>
                <p>{contact().thankYou}</p>
              </div>
            }
          >
            <p class="phone-contact-prompt">{contact().feedbackPrompt}</p>
            <textarea
              class="phone-contact-feedback"
              maxLength={FEEDBACK_MAX}
              rows={5}
              placeholder={contact().feedbackPlaceholder}
              value={feedback()}
              onInput={(e) => setFeedback(e.currentTarget.value)}
            />
            <div class="phone-contact-feedback-meta">
              <span class="phone-contact-feedback-error">{error()}</span>
              <span class="phone-contact-feedback-count">
                {feedback().length}/{FEEDBACK_MAX}
              </span>
            </div>
            <button
              class="phone-submit-btn"
              disabled={submitting() || feedback().trim().length === 0}
              onClick={handleSubmit}
            >
              ✉️ {submitting() ? '...' : contact().submit}
            </button>
          </Show>
        </div>

        <div class="phone-contact-footer">
          <p>{contact().footerText}</p>
        </div>
      </div>
  )
}

const PhoneContact = () => {
  const contact = () => t().contact as Record<string, string>
  return (
    <PhoneLayout showHeader={true} showBackButton={true} title={contact().title}>
      <PhoneContactContent />
    </PhoneLayout>
  )
}

export default PhoneContact
