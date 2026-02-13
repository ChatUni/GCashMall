# Phone Search Page Specification

## Overview

The Phone Search page provides a dedicated search interface for finding series by title or tags.

## Page Structure

### Layout
- Uses the standard phone layout
- Back button and "Search" title in header
- No search icon in header (search is on page)
- Bottom navigation visible

### Content Sections
1. Search Input (sticky)
2. Recent Searches (when input empty)
3. Search Results (when searching)

## Search Input

### Container
- Sticky position below header
- Dark background
- Horizontal padding

### Input Field
- Full width rounded rectangle
- Dark gray background
- Subtle border, blue when focused
- 48 pixel height for easy tapping
- 16 pixel font (prevents zoom on iOS)

### Search Icon
- Positioned inside input on left
- Gray color
- 20 pixel size

### Input Text
- White text color
- Placeholder: "Search series..." / "搜索剧集..."

### Clear Button
- Appears when input has text
- Positioned inside input on right
- Gray X icon
- Tapping clears the input

## Recent Searches

### Display Condition
- Shown when search input is empty
- Shown before any search is performed

### Section Header
- "Recent Searches" title on left
- "Clear All" link on right (blue text)

### Recent Item
- Clock icon on left (gray)
- Search term text in middle (white)
- Delete X button on right (gray)
- Subtle bottom border between items

### Behavior
- Tapping an item performs that search
- Tapping delete removes just that item
- Tapping "Clear All" removes all history
- Maximum 10 recent searches stored

## Search Results

### Display Condition
- Shown when search query exists
- Shown after search is performed

### Results Header
- Shows count and query
- Example: "12 results for 'romance'"
- Gray text, smaller font

### Results Grid
- Same layout as Genre page grid
- 2-3 columns based on screen width
- 12 pixel gap between cards

### No Results State
- Centered in content area
- Large search icon (faded)
- "No results found" message
- "Try different keywords" suggestion

## Search Behavior

### Trigger
- Automatic search after typing stops (300ms delay)
- Or immediate search on keyboard submit

### Results
- Searches series titles and tags
- Returns matching series

### History Storage
- Saves successful searches locally
- Maximum 10 items
- Most recent first

## URL Parameters

### Query Parameter
- URL includes search query
- Allows sharing search links
- Pre-fills input when navigating with query

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Back Button | Tap | Return to previous page |
| Search Input | Type | Perform debounced search |
| Clear Button | Tap | Clear input text |
| Recent Item | Tap | Perform that search |
| Recent Delete | Tap | Remove from history |
| Clear All | Tap | Remove all history |
| Series Card | Tap | Navigate to player |

## Internationalization

### Labels
- English: "Search", "Search series...", "Recent Searches", "Clear All", "No results found", "Try different keywords"
- Chinese: "搜索", "搜索剧集...", "最近搜索", "清除全部", "未找到结果", "试试其他关键词"
