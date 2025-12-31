# Series Card Component Specification

## Overview

The Series Card is a reusable component used throughout GCashTV to display series information in carousels and grids. It appears in the Home page, Player page recommendations, and Genre page.

## Layout

Vertical stack:
- Poster image container
- Title
- Tag (single, most representative)

## Series Card Container

### Styling
- **Flex Shrink**: 0
- **Width**: 200px (fixed)
- **Cursor**: Pointer
- **Transition**: transform 0.3s ease
- **Click Action**: Navigate to `/player/{seriesId}`

### Hover Effects
- **Card**: scale(1.02)
- **Poster Container**: Box shadow 0 0 20px rgba(59, 130, 246, 0.3)
- **Title**: Color changes to #3B82F6

## Poster Container

### Styling
- **Aspect Ratio**: 2:3 (vertical)
- **Border Radius**: 8px
- **Overflow**: Hidden
- **Margin Bottom**: 12px
- **Position**: Relative
- **Background**: #1A1A1E (placeholder)
- **Transition**: box-shadow 0.2s ease

### Poster Image
- **Size**: 100% width and height
- **Object Fit**: Cover
- **Transition**: transform 0.3s ease
- **Hover Effect**: scale(1.05)

## Series Title

### Styling
- **Font Size**: 14px
- **Font Weight**: 500
- **Color**: #FFFFFF
- **Margin**: 0 0 4px 0
- **Text Clamp**: 2 lines max (using -webkit-line-clamp)
- **Transition**: color 0.2s ease

## Series Tag

### Styling
- **Display**: Inline-block
- **Width**: fit-content (only as wide as the text)
- **Background**: #2A2A2E
- **Color**: #9CA3AF
- **Font Size**: 12px
- **Padding**: 4px 10px
- **Border Radius**: 16px (pill shape)
- **Cursor**: Pointer
- **Transition**: background-color 0.2s ease, color 0.2s ease

### Hover State
- **Background**: #3B82F6
- **Color**: #FFFFFF
- **Title Override**: When tag is hovered, title stays white (not blue)
  - CSS: `.series-card:has(.series-tag:hover) .series-title { color: #FFFFFF; }`

### Click Action
- Navigate to `/genre?category={tagName}`
- Uses `e.stopPropagation()` to prevent card click from triggering

---

# Series Carousel Section Specification

## Overview

A horizontal scrolling carousel section used to display series cards. Used for "You Might Like" and "New Releases" sections on Home and Player pages.

## Section Layout

### Container
- **Margin Bottom**: 50px

### Section Header
- **Display**: Flex, space-between, center aligned
- **Margin Bottom**: 20px

### Section Title
- **Font Size**: 28px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin**: 0

## Carousel Controls

### Container
- **Display**: Flex
- **Gap**: 10px

### Arrow Button
- **Size**: 40px × 40px (fixed)
- **Border Radius**: 50% (circular)
- **Background**: #1A1A1E
- **Border**: 1px solid #2A2A2E
- **Cursor**: Pointer
- **Display**: Flex, centered
- **Transition**: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease

### Arrow Button Hover
- **Background**: #2A2A2E
- **Border Color**: #3B82F6
- **Box Shadow**: 0 0 12px rgba(59, 130, 246, 0.5)

### Arrow Icon (CSS-based)
- **Method**: CSS borders (::before pseudo-element)
- **Size**: 10px × 10px
- **Border**: 2px solid #FFFFFF (top and right)
- **Position**: Absolute, centered
- **Left Arrow**: rotate(-135deg)
- **Right Arrow**: rotate(45deg)
- **Hover**: Border color #3B82F6

## Series Carousel

### Container
- **Display**: Flex
- **Gap**: 20px
- **Overflow-X**: Auto (horizontal scroll)
- **Scroll Behavior**: Smooth
- **Padding Bottom**: 10px
- **Scrollbar**: Hidden (all browsers)
  - `-ms-overflow-style`: none
  - `scrollbar-width`: none
  - `::-webkit-scrollbar`: display none

