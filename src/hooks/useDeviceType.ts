import { useState, useEffect } from 'react'

export type DeviceType = 'phone' | 'tablet' | 'desktop'

const PHONE_MAX_WIDTH = 768
const TABLET_MAX_WIDTH = 1024

// Check if user agent indicates a mobile device
const isMobileUserAgent = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent || navigator.vendor || ''
  // Check for common mobile device indicators
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent)
}

// Check if user agent indicates a tablet device
const isTabletUserAgent = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent || navigator.vendor || ''
  // iPads and Android tablets
  return /iPad|Android(?!.*Mobile)/i.test(userAgent)
}

export const getDeviceType = (width: number): DeviceType => {
  if (width <= PHONE_MAX_WIDTH) return 'phone'
  if (width <= TABLET_MAX_WIDTH) return 'tablet'
  return 'desktop'
}

// Determine device type combining width and user agent detection
const detectDeviceType = (width: number): DeviceType => {
  const isMobileUA = isMobileUserAgent()
  const isTabletUA = isTabletUserAgent()
  
  // If user agent indicates mobile/tablet, prioritize that detection
  // This helps when browser is in "desktop mode" but user is on a phone
  if (isMobileUA && !isTabletUA) {
    // User agent says mobile, use phone version regardless of width
    // unless width is very large (e.g., desktop browser with mobile UA spoofing)
    if (width <= 1024) return 'phone'
  }
  
  if (isTabletUA) {
    // User agent says tablet
    if (width <= TABLET_MAX_WIDTH) return 'tablet'
    return 'tablet' // Still show tablet version even if width is larger
  }
  
  // Fall back to width-based detection
  return getDeviceType(width)
}

export const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>(() =>
    detectDeviceType(typeof window !== 'undefined' ? window.innerWidth : 1200)
  )

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(detectDeviceType(window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
