# Phone Series Carousel Component Specification

## Overview

The Phone Series Carousel is a horizontal scrolling component for displaying series cards in a swipeable row. Optimized for touch interaction with smooth momentum scrolling.

## Layout

### Section Container
- Full width of the screen
- Bottom margin for spacing between sections

### Section Header
- Horizontal layout with title on left, "More" button on right
- Horizontal padding: 22px left, 16px right
- 16px bottom margin before cards
- Flexbox with space-between alignment

### Section Title
- 18 pixel font, bold weight (600)
- White text color (#ffffff)
- No margin
- Describes the content category

### More Button
- 32x32 pixel circular button
- Chevron right icon (20x20 pixels)
- Gray icon color (#9CA3AF) in default state
- Transparent background in default state
- 50% border-radius for perfect circle
- Flexbox centered content

#### More Button Hover State
- White icon color (#ffffff)
- Subtle background: rgba(255, 255, 255, 0.08)
- Circular frame: inset box-shadow 1px rgba(255, 255, 255, 0.3)

#### More Button Active/Click State
- White icon color (#ffffff)
- Visible background: rgba(255, 255, 255, 0.15)
- Circular frame: inset box-shadow 1px rgba(255, 255, 255, 0.4)

#### More Button Interaction
- Tapping navigates to full series list for that category
- Uses `onMoreClick` callback prop if provided

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
