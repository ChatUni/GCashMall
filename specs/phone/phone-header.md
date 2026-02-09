# Phone Header Component Specification

## Overview

The Phone Header is a sticky top navigation component for the mobile UI. It provides branding, optional back navigation, page titles, and search functionality.

## Layout

The header is a horizontal bar fixed at the top of the screen with three sections: left, center, and right.

### Dimensions
- Height: 56 pixels (plus safe area on devices with notches)
- Full width of the screen
- Dark background matching the app theme
- Subtle bottom border for visual separation

### Left Section

The left section shows either the app logo or a back button:

**Logo (Default)**
- Displays the GCashTV logo image
- Height of 32 pixels
- Tapping navigates to the home page

**Back Button (When enabled)**
- Circular button with left-pointing arrow icon
- 40 pixels in size
- Tapping returns to the previous page or executes a custom action

### Center Section

The center section optionally displays a page title:
- Only shown when a title is provided
- 18 pixel font, bold weight
- White text color
- Centered in the available space
- Long titles are truncated with ellipsis

### Right Section

The right section contains the search button and optional custom actions:

**Search Button**
- Circular button with magnifying glass icon
- 48 pixels in size with 38 pixel icon
- White icon color
- Tapping navigates to the search page
- Can be hidden on pages where search is not needed

**Custom Actions**
- Additional buttons can be added before the search button
- Used for page-specific actions like share or settings

## Behavior

### Sticky Positioning
The header stays fixed at the top while scrolling content.

### Safe Area Support
On devices with notches (like iPhone), the header extends into the safe area with proper padding.

### Visual Feedback
Buttons show a subtle background highlight when pressed.

## Usage Variations

### Home Page
Shows logo on left, search on right, no title.

### Detail Pages
Shows back button on left, page title in center, search on right.

### Search Page
Shows back button on left, "Search" title in center, no search button.

### Custom Pages
Can include additional action buttons on the right side.
