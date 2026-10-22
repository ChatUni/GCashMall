import { render } from 'solid-js/web'
import './index.css'
import './theme.css'
import App from './App'
import { initOAuthHandler, onDeviceReady, isIOS, isAndroid, getPlatform } from './utils/cordova'
import { initializeIAP } from './utils/iap'
import { registerIAPReconciliation } from './services/accountService'
import { initTheme } from './stores/themeStore'

// Apply the saved theme (default dark) to <html> before first paint
initTheme()

declare global {
  interface Window {
    tap: <T>(x: T) => T
  }
}

window.tap = <T,>(x: T): T => {
  console.log(x)
  return x
}

// Register custom URL scheme handler for OAuth callbacks (gcashmall://oauth?code=...)
initOAuthHandler()

// Lets CSS tell the platforms apart (Android ignores the iOS safe-area insets — see index.css).
// cordova.js loads before this module, so the platform is known before the first render.
document.documentElement.classList.add(`platform-${getPlatform()}`)

// Initialize the store (Apple IAP on iOS, Google Play Billing on Android) after device is ready
onDeviceReady(() => {
  if (isIOS() || isAndroid()) {
    // Register reconciliation before init so orphaned transactions re-delivered during
    // store.initialize() get credited and finished.
    registerIAPReconciliation()
    initializeIAP()
  }
})

const root = document.getElementById('root')

if (root) {
  render(() => <App />, root)
}
