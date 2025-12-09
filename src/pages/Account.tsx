import React from 'react'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import type { AccountFeature } from '../types'
import './Account.css'

const featureKeys = [
  'yourAccount',
  'yourOrdersReturns',
  'yourWishlist',
  'yourPayments',
  'yourMembershipPoints',
  'yourShoppingRecords',
  'customerService',
  'loginSecurity',
] as const

const featureIcons: Record<string, string> = {
  yourAccount: '👤',
  yourOrdersReturns: '📦',
  yourWishlist: '❤️',
  yourPayments: '💳',
  yourMembershipPoints: '⭐',
  yourShoppingRecords: '📊',
  customerService: '🎧',
  loginSecurity: '🔒',
}

const Account: React.FC = () => {
  const { t } = useLanguage()

  const getAccountFeatures = (): AccountFeature[] => {
    return featureKeys.map((key, index) => ({
      _id: String(index + 1),
      name: t.account.features[key].name,
      description: t.account.features[key].description,
      icon: featureIcons[key],
    }))
  }

  const accountFeatures = getAccountFeatures()

  const handleFeatureClick = (featureId: string) => {
    console.log(`Feature clicked: ${featureId}`)
    // TODO: Navigate to specific feature page
  }

  return (
    <div className="account-page">
      <TopBar />
      <main className="account-content">
        <h1 className="page-title">{t.account.pageTitle}</h1>
        <div className="account-feature-list card-list">
          {accountFeatures.map((feature) => (
            <Card
              key={feature._id}
              className="feature-card"
              onClick={() => handleFeatureClick(feature._id)}
            >
              <div className="feature-content">
                <div className="feature-icon">{feature.icon}</div>
                <div className="feature-info">
                  <h3 className="feature-name">{feature.name}</h3>
                  <p className="feature-description">{feature.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <BottomBar />
    </div>
  )
}

export default Account