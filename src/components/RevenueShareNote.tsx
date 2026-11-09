import Icon from './Icon'
import { t } from '../stores/languageStore'
import { fillShare, ensureSystemSettings } from '../stores/systemSettingsStore'
import { isCordova, openSystemBrowser, legalPageUrl, REVENUE_SHARE_PAGE } from '../utils/cordova'
import './RevenueShareNote.css'

const shareText = () => fillShare(t().revenueShare.note)

// The agreement is a static page outside the SPA. In Cordova a target="_blank" link opens an
// embedded WebView with no way back, so hand the URL to the system browser instead.
const openAgreement = (e: MouseEvent) => {
  if (!isCordova()) return
  e.preventDefault()
  openSystemBrowser(legalPageUrl(REVENUE_SHARE_PAGE))
}

// "You earn 70% of what viewers pay to unlock your series." + a link to the agreement.
const RevenueShareNote = (props: { class?: string }) => {
  ensureSystemSettings()

  return (
    <p class={`revenue-share-note ${props.class || ''}`}>
      <Icon name="money" class="revenue-share-note-icon" />
      <span>
        {shareText()}{' '}
        <a
          class="revenue-share-note-link"
          href={legalPageUrl(REVENUE_SHARE_PAGE)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openAgreement}
        >
          {t().revenueShare.link}
        </a>
      </span>
    </p>
  )
}

export default RevenueShareNote
