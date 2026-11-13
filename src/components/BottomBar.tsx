import { useNavigate } from '@solidjs/router'
import { t } from '../stores/languageStore'
import LegalLink from './LegalLink'
import { PRIVACY_POLICY_PAGE, TERMS_PAGE } from '../utils/cordova'
import './BottomBar.css'

const labels = () => t().bottomBar as Record<string, string>

// About / Contact centered; the legal links sit on the right, the usual footer spot.
const BottomBar = () => {
  const navigate = useNavigate()

  return (
    <div class="bottom-bar">
      <div class="bottom-bar-content">
        <button class="bottom-bar-link" onClick={() => navigate('/about')}>
          {labels().about}
        </button>
        <button class="bottom-bar-link" onClick={() => navigate('/contact')}>
          {labels().contact}
        </button>
      </div>
      <div class="bottom-bar-legal">
        <LegalLink class="bottom-bar-legal-link" page={PRIVACY_POLICY_PAGE}>
          {t().legal.privacy}
        </LegalLink>
        <LegalLink class="bottom-bar-legal-link" page={TERMS_PAGE}>
          {t().legal.terms}
        </LegalLink>
      </div>
    </div>
  )
}

export default BottomBar
