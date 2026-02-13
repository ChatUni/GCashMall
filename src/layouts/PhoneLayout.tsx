import React from 'react'
import PhoneNavBar from '../components/phone/PhoneNavBar'
import PhoneHeader from '../components/phone/PhoneHeader'
import './PhoneLayout.css'

interface PhoneLayoutProps {
  children: React.ReactNode
  title?: string
  showHeader?: boolean
  showBackButton?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
}

const PhoneLayout: React.FC<PhoneLayoutProps> = ({
  children,
  title,
  showHeader = true,
  showBackButton = false,
  onBack,
  rightAction,
}) => {
  return (
    <div className="phone-layout">
      {showHeader && (
        <PhoneHeader
          title={title}
          showBackButton={showBackButton}
          onBack={onBack}
          rightAction={rightAction}
        />
      )}
      <main className="phone-content">
        {children}
      </main>
      <PhoneNavBar />
    </div>
  )
}

export default PhoneLayout
