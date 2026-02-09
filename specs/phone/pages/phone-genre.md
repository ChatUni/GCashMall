# Phone Genre Page Specification

## Overview

The Phone Genre page displays series organized by categories in a grid layout with horizontal category filtering tabs.

## Page Structure

### Layout
- PhoneLayout wrapper
- No back button
- Search icon visible
- Bottom navigation visible

### Content Sections
1. Category Filter (sticky)
2. Series Grid

## Category Filter

### Container
- **Position**: Sticky, top: 56px (below header)
- **Background**: #0B0B0E
- **Padding**: 12px 0
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.05)
- **Z-Index**: 50

### Scroll Container
- **Display**: Flex
- **Gap**: 8px
- **Overflow-X**: Auto
- **Padding**: 0 16px
- **Scrollbar**: Hidden

### Category Tab
- **Background**: #1A1A1A (default), #3B82F6 (active)
- **Color**: #9CA3AF (default), #FFFFFF (active)
- **Font Size**: 13px
- **Font Weight**: 500
- **Padding**: 8px 16px
- **Border Radius**: 16px
- **White Space**: nowrap
- **Cursor**: Pointer
- **Transition**: all 0.2s ease

## Series Grid

### Container
- **Display**: Grid
- **Gap**: 12px
- **Padding**: 16px

### Grid Template
- **≤375px**: repeat(2, 1fr)
- **>375px**: repeat(3, 1fr)

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
- Skeleton grid
- Category tabs visible

### Empty State
- "No series found" message
- Suggest different category

## Infinite Scroll

- Load more on scroll
- Loading indicator at bottom
- Stop when all loaded

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Category Tab | Tap | Filter by category |
| Series Card | Tap | Navigate to player |

## Internationalization

| Key | English | Chinese |
|-----|---------|---------|
| genre | Genre | 分类 |
| all | All | 全部 |
| noResults | No series found | 暂无内容 |