### Scroll Functionality
- **Scroll Amount**: 80% of container width
- **Direction**: Left or Right based on button clicked
- **Behavior**: Smooth scrolling via `scrollBy()`

## View More Card

Appears at the end of each carousel.

### Card Container
- **Flex Shrink**: 0
- **Width**: 120px (fixed)
- **Display**: Flex column, centered
- **Padding Top**: 50px
- **Cursor**: Pointer
- **Transition**: transform 0.2s ease
- **Hover**: scale(1.05)
- **Click Action**: Navigate to `/genre`

### View More Content (Circle)
- **Display**: Flex column, centered
- **Gap**: 0px
- **Padding**: 16px
- **Background**: #1A1A1E
- **Border Radius**: 50% (circular)
- **Size**: 80px × 80px
- **Transition**: background-color 0.2s ease, box-shadow 0.2s ease

### View More Content Hover
- **Background**: #2A2A2E
- **Box Shadow**: 0 0 20px rgba(59, 130, 246, 0.3)

### View More Arrow Icon
- **Size**: 40px × 40px
- **Color**: #9CA3AF
- **Transition**: color 0.2s ease
- **Hover**: Color #3B82F6
- **SVG**: Chevron right icon (no hardcoded width/height attributes)

### View More Text
- **Font Size**: 12px
- **Color**: #9CA3AF
- **Text Align**: Center
- **Margin Top**: 10px
- **Transition**: color 0.2s ease
- **Hover**: Color #3B82F6
- **Position**: Outside the circle (below view-more-content)

---

# You Might Like Section

## Overview
A recommendation carousel section displaying series the user might enjoy based on their viewing history or preferences.

## Implementation
Uses the Series Carousel Section component with:
- **Title**: "You Might Like" (i18n: `t.home.youMightLike`)
- **Data Source**: `youMightLikeSeries` array or filtered recommendations
- **Filtering**: Excludes current series when on Player page

---

# New Releases Section

## Overview
A carousel section displaying newly released series content.

## Implementation
Uses the Series Carousel Section component with:
- **Title**: "New Releases" (i18n: `t.home.newReleases`)
- **Data Source**: `newReleasesSeries` array or filtered new releases
- **Filtering**: Excludes current series when on Player page

---

# Responsive Design

## Breakpoints

### 1024px (Tablet)
- **Series Card**: Width 180px

### 768px (Mobile)
- **Series Card**: Width 160px
- **Section Title**: 20px
- **Carousel Arrow**: 36px × 36px

### 480px (Small Mobile)
- **Series Card**: Width 140px
- **Series Title**: 13px
- **View More Card**: Width 100px
- **View More Circle**: 70px × 70px
- **View More Arrow**: 32px × 32px

---

# Color Palette

| Element | Color |
|---------|-------|
| Card Background | #1A1A1E |
| Tag Background | #2A2A2E |
| Primary Blue | #3B82F6 |
| Text White | #FFFFFF |
| Text Gray | #9CA3AF |
| Blue Glow | rgba(59, 130, 246, 0.3) |
| Blue Glow Strong | rgba(59, 130, 246, 0.5) |

---

# Animations & Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Poster Image | transform | 0.3s | ease |
| Series Title | color | 0.2s | ease |
| Tag | background, color | 0.2s | ease |
| Carousel Arrow | background, border, shadow | 0.2s | ease |
| View More Card | transform | 0.2s | ease |
| View More Content | background, shadow | 0.2s | ease |
| View More Arrow/Text | color | 0.2s | ease |

---

# Accessibility

- Carousel arrows have `aria-label` attributes ("Scroll left", "Scroll right")
- All images have `alt` attributes with series titles
- Interactive elements are keyboard accessible
- Color contrast meets WCAG guidelines
