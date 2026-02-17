# Phone Player Page Specification

## Overview

The Phone Player page provides a mobile-optimized video playback experience with series information, episode selection, and related content. This page shares core behavior with the desktop Player page - see [`player.md`](../../pages/player.md) for shared specifications.

## Shared Specifications

This page shares core functionality with the [desktop Player page](../../pages/player.md). The following sections are identical and are not repeated here:
- **Video Playing Restriction** - Time limit (3 seconds) for unpurchased episodes
- **Trial Viewing System** - Trial logic, state tracking, TIME_LIMIT constant (configurable, default 3 seconds)
- **Episode Purchase System** - Purchase price (0.1 GCash), purchase flow, purchased episode storage
- **Purchase State Synchronization** - Backend persistence, frontend store updates
- **Purchase Check Logic** - Matching by seriesId AND (episodeId OR episodeNumber)
- **Purchase Dialog behavior** - Purchase flow, validation, API calls

Refer to [`player.md`](../../pages/player.md) for full details on these systems.

This document focuses on mobile-specific UI/UX differences.

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
4. You Might Like
5. New Releases

## Video Player Section

### Container
- Full width of screen
- 16:9 aspect ratio
- Black background

### Back Button
- Position: absolute, top-left corner (16px from top and left)
- Size: 44x44 pixels, circular (border-radius 50%)
- Background: semi-transparent black (rgba(0, 0, 0, 0.5))
- Icon: Left arrow SVG, 28x28 pixels, white color (#ffffff), stroke-width 2.5
- Z-index: 10 (above video)
- Hover state: Arrow turns blue (#3B82F6)
- Active state: Scale 0.95, arrow turns darker blue (#2563EB)
- Transition: 0.2s ease for color and transform
- On tap: Navigate back to previous page

### Video Display
- Fills container
- Maintains aspect ratio
- Native playback controls
- Video URL: `https://player.mediadelivery.net/embed/{BUNNY_LIBRARY_ID}/{videoId of the episode}`

### On Load Behavior
- Find the last watched episode in the series from user's watch list
- Default to first episode if not found in watch list
- If series not in watch list, call the add to watch list API with current series and first episode
- Use the Bunny Stream Playback Control API to capture time updates from the iframe

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
- Locked state (not purchased): gray stroke (#9CA3AF), no fill
- Unlocked state (purchased): hide the lock
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
- "Episodes (count)" title with episode count
- 16 pixel font, bold
- White text
- Collapsible toggle with arrow icon
- **Default state: Expanded** (episodes visible by default)

### Episode Grid
- 5 columns of episode thumbnails
- 8 pixel gap between thumbnails
- Horizontal padding
- **Stays expanded when clicking an episode** (does not collapse)

### Episode Thumbnail
- **Aspect Ratio**: 2:3
- **Border Radius**: 6px
- **Overflow**: Hidden
- **Cursor**: Pointer

#### Thumbnail Image
- Default: `https://vz-918d4e7e-1fb.b-cdn.net/{videoId}/thumbnail.jpg`
- On hover/press: `https://vz-918d4e7e-1fb.b-cdn.net/{videoId}/preview.webp`

#### Episode States
- **Default (unselected)**: No border
- **Current (selected)**: 2px blue border (#3B82F6)
- **Purchased**: Shows top-right green ribbon indicator

#### Episode Number Badge
- **Position**: Absolute bottom-left
- **Background**: rgba(0, 0, 0, 0.7)
- **Color**: #FFFFFF
- **Font Size**: 10px
- **Padding**: 2px 6px
- **Border Radius**: 4px
- **Format**: "EP XX"

#### Interaction
- On tap: play the episode and call the add to watch list API with current series and current episode

## You Might Like Section

### Section Header
- "You Might Like" title (English) / "猜你喜欢" (Chinese)
- 16 pixel font, bold

### Carousel
- Horizontal scrolling series cards
- Shows recommended series based on viewing history
- Excludes current series from display

## New Releases Section

### Section Header
- "New Releases" title (English) / "最新上线" (Chinese)
- 16 pixel font, bold

### Carousel
- Horizontal scrolling series cards
- Shows recently added series
- Excludes current series from display

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
- `/player/:seriesId` - View series starting at episode 1 (or last watched)
- `/player/:seriesId/:episodeId` - View specific episode

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
| Video (at time limit) | Auto | Pause video, show purchase popup (if episode not purchased) |
| Fullscreen | Tap | Enter fullscreen mode |
| Episode Toggle | Tap | Expand/collapse episode list |
| Episode Thumbnail | Tap | Switch to that episode, call add to watch list API (list stays expanded) |
| Tag | Tap | Navigate to `/genre?category={tag}` |
| Series Card | Tap | Navigate to `/player/{seriesId}` |
| Back | Tap | Return to previous page |
| Show More | Tap | Expand description |
| Favorite Button | Tap | Show Favorite Confirmation Modal (or toggle directly if "Don't show again" was checked) |
| Lock Button | Tap | Show Purchase Popup (if not purchased) |

## Internationalization

### Labels
- English: "Episodes", "Episode", "You Might Like", "New Releases", "Show more", "Show less"
- Chinese: "剧集", "第X集", "猜你喜欢", "最新上线", "展开", "收起"
