# Home Page Specification

## Overview

The Home page is the main landing page for GCashTV, featuring a hero section showcasing a featured series and horizontal carousels displaying recommended content. It serves as the primary discovery interface for users to find and watch video content.

## Page Structure

### Layout
- **Container**: Full viewport height, flexbox column layout
- **Background**: Dark theme (#0B0B0E)
- **Content Padding**: 40px vertical, 60px horizontal
- **Width**: 100%, box-sizing border-box

### Components Used
- TopBar (header navigation)
- BottomBar (footer navigation)

## Data Sources

The page imports series data from `src/data/seriesData.ts`:
- `featuredSeries` - Single featured series for hero section
- `youMightLikeSeries` - Array of recommended series
- `newReleasesSeries` - Array of newly released series

## Hero Section

### Layout
- **Display**: Flexbox row
- **Gap**: 40px
- **Margin Bottom**: 60px
- **Min Height**: 500px

### Hero Poster Container
- **Width**: 340px (fixed)
- **Aspect Ratio**: 2:3
- **Border Radius**: 16px
- **Overflow**: Hidden
- **Cursor**: Pointer
- **Position**: Relative

### Hero Poster Image
- **Size**: 100% width and height
- **Object Fit**: Cover
- **Transition**: transform 0.3s ease
- **Hover Effect**: scale(1.05)

### Hero Poster Overlay
- **Position**: Absolute, covers entire container
- **Background**: rgba(0, 0, 0, 0.4)
- **Display**: Flex, centered
- **Opacity**: 0 (default), 1 on hover
- **Transition**: opacity 0.3s ease

### Hero Play Icon (on poster)
- **Size**: 80px × 80px
- **Color**: rgba(255, 255, 255, 0.9)
- **SVG Path**: Play triangle icon

### Hero Info Section
- **Flex**: 1 (fills remaining space)
- **Display**: Flex column
- **Justify Content**: Center
- **Padding**: 20px 0

### Hero Title
- **Font Size**: 36px
- **Font Weight**: 700
- **Color**: #FFFFFF
- **Margin**: 0 0 20px 0
- **Line Height**: 1.2
- **Text Clamp**: 2 lines max

### Hero Tags
- **Display**: Flex wrap
- **Gap**: 10px
- **Margin Bottom**: 20px

### Hero Tag (individual)
- **Background**: #2A2A2E
- **Color**: #9CA3AF
- **Font Size**: 13px
- **Padding**: 6px 14px
- **Border Radius**: 20px (pill shape)
- **Cursor**: Pointer
- **Hover**: Background #3B82F6, Color #FFFFFF
- **Click Action**: Navigate to `/genre?category={tag}`

### Hero Description
- **Font Size**: 15px
- **Color**: #9CA3AF
- **Line Height**: 1.7
- **Margin**: 0 0 30px 0
- **Text Clamp**: 4 lines max

### Hero Play Button
- **Display**: Inline-flex, centered
- **Gap**: 10px
- **Background**: #3B82F6
- **Color**: #FFFFFF
- **Font Size**: 16px
- **Font Weight**: 600
- **Padding**: 14px 32px
- **Border Radius**: 30px (pill shape)
- **Width**: fit-content
- **Hover**: scale(1.05), Background #2563EB
- **Icon Size**: 20px × 20px
- **Click Action**: Navigate to `/player/{featuredSeriesId}`

## Series Sections

Use shared series list component. See [shared/series.md](../shared/series.md) for detailed specifications.

Two sections with different data:
1. **You Might Like** - Uses `youMightLikeSeries` data
2. **New Releases** - Uses `newReleasesSeries` data

## Navigation Actions

| Element | Action |
|---------|--------|
| Hero Poster | Navigate to `/player/{featuredSeriesId}` |
| Hero Play Button | Navigate to `/player/{featuredSeriesId}` |
| Hero Tag | Navigate to `/genre?category={tag}` |
| Series Card | Navigate to `/player/{seriesId}` |
| Series Tag | Navigate to `/genre?category={tag}` |
| View More Card | Navigate to `/genre` |

## Context Dependencies

### LanguageContext
- `t`: Translation object for i18n support
  - `t.home.play` - Play button text
  - `t.home.youMightLike` - Section title
  - `t.home.newReleases` - Section title
  - `t.home.viewMore` - View more text

## Loading State

### Loading Container
- **Display**: Flex, centered
- **Flex**: 1
- **Font Size**: 18px
- **Color**: #9CA3AF

## Responsive Design

### Breakpoints

#### 1024px (Tablet)
- **Hero Section**:
  - Gap: 30px
  - Min Height: 400px
  - Poster Width: 280px
  - Title: 28px
- **Series Card**:
  - Width: calc((100% - 40px) / 3) - Shows ~3 cards
  - Min Width: 180px

#### 768px (Mobile)
- **Content Padding**: 20px 15px
- **Hero Section**:
  - Flex Direction: Column
  - Align Items: Center
  - Gap: 24px
  - Min Height: Auto
- **Hero Poster**:
  - Width: 100%
  - Max Width: 300px
- **Hero Info**:
  - Text Align: Center
  - Padding: 0
- **Hero Title**: 24px
- **Hero Tags**: Justify Center
- **Hero Description**: 3 lines max
- **Hero Play Button**: Margin auto (centered)
- **Series Card**:
  - Width: calc((100% - 20px) / 2) - Shows ~2 cards
  - Min Width: 150px
- **Section Title**: 20px
- **Carousel Arrow**: 36px × 36px

#### 480px (Small Mobile)
- **Hero Poster**: Max Width 250px
- **Hero Title**: 22px
- **Hero Play Button**: Padding 12px 24px, Font 14px
- **Series Card**: Min Width 140px
- **Series Title**: 14px

## Color Palette

| Element | Color |
|---------|-------|
| Page Background | #0B0B0E |
| Card/Button Background | #1A1A1E |
| Tag Background | #2A2A2E |
| Primary Blue | #3B82F6 |
| Primary Blue Hover | #2563EB |
| Text White | #FFFFFF |
| Text Gray | #9CA3AF |
| Overlay | rgba(0, 0, 0, 0.4) |
| Blue Glow | rgba(59, 130, 246, 0.3) |
| Blue Glow Strong | rgba(59, 130, 246, 0.5) |

## Animations & Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Poster Image | transform | 0.3s | ease |
| Poster Overlay | opacity | 0.3s | ease |
| Play Button | transform, background | 0.2s | ease |
| Tag | background, color | 0.2s | ease |
| Series Title | color | 0.2s | ease |
| Carousel Arrow | background, border, shadow | 0.2s | ease |
| View More Card | transform | 0.2s | ease |
| View More Content | background, shadow | 0.2s | ease |
| View More Arrow/Text | color | 0.2s | ease |

## Accessibility

- Carousel arrows have `aria-label` attributes ("Scroll left", "Scroll right")
- All images have `alt` attributes with series titles
- Interactive elements are keyboard accessible
- Color contrast meets WCAG guidelines
