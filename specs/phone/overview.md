# Phone UI Overview

## Introduction

The GCashTV application supports a responsive phone UI that automatically activates when the viewport width is 768 pixels or less. The phone UI provides a mobile-optimized experience with the same data and functionality as the desktop version.

## Device Detection

### Breakpoints
- **Phone**: ≤768px
- **Tablet**: 769px - 1024px
- **Desktop**: >1024px

### Detection Method
- Window resize listener
- Initial check on mount
- Returns: 'phone' | 'tablet' | 'desktop'

## Responsive Routing

The application automatically renders appropriate components based on device type:
- Phone devices → Phone-specific pages
- Desktop/tablet → Standard pages

## Architecture

### Layout Components
| Component | Location |
|-----------|----------|
| PhoneLayout | src/layouts/PhoneLayout.tsx |
| PhoneHeader | src/components/phone/PhoneHeader.tsx |
| PhoneNavBar | src/components/phone/PhoneNavBar.tsx |

### Page Components
| Page | Location |
|------|----------|
| PhoneHome | src/pages/phone/PhoneHome.tsx |
| PhoneGenre | src/pages/phone/PhoneGenre.tsx |
| PhoneSearch | src/pages/phone/PhoneSearch.tsx |
| PhonePlayer | src/pages/phone/PhonePlayer.tsx |
| PhoneAccount | src/pages/phone/PhoneAccount.tsx |
| PhoneAbout | src/pages/phone/PhoneAbout.tsx |
| PhoneContact | src/pages/phone/PhoneContact.tsx |

### Shared Components
| Component | Location |
|-----------|----------|
| PhoneSeriesCard | src/components/phone/PhoneSeriesCard.tsx |
| PhoneSeriesCarousel | src/components/phone/PhoneSeriesCarousel.tsx |

## Design Specifications

### Colors
| Name | Value | Usage |
|------|-------|-------|
| Background | #0B0B0E | Page background |
| Card Background | #1A1A1A | Cards, inputs |
| Surface | #121214 | Elevated surfaces |
| Primary | #3B82F6 | Buttons, active states |
| Text Primary | #FFFFFF | Main text |
| Text Secondary | #9CA3AF | Secondary text |
| Text Tertiary | #6B7280 | Disabled, hints |
| Border | rgba(255,255,255,0.1) | Borders, dividers |
| Error | #EF4444 | Error states |
| Success | #10B981 | Success states |

### Typography
| Element | Size | Weight |
|---------|------|--------|
| Page Title | 18px | 600 |
| Section Title | 16px | 600 |
| Body | 14-15px | 400 |
| Small | 12-13px | 400-500 |
| Tiny | 10-11px | 400 |

### Spacing
| Name | Value |
|------|-------|
| Page Padding | 16px |
| Section Gap | 24px |
| Item Gap | 12px |
| Small Gap | 8px |

### Dimensions
| Element | Size |
|---------|------|
| Header Height | 56px |
| NavBar Height | 64px |
| Touch Target | 44px minimum |
| Card Width | 140px |
| Input Height | 48px |
| Button Height | 48px |

### Border Radius
| Element | Radius |
|---------|--------|
| Cards | 8px |
| Buttons | 20-24px |
| Inputs | 8px |
| Tags | 12-16px |
| Containers | 12px |

## Safe Area Support

### iOS Devices
- **Top**: env(safe-area-inset-top)
- **Bottom**: env(safe-area-inset-bottom)

### Applied To
- Header padding top
- NavBar padding bottom
- Content area margins

## Touch Interactions

### Minimum Touch Targets
- All interactive elements: 44px × 44px minimum

### Feedback
- Active state: Background highlight or scale
- Transition: 0.2s ease

## Performance

### Optimizations
- Lazy loading images
- Hardware-accelerated scrolling
- Minimal re-renders
- Efficient list virtualization
