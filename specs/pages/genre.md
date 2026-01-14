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

## Responsive Design

### Breakpoints

#### 1200px
- **Grid**: 3 columns

#### 1024px (Tablet)
- **Sidebar**: Hidden (display: none)
- **Genre Dropdown**: Visible (replaces sidebar)
- **Grid Section**:
  - Padding: 24px 30px

#### 768px (Mobile)
- **Grid Section**:
  - Padding: 20px 16px
- **Grid**: 3 columns
- **Gap**: 12px
- **Title**: 20px
- **Card Title**: 12px
- **Card Poster Margin Bottom**: 8px

## Genre Dropdown

On tablet and mobile devices (≤1024px), the sidebar is replaced with a dropdown menu to save space. The dropdown is placed outside the main content flex container (between TopBar and content area) to avoid layout issues.

### Dropdown Container
- **Display**: None (desktop >1024px), Block (tablet and mobile ≤1024px)
- **Position**: Relative
- **Padding**: 16px
- **Border Bottom**: 1px solid #1A1A1E
- **Placement**: Between TopBar and .genre-content (not inside flex container)

### Dropdown Trigger Button
- **Display**: Flex, space-between, center aligned
- **Width**: 100%
- **Padding**: 12px 16px
- **Background**: #1A1A1E
- **Border**: 1px solid #242428
- **Border Radius**: 8px
- **Color**: #FFFFFF
- **Font Size**: 14px
- **Font Weight**: 500
- **Cursor**: Pointer
- **Transition**: border-color 0.2s ease
- **Hover**: Border color #3B82F6
- **Content**: Active genre name + dropdown arrow icon

### Dropdown Arrow Icon
- **Size**: 16px × 16px
- **Stroke**: currentColor
- **Stroke Width**: 2
- **Transition**: transform 0.2s ease
- **Open State**: rotate(180deg)

### Dropdown Menu
- **Position**: Absolute
- **Top**: calc(100% - 8px)
- **Left/Right**: 16px
- **Background**: #151518
- **Border**: 1px solid #242428
- **Border Radius**: 8px
- **Box Shadow**: 0 8px 24px rgba(0, 0, 0, 0.4)
- **Z-Index**: 1001
- **Max Height**: 300px
- **Overflow-Y**: Auto

### Dropdown Item
- **Display**: Block
- **Width**: 100%
- **Padding**: 12px 16px
- **Background**: None
- **Border**: None
- **Color**: #9CA3AF
- **Font Size**: 14px
- **Text Align**: Left
- **Cursor**: Pointer
- **Transition**: background-color 0.2s ease, color 0.2s ease

### Dropdown Item Hover
- **Background**: rgba(255, 255, 255, 0.05)
- **Color**: #FFFFFF

### Dropdown Item Active
- **Color**: #3B82F6
- **Background**: rgba(59, 130, 246, 0.1)

#### 480px (Small Mobile)
- **Header**: Column direction, left aligned, 8px gap
- **Card Title**: 13px
