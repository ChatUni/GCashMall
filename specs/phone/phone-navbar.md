# Phone Navigation Bar Component Specification

## Overview

The Phone Navigation Bar is a fixed bottom navigation component providing primary navigation for the mobile UI. It follows standard mobile app patterns for thumb-friendly access to main sections.

## Layout

The navigation bar is a horizontal bar fixed at the bottom of the screen.

### Dimensions
- Height: 64 pixels (plus safe area on devices with home indicators)
- Full width of the screen
- Dark background matching the app theme
- Subtle top border for visual separation

### Navigation Items

The bar contains three equally-spaced navigation items:

**Home**
- House icon
- Label: "Home" (English) / "首页" (Chinese)
- Navigates to the home page

**Genre**
- Grid icon (four squares)
- Label: "Genre" (English) / "分类" (Chinese)
- Navigates to the genre browsing page

**Account**
- Person icon
- Label: "Account" (English) / "我的" (Chinese)
- Navigates to the account page

### Item Layout

Each navigation item displays:
- Icon above the label
- 24 pixel icon size
- 11 pixel label text
- Vertically centered in the bar
- Minimum 64 pixel width for easy tapping

## States

### Default State
- Gray icon and label color
- No background highlight

### Active State
- Blue icon and label color
- Indicates the current page
- Determined by matching the current URL path

## Behavior

### Fixed Positioning
The navigation bar stays fixed at the bottom while scrolling content.

### Safe Area Support
On devices with home indicators (like iPhone), the bar extends into the safe area with proper padding.

### Route Matching
- Home is active only on the exact home path
- Other items are active when the path starts with their route (allowing for sub-pages)

## Internationalization

Labels change based on the selected language:
- English: Home, Genre, Account
- Chinese: 首页, 分类, 我的
