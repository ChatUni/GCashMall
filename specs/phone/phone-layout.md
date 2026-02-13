# Phone Layout Component Specification

## Overview

The Phone Layout is a wrapper component that provides consistent structure for all phone pages, including the header and bottom navigation bar.

## Structure

The layout creates a full-screen container with three main areas:

### Header Area
- Fixed at the top of the screen
- Contains the Phone Header component
- Always visible while scrolling

### Content Area
- Fills the space between header and navigation bar
- Scrollable when content exceeds available space
- Supports smooth momentum scrolling on touch devices

### Navigation Area
- Fixed at the bottom of the screen
- Contains the Phone Navigation Bar component
- Can be hidden for full-screen experiences (like video playback)

## Configuration Options

### Title
Optional page title displayed in the header center.

### Back Button
When enabled, shows a back arrow instead of the logo. Used on detail and sub-pages.

### Search Icon
Controls whether the search icon appears in the header. Enabled by default, can be hidden on search-related pages.

### Navigation Bar
Controls whether the bottom navigation is shown. Enabled by default, can be hidden for immersive experiences.

### Custom Back Action
Allows specifying a custom action when the back button is pressed, instead of the default browser back behavior.

### Right Action
Allows adding custom buttons to the right side of the header.

## Scroll Behavior

- Content scrolls independently of header and navigation
- Header remains visible at all times
- Navigation bar remains visible (unless hidden)
- iOS momentum scrolling is enabled for natural feel

## Safe Area Handling

The layout properly accounts for device safe areas:
- Header includes top safe area padding (for notches)
- Content area accounts for both header and navigation heights
- Navigation bar includes bottom safe area padding (for home indicators)

## Usage Patterns

### Standard Page
Header with logo and search, scrollable content, bottom navigation visible.

### Detail Page
Header with back button and title, scrollable content, bottom navigation visible.

### Full-Screen Page
Header with back button, content fills screen, navigation hidden.
