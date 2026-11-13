import {
  PRIVACY_POLICY_PAGE,
  TERMS_PAGE,
  GUIDELINES_PAGE,
  REVENUE_SHARE_PAGE,
  COPYRIGHT_PAGE,
} from './cordova'

// The public legal pages, in display order. `key` is the label key in t().legal.
export type LegalKey = 'privacy' | 'terms' | 'guidelines' | 'creatorAgreement' | 'copyright'

export const LEGAL_PAGES: { key: LegalKey; page: string }[] = [
  { key: 'privacy', page: PRIVACY_POLICY_PAGE },
  { key: 'terms', page: TERMS_PAGE },
  { key: 'guidelines', page: GUIDELINES_PAGE },
  { key: 'creatorAgreement', page: REVENUE_SHARE_PAGE },
  { key: 'copyright', page: COPYRIGHT_PAGE },
]
