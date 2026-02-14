import { useState, useEffect } from 'react'

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
    TABLET_MAX_WIDTH
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

export const useDeviceType = (): DeviceType => {
  // Initialize with detected value immediately (works on client)
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    // This runs on initial render - on client, window is available
    if (typeof window !== 'undefined') {
      return detectDeviceType()
    }
    return 'desktop' // SSR fallback
  })
  
  useEffect(() => {
    // Re-detect after mount to ensure correctness (handles any edge cases)
    const currentType = detectDeviceType()
    setDeviceType(currentType)
    
    // Debug logging to help diagnose issues
    console.log('useDeviceType: width=', window.innerWidth, 'detected=', currentType, 'ua=', navigator.userAgent.substring(0, 50))
    
    // Handle resize events
    const handleResize = () => {
      const newType = detectDeviceType()
      console.log('useDeviceType resize: width=', window.innerWidth, 'detected=', newType)
      setDeviceType(newType)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Also listen for orientation change (important for mobile)
    window.addEventListener('orientationchange', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])
  
  return deviceType
}

export const useIsMobile = (): boolean => {
  const deviceType = useDeviceType()
  return deviceType === 'phone'
}

export const useIsTablet = (): boolean => {
  const deviceType = useDeviceType()
  return deviceType === 'tablet'
}

export const useIsDesktop = (): boolean => {
  const deviceType = useDeviceType()
  return deviceType === 'desktop'
}

export default useDeviceType
