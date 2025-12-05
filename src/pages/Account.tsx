import React from 'react'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import type { AccountFeature } from '../types'
import './Account.css'

const Account: React.FC = () => {
  const accountFeatures: AccountFeature[] = [
    {
      _id: '1',
      name: 'Your Account',
      description: 'Manage your personal profile and preferences.',
      icon: '👤'
    },
    {
      _id: '2',
      name: 'Your Orders & Returns',
      description: 'Track, return, cancel orders or reorder items.',
      icon: '📦'
    },
    {
      _id: '3',
      name: 'Your Wishlist',
      description: 'Save items you love and review them anytime.',
      icon: '❤️'
    },
    {
      _id: '4',
      name: 'Your Payments',
      description: 'Manage cards and view recent transactions.',
      icon: '💳'
    },
    {
      _id: '5',
      name: 'Your Membership & Points',
      description: 'View membership status and redeem rewards.',
      icon: '⭐'
    },
    {
      _id: '6',
      name: 'Your Shopping Records',
      description: 'Review past purchases and browsing history.',
      icon: '📊'
    },
    {
      _id: '7',
      name: 'Customer Service',
      description: 'Get help or contact support for assistance.',
      icon: '🎧'
    },
    {
      _id: '8',
      name: 'Login & Security',
      description: 'Manage password, email, and mobile number.',
      icon: '🔒'
    }
  ]

  const handleFeatureClick = (featureId: string) => {
    console.log(`Feature clicked: ${featureId}`)
    // TODO: Navigate to specific feature page
  }

  return (
    <div className="account-page">
      <TopBar />
      <main className="account-content">
        <h1 className="page-title">Your Account</h1>
        <div className="account-feature-list">
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