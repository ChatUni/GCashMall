# Phone Home Page Specification

## Overview

The Phone Home page is the main landing page for the mobile UI, featuring a hero banner and horizontal carousels of recommended content.

## Page Structure

### Layout
- PhoneLayout wrapper
- No back button
- Search icon visible
- Bottom navigation visible

### Content Sections
1. Hero Banner
2. "You Might Like" Carousel
3. "New Releases" Carousel

## Hero Banner

### Container
- **Width**: 100%
- **Aspect Ratio**: 16:9
- **Position**: Relative
- **Margin Bottom**: 24px

### Background Image
- **Width**: 100%
- **Height**: 100%
- **Object Fit**: Cover
- **Object Position**: Center

### Gradient Overlay
- **Position**: Absolute, bottom: 0
- **Width**: 100%
- **Height**: 60%
- **Background**: linear-gradient(transparent, rgba(11, 11, 14, 0.9))

### Content Overlay
- **Position**: Absolute, bottom: 0
- **Width**: 100%
- **Padding**: 16px

### Hero Title
- **Font Size**: 20px
- **Font Weight**: 700
- **Color**: #FFFFFF
- **Margin Bottom**: 8px
- **Line Clamp**: 2

### Hero Tags
- **Display**: Flex, wrap
- **Gap**: 6px
- **Margin Bottom**: 12px

### Hero Tag
- **Background**: rgba(255, 255, 255, 0.2)
- **Color**: #FFFFFF
- **Font Size**: 11px
- **Padding**: 4px 10px
- **Border Radius**: 12px

### Play Button
- **Display**: Inline-flex, centered
- **Gap**: 6px
- **Background**: #3B82F6
- **Color**: #FFFFFF
- **Font Size**: 14px
- **Font Weight**: 600
- **Padding**: 10px 24px
- **Border Radius**: 20px
- **Icon Size**: 16px

## Series Carousels

### "You Might Like" Section
- **Title**: "You Might Like" / "猜你喜欢"
- **Data**: Recommended series

### "New Releases" Section
- **Title**: "New Releases" / "最新上线"
- **Data**: Recently added series

## Data Loading

### Loading State
- Centered spinner or skeleton
- Full content area

### Error State
- Error message
- Retry button

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Hero Banner | Tap | Navigate to featured series |
| Play Button | Tap | Navigate to player |
| Hero Tag | Tap | Navigate to genre with tag |
| Series Card | Tap | Navigate to player |

## Internationalization

| Key | English | Chinese |
|-----|---------|---------|
| youMightLike | You Might Like | 猜你喜欢 |
| newReleases | New Releases | 最新上线 |
| play | Play | 播放 |
