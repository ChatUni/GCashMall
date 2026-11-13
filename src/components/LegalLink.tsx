import type { JSX } from 'solid-js'
import { isCordova, openSystemBrowser, legalPageUrl } from '../utils/cordova'

// The legal pages are static pages outside the SPA, opened in a new tab so the user doesn't
// lose what they were doing. In Cordova a plain target="_blank" is hijacked into an embedded
// WebView with no way back, so hand the URL to the system browser instead.
const openInSystemBrowser = (page: string) => (e: MouseEvent) => {
  if (!isCordova()) return
  e.preventDefault()
  openSystemBrowser(legalPageUrl(page))
}

// A link to one of the public legal pages (PRIVACY_POLICY_PAGE, TERMS_PAGE, ...).
const LegalLink = (props: { page: string; class?: string; children: JSX.Element }) => (
  <a
    class={props.class}
    href={legalPageUrl(props.page)}
    target="_blank"
    rel="noopener noreferrer"
    onClick={openInSystemBrowser(props.page)}
  >
    {props.children}
  </a>
)

export default LegalLink
