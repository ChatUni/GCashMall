// Production site URL used as OAuth redirect in Cordova
// (Cordova's window.location.origin is app://localhost which Google rejects)
export const PRODUCTION_ORIGIN = import.meta.env.VITE_LOCAL_SERVER as string

// Mobile OAuth redirect page hosted on the production site
// Google redirects here, then this page redirects to gcashmall:// custom URL scheme
export const MOBILE_OAUTH_REDIRECT = `${PRODUCTION_ORIGIN}/oauth-mobile.html`

// InAppBrowser reference returned by cordova.InAppBrowser.open()
interface InAppBrowserRef {
  close: () => void
  addEventListener: (event: string, callback: (event: { url: string }) => void) => void
  removeEventListener: (event: string, callback: (event: { url: string }) => void) => void
}

declare global {
  interface Window {
    cordova?: {
      platformId: string
      version: string
      InAppBrowser?: {
        open: (url: string, target: string, options?: string) => InAppBrowserRef
      }
    }
    // Custom URL scheme plugin handler
    handleOpenURL?: (url: string) => void
  }
}

export const isCordova = (): boolean => {
  return typeof window !== 'undefined' && !!window.cordova
}

export const getPlatform = (): string => {
  if (isCordova() && window.cordova) {
    return window.cordova.platformId
  }
  return 'web'
}

export const isAndroid = (): boolean => {
  return getPlatform() === 'android'
}

export const isIOS = (): boolean => {
  return getPlatform() === 'ios'
}

export const onDeviceReady = (callback: () => void): void => {
  if (isCordova()) {
    document.addEventListener('deviceready', callback, false)
  } else {
    if (document.readyState === 'complete') {
      callback()
    } else {
      window.addEventListener('load', callback)
    }
  }
}

export const onPause = (callback: () => void): void => {
  document.addEventListener('pause', callback, false)
}

export const onResume = (callback: () => void): void => {
  document.addEventListener('resume', callback, false)
}

export const onBackButton = (callback: () => void): void => {
  document.addEventListener('backbutton', callback, false)
}

export const exitApp = (): void => {
  if (isCordova() && isAndroid()) {
    const nav = navigator as Navigator & { app?: { exitApp: () => void } }
    if (nav.app?.exitApp) {
      nav.app.exitApp()
    }
  }
}

// OAuth via system browser (Safari/Chrome) + custom URL scheme callback
// Google blocks embedded WebViews (disallowed_useragent), so we must use the system browser.
//
// Flow:
// 1. Open Google OAuth in system browser with redirect_uri = MOBILE_OAUTH_REDIRECT
// 2. User authenticates in Safari/Chrome
// 3. Google redirects to oauth-mobile.html?code=...
// 4. oauth-mobile.html redirects to gcashmall://oauth?code=...
// 5. Custom URL scheme plugin fires handleOpenURL with the code
// 6. Promise resolves with the authorization code

// Pending OAuth callback resolver
let oauthResolve: ((code: string) => void) | null = null
let oauthReject: ((error: Error) => void) | null = null

// Register the custom URL scheme handler (called once at app startup)
export const initOAuthHandler = (): void => {
  window.handleOpenURL = (url: string) => {
    // Must wrap in setTimeout to avoid iOS blocking issue
    // (handleOpenURL is called before the app is fully in foreground)
    setTimeout(() => handleCustomUrl(url), 0)
  }
}

// Handle incoming custom URL scheme
const handleCustomUrl = (url: string): void => {
  if (!url.startsWith('gcashmall://oauth')) return

  const code = extractCodeFromUrl(url)
  if (code && oauthResolve) {
    oauthResolve(code)
  } else if (oauthReject) {
    oauthReject(new Error('No authorization code found in callback URL'))
  }
  cleanupOAuthState()
}

// Open OAuth in system browser and wait for custom URL scheme callback
export const openOAuthSystemBrowser = (authUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Clean up any previous pending OAuth
    cleanupOAuthState()

    oauthResolve = resolve
    oauthReject = reject

    // Open in system browser (_system target opens Safari/Chrome, not a WebView)
    openSystemBrowser(authUrl)

    // Timeout after 5 minutes (user might have abandoned)
    setTimeout(() => {
      if (oauthResolve) {
        cleanupOAuthState()
        reject(new Error('OAuth timed out'))
      }
    }, 5 * 60 * 1000)
  })
}

// Open URL in system browser (Safari on iOS, Chrome on Android)
const openSystemBrowser = (url: string): void => {
  if (isCordova() && window.cordova?.InAppBrowser) {
    // _system target opens the OS default browser, not an embedded WebView
    window.cordova.InAppBrowser.open(url, '_system', '')
  } else {
    window.open(url, '_blank')
  }
}

// Extract authorization code from OAuth callback URL
const extractCodeFromUrl = (url: string): string | null => {
  try {
    // Handle both https:// and custom scheme gcashmall:// URLs
    const queryString = url.includes('?') ? url.split('?')[1] : ''
    const params = new URLSearchParams(queryString)
    return params.get('code')
  } catch {
    return null
  }
}

// Clean up OAuth promise state
const cleanupOAuthState = (): void => {
  oauthResolve = null
  oauthReject = null
}

// Stripe checkout result after InAppBrowser flow
export type StripeCheckoutResult =
  | { status: 'success'; sessionId: string }
  | { status: 'cancelled' }

// Open Stripe checkout in InAppBrowser and monitor URL for callback redirect
// When Stripe redirects to the success/cancel URL, intercept it, close the browser,
// and return the result to the caller (mirrors the OAuth pattern).
export const openStripeInAppBrowser = (
  stripeUrl: string,
  callbackOrigin: string,
): Promise<StripeCheckoutResult> => {
  return new Promise((resolve, reject) => {
    if (!isCordova() || !window.cordova?.InAppBrowser) {
      reject(new Error('InAppBrowser not available'))
      return
    }

    let resolved = false

    const browser = window.cordova.InAppBrowser.open(
      stripeUrl,
      '_blank',
      'location=yes,clearcache=no,clearsessioncache=no',
    )

    const cleanup = () => {
      browser.removeEventListener('loadstart', onLoadStart)
      browser.removeEventListener('exit', onExit)
    }

    const onLoadStart = (event: { url: string }) => {
      if (!event.url.startsWith(callbackOrigin)) return
      if (resolved) return
      resolved = true

      const params = extractQueryParams(event.url)
      const topupStatus = params.get('topup_status')

      cleanup()
      browser.close()

      if (topupStatus === 'success') {
        const sessionId = params.get('session_id') || ''
        resolve({ status: 'success', sessionId })
      } else {
        resolve({ status: 'cancelled' })
      }
    }

    const onExit = () => {
      if (resolved) return
      resolved = true
      cleanup()
      // Browser was closed without hitting callback — treat as cancelled
      resolve({ status: 'cancelled' })
    }

    browser.addEventListener('loadstart', onLoadStart)
    browser.addEventListener('exit', onExit)
  })
}

// Extract query params from a URL (handles both regular and hash URLs)
const extractQueryParams = (url: string): URLSearchParams => {
  try {
    const queryString = url.includes('?') ? url.split('?')[1] : ''
    return new URLSearchParams(queryString)
  } catch {
    return new URLSearchParams()
  }
}
