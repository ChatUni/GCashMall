# Phone Layout Component Specification

## Overview

The Phone Layout is a wrapper component that provides consistent structure for all phone pages, including the header and bottom navigation bar.

## Layout Structure

### Outer Container
- **Display**: Flex column
- **Min Height**: 100vh (100dvh on mobile)
- **Background**: #0B0B0E
- **Position**: Relative

### Content Area
- **Flex**: 1
- **Overflow-Y**: Auto
- **Padding Bottom**: 64px (navbar height) + safe area
- **-webkit-overflow-scrolling**: touch

## Component Hierarchy

```
PhoneLayout
├── PhoneHeader (sticky top)
├── Content (scrollable)
└── PhoneNavBar (fixed bottom, optional)
```

## Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | - | Page title in header |
| showBackButton | boolean | false | Show back arrow instead of logo |
| showSearch | boolean | true | Show search icon in header |
| showNavBar | boolean | true | Show bottom navigation |
| onBack | function | - | Custom back handler |
| rightAction | ReactNode | - | Custom header right action |

## Scroll Behavior

- **Content Scroll**: Independent of header and navbar
- **Header**: Remains sticky at top
- **NavBar**: Remains fixed at bottom
- **iOS Momentum**: -webkit-overflow-scrolling: touch

## Safe Area Handling

### Top Safe Area
- Header includes padding for notch
- Content starts below header

### Bottom Safe Area
- Content padding accounts for navbar + safe area
- NavBar includes padding for home indicator

## Usage Patterns

### Standard Page
- Header with logo and search
- Scrollable content
- Bottom navigation visible

### Detail Page
- Header with back button and title
- Scrollable content
- Bottom navigation visible

### Full-Screen Page
- Header with back button
- Content fills screen
- Navigation hidden

## Dimensions Summary

| Element | Height |
|---------|--------|
| Header | 56px + safe area top |
| NavBar | 64px + safe area bottom |
| Content | Remaining viewport height |
