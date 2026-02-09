# Phone Search Page Specification

## Overview

The Phone Search page provides a dedicated search interface for finding series by title or tags.

## Page Structure

### Layout
- PhoneLayout wrapper
- Back button visible
- Title: "Search"
- No search icon in header
- Bottom navigation visible

### Content Sections
1. Search Input (sticky)
2. Recent Searches / Search Results

## Search Input

### Container
- **Padding**: 16px
- **Position**: Sticky, top: 56px
- **Background**: #0B0B0E
- **Z-Index**: 50

### Input Wrapper
- **Display**: Flex
- **Background**: #1A1A1A
- **Border Radius**: 24px
- **Height**: 48px
- **Border**: 1px solid rgba(255, 255, 255, 0.1)
- **Focus**: Border #3B82F6

### Search Icon
- **Size**: 20px
- **Color**: #9CA3AF
- **Margin**: 0 12px

### Input Field
- **Flex**: 1
- **Background**: Transparent
- **Border**: None
- **Font Size**: 16px
- **Color**: #FFFFFF
- **Placeholder Color**: #9CA3AF

### Clear Button
- **Size**: 20px
- **Color**: #9CA3AF
- **Margin Right**: 12px
- **Display**: When input has value

## Recent Searches

### Section Header
- **Display**: Flex, space-between
- **Padding**: 0 16px
- **Margin Bottom**: 12px

### Title
- **Font Size**: 16px
- **Font Weight**: 600
- **Color**: #FFFFFF

### Clear All
- **Font Size**: 14px
- **Color**: #3B82F6

### Recent Item
- **Display**: Flex, center aligned
- **Gap**: 12px
- **Padding**: 12px 16px
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.05)

### Item Icon
- **Size**: 16px
- **Color**: #9CA3AF

### Item Text
- **Font Size**: 14px
- **Color**: #FFFFFF
- **Flex**: 1

### Item Delete
- **Size**: 16px
- **Color**: #9CA3AF

## Search Results

### Results Header
- **Padding**: 16px
- **Font Size**: 14px
- **Color**: #9CA3AF

### Results Grid
- **Display**: Grid
- **Grid Template**: repeat(3, 1fr)
- **Gap**: 12px
- **Padding**: 0 16px 16px

### No Results
- **Display**: Flex column, centered
- **Padding**: 48px 16px
- **Icon Size**: 48px, opacity 0.3
- **Text Color**: #9CA3AF

## Search Behavior

### Trigger
- Debounced: 300ms delay
- Or keyboard submit

### Storage
- **Key**: gcashtv-recent-searches
- **Max Items**: 10

## URL Parameters

### Query: q
- **Example**: `/search?q=romance`
- Pre-fills input

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Input | Type | Debounced search |
| Clear | Tap | Clear input |
| Recent Item | Tap | Perform search |
| Delete | Tap | Remove from history |
| Clear All | Tap | Clear all history |
| Series Card | Tap | Navigate to player |

## Internationalization

| Key | English | Chinese |
|-----|---------|---------|
| search | Search | 搜索 |
| searchPlaceholder | Search series... | 搜索剧集... |
| recentSearches | Recent Searches | 最近搜索 |
| clearAll | Clear All | 清除全部 |
| noResults | No results found | 未找到结果 |
