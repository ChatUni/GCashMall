import { For } from 'solid-js'
import { t } from '../stores/languageStore'
import LegalLink from './LegalLink'
import { PRIVACY_POLICY_PAGE, TERMS_PAGE } from '../utils/cordova'
import './LegalConsentNote.css'

const LINKED_PAGES: Record<string, { page: string; label: () => string }> = {
  '{terms}': { page: TERMS_PAGE, label: () => t().legal.terms },
  '{privacy}': { page: PRIVACY_POLICY_PAGE, label: () => t().legal.privacy },
}

// "By continuing, you agree to the {terms} and {privacy}." split into text and link parts,
// so each language can put the links wherever its grammar needs them.
const consentParts = () => t().legal.consent.split(/(\{terms\}|\{privacy\})/).filter(Boolean)

// Shown under sign-in and sign-up: every way in (email, Google, Apple) creates or uses an
// account, which the Terms say means accepting them.
const LegalConsentNote = () => (
  <p class="legal-consent-note">
    <For each={consentParts()}>
      {(part) => {
        const link = LINKED_PAGES[part]
        if (!link) return part
        return (
          <LegalLink class="legal-consent-link" page={link.page}>
            {link.label()}
          </LegalLink>
        )
      }}
    </For>
  </p>
)

export default LegalConsentNote
