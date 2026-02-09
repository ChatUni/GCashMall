# Phone Genre Page Specification

## Overview

The Phone Genre page displays series organized by categories in a grid layout with horizontal category filtering tabs.

## Page Structure

### Layout
- Uses the standard phone layout
- Logo and search icon in header
- Bottom navigation visible
- Vertically scrolling content

### Content Sections
1. Category Filter Tabs (sticky)
2. Series Grid

## Category Filter

### Container
- Sticky position below header
- Dark background matching app theme
- Subtle bottom border
- Horizontal scrolling for many categories

### Scroll Area
- Horizontal scrolling tab row
- Tabs arranged left to right
- Padding at start and end
- Scrollbar hidden

### Category Tab
- Pill-shaped buttons
- Dark gray background (default)
- Blue background (active/selected)
- Gray text (default)
- White text (active)
- 13 pixel font, medium weight
- Horizontal padding for comfortable tapping
- No line breaks (single line)

### Available Categories
- All (shows everything)
- Romance
- Action
- Comedy
- Drama
- Thriller
- Fantasy
- And other genre tags from the database

## Series Grid

### Container
- Fills remaining space below filter
- Horizontal padding matching app style
- Vertical padding for spacing

### Grid Layout
- 2 columns on smaller phones (375 pixels or less)
- 3 columns on larger phones
- 12 pixel gap between cards
- Cards fill available width in their column

### Grid Items
- Uses Phone Series Card component
- Responsive width based on column count
- Maintains 2:3 aspect ratio for posters

## URL Parameters

### Category Parameter
- URL can include category filter
- Example: Navigating from a tag sets the category
- Default shows "All" if no parameter

## Data Loading

### Initial Load
- Fetches all available categories
- Fetches series for selected category

### Category Change
- Updates URL parameter
- Fetches series for new category
- Scrolls content to top

### Loading State
- Shows skeleton grid while loading
- Category tabs remain visible and interactive

### Empty State
- Shows "No series found" message
- Suggests trying a different category

## Infinite Scroll (Optional)

- Loads more series as user scrolls down
- Shows loading indicator at bottom
- Stops when all series are loaded

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Category Tab | Tap | Filter series by that category |
| Series Card | Tap | Navigate to series player |
| Scroll | Swipe up/down | Browse through series |
| Search Icon | Tap | Navigate to search page |

## Internationalization

### Labels
- English: "Genre", "All", "No series found"
- Chinese: "分类", "全部", "暂无内容"

### Category Names
Categories are translated based on the selected language.
