import React, { useState } from 'react'
import PhoneLayout from '../../layouts/PhoneLayout'
import { useLanguage } from '../../context/LanguageContext'
import { toastStoreActions, useToastStore } from '../../stores'
import './PhoneContact.css'

const PhoneContact: React.FC = () => {
  const { t } = useLanguage()
  const contact = t.contact as Record<string, string>
  const toastState = useToastStore()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.message) {
      toastStoreActions.show(contact.fillRequired || 'Please fill in all required fields', 'error')
      return
    }

    setSending(true)
    
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    toastStoreActions.show(contact.sendSuccess || 'Message sent successfully!', 'success')
    setFormData({ name: '', email: '', subject: '', message: '' })
    setSending(false)
  }

  return (
    <PhoneLayout showHeader={true} showBackButton={true} title={contact.title || 'Contact Us'}>
      <div className="phone-contact">
        <div className="phone-contact-header">
          <h1 className="phone-contact-title">{contact.title || 'Contact Us'}</h1>
          <p className="phone-contact-subtitle">
            {contact.subtitle || 'Have questions? We\'d love to hear from you.'}
          </p>
        </div>

        <form className="phone-contact-form" onSubmit={handleSubmit}>
          <div className="phone-form-group">
            <label>{contact.name || 'Name'} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={contact.namePlaceholder || 'Your name'}
            />
          </div>

          <div className="phone-form-group">
            <label>{contact.email || 'Email'} *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={contact.emailPlaceholder || 'your@email.com'}
            />
          </div>

          <div className="phone-form-group">
            <label>{contact.subject || 'Subject'}</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder={contact.subjectPlaceholder || 'What is this about?'}
            />
          </div>

          <div className="phone-form-group">
            <label>{contact.message || 'Message'} *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={contact.messagePlaceholder || 'Your message...'}
              rows={5}
            />
          </div>

          <button type="submit" className="phone-submit-btn" disabled={sending}>
            {sending ? '...' : (contact.send || 'Send Message')}
          </button>
        </form>

        <div className="phone-contact-info">
          <h2>{contact.otherWays || 'Other Ways to Reach Us'}</h2>
          
          <div className="phone-contact-item">
            <span className="phone-contact-icon">📧</span>
            <div>
              <span className="phone-contact-label">{contact.emailLabel || 'Email'}</span>
              <span className="phone-contact-value">support@gcashtv.com</span>
            </div>
          </div>

          <div className="phone-contact-item">
            <span className="phone-contact-icon">📱</span>
            <div>
              <span className="phone-contact-label">{contact.phoneLabel || 'Phone'}</span>
              <span className="phone-contact-value">+63 123 456 7890</span>
            </div>
          </div>
        </div>
      </div>

      {toastState.isVisible && (
        <div className={`phone-toast phone-toast-${toastState.type}`}>
          {toastState.message}
        </div>
      )}
    </PhoneLayout>
  )
}

export default PhoneContact
