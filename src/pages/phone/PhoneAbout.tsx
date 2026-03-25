import PhoneLayout from '../../layouts/PhoneLayout'
import { APP_DISPLAY_NAME } from '../../utils/config'
import { t } from '../../stores/languageStore'
import './PhoneAbout.css'

const PhoneAbout = () => {
  const about = () => (t().about || {}) as Record<string, string>

  return (
    <PhoneLayout showHeader={true} showBackButton={true} title={about().title || 'About Us'}>
      <div class="phone-about">
        <div class="phone-about-logo">
          <img
            src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
            alt={APP_DISPLAY_NAME}
          />
        </div>

        <h1 class="phone-about-title">{about().title || `About ${APP_DISPLAY_NAME}`}</h1>

        <div class="phone-about-content">
          <p>{about().description || `${APP_DISPLAY_NAME} is your premier destination for streaming entertainment.`}</p>

          <section class="phone-about-section">
            <h2>{about().missionTitle || 'Our Mission'}</h2>
            <p>{about().missionText || 'To provide high-quality entertainment accessible to everyone.'}</p>
          </section>

          <section class="phone-about-section">
            <h2>{about().featuresTitle || 'Features'}</h2>
            <ul class="phone-about-features">
              <li>{about().feature1 || 'Extensive library of series and movies'}</li>
              <li>{about().feature2 || 'High-quality streaming'}</li>
              <li>{about().feature3 || 'Personalized recommendations'}</li>
              <li>{about().feature4 || 'Easy payment with GCash'}</li>
            </ul>
          </section>

          <section class="phone-about-section">
            <h2>{about().versionTitle || 'Version'}</h2>
            <p class="phone-about-version">v1.0.0</p>
          </section>
        </div>
      </div>
    </PhoneLayout>
  )
}

export default PhoneAbout
