import { render } from 'solid-js/web'
import './index.css'
import App from './App'
import { initOAuthHandler } from './utils/cordova'

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

const root = document.getElementById('root')

if (root) {
  render(() => <App />, root)
}
