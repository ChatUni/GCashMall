declare global {
  interface Window {
    cordova?: {
      platformId: string
      version: string
    }
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
