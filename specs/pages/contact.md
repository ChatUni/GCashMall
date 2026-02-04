# Contact Page Specification

## Overview

The Contact page provides users with a simple and elegant way to reach out to the GCashTV team. It displays contact information and encourages users to share their feedback and creative ideas.

## Page Structure

### Layout
- **Container**: Full viewport height, flexbox column layout
- **Background**: Dark theme (#0B0B0E)
- **Content Area**: Centered, max-width 600px
- **Padding**: 40px vertical, 20px horizontal

### Components Used
- TopBar (header navigation)
- BottomBar (footer navigation)

## Content Sections

### Header Section

#### Layout
- **Text Align**: center
- **Margin Bottom**: 32px

#### Elements
- **Icon**: ✉️
  - Font Size: 64px
  - Margin Bottom: 16px
  - Animation: bounce (2s ease-in-out infinite)
    - 0%, 100%: translateY(0)
    - 50%: translateY(-10px)
- **Title**: "Contact Us"
  - Font Size: 36px
  - Font Weight: 700
  - Color: White (#FFFFFF)
  - Margin: 0 0 12px 0
- **Subtitle**: "We'd love to hear from you"
  - Font Size: 16px
  - Color: Gray (#9CA3AF)
  - Margin: 0

### Contact Card

#### Container
- **Background**: #121214
- **Border Radius**: 16px
- **Padding**: 32px
- **Box Shadow**: 0 4px 20px rgba(0, 0, 0, 0.3)

#### Welcome Message
- **Text Align**: center
- **Margin Bottom**: 32px
- **Content**: "Your feedback and creative ideas are always welcome."
- **Font Size**: 18px
- **Color**: Light Gray (#E5E7EB)
- **Line Height**: 1.8

#### Contact Info Section

##### Container
- **Background**: #1A1A1E
- **Border Radius**: 12px
- **Padding**: 24px
- **Margin Bottom**: 32px

##### Info Item Layout
- **Display**: flex
- **Align Items**: center
- **Gap**: 16px

##### Icon Container
- **Size**: 56px × 56px
- **Background**: Linear gradient (135deg, #3B82F6 to #1D4ED8)
- **Border Radius**: 12px
- **Display**: flex, center aligned
- **Icon**: 📧 (32px)

##### Details
- **Display**: flex column
- **Gap**: 4px
- **Label**: "Email Address"
  - Font Size: 14px
  - Color: Gray (#9CA3AF)
- **Value**: "chatuni.ai@gmail.com"
  - Font Size: 18px
  - Font Weight: 600
  - Color: Blue (#3B82F6)
  - Text Decoration: none
  - Hover: Color #60A5FA, underline

#### Call-to-Action Section

##### Layout
- **Text Align**: center

##### Elements
- **CTA Text**: "Have questions or suggestions? Drop us a line!"
  - Font Size: 14px
  - Color: Gray (#9CA3AF)
  - Margin: 0 0 16px 0
- **Send Email Button**:
  - Display: inline-flex
  - Align Items: center
  - Gap: 10px
  - Background: Linear gradient (135deg, #3B82F6 to #1D4ED8)
  - Color: White (#FFFFFF)
  - Padding: 14px 32px
  - Border Radius: 12px
  - Font Size: 16px
  - Font Weight: 600
  - Text Decoration: none
  - Hover:
    - Transform: translateY(-2px)
    - Box Shadow: 0 8px 24px rgba(59, 130, 246, 0.4)
  - Icon: ✉️ (18px)
  - Text: "Send Email"
  - Link: mailto:chatuni.ai@gmail.com

### Footer Section

#### Layout
- **Text Align**: center
- **Margin Top**: 32px

#### Content
- **Text**: "We typically respond within 24-48 hours."
- **Font Size**: 14px
- **Color**: Dark Gray (#6B7280)

## Responsive Design

### Breakpoints

#### 768px (Tablet)
- **Content Padding**: 24px 16px
- **Icon**: 48px
- **Title**: 28px
- **Card Padding**: 24px
- **Message Font**: 16px
- **Info Padding**: 20px
- **Info Icon**: 48px × 48px, 24px emoji
- **Info Value**: 16px

#### 480px (Mobile)
- **Title**: 24px
- **Subtitle**: 14px
- **Card Padding**: 20px
- **Info Item**: flex-direction column, text-align center
- **Info Details**: align-items center
- **Send Email Button**: width 100%, justify-content center

## Internationalization

### English (en)

| Key | Value |
|-----|-------|
| title | Contact Us |
| subtitle | We'd love to hear from you |
| welcomeMessage | Your feedback and creative ideas are always welcome. |
| emailLabel | Email Address |
| ctaText | Have questions or suggestions? Drop us a line! |
| sendEmail | Send Email |
| footerText | We typically respond within 24-48 hours. |

### Chinese (zh)

| Key | Value |
|-----|-------|
| title | 联系我们 |
| subtitle | 我们很乐意听取您的意见 |
| welcomeMessage | 我们随时欢迎您的反馈和创意想法。 |
| emailLabel | 电子邮箱 |
| ctaText | 有问题或建议？请给我们留言！ |
| sendEmail | 发送邮件 |
| footerText | 我们通常会在24-48小时内回复。 |

## Routing

- **Path**: /contact
- **Component**: Contact

## Animations

### Bounce Animation

The contact icon (✉️) has a continuous bounce animation:

- **Duration**: 2s
- **Timing Function**: ease-in-out
- **Iteration**: infinite
- **Keyframes**:
  - At 0% and 100%: translateY(0)
  - At 50%: translateY(-10px)

## Interactions

### Page Load
- **Scroll to Top**: When the page loads, the window automatically scrolls to the top (position 0, 0)
- **Implementation**: useEffect hook with window.scrollTo(0, 0) on component mount

### Email Link Click
- **Element**: Email address text (chatuni.ai@gmail.com)
- **Link Type**: mailto link
- **Behavior**: Opens the user's default email client with the recipient address pre-filled
- **Platform Behavior**:
  - Desktop: Opens local email application (Outlook, Apple Mail, Thunderbird, etc.)
  - Mobile: Opens system default mail app
  - Chrome with Gmail handler: May open Gmail web interface

### Send Email Button Click
- **Element**: "Send Email" button
- **Link Type**: mailto link
- **Behavior**: Same as email link - opens the user's default email client with the recipient address pre-filled
- **Recipient**: chatuni.ai@gmail.com

## Accessibility

- Email link is clickable and opens default email client
- Proper heading hierarchy (h1 for title)
- Sufficient color contrast for readability
- Interactive elements have hover states for visual feedback
