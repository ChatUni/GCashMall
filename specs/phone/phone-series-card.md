# Phone Series Card Component Specification

## Overview

The Phone Series Card is a compact card component optimized for mobile displays, showing a series poster, title, and optional tag. Used in carousels and grid layouts throughout the phone UI.

## Layout

### Card Container
- Fixed width of 140 pixels when used in carousels
- Responsive width when used in grids
- Tappable with visual feedback

### Poster Image
- Portrait orientation with 2:3 aspect ratio
- Rounded corners (8 pixels)
- Fills the container width
- Images load lazily for performance
- Dark placeholder shown while loading

### Tag Badge (Optional)
- Positioned in the top-left corner of the poster
- Semi-transparent dark background
- White text, small font size (10 pixels)
- Shows the first tag of the series
- Truncated with ellipsis if too long

### Title
- Displayed below the poster
- White text, 13 pixel font
- Medium font weight
- Limited to 2 lines maximum
- Truncated with ellipsis if longer
- Small gap between poster and title

## States

### Default State
Normal appearance with no visual changes.

### Pressed State
Slight scale reduction (98%) to provide tactile feedback when tapped.

## Behavior

### Tap Action
Tapping the card navigates to the series player page.

### Image Loading
- Shows dark placeholder initially
- Image fades in when loaded
- Handles missing images gracefully

## Usage Contexts

### In Carousels
- Fixed 140 pixel width
- Horizontal scrolling with other cards
- 12 pixel gap between cards

### In Grids
- Responsive width based on grid columns
- 2 columns on smaller phones (375 pixels or less)
- 3 columns on larger phones
- 12 pixel gap between cards
