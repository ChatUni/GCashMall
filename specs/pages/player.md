# Player Page Specification

## Overview

The Player page is the video playback interface for GCashTV, featuring a video player with custom controls, episode metadata, an episode list sidebar, and recommendation carousels. It supports favorites, watch history tracking, and social sharing functionality.

## Page Structure

### Layout
- **Container**: Full viewport height, flexbox column layout
- **Background**: Dark theme (#0B0B0E)
- **Max Width**: 1600px (centered)
- **Padding**: 0 60px 40px

### Components Used
- TopBar (header navigation)
- BottomBar (footer navigation)

## URL Parameters

The page uses React Router params:
- `/player/:seriesId` - View series starting at episode 1
- `/player/:seriesId/:episodeId` - View specific episode

## Data Structures

### Episode Interface
```typescript
interface Episode {
  id: number
  number: number
  title: string
  thumbnail: string
  duration: string
}
```

### Series Interface
```typescript
interface Series {
  id: number
  title: string
  description: string
  tags: string[]
  language: string
  episodes: Episode[]
  poster: string
}
```

### RecommendedSeries Interface
```typescript
interface RecommendedSeries {
  id: string
  title: string
  poster: string
  tag: string
}
```

## Breadcrumb Navigation

### Container
- **Padding**: 16px 60px
- **Font Size**: 14px
- **Color**: #9CA3AF

### Elements
- **Link (GcashTV)**: Clickable, navigates to home page `/`, hover color #3B82F6
- **Separator**: ">" with margin 0 8px, color #6B7280
- **Current**: Series title, color #FFFFFF

## Main Content Layout

### Player Content Container
- **Display**: Flex row
- **Gap**: 30px
- **Margin Bottom**: 50px
- **Align Items**: flex-start

### Player Left Section
- **Flex**: 1
- **Min Width**: 0
- **Max Width**: calc(100% - 350px)

## Video Player

### Container
- **Position**: Relative
- **Background**: #000000
- **Border Radius**: 12px
- **Overflow**: Hidden
- **Box Shadow**: 0 8px 32px rgba(0, 0, 0, 0.5)
- **Aspect Ratio**: 16:9
- **Width**: 100%

### Video Element
- **Size**: 100% width and height
- **Object Fit**: Cover
- **Poster**: Series poster image
- **Click**: Toggle play/pause

### Fullscreen Styles
When video container enters fullscreen mode:
- **Border Radius**: 0
- **Aspect Ratio**: unset
- **Width**: 100vw
- **Height**: 100vh
- **Video Object Fit**: contain (to fit video within screen)
- **Vendor Prefixes**: `:fullscreen`, `:-webkit-full-screen`, `:-moz-full-screen`, `:-ms-fullscreen`

### Player Controls Overlay
- **Position**: Absolute bottom
- **Background**: linear-gradient(transparent, rgba(0, 0, 0, 0.8))
- **Padding**: 20px
- **Opacity**: 0 (hidden), 1 when visible
- **Transition**: opacity 0.3s ease
- **Auto-hide**: After 3 seconds when playing

### Progress Bar
- **Height**: 4px
- **Background**: rgba(255, 255, 255, 0.3)
- **Border Radius**: 2px
- **Cursor**: Pointer
- **Margin Bottom**: 12px
- **Filled Color**: #3B82F6

### Controls Row
- **Display**: Flex, space-between
- **Left Controls**: Play/Pause, Volume, Time display
- **Right Controls**: Speed selector, Fullscreen

### Control Buttons
- **Background**: None
- **Color**: #FFFFFF
- **Padding**: 8px
- **Border Radius**: 50%
- **Hover**: Background rgba(255, 255, 255, 0.1), Color #3B82F6
- **Icon Size**: 24px (32px for play button)

### Time Display
- **Color**: #FFFFFF
- **Font Size**: 13px
- **Font Family**: Monospace
- **Format**: "MM:SS / MM:SS"

### Speed Selector
- **Background**: rgba(0, 0, 0, 0.5)
- **Border**: 1px solid rgba(255, 255, 255, 0.2)
- **Options**: 0.25x, 0.5x, 1x, 1.25x, 1.5x, 2x, 3x

## Episode Metadata Section

### Episode Title
- **Font Size**: 22px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin**: 0 0 16px 0
- **Format**: "{Series Title} - Episode {XX}"

### Metadata Row
- **Display**: Flex
- **Gap**: 20px
- **Margin Bottom**: 16px
- **Items**: Language selector, Favorite button

### Language Selector
- **Display**: Flex with globe icon
- **Icon Size**: 18px
- **Color**: #9CA3AF
- **Options**: English, 中文, Español, Français

### Favorite Button
- **Size**: 48px × 48px
- **Border Radius**: 50%
- **Background**: #1A1A1A
- **Color**: #9CA3AF (inactive), #EF4444 (active)
- **Hover**: Background #2A2A2E, scale(1.05)
- **Icon**: Heart SVG (filled when active)

### Tag List
- **Display**: Flex wrap
- **Gap**: 10px

### Tag Pill
- **Background**: #2A2A2E
- **Color**: #9CA3AF
- **Font Size**: 13px
- **Padding**: 6px 14px
- **Border Radius**: 20px
- **Hover**: Background #3B82F6, Color #FFFFFF
- **Click**: Navigate to `/genre?category={tag}`

### Episode Description
- **Margin Top**: 20px
- **Color**: #9CA3AF
- **Font Size**: 14px
- **Line Height**: 1.7
- **Text Clamp**: 4 lines max

## Episode List Panel (Right Sidebar)

### Container
- **Width**: 320px (fixed)
- **Flex Shrink**: 0
- **Background**: #121214
- **Border Radius**: 12px
- **Padding**: 20px
- **Box Shadow**: 0 4px 20px rgba(0, 0, 0, 0.3)
- **Max Height**: 700px
- **Overflow-Y**: Auto
- **Align Self**: flex-start
- **Position**: Sticky
- **Top**: 80px

### Panel Title
- **Font Size**: 18px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin**: 0 0 16px 0

### Episode Range Selector
- **Display**: Flex
- **Gap**: 8px
- **Margin Bottom**: 16px
- **Ranges**: "1-40", "41-77"

### Range Button
- **Background**: #1A1A1E (inactive), #3B82F6 (active)
- **Color**: #9CA3AF (inactive), #FFFFFF (active)
- **Padding**: 8px 16px
- **Border Radius**: 6px
- **Font Size**: 13px

### Episode Grid
- **Display**: Grid
- **Columns**: repeat(4, 1fr)
- **Gap**: 10px

### Episode Thumbnail
- **Aspect Ratio**: 2:3
- **Border Radius**: 8px
- **Overflow**: Hidden
- **Cursor**: Pointer
- **Hover**: scale(1.05), blue glow shadow
- **Active State**: 2px blue border, blue overlay

### Episode Number Badge
- **Position**: Absolute bottom-left
- **Background**: rgba(0, 0, 0, 0.7)
- **Color**: #FFFFFF
- **Font Size**: 10px
- **Padding**: 2px 6px
- **Border Radius**: 4px
- **Format**: "EP XX"

## Recommendation Carousels

Use shared series list component. See [shared/series.md](../shared/series.md) for detailed specifications.

Two sections:
1. **You Might Like** - Filtered to exclude current series
2. **New Releases** - Filtered to exclude current series

## Confirmation Popups

### Favorite Popup
- **Overlay**: Fixed, rgba(0, 0, 0, 0.7), z-index 1000
- **Modal**:
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 32px
  - Max Width: 400px
  - Animation: fadeIn 0.2s, slideUp 0.3s
- **Icon**: 64px circle, red tint background, heart icon
- **Title**: "Add to Favorites?" - 20px, white
- **Message**: 14px, gray, line-height 1.6
- **Buttons**: Yes (blue), No (gray)

## Context Dependencies

### LanguageContext
- `t`: Translation object for i18n

### FavoritesContext
- `addFavorite()`: Add series to favorites
- `removeFavorite()`: Remove from favorites
- `isFavorite()`: Check if series is favorited

### WatchHistoryContext
- `addToHistory()`: Record episode view

## State Management

### Video Player State
| State | Type | Default | Description |
|-------|------|---------|-------------|
| isPlaying | boolean | false | Playback state |
| currentTime | number | 0 | Current position |
| duration | number | 0 | Video duration |
| volume | number | 1 | Volume level |
| isMuted | boolean | false | Mute state |
| playbackSpeed | number | 1 | Playback rate |
| showControls | boolean | true | Controls visibility |
| isFullscreen | boolean | false | Fullscreen state |

### UI State
| State | Type | Default | Description |
|-------|------|---------|-------------|
| selectedLanguage | string | 'English' | Audio language |
| episodeRange | string | '1-40' | Episode range filter |
| showFavoritePopup | boolean | false | Favorite confirmation |

## Navigation Actions

| Element | Action |
|---------|--------|
| Breadcrumb Link | Navigate to `/` |
| Episode Thumbnail | Navigate to `/player/{seriesId}/{episodeNumber}` |
| Series Card | Navigate to `/player/{seriesId}` |
| Tag Pill | Navigate to `/genre?category={tag}` |
| View More | Navigate to `/genre` |

## Side Effects

### On Series Change
- Scroll to top of page
- Reset episode to 1 (if no episodeId)

### On Episode View
- Record to watch history via context

### Controls Auto-hide
- Hide after 3 seconds when playing
- Show on mouse move
- Hide on mouse leave (if playing)

## Responsive Design

### Breakpoints

#### 1200px
- **Player Content**: Column direction
- **Player Left**: Max width 100%
- **Episode Panel**: Width 100%, max-height 400px, position relative, top 0 (removes sticky)
- **Episode Grid**: 8 columns

#### 768px (Mobile)
- **Breadcrumb**: Padding 12px 20px, font 13px
- **Player Main**: Padding 0 20px 30px
- **Video Container**: Max height 500px
- **Episode Title**: 18px
- **Metadata Row**: Flex wrap, gap 12px
- **Episode Grid**: 5 columns
- **Series Card**: 160px width
- **Section Title**: 22px

#### 480px (Small Mobile)
- **Breadcrumb**: Padding 10px 15px
- **Player Main**: Padding 0 15px 20px
- **Episode Grid**: 4 columns
- **Series Card**: 140px width
- **Section Title**: 20px
- **View More Card**: 100px width, 60px circle

## Color Palette

| Element | Color |
|---------|-------|
| Page Background | #0B0B0E |
| Video Background | #000000 |
| Panel Background | #121214 |
| Button Background | #1A1A1A |
| Tag Background | #2A2A2E |
| Primary Blue | #3B82F6 |
| Primary Blue Hover | #2563EB |
| Favorite Red | #EF4444 |
| Text White | #FFFFFF |
| Text Gray | #9CA3AF |
| Text Muted | #6B7280 |
| Progress Bar | rgba(255, 255, 255, 0.3) |
| Controls Gradient | linear-gradient(transparent, rgba(0, 0, 0, 0.8)) |

## Animations

| Animation | Properties |
|-----------|------------|
| fadeIn | opacity 0 → 1, 0.2s |
| slideUp | translateY(20px) → 0, opacity 0 → 1, 0.3s |
| Controls | opacity 0.3s ease |
| Progress | width 0.1s linear |
| Hover effects | 0.2s ease |
| Poster scale | 0.3s ease |

## Mock Data

### Series Database
17 series entries with:
- Unique IDs (featured-1, 1-16)
- Titles
- Descriptions
- Tags array
- Poster URLs (Cloudinary)

### Episodes
77 episodes per series:
- Generated dynamically
- Random durations (20-40 minutes)
- Placeholder thumbnails

### Recommended Series
8 series for "You Might Like"
8 series for "New Releases"

## Accessibility

- Video controls are keyboard accessible
- Carousel arrows have aria-labels
- Images have alt attributes
- Interactive elements have proper cursor styles
- Color contrast meets WCAG guidelines
