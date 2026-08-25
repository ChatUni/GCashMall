// Brand artwork, bundled with the app rather than fetched from Cloudinary.
//
// These sit in the TopBar/header on every screen, so a cross-origin request for them is on
// the critical render path of every cold load — and in the Cordova app it means a blank
// header until the network answers (or forever, offline). Vite fingerprints the filenames,
// so cache-busting is automatic and they ship from the same CDN as the rest of the bundle.
// Cloudinary stays for user-generated media (covers, avatars), which is what it's for.
//
// Note the GUSD coin glyph is a SEPARATE mark (a "G$" token shown beside wallet amounts),
// still served from Cloudinary — do not replace those with these.

import logoUrl from '../assets/ganime-logo.png'
import markUrl from '../assets/ganime-mark.png'

// Horizontal wordmark — for height-constrained, auto-width slots (TopBar, phone header).
export const BRAND_LOGO = logoUrl

// Square app mark — for square slots (About pages), where the wordmark would be squashed.
export const BRAND_MARK = markUrl
