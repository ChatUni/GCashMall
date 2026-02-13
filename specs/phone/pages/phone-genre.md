# Phone Genre Page Specification

## Overview

The Phone Genre page displays series organized by categories in a grid layout with a filter button that opens a bottom sheet modal for category selection.

## Page Structure

### Layout
- **Wrapper**: PhoneLayout component
- **Header**: Logo on left, search icon on right
- **Navigation**: Bottom navigation visible
- **Scroll**: Vertical scrolling content

### Content Sections
1. Filter Bar (with filter button)
2. Series Grid

## Filter Bar

### Container
- **Display**: Flex, space-between, center aligned
- **Margin Bottom**: 16px

### Filter Button
- **Display**: Flex, center aligned
- **Gap**: 8px
- **Background**: #1A1A1A
- **Color**: #FFFFFF
- **Font Size**: 14px
- **Font Weight**: 500
- **Padding**: 10px 16px
- **Border Radius**: 8px
- **Border**: 1px solid rgba(255, 255, 255, 0.1)

### Filter Button Icons
- **Filter Icon**: 18px, color #3B82F6
- **Chevron Icon**: 16px, color #9CA3AF

### Results Count
- **Font Size**: 13px
- **Color**: #9CA3AF

## Filter Modal (Bottom Sheet)

### Overlay
- **Position**: Fixed, full screen
- **Background**: rgba(0, 0, 0, 0.6)
- **Z-Index**: 200
- **Display**: Flex, align-items: flex-end
- **Animation**: fadeIn 0.2s ease

### Modal Container
- **Width**: 100%
- **Max Height**: 70vh
- **Background**: #121214
- **Border Radius**: 16px 16px 0 0
- **Animation**: slideUp 0.3s ease

### Modal Header
- **Display**: Flex, space-between, center aligned
- **Padding**: 16px 20px
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.1)

### Modal Title
- **Font Size**: 18px
- **Font Weight**: 600
- **Color**: #FFFFFF

### Close Button
- **Size**: 36px × 36px
- **Background**: Transparent
- **Border Radius**: 50%
- **Icon Size**: 24px
- **Color**: #9CA3AF

### Modal List
- **Max Height**: calc(70vh - 70px)
- **Overflow-Y**: Auto
- **Padding**: 8px 0

### Modal Item
- **Display**: Flex, space-between, center aligned
- **Width**: 100%
- **Padding**: 14px 20px
- **Background**: Transparent
- **Color**: #FFFFFF
- **Font Size**: 15px

### Modal Item (Active)
- **Color**: #3B82F6
- **Checkmark Icon**: 20px, color #3B82F6

## Series Grid

### Container
- **Display**: Grid
- **Gap**: 12px
- **Padding**: 0 (already in page padding)
- **Align Items**: start (ensures cards align at top of each row)

### Grid Card Overrides
- **Width**: 100% (fills grid cell)
- **Min Width**: 0 (allows proper shrinking)

### Grid Template (>360px)
- **Columns**: 3
- **Template**: repeat(3, 1fr)

### Grid Template (240px - 360px)
- **Columns**: 2
- **Template**: repeat(2, 1fr)

### Grid Template (≤240px)
- **Columns**: 1
- **Template**: 1fr
- **Card Max Width**: 150px (prevents cards from being too wide)

## Categories

| Key | English | Chinese |
|-----|---------|---------|
| all | All | 全部 |
| romance | Romance | 爱情 |
| action | Action | 动作 |
| comedy | Comedy | 喜剧 |
| drama | Drama | 剧情 |
| thriller | Thriller | 惊悚 |
| fantasy | Fantasy | 奇幻 |

## URL Parameters

### Query: category
- **Example**: `/genre?category=romance`
- **Default**: "all"

## Data Loading

### Loading State
- **Display**: Skeleton grid (6 items)
- **Filter Bar**: Visible and interactive

### Empty State
- **Display**: Centered message with icon
- **Icon**: 🎬 (48px, 50% opacity)
- **Text**: "No series found"
- **Color**: #9CA3AF

## Skeleton Loading

### Skeleton Image
- **Aspect Ratio**: 2:3
- **Background**: Shimmer animation
- **Border Radius**: 8px

### Skeleton Title
- **Width**: 80%
- **Height**: 14px
- **Border Radius**: 4px

### Skeleton Tag
- **Width**: 50%
- **Height**: 12px
- **Border Radius**: 4px

## Animations

### Shimmer
- **Duration**: 1.5s infinite
- **Background**: linear-gradient sweep

### Modal Fade In
- **Duration**: 0.2s ease
- **From**: opacity 0
- **To**: opacity 1

### Modal Slide Up
- **Duration**: 0.3s ease
- **From**: translateY(100%)
- **To**: translateY(0)

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Filter Button | Tap | Open filter modal |
| Modal Overlay | Tap | Close modal |
| Close Button | Tap | Close modal |
| Category Item | Tap | Select category, close modal, update URL |
| Series Card | Tap | Navigate to `/player/{seriesId}` |
| Search Icon | Tap | Navigate to `/search` |

## Internationalization

| Key | English | Chinese |
|-----|---------|---------|
| genre | Genre | 分类 |
| allGenres | All | 全部 |
| noSeries | No series found | 暂无内容 |
| resultsCount | {count} results | {count} 个结果 |
