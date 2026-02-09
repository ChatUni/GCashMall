# Phone Series Carousel Component Specification

## Overview

The Phone Series Carousel is a horizontal scrolling component for displaying series cards in a swipeable row. Optimized for touch interaction with smooth momentum scrolling.

## Layout

### Section Container
- Full width of the screen
- Bottom margin for spacing between sections

### Section Header
- Horizontal layout with title on left
- Optional "See All" link on right
- Horizontal padding matching content
- Small bottom margin before cards

### Section Title
- 18 pixel font, bold weight
- White text color
- Describes the content category

### See All Link (Optional)
- Blue text color
- 14 pixel font
- Tapping shows full list of series

### Scroll Container
- Horizontal scrolling area
- Cards arranged in a row
- 12 pixel gap between cards
- Horizontal padding at start and end
- Scrollbar hidden for clean appearance

## Scroll Behavior

### Touch Scrolling
- Native horizontal swipe gestures
- Momentum scrolling continues after finger lift
- Smooth deceleration
- Optional snap-to-card alignment

### Scrollbar
Hidden on all platforms for cleaner mobile appearance.

## Card Display

### Card Size
- Fixed 140 pixel width per card
- Cards maintain their size (no shrinking)
- Multiple cards visible based on screen width

### Card Spacing
- 12 pixel gap between cards
- 16 pixel padding at carousel edges

## Content States

### Loading State
- Can show skeleton placeholder cards
- Or hide section until data loads

### Empty State
- Section not rendered when no series available
- Or shows "No content available" message

### Populated State
- Shows all series cards in scrollable row
- Typically 5-20 cards per carousel

## Interactions

### Swipe
Horizontal swipe scrolls through cards naturally.

### Card Tap
Tapping a card navigates to that series player.

### See All Tap
Tapping "See All" navigates to a full list view.

## Performance

### Lazy Loading
Card images load as they come into view.

### Smooth Scrolling
Hardware-accelerated scrolling for 60fps performance.

### Memory Efficiency
Only visible cards are fully rendered.
