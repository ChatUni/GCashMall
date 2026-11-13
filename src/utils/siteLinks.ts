import type { IconName } from '../components/Icon'

// Store listings for the native apps (also encoded in src/assets/qr-*.svg — regenerate the QR
// codes if these ever change).
export const APP_STORE_URL = 'https://apps.apple.com/app/id6801237246'
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=io.ganime.app'

export const SUPPORT_EMAIL = 'ganimesupport@freshroad.com'

// Ganime's own social accounts, shown in the site footer. An entry with an empty url is
// hidden, so fill a url in to show that icon.
export const SOCIAL_LINKS: { icon: IconName; label: string; url: string }[] = [
  { icon: 'facebook', label: 'Facebook', url: '' },
  { icon: 'instagram', label: 'Instagram', url: '' },
  { icon: 'tiktok', label: 'TikTok', url: '' },
  { icon: 'x', label: 'X', url: '' },
  { icon: 'youtube', label: 'YouTube', url: '' },
]

export const activeSocialLinks = () => SOCIAL_LINKS.filter((s) => s.url)
