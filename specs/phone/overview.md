# Phone UI Overview

## Introduction

The GCashTV application supports a responsive phone UI that automatically activates when the screen width is 768 pixels or less. The phone UI provides a mobile-optimized experience with the same data and functionality as the desktop version, but with a touch-friendly interface designed for smaller screens.

## Device Detection

The application detects the device type based on screen width:
- Phone: 768 pixels or less
- Tablet: 769 to 1024 pixels
- Desktop: More than 1024 pixels

The detection updates automatically when the window is resized.

## Responsive Routing

The application automatically renders the appropriate version based on device type:
- Phone devices see phone-specific pages
- Desktop and tablet devices see standard pages

Both versions share the same data and functionality, only the presentation differs.

## Phone-Specific Architecture

### Layout Structure
The phone UI uses a consistent layout with:
- A sticky header at the top with logo and search
- Scrollable content in the middle
- A fixed navigation bar at the bottom

### Pages
The phone version includes dedicated pages for:
- Home (featured content and recommendations)
- Genre (category browsing)
- Search (find series)
- Player (video playback)
- Account (user profile and settings)
- About (app information)
- Contact (support form)

### Components
Phone-specific components include:
- Header (top navigation)
- Navigation Bar (bottom tabs)
- Series Card (compact poster display)
- Series Carousel (horizontal scrolling list)

## Design Principles

1. Touch-First: All interactive elements are sized for finger taps (minimum 44 pixels)
2. Safe Areas: Support for device notches and home indicators
3. Vertical Scrolling: Content flows vertically with horizontal carousels for series
4. Bottom Navigation: Primary navigation at bottom for easy thumb access
5. Sticky Header: Logo and search always visible at top
6. Dark Theme: Consistent dark background matching desktop version

## Global Mobile Styles

The phone UI includes:
- Safe area padding for devices with notches
- Minimum touch target sizes
- Hidden scrollbars for cleaner appearance
- Proper viewport height handling for mobile browsers
