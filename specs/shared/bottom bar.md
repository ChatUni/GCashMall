# Bottom Bar Component Specification

## Overview

The Bottom Bar is a simple footer navigation component for GCashTV that provides links to informational pages like About and Contact. It appears at the bottom of all pages and uses a minimal dark theme design.

## Component Structure

### Layout
- **Position**: Static (pushed to bottom via margin-top: auto)
- **Height**: 60px
- **Width**: 100%
- **Background**: Black (#000000)
- **Display**: Flex, center aligned, center justified

### Content Container
- **Display**: Flex, center aligned
- **Gap**: 40px

## Navigation Links

### Link Buttons
Two navigation buttons are provided:

| Label | Path | Description |
|-------|------|-------------|
| About | `/about` | About page |
| Contact | `/contact` | Contact page |

### Link Button Styling
- **Background**: None (transparent)
- **Border**: None
- **Color**: White (#FFFFFF)
- **Font Size**: 16px
- **Cursor**: Pointer
- **Padding**: 10px 20px
- **Text Decoration**: None
- **Transition**: color 0.2s ease
- **Hover**: Color #CCCCCC (light gray)

## Component Dependencies

### Imports
```typescript
import React from 'react'
import { useNavigate } from 'react-router-dom'
import './BottomBar.css'
```

## Navigation Behavior

### Click Handlers
- `handleAboutClick()`: Navigates to `/about`
- `handleContactClick()`: Navigates to `/contact`

### Navigation Method
Uses React Router's `useNavigate` hook for programmatic navigation.

## Color Palette

| Element | Color |
|---------|-------|
| Background | #000000 (black) |
| Link Text | #FFFFFF (white) |
| Link Hover | #CCCCCC (light gray) |

## Animations & Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Link Button | color | 0.2s | ease |

## Usage

The BottomBar component is used at the bottom of all main pages:
- Home page
- Genre page
- Player page
- Account page
- Product List page

### Example Usage
```tsx
import BottomBar from '../components/BottomBar'

const SomePage: React.FC = () => {
  return (
    <div className="page">
      <TopBar />
      <main className="content">
        {/* Page content */}
      </main>
      <BottomBar />
    </div>
  )
}
```

## Layout Integration

The BottomBar uses `margin-top: auto` to push itself to the bottom of the page when used within a flex container with `min-height: 100vh`. This ensures the footer stays at the bottom even when content is short.

### Parent Container Requirements
```css
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

## Responsive Design

The current implementation does not include specific responsive breakpoints. The component maintains its layout across all screen sizes due to its simple centered design.

### Potential Responsive Enhancements
- Reduce gap on mobile devices
- Stack links vertically on very small screens
- Adjust font size for mobile

## Accessibility

- Links are implemented as buttons for keyboard accessibility
- Hover states provide visual feedback
- Sufficient color contrast between text and background

## Future Enhancements

Potential improvements for this component:
- Add more footer links (Privacy Policy, Terms of Service)
- Add social media icons
- Add copyright notice
- Add app download links
- Add newsletter signup
- Implement i18n for link labels
- Add responsive design for mobile
