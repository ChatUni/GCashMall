import { render } from 'solid-js/web'
import './index.css'
import App from './App'
import { initOAuthHandler, onDeviceReady, isIOS } from './utils/cordova'
import { initializeIAP } from './utils/iap'
import { registerIAPReconciliation } from './services/accountService'

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

// Initialize In-App Purchase store on iOS after device is ready
onDeviceReady(() => {
  if (isIOS()) {
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
