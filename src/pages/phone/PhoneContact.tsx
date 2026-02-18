import { createSignal, Show } from 'solid-js'
import PhoneLayout from '../../layouts/PhoneLayout'
import { t } from '../../stores/languageStore'
import { toastStoreActions, toastStore } from '../../stores'
import './PhoneContact.css'

const PhoneContact = () => {
  const contact = () => t().contact as Record<string, string>

  const [formData, setFormData] = createSignal({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [sending, setSending] = createSignal(false)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    const data = formData()
    if (!data.name || !data.email || !data.message) {
      toastStoreActions.show(contact().fillRequired || 'Please fill in all required fields', 'error')
      return
    }

    setSending(true)

    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toastStoreActions.show(contact().sendSuccess || 'Message sent successfully!', 'success')
    setFormData({ name: '', email: '', subject: '', message: '' })
    setSending(false)
  }

  return (
    <PhoneLayout showHeader={true} showBackButton={true} title={contact().title || 'Contact Us'}>
      <div class="phone-contact">
        <div class="phone-contact-header">
          <h1 class="phone-contact-title">{contact().title || 'Contact Us'}</h1>
          <p class="phone-contact-subtitle">
            {contact().subtitle || "Have questions? We'd love to hear from you."}
          </p>
        </div>

        <form class="phone-contact-form" onSubmit={handleSubmit}>
          <div class="phone-form-group">
            <label>{contact().name || 'Name'} *</label>
            <input
              type="text"
              value={formData().name}
              onInput={(e) => setFormData({ ...formData(), name: e.currentTarget.value })}
              placeholder={contact().namePlaceholder || 'Your name'}
            />
          </div>

          <div class="phone-form-group">
            <label>{contact().email || 'Email'} *</label>
            <input
              type="email"
              value={formData().email}
              onInput={(e) => setFormData({ ...formData(), email: e.currentTarget.value })}
              placeholder={contact().emailPlaceholder || 'your@email.com'}
            />
          </div>

          <div class="phone-form-group">
            <label>{contact().subject || 'Subject'}</label>
            <input
              type="text"
              value={formData().subject}
              onInput={(e) => setFormData({ ...formData(), subject: e.currentTarget.value })}
              placeholder={contact().subjectPlaceholder || 'What is this about?'}
            />
          </div>

          <div class="phone-form-group">
            <label>{contact().message || 'Message'} *</label>
            <textarea
              value={formData().message}
              onInput={(e) => setFormData({ ...formData(), message: e.currentTarget.value })}
              placeholder={contact().messagePlaceholder || 'Your message...'}
              rows={5}
            />
          </div>

          <button type="submit" class="phone-submit-btn" disabled={sending()}>
            {sending() ? '...' : (contact().send || 'Send Message')}
          </button>
        </form>

        <div class="phone-contact-info">
          <h2>{contact().otherWays || 'Other Ways to Reach Us'}</h2>

          <div class="phone-contact-item">
            <span class="phone-contact-icon">📧</span>
            <div>
              <span class="phone-contact-label">{contact().emailLabel || 'Email'}</span>
              <span class="phone-contact-value">support@gcashtv.com</span>
            </div>
          </div>

          <div class="phone-contact-item">
            <span class="phone-contact-icon">📱</span>
            <div>
              <span class="phone-contact-label">{contact().phoneLabel || 'Phone'}</span>
              <span class="phone-contact-value">+63 123 456 7890</span>
            </div>
          </div>
        </div>
      </div>

      <Show when={toastStore.isVisible}>
        <div class={`phone-toast phone-toast-${toastStore.type}`}>
          {toastStore.message}
        </div>
      </Show>
    </PhoneLayout>
  )
}

export default PhoneContact
