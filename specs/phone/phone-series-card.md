# Phone Series Card Component Specification

## Overview

The Phone Series Card is a compact card component optimized for mobile displays, showing series poster, title, and optional tag.

## Layout

### Card Container
- **Width**: 140px (carousel) or responsive (grid)
- **Cursor**: Pointer
- **Transition**: transform 0.2s ease

### Poster Container
- **Aspect Ratio**: 2:3
- **Border Radius**: 8px
- **Overflow**: Hidden
- **Background**: #1A1A1A
- **Position**: Relative

### Poster Image
- **Width**: 100%
- **Height**: 100%
- **Object Fit**: Cover
- **Loading**: Lazy

### Tag Badge
- **Position**: Absolute, top: 8px, left: 8px
- **Background**: rgba(0, 0, 0, 0.7)
- **Color**: #FFFFFF
- **Font Size**: 10px
- **Padding**: 4px 8px
- **Border Radius**: 4px
- **Max Width**: 80%
- **Overflow**: Hidden
- **Text Overflow**: ellipsis
- **White Space**: nowrap

### Title
- **Font Size**: 13px
- **Font Weight**: 500
- **Color**: #FFFFFF
- **Margin Top**: 8px
- **Line Height**: 1.3
- **Display**: -webkit-box
- **-webkit-line-clamp**: 2
- **Overflow**: Hidden

## States

### Default State
- Normal appearance

### Pressed State
- **Transform**: scale(0.98)

## Grid Layout

### Container
- **Display**: Grid
- **Gap**: 12px
- **Padding**: 16px

### Responsive Columns
| Screen Width | Columns |
|--------------|---------|
| ≤375px | 2 |
| >375px | 3 |

### Grid Template
- **≤375px**: repeat(2, 1fr)
- **>375px**: repeat(3, 1fr)

## Carousel Layout

### Card Width
- **Fixed**: 140px
- **Flex Shrink**: 0

### Gap
- **Between Cards**: 12px

## Interactions

| Action | Result |
|--------|--------|
| Tap | Navigate to player |
| Press | Scale to 98% |
| Release | Return to 100% |
