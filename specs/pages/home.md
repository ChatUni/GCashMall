# Home Page Specification

## Overview

The Home page is the main landing page of **GCashTV**. This is the first page users see when they open the app or website. Its main purpose is to help users **discover video content easily and quickly**.

The page highlights one featured series at the top (the **Hero section**) and displays multiple rows of recommended content below it using horizontal scrolling carousels. From this page, users can preview, explore, and start watching content with minimal effort.

---

## Page Structure

### Layout
- **Container**: Occupies the full height of the screen and uses a vertical (top-to-bottom) layout
- **Background**: Dark theme with color `#0B0B0E`
- **Content Padding**:
  - Vertical padding: 40px
  - Horizontal padding: 60px
- **Width**: 100% of the screen
- **Box Sizing**: Includes padding within total width calculations

### Components Used
- **TopBar**: The main header navigation at the top of the page
- **BottomBar**: The main footer navigation at the bottom of the page

---

## Data Sources

The Home page displays content using predefined series data loaded from `src/data/seriesData.ts`.

The data includes:
- **featuredSeries**  
  A single, highlighted series shown in the Hero section.
- **youMightLikeSeries**  
  A list of recommended series tailored for discovery.
- **newReleasesSeries**  
  A list of newly released series.

---

## Hero Section

The Hero section is the most visually prominent area on the page. It introduces the featured series and encourages users to start watching immediately.

### Layout
- **Display**: Horizontal layout (poster on the left, text on the right)
- **Spacing Between Elements**: 40px
- **Bottom Margin**: 60px
- **Minimum Height**: 500px

---

### Hero Poster Container
- **Width**: Fixed at 340px
- **Aspect Ratio**: 2:3 (portrait-style poster)
- **Corner Radius**: 16px
- **Overflow**: Content outside the container is hidden
- **Cursor**: Pointer (indicates it is clickable)
- **Position**: Relative (allows overlay positioning)

---

### Hero Poster Image
- **Size**: Fills the entire container
- **Image Fit**: Cropped proportionally to fill the space
- **Transition**: Smooth scaling animation over 0.3 seconds
- **Hover Effect**: Slight zoom-in (scale to 1.05)

---

### Hero Poster Overlay
- **Position**: Covers the entire poster
- **Background**: Semi-transparent black (`rgba(0, 0, 0, 0.4)`)
- **Content Alignment**: Centered horizontally and vertically
- **Visibility**:
  - Hidden by default
  - Appears when the user hovers over the poster
- **Transition**: Smooth fade-in and fade-out (0.3s)

---

### Hero Play Icon (on Poster)
- **Size**: 80px × 80px
- **Color**: Nearly white (`rgba(255, 255, 255, 0.9)`)
- **Icon Type**: Play triangle symbol

---

### Hero Info Section
- **Flex Behavior**: Takes up remaining horizontal space
- **Layout**: Vertical stack
- **Vertical Alignment**: Centered
- **Padding**: 20px on top and bottom

---

### Hero Title
- **Font Size**: 36px
- **Font Weight**: Bold (700)
- **Text Color**: White (`#FFFFFF`)
- **Bottom Margin**: 20px
- **Line Height**: 1.2
- **Max Lines**: 2 lines (extra text is truncated)

---

### Hero Tags
- **Layout**: Horizontal row that wraps onto multiple lines if needed
- **Spacing Between Tags**: 10px
- **Bottom Margin**: 20px

---

### Hero Tag (Individual)
- **Background Color**: `#2A2A2E`
- **Text Color**: Gray (`#9CA3AF`)
- **Font Size**: 13px
- **Padding**: 6px vertical, 14px horizontal
- **Shape**: Rounded pill (20px radius)
- **Cursor**: Pointer
- **Hover State**:
  - Background turns blue (`#3B82F6`)
  - Text turns white
- **Click Action**: Navigates to `/genre?category={tag}`

---

### Hero Description
- **Font Size**: 15px
- **Text Color**: Gray (`#9CA3AF`)
- **Line Height**: 1.7
- **Bottom Margin**: 30px
- **Max Lines**: 4 lines (extra text is truncated)

---

### Hero Play Button
- **Layout**: Inline button with centered content
- **Icon and Text Gap**: 10px
- **Background Color**: Blue (`#3B82F6`)
- **Text Color**: White
- **Font Size**: 16px
- **Font Weight**: Semi-bold (600)
- **Padding**: 14px vertical, 32px horizontal
- **Shape**: Pill (30px radius)
- **Width**: Adjusts to fit content
- **Hover Effect**:
  - Slight zoom-in
  - Darker blue background (`#2563EB`)
