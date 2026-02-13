import { useState, useEffect } from 'react'

export type DeviceType = 'phone' | 'tablet' | 'desktop'

const PHONE_MAX_WIDTH = 768
const TABLET_MAX_WIDTH = 1024

export const getDeviceType = (width: number): DeviceType => {
  if (width <= PHONE_MAX_WIDTH) return 'phone'
  if (width <= TABLET_MAX_WIDTH) return 'tablet'
  return 'desktop'
}

export const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => 
    getDeviceType(typeof window !== 'undefined' ? window.innerWidth : 1200)
  )

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType(window.innerWidth))
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
