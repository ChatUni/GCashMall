import React from 'react'
import PhoneLayout from '../../layouts/PhoneLayout'
import { useLanguage } from '../../context/LanguageContext'
import './PhoneAbout.css'

const PhoneAbout: React.FC = () => {
  const { t } = useLanguage()
  const about = t.about as Record<string, string>

  return (
    <PhoneLayout showHeader={true} showBackButton={true} title={about.title || 'About Us'}>
      <div className="phone-about">
        <div className="phone-about-logo">
          <img
            src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
            alt="GcashTV"
          />
        </div>

        <h1 className="phone-about-title">{about.title || 'About GcashTV'}</h1>

        <div className="phone-about-content">
          <p>{about.description || 'GcashTV is your premier destination for streaming entertainment.'}</p>
          
          <section className="phone-about-section">
            <h2>{about.missionTitle || 'Our Mission'}</h2>
            <p>{about.missionText || 'To provide high-quality entertainment accessible to everyone.'}</p>
          </section>

          <section className="phone-about-section">
            <h2>{about.featuresTitle || 'Features'}</h2>
            <ul className="phone-about-features">
              <li>{about.feature1 || 'Extensive library of series and movies'}</li>
              <li>{about.feature2 || 'High-quality streaming'}</li>
              <li>{about.feature3 || 'Personalized recommendations'}</li>
              <li>{about.feature4 || 'Easy payment with GCash'}</li>
            </ul>
          </section>

          <section className="phone-about-section">
            <h2>{about.versionTitle || 'Version'}</h2>
            <p className="phone-about-version">v1.0.0</p>
          </section>
        </div>
      </div>
    </PhoneLayout>
  )
}

export default PhoneAbout
