# Phone Player Page Specification

## Overview

The Phone Player page provides a mobile-optimized video playback experience with series information, episode selection, and related content.

## Page Structure

### Layout
- PhoneLayout wrapper
- Back button visible
- Title: Series title
- Search icon visible
- Bottom navigation visible (hidden in fullscreen)

### Content Sections
1. Video Player
2. Series Info
3. Episode List
4. Related Series

## Video Player

### Container
- **Width**: 100%
- **Aspect Ratio**: 16:9
- **Background**: #000000
- **Position**: Relative

### Video Element
- **Width**: 100%
- **Height**: 100%
- **Object Fit**: Contain

### Fullscreen Button
- **Position**: Absolute, bottom: 12px, right: 12px
- **Size**: 40px × 40px
- **Background**: rgba(0, 0, 0, 0.5)
- **Border Radius**: 8px
- **Icon Size**: 20px

### Loading State
- Centered spinner
- Black background

## Series Info

### Container
- **Padding**: 16px
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.05)

### Title
- **Font Size**: 18px
- **Font Weight**: 700
- **Color**: #FFFFFF
- **Margin Bottom**: 8px

### Meta Info
- **Display**: Flex, wrap
- **Gap**: 12px
- **Font Size**: 13px
- **Color**: #9CA3AF
- **Margin Bottom**: 12px

### Tags
- **Display**: Flex, wrap
- **Gap**: 8px
- **Margin Bottom**: 12px

### Tag
- **Background**: #2A2A2E
- **Color**: #9CA3AF
- **Font Size**: 12px
- **Padding**: 4px 12px
- **Border Radius**: 12px

### Description
- **Font Size**: 14px
- **Color**: #9CA3AF
- **Line Height**: 1.6
- **Default Lines**: 3
- **Expandable**: Show more/less

## Episode List

### Section Header
- **Padding**: 16px
- **Font Size**: 16px
- **Font Weight**: 600
- **Color**: #FFFFFF

### Episode Grid
- **Display**: Grid
- **Grid Template**: repeat(5, 1fr)
- **Gap**: 8px
- **Padding**: 0 16px 16px

### Episode Button
- **Aspect Ratio**: 1:1
- **Border Radius**: 8px
- **Font Size**: 14px
- **Font Weight**: 500
- **Display**: Flex, centered

### Episode States
| State | Background | Color |
|-------|------------|-------|
| Default | #1A1A1A | #FFFFFF |
| Current | #3B82F6 | #FFFFFF |
| Watched | #1A1A1A | #9CA3AF |
| Locked | #1A1A1A | #4B5563 + lock icon |

## Related Series

### Section Title
- **Padding**: 0 16px
- **Font Size**: 16px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin Bottom**: 12px

### Carousel
- PhoneSeriesCarousel component
- Related by tags

## Fullscreen Mode

### Behavior
- Landscape preferred
- Hide header and nav
- Full viewport video
- Tap to show/hide controls

### Exit Methods
- Exit button
- Back button
- Rotate to portrait

## Watch History

### Storage Key
- gcashtv-watch-history

### Progress Tracking
- Save every 10 seconds
- Resume from last position

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Video | Tap | Toggle play/pause |
| Fullscreen | Tap | Enter fullscreen |
| Episode | Tap | Switch episode |
| Tag | Tap | Navigate to genre |
| Related | Tap | Navigate to series |

## Internationalization

| Key | English | Chinese |
|-----|---------|---------|
| episodes | Episodes | 剧集 |
| related | Related | 相关推荐 |
| showMore | Show more | 展开 |
| showLess | Show less | 收起 |
