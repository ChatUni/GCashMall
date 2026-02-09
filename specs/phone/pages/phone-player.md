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

### Action Buttons
- Positioned to the right of the title
- Horizontal flex layout with 8 pixel gap
- 48x48 pixel circular buttons (large variant)
- Transparent background
- Active state: background rgba(255, 255, 255, 0.1)
- SVG icons: 32x32 pixels

#### Favorite Button
- Heart icon (SVG, 32x32)
- Default state: gray stroke (#9CA3AF), no fill
- Active state (favorited): red fill and stroke (#ef4444)
- On click:
  - If not logged in: show login modal
  - If logged in:
    - Check localStorage for `hideFavoriteModal`
    - If `'true'`: directly perform add/remove action
    - Otherwise: show Favorite Confirmation Modal

#### Lock/Unlock Button
- Lock icon (SVG, 32x32)
- Always visible (shows purchase status)
- Locked state (not purchased): gray stroke (#9CA3AF), no fill
- Unlocked state (purchased): orange fill and stroke (#F97316)
- On click (when locked):
  - If not logged in: show login modal
  - If logged in: show purchase popup

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

## Confirmation Modals

### Favorite Confirmation Modal
- **Overlay**: Fixed, rgba(0, 0, 0, 0.8), z-index 1000
- **Modal**:
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 24px
  - Max Width: 320px
  - Text Align: Center
- **Icon**: 48px heart emoji (❤️ for add, 💔 for remove)
- **Title**:
  - Adding: "Add to Favorites" - 18px, white
  - Removing: "Remove from Favorites" - 18px, white
- **Series Info Box**:
  - Background: #242428
  - Border Radius: 8px
  - Padding: 12px
  - Margin Bottom: 16px
  - **Series Name**: 14px, font-weight 500, white
  - **Episode Info**: 12px, gray (#9CA3AF)
- **Message**:
  - Adding: "Add this series to your favorites?"
  - Removing: "Remove this series from your favorites?"
  - Font Size: 13px, Color: #9CA3AF, Line Height: 1.5
- **Don't Show Again Checkbox**:
  - Display: Flex, centered, gap 8px
  - Margin Bottom: 20px
  - Cursor: Pointer
  - User Select: None
  - **Checkbox Input**:
    - Size: 18px × 18px
    - Accent Color: #3B82F6
    - Cursor: Pointer
  - **Label**: "Don't show again" - 14px, #9CA3AF
- **Buttons**:
  - Confirm (blue, full width, 15px font, 14px padding) - triggers favorite action
  - Cancel (gray #2a2a2e, full width, 15px font, 14px padding) - closes modal without action
- **Persistence**:
  - When "Don't show again" is checked and Confirm is clicked:
    - Save preference to localStorage key: `hideFavoriteModal` = `'true'`
  - On subsequent favorite button clicks:
    - Check localStorage for `hideFavoriteModal`
    - If `'true'`: directly perform add/remove action without showing modal
    - If not set or `'false'`: show confirmation modal

### Purchase Popup
- **Overlay**: Fixed, rgba(0, 0, 0, 0.8), z-index 1000
- **Modal**:
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 24px
  - Max Width: 320px
  - Text Align: Center
- **Icon**: 40px lock emoji (🔓)
- **Title**: "Unlock Episode" - 18px, white
- **Message**: "Unlock this episode to continue watching" - 13px, gray
- **Episode Info Box**:
  - Background: #242428
  - Border Radius: 8px
  - Padding: 12px
  - **Series Name**: 14px, font-weight 500, white
  - **Episode Name**: 12px, gray (#9CA3AF)
- **Price Display**:
  - GCash logo (24px)
  - Amount: "0.10" - 28px, bold, #3B82F6
- **Balance Display**:
  - Label: "Your balance:" - 13px, gray
  - Amount: Current wallet balance
- **Buttons**:
  - Confirm Purchase (blue, full width)
  - Cancel (gray, full width)

### Purchase Result Modal
- **Overlay**: Fixed, rgba(0, 0, 0, 0.8), z-index 1000
- **Modal**:
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 24px
  - Max Width: 320px
  - Text Align: Center
- **Result Icon**:
  - Size: 56px × 56px
  - Border Radius: 50%
  - **Success**: Green background (#22C55E) with white checkmark
  - **Error**: Red background (#EF4444) with white X
- **Result Title**:
  - Font Size: 18px
  - Font Weight: 600
  - **Success**: "Unlock Episode Successfully!" - color #22C55E
  - **Error**: "Unlock Failed" - color #EF4444
- **Result Message**:
  - Font Size: 13px
  - Color: #9CA3AF
- **Button**:
  - Full width, 15px font, 14px padding
  - **Success**: Green background (#22C55E)
  - **Error**: Red background (#EF4444), navigates to wallet if balance issue

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
| Favorite Button | Tap | Show Favorite Confirmation Modal (or toggle directly if "Don't show again" was checked) |
| Lock Button | Tap | Show Purchase Popup (if not purchased) |

## Internationalization

### Labels
- English: "Episodes", "Episode", "Related", "Show more", "Show less"
- Chinese: "剧集", "第X集", "相关推荐", "展开", "收起"
