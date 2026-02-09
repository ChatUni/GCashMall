# Phone Player Page Specification

## Overview

The Phone Player page provides a mobile-optimized video playback experience with series information, episode selection, and related content.

## Page Structure

### Layout
- Uses the standard phone layout
- Back button and series title in header
- Search icon visible
- Bottom navigation visible (hidden in fullscreen)

### Content Sections
1. Video Player
2. Series Information
3. Episode List
4. Related Series

## Video Player Section

### Container
- Full width of screen
- 16:9 aspect ratio
- Black background

### Video Display
- Fills container
- Maintains aspect ratio
- Native playback controls

### Fullscreen Button
- Positioned in bottom-right corner
- Semi-transparent dark background
- Expand icon
- Tapping enters fullscreen mode

### Loading State
- Centered loading spinner
- Black background

### Error State
- Error message displayed
- Retry button available

## Series Information Section

### Container
- Below video player
- Horizontal padding
- Subtle bottom border

### Title
- 18 pixel font, bold
- White text
- Full series title

### Meta Information
- Horizontal row of details
- Gray text, smaller font
- Includes: episode count, view count, release year

### Tags
- Horizontal row of tag pills
- Dark gray background
- Gray text
- Tapping a tag navigates to genre

### Description
- Gray text, readable line height
- Expandable with "Show more" / "Show less"
- Default shows 3 lines

## Episode List Section

### Section Header
- "Episodes" title
- 16 pixel font, bold
- White text

### Episode Grid
- 5 columns of episode buttons
- 8 pixel gap between buttons
- Horizontal padding

### Episode Button
- Square shape
- Episode number displayed
- Different colors for states:
  - Default: Dark gray background, white text
  - Current: Blue background, white text
  - Watched: Dark gray background, gray text
  - Locked: Dark gray background, lock icon

### Locked Episodes
- Shows lock icon instead of number
- Tapping shows purchase dialog

## Related Series Section

### Section Header
- "Related" title
- 16 pixel font, bold

### Carousel
- Horizontal scrolling series cards
- Shows series with similar tags

## Video Playback

### Controls
- Play/pause
- Progress bar with seek
- Volume (where supported)
- Fullscreen toggle

### Progress Tracking
- Saves position every 10 seconds
- Resumes from last position on return

### Watch History
- Records watched episodes
- Stores series, episode, timestamp, progress

## Fullscreen Mode

### Behavior
- Landscape orientation preferred
- Hides header and navigation
- Video fills entire screen
- Tap to show/hide controls

### Exit Methods
- Tap exit/minimize button
- Press device back button
- Rotate to portrait orientation

## URL Structure

### Route Format
- Includes series ID
- Optionally includes episode number
- Defaults to episode 1 or last watched

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Video | Tap | Toggle play/pause |
| Fullscreen | Tap | Enter fullscreen mode |
| Episode Button | Tap | Switch to that episode |
| Tag | Tap | Navigate to genre with tag |
| Related Card | Tap | Navigate to that series |
| Back | Tap | Return to previous page |
| Show More | Tap | Expand description |

## Internationalization

### Labels
- English: "Episodes", "Episode", "Related", "Show more", "Show less"
- Chinese: "剧集", "第X集", "相关推荐", "展开", "收起"