- **Icon Size**: 20px × 20px
- **Click Action**: Navigates to `/player/{featuredSeriesId}`

---

## Series Sections

Below the Hero section, the page displays multiple horizontal content rows using a shared series list layout.

Detailed behavior and visuals are defined in **shared/series.md**.

Two sections are shown:
1. **You Might Like**  
   Uses `youMightLikeSeries` data
2. **New Releases**  
   Uses `newReleasesSeries` data

---

## Navigation Actions

| Element | Action |
|-------|--------|
| Hero Poster | Navigate to `/player/{featuredSeriesId}` |
| Hero Play Button | Navigate to `/player/{featuredSeriesId}` |
| Hero Tag | Navigate to `/genre?category={tag}` |
| Series Card | Navigate to `/player/{seriesId}` |
| Series Tag | Navigate to `/genre?category={tag}` |
| View More Card | Navigate to `/genre` |

---

## Context Dependencies

### LanguageContext
The Home page supports multiple languages using a translation system.

Text keys include:
- `t.home.play` — Play button label
- `t.home.youMightLike` — Section title
- `t.home.newReleases` — Section title
- `t.home.viewMore` — “View more” text

---

## Loading State

### Loading Container
Displayed while content is loading.
- **Layout**: Centered horizontally and vertically
- **Flex**: Expands to fill available space
- **Font Size**: 18px
- **Text Color**: Gray (`#9CA3AF`)

---

## Responsive Design

### Breakpoints

#### 1024px (Tablet)
- **Hero Section**:
  - Gap: 30px
  - Minimum Height: 400px
  - Poster Width: 280px
  - Title Font Size: 28px
- **Series Card**:
  - Shows approximately 3 cards per row
  - Minimum Width: 180px

---

#### 768px (Mobile)
- **Content Padding**: 20px vertical, 15px horizontal
- **Hero Section**:
  - Layout changes to vertical
  - Content centered
  - Gap: 24px
  - Height adjusts automatically
- **Hero Poster**:
  - Full width with max width of 300px
- **Hero Info**:
  - Text centered
  - No vertical padding
- **Hero Title**: 24px
- **Hero Tags**: Centered
- **Hero Description**: Maximum 3 lines
- **Hero Play Button**: Centered horizontally
- **Series Card**:
  - Shows approximately 2 cards per row
  - Minimum Width: 150px
- **Section Title**: 20px
- **Carousel Arrow**: 36px × 36px

---

#### 480px (Small Mobile)
- **Hero Poster**: Max width 250px
- **Hero Title**: 22px
- **Hero Play Button**:
  - Padding: 12px × 24px
  - Font Size: 14px
- **Series Card**: Minimum width 140px
- **Series Title**: 14px

---

## Color Palette

| Element | Color |
|-------|-------|
| Page Background | #0B0B0E |
| Card / Button Background | #1A1A1E |
| Tag Background | #2A2A2E |
| Primary Blue | #3B82F6 |
| Primary Blue Hover | #2563EB |
| Text White | #FFFFFF |
| Text Gray | #9CA3AF |
| Overlay | rgba(0, 0, 0, 0.4) |
| Blue Glow | rgba(59, 130, 246, 0.3) |
| Blue Glow Strong | rgba(59, 130, 246, 0.5) |

---

## Animations & Transitions

| Element | Property | Duration | Easing |
|-------|----------|----------|--------|
| Poster Image | Transform | 0.3s | Ease |
| Poster Overlay | Opacity | 0.3s | Ease |
| Play Button | Transform, Background | 0.2s | Ease |
| Tag | Background, Color | 0.2s | Ease |
| Series Title | Color | 0.2s | Ease |
| Carousel Arrow | Background, Border, Shadow | 0.2s | Ease |
| View More Card | Transform | 0.2s | Ease |
| View More Content | Background, Shadow | 0.2s | Ease |
| View More Arrow / Text | Color | 0.2s | Ease |

---

## Accessibility

- Carousel navigation buttons include descriptive `aria-label`s (“Scroll left”, “Scroll right”)
- All images include descriptive `alt` text using series titles
- All interactive elements can be accessed using a keyboard
- Color contrast meets WCAG accessibility guidelines
