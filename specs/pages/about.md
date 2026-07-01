# About Page Specification

## Overview

The About page provides information about GCashTV, its mission, features, and how the platform works. It serves as an introduction to the streaming service for new and existing users.

## Page Structure

### Layout
- **Container**: Full viewport height, flexbox column layout
- **Background**: Dark theme (#0B0B0E)
- **Content Area**: Centered, max-width 900px
- **Padding**: 40px vertical, 20px horizontal

### Components Used
- TopBar (header navigation)
- BottomBar (footer navigation)

## Content Sections

### Hero Section

#### Layout
- **Text Align**: center
- **Margin Bottom**: 40px

#### Elements
- **Logo**:
  - Image URL: https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png
  - Size: 80px × 80px
  - Animation: pulse (2s ease-in-out infinite)
    - 0%, 100%: scale(1)
    - 50%: scale(1.05)
  - Margin Bottom: 20px
- **Title**: "GcashTV"
  - Font Size: 48px
  - Font Weight: 700
  - Color: Gradient (135deg, #3B82F6 to #60A5FA)
  - Margin: 0 0 12px 0
- **Tagline**: "Your premium destination for streaming entertainment"
  - Font Size: 18px
  - Color: Gray (#9CA3AF)
  - Max Width: 500px
  - Line Height: 1.6

### Mission Section

#### Card Container
- **Background**: #121214
- **Border Radius**: 16px
- **Padding**: 32px
- **Box Shadow**: 0 4px 20px rgba(0, 0, 0, 0.3)
- **Margin Bottom**: 24px

#### Content
- **Layout**: Centered text
- **Icon**: 🎯 (48px)
- **Title**: "Our Mission"
  - Font Size: 24px
  - Font Weight: 600
  - Color: White (#FFFFFF)
- **Text**: Mission description
  - Font Size: 16px
  - Color: Light Gray (#D1D5DB)
  - Line Height: 1.8
  - Max Width: 600px

### Features Section

#### Card Container
- Same styling as Mission Section card

#### Title
- **Text**: "Why Choose GcashTV"
- **Font Size**: 24px
- **Font Weight**: 600
- **Color**: White (#FFFFFF)
- **Text Align**: center
- **Margin Bottom**: 24px

#### Features Grid
- **Display**: grid
- **Grid Template Columns**: repeat(2, 1fr)
- **Gap**: 24px

#### Feature Item
- **Background**: #1A1A1E
- **Border Radius**: 12px
- **Padding**: 24px
- **Text Align**: center
- **Hover**:
  - Transform: translateY(-4px)
  - Box Shadow: 0 8px 24px rgba(59, 130, 246, 0.15)

##### Feature Elements
- **Icon**: Emoji (40px)
- **Title**: Feature name
  - Font Size: 18px
  - Font Weight: 600
  - Color: White (#FFFFFF)
- **Text**: Feature description
  - Font Size: 14px
  - Color: Gray (#9CA3AF)
  - Line Height: 1.6

##### Features List

| Icon | Title | Description |
|------|-------|-------------|
| 🎬 | Exclusive Content | Access a wide variety of exclusive series and movies you won't find anywhere else. |
| 💰 | Easy Payments | Pay for episodes seamlessly with your GUSD wallet. Top up anytime, anywhere. |
| 🌍 | Multi-Language Support | Enjoy content in multiple languages with our built-in language switching feature. |
| 📱 | Watch Anywhere | Stream on any device - desktop, tablet, or mobile. Your entertainment, your way. |

### How It Works Section

#### Card Container
- Same styling as Mission Section card

#### Title
- **Text**: "How It Works"
- **Font Size**: 24px
- **Font Weight**: 600
- **Color**: White (#FFFFFF)
- **Text Align**: center
- **Margin Bottom**: 24px

#### Steps Container
- **Display**: flex column
- **Gap**: 20px

#### Step Item
- **Display**: flex
- **Align Items**: flex-start
- **Gap**: 20px
- **Background**: #1A1A1E
- **Border Radius**: 12px
- **Padding**: 24px

##### Step Number
- **Size**: 40px × 40px
- **Background**: Linear gradient (135deg, #3B82F6 to #1D4ED8)
- **Border Radius**: 50%
- **Font Size**: 18px
- **Font Weight**: 700
- **Color**: White (#FFFFFF)
- **Display**: flex, center aligned

##### Step Content
- **Title**: Step name
  - Font Size: 18px
  - Font Weight: 600
  - Color: White (#FFFFFF)
- **Text**: Step description
  - Font Size: 14px
  - Color: Gray (#9CA3AF)
  - Line Height: 1.6

##### Steps List

| Step | Title | Description |
|------|-------|-------------|
| 1 | Create an Account | Sign up for free using your email or social media accounts. It only takes a minute. |
| 2 | Top Up Your Wallet | Add funds to your GUSD wallet to unlock premium episodes and content. |
| 3 | Start Watching | Browse our library, unlock episodes, and enjoy unlimited streaming. |

### Footer Section

#### Layout
- **Text Align**: center
- **Margin Top**: 16px

#### Content
- **Text**: "Thank you for choosing GcashTV. Happy watching!"
- **Font Size**: 14px
- **Color**: Dark Gray (#6B7280)

## Responsive Design

### Breakpoints

#### 768px (Tablet)
- **Content Padding**: 24px 16px
- **Logo**: 64px × 64px
- **Title**: 36px
- **Tagline**: 16px
- **Card Padding**: 24px
- **Card Title**: 20px
- **Section Icon**: 40px
- **Section Title**: 20px
- **Features Grid**: 1 column
- **Feature Padding**: 20px
- **Feature Icon**: 32px
- **Feature Title**: 16px
- **Step Padding**: 20px
- **Step Number**: 36px × 36px, 16px font
- **Step Title**: 16px

#### 480px (Mobile)
- **Title**: 28px
- **Tagline**: 14px
- **Card Padding**: 20px
- **Step Item**: flex-direction column, align-items center, text-align center
- **Step Content**: text-align center

## Internationalization

### English (en)

| Key | Value |
|-----|-------|
| tagline | Your premium destination for streaming entertainment |
| missionTitle | Our Mission |
| missionText | GcashTV is dedicated to bringing you the best streaming experience with a vast library of series and movies. We believe in making quality entertainment accessible to everyone, with seamless payment integration through GUSD. |
| featuresTitle | Why Choose GcashTV |
| feature1Title | Exclusive Content |
| feature1Text | Access a wide variety of exclusive series and movies you won't find anywhere else. |
| feature2Title | Easy Payments |
| feature2Text | Pay for episodes seamlessly with your GUSD wallet. Top up anytime, anywhere. |
| feature3Title | Multi-Language Support |
| feature3Text | Enjoy content in multiple languages with our built-in language switching feature. |
| feature4Title | Watch Anywhere |
| feature4Text | Stream on any device - desktop, tablet, or mobile. Your entertainment, your way. |
| howItWorksTitle | How It Works |
| step1Title | Create an Account |
| step1Text | Sign up for free using your email or social media accounts. It only takes a minute. |
| step2Title | Top Up Your Wallet |
| step2Text | Add funds to your GUSD wallet to unlock premium episodes and content. |
| step3Title | Start Watching |
| step3Text | Browse our library, unlock episodes, and enjoy unlimited streaming. |
| footerText | Thank you for choosing GcashTV. Happy watching! |

### Chinese (zh)

| Key | Value |
|-----|-------|
| tagline | 您的优质流媒体娱乐平台 |
| missionTitle | 我们的使命 |
| missionText | GcashTV 致力于为您提供最佳的流媒体体验，拥有丰富的剧集和电影库。我们相信优质娱乐应该人人可及，通过 GUSD 实现无缝支付集成。 |
| featuresTitle | 为什么选择 GcashTV |
| feature1Title | 独家内容 |
| feature1Text | 访问各种独家剧集和电影，这些内容在其他地方找不到。 |
| feature2Title | 便捷支付 |
| feature2Text | 使用 GUSD 钱包轻松支付剧集费用。随时随地充值。 |
| feature3Title | 多语言支持 |
| feature3Text | 通过内置的语言切换功能，享受多种语言的内容。 |
| feature4Title | 随处观看 |
| feature4Text | 在任何设备上观看 - 电脑、平板或手机。您的娱乐，您做主。 |
| howItWorksTitle | 使用方法 |
| step1Title | 创建账户 |
| step1Text | 使用邮箱或社交媒体账户免费注册。只需一分钟。 |
| step2Title | 钱包充值 |
| step2Text | 向您的 GUSD 钱包充值，解锁高级剧集和内容。 |
| step3Title | 开始观看 |
| step3Text | 浏览我们的内容库，解锁剧集，享受无限流媒体。 |
| footerText | 感谢您选择 GcashTV。祝您观影愉快！ |

## Routing

- **Path**: /about
- **Component**: About

## Interactions

### Page Load
- **Scroll to Top**: When the page loads, the window automatically scrolls to the top (position 0, 0)
- **Implementation**: useEffect hook with window.scrollTo(0, 0) on component mount

## Animations

### Pulse Animation

The logo has a continuous pulse animation:

- **Duration**: 2s
- **Timing Function**: ease-in-out
- **Iteration**: infinite
- **Keyframes**:
  - At 0% and 100%: scale(1)
  - At 50%: scale(1.05)

### Feature Hover Animation

Feature cards have a hover effect:

- **Transform**: translateY(-4px)
- **Box Shadow**: 0 8px 24px rgba(59, 130, 246, 0.15)
- **Transition**: 0.2s ease

## Accessibility

- Proper heading hierarchy (h1 for title, h2 for section titles, h3 for feature/step titles)
- Sufficient color contrast for readability
- Interactive elements have hover states for visual feedback
- Semantic HTML structure for screen readers
