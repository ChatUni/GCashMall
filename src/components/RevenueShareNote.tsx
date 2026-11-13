import Icon from './Icon'
import { t } from '../stores/languageStore'
import { fillShare, ensureSystemSettings } from '../stores/systemSettingsStore'
import LegalLink from './LegalLink'
import { REVENUE_SHARE_PAGE } from '../utils/cordova'
import './RevenueShareNote.css'

const shareText = () => fillShare(t().revenueShare.note)

// "You earn 70% of what viewers pay to unlock your series." + a link to the agreement.
const RevenueShareNote = (props: { class?: string }) => {
  ensureSystemSettings()

  return (
    <p class={`revenue-share-note ${props.class || ''}`}>
      <Icon name="money" class="revenue-share-note-icon" />
      <span>
        {shareText()}{' '}
        <LegalLink class="revenue-share-note-link" page={REVENUE_SHARE_PAGE}>
          {t().revenueShare.link}
        </LegalLink>
      </span>
    </p>
  )
}

export default RevenueShareNote
