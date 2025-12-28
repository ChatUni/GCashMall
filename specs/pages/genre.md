# Genre Page Specification

## Overview

The Genre page is a content browsing interface for GCashTV that allows users to filter and discover series by genre/category. It features a sidebar with genre filters and a responsive grid displaying filtered content.

## Page Structure

### Layout
- **Container**: Full viewport height, flexbox column layout
- **Background**: Dark theme (#0B0B0E)
- **Content Area**: Flexbox row with sidebar and grid section

### Components Used
- TopBar (header navigation)
- BottomBar (footer navigation)

## URL Parameters

The page supports category filtering via URL query parameter:
- `?category={genreName}` - Pre-selects the specified genre
- Example: `/genre?category=Romance`

### URL Behavior
- On mount, reads `category` parameter from URL
- If valid category found, sets it as active genre
- When genre is selected, updates URL with category parameter
- Selecting "All" clears the category parameter

## Data Structure

### Series Interface
```typescript
interface Series {
  id: string
  title: string
  poster: string
  tag: string
  genres: string[]
}
```

### Genre List
Available genres for filtering:
1. All
2. Romance
3. Drama
4. Thriller
5. Comedy
6. Action
7. Fantasy
8. Sci-Fi
9. Horror
10. Adventure
11. Teenagers
12. Humor
13. Time Travel & Rebirth
14. Mystery & Suspense
15. Revenge
16. Miracle Healer
17. Substitute
18. Celebrity
19. Hidden Identity
20. Princess
21. Security Guard
22. Criminal Investigation

## Genre Sidebar

### Container
- **Width**: 240px (fixed)
- **Min Width**: 240px
- **Background**: #0B0B0E
- **Padding**: 30px 0
- **Overflow-Y**: Auto
- **Position**: Sticky
- **Top**: 60px (below TopBar)
- **Height**: calc(100vh - 60px)
- **Border Right**: 1px solid #1A1A1E

### Genre List
- **Display**: Flex column
- **Gap**: 4px
- **Padding**: 0 20px

### Genre Item (Button)
- **Background**: None
- **Border**: None
- **Color**: #9CA3AF
- **Font Size**: 14px
- **Font Weight**: 400
- **Padding**: 12px 16px
- **Cursor**: Pointer
- **Text Align**: Left
- **Border Radius**: 8px
- **Position**: Relative
- **Transition**: color 0.2s ease, background-color 0.2s ease

### Genre Item Hover State
- **Color**: #FFFFFF
- **Background**: rgba(255, 255, 255, 0.05)

### Genre Item Active State
- **Color**: #FFFFFF
- **Font Weight**: 500
- **Background**: rgba(59, 130, 246, 0.1)

### Active Indicator (::before)
- **Position**: Absolute left
- **Top**: 50%, translateY(-50%)
- **Width**: 3px
- **Height**: 20px
- **Background**: #3B82F6
- **Border Radius**: 0 2px 2px 0

## Content Grid Section

### Container
- **Flex**: 1 (fills remaining space)
- **Padding**: 30px 60px
- **Overflow-Y**: Auto

### Section Header
- **Display**: Flex, space-between, center aligned
- **Margin Bottom**: 24px

### Genre Title
- **Font Size**: 24px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin**: 0
- **Content**: Active genre name (or "All" translated)

### Genre Count
- **Font Size**: 14px
- **Color**: #9CA3AF
- **Content**: "{count} results"

## Content Grid

### Grid Layout
- **Display**: Grid
- **Columns**: repeat(4, 1fr) - 4 equal columns
- **Gap**: 24px

## Genre Card

### Card Container
- **Cursor**: Pointer
- **Transition**: transform 0.3s ease
- **Hover**: scale(1.02)
- **Click Action**: Navigate to `/player/{seriesId}`

### Card Poster Container
- **Aspect Ratio**: 2:3
- **Border Radius**: 8px
- **Overflow**: Hidden
- **Margin Bottom**: 12px
- **Background**: #1A1A1E (placeholder)

### Card Image
- **Size**: 100% width and height
- **Object Fit**: Cover
- **Transition**: transform 0.3s ease
- **Hover**: scale(1.05)

### Card Hover Effects
- **Image**: scale(1.05)
- **Poster Container**: Box shadow 0 0 20px rgba(59, 130, 246, 0.3)
- **Title**: Color changes to #3B82F6

### Card Title
- **Font Size**: 14px
- **Font Weight**: 500
- **Color**: #FFFFFF
- **Margin**: 0 0 4px 0
- **Text Clamp**: 2 lines max
- **Transition**: color 0.2s ease

### Card Tag
- **Font Size**: 12px
- **Color**: #9CA3AF

## Filtering Logic

### Filter Function
```typescript
const filteredSeries = useMemo(() => {
  if (activeGenre === 'All') {
    return allSeries
  }
  return allSeries.filter(series =>
    series.tag === activeGenre || series.genres.includes(activeGenre)
  )
}, [activeGenre])
```

- **"All" selected**: Returns all series
- **Genre selected**: Filters series where:
  - `series.tag` matches active genre, OR
  - `series.genres` array includes active genre

## Navigation Actions

| Element | Action |
|---------|--------|
| Genre Item | Set active genre, update URL |
| Genre Card | Navigate to `/player/{seriesId}` |

## Context Dependencies

### LanguageContext
- `t`: Translation object for i18n support
  - `t.genre.all` - "All" text
  - `t.genre.results` - "results" text

## Responsive Design

### Breakpoints

#### 1200px
- **Grid**: 3 columns

#### 1024px (Tablet)
- **Sidebar**:
  - Width: 200px
  - Min Width: 200px
- **Grid Section**:
  - Padding: 24px 30px

#### 768px (Mobile)
- **Content Layout**: Column direction (stacked)
- **Sidebar**:
  - Width: 100%
  - Min Width: 100%
  - Height: Auto
  - Position: Relative
  - Top: 0
  - Border Right: None
  - Border Bottom: 1px solid #1A1A1E
  - Padding: 16px 0
- **Genre List**:
  - Flex Direction: Row
  - Flex Wrap: Wrap
  - Gap: 8px
  - Padding: 0 16px
- **Genre Item**:
  - Padding: 8px 16px
  - Font Size: 13px
- **Genre Item Active**:
  - No left indicator (::before hidden)
  - Background: #3B82F6 (solid blue)
  - Border Radius: 20px (pill shape)
- **Grid Section**:
  - Padding: 20px 16px
- **Grid**: 2 columns
- **Gap**: 16px
- **Title**: 20px

#### 480px (Small Mobile)
- **Header**: Column direction, left aligned, 8px gap
- **Card Title**: 13px

## Color Palette

| Element | Color |
|---------|-------|
| Page Background | #0B0B0E |
| Sidebar Background | #0B0B0E |
| Card Placeholder | #1A1A1E |
| Border | #1A1A1E |
| Primary Blue | #3B82F6 |
| Active Background | rgba(59, 130, 246, 0.1) |
| Hover Background | rgba(255, 255, 255, 0.05) |
| Text White | #FFFFFF |
| Text Gray | #9CA3AF |
| Blue Glow | rgba(59, 130, 246, 0.3) |

## Animations & Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Genre Item | color, background | 0.2s | ease |
| Card Container | transform | 0.3s | ease |
| Card Image | transform | 0.3s | ease |
| Card Title | color | 0.2s | ease |

## Mock Data

The page includes 16 mock series entries with:
- Unique IDs (1-16)
- Titles
- Poster images (Cloudinary URLs)
- Primary tag
- Multiple genre associations

### Sample Series Data
```typescript
{
  id: '1',
  title: 'Love in the City',
  poster: 'https://res.cloudinary.com/.../poster2.jpg',
  tag: 'Romance',
  genres: ['Romance', 'Teenagers']
}
```

## Accessibility

- All genre buttons are keyboard accessible
- Images have alt attributes with series titles
- Interactive elements have proper cursor styles
- Color contrast meets WCAG guidelines
