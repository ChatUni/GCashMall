import { For } from 'solid-js'
import { t } from '../stores/languageStore'
import LegalLink from './LegalLink'
import { LEGAL_PAGES } from '../utils/legalPages'
import './LegalLinksCard.css'

// "Legal" card listing every public legal page. The phone layout and the native apps have no
// footer, so this is where app users reach the privacy policy and terms.
const LegalLinksCard = () => (
  <div class="legal-links-card">
    <h2 class="legal-links-title">{t().legal.title}</h2>
    <For each={LEGAL_PAGES}>
      {(item) => (
        <LegalLink class="legal-links-row" page={item.page}>
          <span>{t().legal[item.key]}</span>
          <span class="legal-links-chevron" aria-hidden="true" />
        </LegalLink>
      )}
    </For>
  </div>
)

export default LegalLinksCard
