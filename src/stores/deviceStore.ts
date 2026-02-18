import { createStore } from 'solid-js/store'
import { createMemo } from 'solid-js'

export type DeviceType = 'phone' | 'tablet' | 'desktop'

const PHONE_MAX_WIDTH = 768
const TABLET_MAX_WIDTH = 1024

// Check if user agent indicates a mobile device (phone or tablet)
const isMobileUserAgent = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent || navigator.vendor || ''
  // Check for common mobile device indicators
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent)
}

// Check if the device has touch capability
const hasTouchCapability = (): boolean => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export const getDeviceType = (width: number): DeviceType => {
  if (width <= PHONE_MAX_WIDTH) return 'phone'
  if (width <= TABLET_MAX_WIDTH) return 'tablet'
  return 'desktop'
}

// Determine device type - primarily use viewport width
const detectDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop'
  
  const width = window.innerWidth
  const isMobileUA = isMobileUserAgent()
  const hasTouch = hasTouchCapability()
  
  // Debug: Log all detection info
  console.log('[DeviceDetect]', {
    width,
    isMobileUA,
    hasTouch,
    userAgent: navigator.userAgent,
    PHONE_MAX_WIDTH,
    TABLET_MAX_WIDTH,
  })
  
  // Primary: use viewport width (works with DevTools device emulation)
  if (width <= PHONE_MAX_WIDTH) {
    console.log('[DeviceDetect] Returning phone (width <= PHONE_MAX_WIDTH)')
    return 'phone'
  }
  if (width <= TABLET_MAX_WIDTH) {
    console.log('[DeviceDetect] Returning tablet (width <= TABLET_MAX_WIDTH)')
    return 'tablet'
  }
  
  // Secondary: if UA indicates mobile and has touch, treat as phone even with larger width
  // This handles cases where mobile browsers request desktop site
  if (isMobileUA && hasTouch && width <= 1280) {
    console.log('[DeviceDetect] Returning phone (mobile UA + touch + width <= 1280)')
    return 'phone'
  }
  
  console.log('[DeviceDetect] Returning desktop (fallback)')
  return 'desktop'
}

const [deviceState, setDeviceState] = createStore({
  deviceType: detectDeviceType() as DeviceType,
})

// Set up resize listener (runs once at module load)
if (typeof window !== 'undefined') {
  const handleResize = () => {
    const newType = detectDeviceType()
    setDeviceState({ deviceType: newType })
  }
  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', handleResize)
}

export const deviceStore = deviceState

export const isPhone = createMemo(() => deviceState.deviceType === 'phone')
export const isTablet = createMemo(() => deviceState.deviceType === 'tablet')
export const isDesktop = createMemo(() => deviceState.deviceType === 'desktop')
