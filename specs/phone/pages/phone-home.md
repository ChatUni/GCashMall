# Phone Home Page Specification

## Overview

The Phone Home page is the main landing page for the mobile UI, featuring a hero banner showcasing featured content and horizontal carousels of recommended series.

## Page Structure

### Layout
- Uses the standard phone layout
- Header shows logo on left, "Home" title in center, search icon on right
- Bottom navigation visible
- Vertically scrolling content

### Content Sections
1. Hero Banner (featured series)
2. "You Might Like" Carousel
3. "New Releases" Carousel

## Hero Banner

### Container
- Full width of the screen
- 16:9 aspect ratio
- Positioned at the top of content

### Background Image
- Featured series poster as background
- Covers entire container
- Centered positioning

### Gradient Overlay
- Dark gradient from bottom to top
- Allows text to be readable over image
- Covers bottom 60% of banner

### Content Overlay
- Positioned at bottom of banner
- Contains title, tags, and play button
- Horizontal padding for content

### Hero Title
- 20 pixel font, bold weight
- White text color
- Maximum 2 lines, truncated if longer

### Hero Tags
- Horizontal row of tag pills
- Semi-transparent white background
- White text, small font
- Wraps to multiple lines if needed

### Play Button
- Blue background with white text
- Play icon followed by "Play" text
- Rounded pill shape
- Prominent size for easy tapping

## Series Carousels

### "You Might Like" Section
- Title: "You Might Like" (English) / "猜你喜欢" (Chinese)
- Shows recommended series based on viewing history
- Horizontal scrolling carousel of series cards

### "New Releases" Section
- Title: "New Releases" (English) / "最新上线" (Chinese)
- Shows recently added series
- Horizontal scrolling carousel of series cards

## Data Loading

### Initial Load
- Fetches featured series for hero banner
- Fetches recommended series list
- Fetches new releases list

### Loading State
- Shows loading indicator or skeleton UI
- Centered in content area

### Error State
- Shows error message
- Provides retry option

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Hero Banner | Tap | Navigate to featured series |
| Play Button | Tap | Navigate to featured series player |
| Hero Tag | Tap | Navigate to genre with that tag |
| Series Card | Tap | Navigate to series player |
| Search Icon | Tap | Navigate to search page |

## Internationalization

### Section Titles
- English: "You Might Like", "New Releases", "Play"
- Chinese: "猜你喜欢", "最新上线", "播放"
