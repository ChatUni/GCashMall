# Phone Series Carousel Component Specification

## Overview

The Phone Series Carousel is a horizontal scrolling component for displaying series cards in a swipeable row.

## Layout

### Section Container
- **Width**: 100%
- **Margin Bottom**: 24px

### Section Header
- **Display**: Flex, space-between, center aligned
- **Padding**: 0 16px
- **Margin Bottom**: 12px

### Section Title
- **Font Size**: 18px
- **Font Weight**: 600
- **Color**: #FFFFFF

### See All Link
- **Font Size**: 14px
- **Color**: #3B82F6
- **Cursor**: Pointer

### Scroll Container
- **Display**: Flex
- **Gap**: 12px
- **Overflow-X**: Auto
- **Overflow-Y**: Hidden
- **Padding**: 0 16px
- **Scroll Behavior**: Smooth
- **-webkit-overflow-scrolling**: touch

## Scrollbar Hiding

- **-webkit-scrollbar**: display: none
- **-ms-overflow-style**: none
- **scrollbar-width**: none

## Card Display

### Card Size
- **Width**: 140px
- **Flex Shrink**: 0

### Card Spacing
- **Gap**: 12px
- **Edge Padding**: 16px

## Content States

### Loading State
- Skeleton placeholder cards
- Or hide section

### Empty State
- Section not rendered
- Or "No content" message

### Populated State
- Horizontal scrollable cards
- Typically 5-20 cards

## Scroll Behavior

### Touch Scrolling
- Native horizontal swipe
- Momentum scrolling
- Smooth deceleration

### Snap (Optional)
- Snap to card edges
- scroll-snap-type: x mandatory
- scroll-snap-align: start

## Interactions

| Action | Result |
|--------|--------|
| Swipe left/right | Scroll through cards |
| Tap card | Navigate to player |
| Tap "See All" | Navigate to full list |

## Performance

- Lazy loading images
- Hardware-accelerated scroll
- Only visible cards rendered
