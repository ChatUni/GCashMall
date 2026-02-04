# Player Page Specification

## Overview

The Player page is the video playback interface for GCashTV, featuring a video player with custom controls, episode metadata, an episode list sidebar, and recommendation carousels. It supports favorites, watch history tracking, and social sharing functionality.

## Page Structure

### Layout
- **Container**: Full viewport height, flexbox column layout
- **Background**: Dark theme (#0B0B0E)
- **Max Width**: 1600px (centered)
- **Padding**: 0 60px 40px

### Components Used
- TopBar (header navigation)
- BottomBar (footer navigation)

## URL Parameters

The page uses React Router params:
- `/player/:seriesId` - View series starting at episode 1
- `/player/:seriesId/:episodeId` - View specific episode

## Breadcrumb Navigation

### Container
- **Padding**: 16px 60px
- **Font Size**: 14px
- **Color**: #9CA3AF

### Elements
- **Link (GcashTV)**: Clickable, hover color #3B82F6
- **Separator**: ">" with margin 0 8px, color #6B7280
- **Current**: Series title, color #FFFFFF

## Main Content Layout

### Player Content Container
- **Display**: Flex row
- **Gap**: 30px
- **Margin Bottom**: 50px

### Player Left Section
- **Flex**: 1
- **Min Width**: 0

## Video Player

### Container
- **Position**: Relative
- **Background**: #000000
- **Border Radius**: 12px
- **Overflow**: Hidden
- **Box Shadow**: 0 8px 32px rgba(0, 0, 0, 0.5)
- **Aspect Ratio**: 16:9
- **Width**: 100%

### Video Element
- **Size**: 100% width and height
- **Object Fit**: Cover
- **Poster**: Series poster image
- **Click**: Toggle play/pause

### Player Controls Overlay
- **Position**: Absolute bottom
- **Background**: linear-gradient(transparent, rgba(0, 0, 0, 0.8))
- **Padding**: 20px
- **Opacity**: 0 (hidden), 1 when visible
- **Transition**: opacity 0.3s ease
- **Auto-hide**: After 3 seconds when playing

### Progress Bar
- **Height**: 4px
- **Background**: rgba(255, 255, 255, 0.3)
- **Border Radius**: 2px
- **Cursor**: Pointer
- **Margin Bottom**: 12px
- **Filled Color**: #3B82F6

### Controls Row
- **Display**: Flex, space-between
- **Left Controls**: Play/Pause, Volume, Time display
- **Right Controls**: Speed selector, Fullscreen

### Control Buttons
- **Background**: None
- **Color**: #FFFFFF
- **Padding**: 8px
- **Border Radius**: 50%
- **Hover**: Background rgba(255, 255, 255, 0.1), Color #3B82F6
- **Icon Size**: 24px (32px for play button)

### Time Display
- **Color**: #FFFFFF
- **Font Size**: 13px
- **Font Family**: Monospace
- **Format**: "MM:SS / MM:SS"

### Speed Selector
- **Background**: rgba(0, 0, 0, 0.5)
- **Border**: 1px solid rgba(255, 255, 255, 0.2)
- **Options**: 0.25x, 0.5x, 1x, 1.25x, 1.5x, 2x, 3x

### Interaction

- on load:
  - find the last watched episode in the series in the user's watch list, default to first episode if not found
  - play video https://player.mediadelivery.net/embed/{BUNNY_LIBRARY_ID}/{videoId of the episode}
  - if series not in watch list, call the add to watch list API with current series and first episode

### Video Playing Restriction

- Time Limit (TL) = 3 seconds
- if user is not logged in, or if the logged in user hasn't purchased the current episode, only the first TL seconds can be played, when the video play reaches TL, or if the user tries to play/jump pass TL, stop playing and show the purchase dialog
- in order to capture time updates from a Bunny Stream iframe, use the Bunny Stream Playback Control API

## Purchase Dialog

Episode Cost = 1 GCash

### Layout

- "You must purchase the episode in order to continue watching. It will cost {EC} GCash."
- "Do you want to purchase?"
- "Purchase" button (green), "Cancel" button (red)

### Interaction

- on purchase button click:
  - if the user is not logged in, show the log in dialog
  - if the this is not enough GCash in the user's wallet, show message "You don't have enough GCash, please top up first", then take user to the wallet section in the account page (/account?tab=wallet)
  - otherwise, call the purchase episode API:
    - on success:
      - deduct EC GCash from the user's wallet
      - add it to the user's purchase history
      - show the successful message in toast notification
      - close the dialog
      - continue playing
    - on fail, show the error in toast notification
- on close button click: close the dialog

## Episode Metadata Section

### Episode Title
- **Font Size**: 22px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin**: 0 0 16px 0
- **Format**: "{Series Title} - Episode {XX}"

### Metadata Row
- **Display**: Flex
- **Gap**: 20px
- **Margin Bottom**: 16px
- **Items**: Language selector, Favorite button

#### Language Selector
- **Display**: Flex with globe icon
- **Icon Size**: 18px
- **Styling**: Flat dark theme select (see Global Style Specification)
  - Background: #1A1A1E
  - Border: 1px solid #2A2A2E
  - Border Radius: 6px
  - Padding: 6px 28px 6px 10px
  - Color: #FFFFFF
  - Custom dropdown arrow (SVG-based)
  - Hover: Border #3B82F6, Background #242428
  - Focus: Border #3B82F6 with blue glow
- **Options**: English, 中文, Español, Français

#### Action Buttons Container
- **Display**: Flex
- **Gap**: 12px
- **Align Items**: Center

#### Favorite Button
- **Size**: 48px × 48px
- **Border Radius**: 50%
- **Background**: #1A1A1A
- **Color**: #9CA3AF (inactive), #EF4444 (active)
- **Hover**: Background #2A2A2E, scale(1.05)
- **Icon**: Heart SVG (filled when active)
- on click:
  - Check localStorage for `hideFavoriteModal` preference
  - If `hideFavoriteModal` is `'true'`:
    - inactive: directly call add to favorite API, change to active
    - active: directly call remove from favorite API, change to inactive
  - If `hideFavoriteModal` is not set or `'false'`:
    - Show Favorite Confirmation Modal (see Confirmation Popups section)

#### Unlock Button
- **Size**: 48px × 48px
- **Border Radius**: 50%
- **Background**: #1A1A1A (locked), transparent (unlocked/purchased)
- **Color**: #9CA3AF (locked), #F97316 orange (unlocked)
- **Hover**: Background #2A2A2E, scale(1.05)
- **Icon**: Lock SVG (locked), Lock SVG filled with orange (unlocked)
- **States**:
  - **Locked**: Episode not purchased, shows lock icon with gray stroke
  - **Unlocked**: Episode purchased, shows lock icon filled with orange (#F97316)
- on click (when locked):
  - Show purchase confirmation popup

### Tag List
- **Display**: Flex wrap
- **Gap**: 10px

#### Tag Pill
- **Background**: #2A2A2E
- **Color**: #9CA3AF
- **Font Size**: 13px
- **Padding**: 6px 14px
- **Border Radius**: 20px
- **Hover**: Background #3B82F6, Color #FFFFFF
- **Click**: Navigate to `/genre?category={tag}`

### Episode Description
- **Margin Top**: 20px
- **Color**: #9CA3AF
- **Font Size**: 14px
- **Line Height**: 1.7
- **Text Clamp**: 4 lines max

## Episode List Panel (Right Sidebar)

### Container
- **Width**: 320px (fixed)
- **Background**: #121214
- **Border Radius**: 12px
- **Padding**: 20px
- **Box Shadow**: 0 4px 20px rgba(0, 0, 0, 0.3)
- **Max Height**: 700px
- **Overflow-Y**: Auto
- **Margin Left**: auto (pushes sidebar to the right edge of the container)
- **Margin Right**: 80px 

### Panel Title
- **Font Size**: 18px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin**: 0 0 16px 0

### Episode Range Selector
- **Display**: Flex
- **Gap**: 8px
- **Margin Bottom**: 16px
- **Ranges**: "1-40", "41-77"

### Range Button
- **Background**: #1A1A1E (inactive), #3B82F6 (active)
- **Color**: #9CA3AF (inactive), #FFFFFF (active)
- **Padding**: 8px 16px
- **Border Radius**: 6px
- **Font Size**: 13px

### Episode Grid
- **Display**: Grid
- **Columns**: repeat(4, 1fr)
- **Gap**: 10px

### Episode Thumbnail
- **Aspect Ratio**: 2:3
- **Border Radius**: 8px
- **Overflow**: Hidden
- **Cursor**: Pointer
- **Hover**: scale(1.05), blue glow shadow
- **Active State**: 2px blue border, blue overlay

#### Thumbnail Image

- https://vz-918d4e7e-1fb.b-cdn.net/{videoId}/thumbnail.jpg
- on hover: https://vz-918d4e7e-1fb.b-cdn.net/{videoId}/preview.webp

#### Interaction

- on click: play the episode and call the add to watch list API with current series and current episode
- purchsed episodes will show a top right green ribbon

### Episode Number Badge
- **Position**: Absolute bottom-left
- **Background**: rgba(0, 0, 0, 0.7)
- **Color**: #FFFFFF
- **Font Size**: 10px
- **Padding**: 2px 6px
- **Border Radius**: 4px
- **Format**: "EP XX"

## Recommendation Carousels

Two sections identical to Home page:
1. **You Might Like** - Filtered to exclude current series
2. **New Releases** - Filtered to exclude current series

### Section Layout
- **Margin Bottom**: 50px

### Section Header
- **Display**: Flex, space-between
- **Title**: 28px, white, font-weight 600
- **Controls**: Carousel arrows

### Carousel
- **Display**: Flex
- **Gap**: 20px
- **Overflow-X**: Auto (hidden scrollbar)
- **Scroll**: Smooth, 80% of container width per click

### Series Card
- **Width**: 180px (fixed)
- **Poster**: 2:3 aspect ratio, 12px border radius
- **Hover**: Poster scale 1.05, blue glow, title turns blue
- **Click**: Navigate to `/player/{seriesId}`

### View More Card
- **Width**: 120px
- **Circular button**: 80px × 80px
- **Padding Top**: 80px
- **Click**: Navigate to `/genre`

## Trial Viewing System

### Overview
Users can watch the first 60 seconds (1 minute) of any episode for free. After the trial period ends, they must purchase the episode to continue watching.

### Trial Logic
- **Trial Duration**: 60 seconds
- **Trigger**: Video playback reaches 60 seconds for unpurchased episodes
- **Behavior**:
  - Video pauses automatically at 60 seconds
  - Purchase popup appears
  - User can either purchase or close the popup
  - If closed without purchase, video remains paused at 60 seconds

### Trial State Tracking
- Track current playback time
- Check if episode is purchased before applying trial limit
- Purchased episodes have no time limit

### Trial Ended Notification
- **Position**: Top of video player
- **Background**: rgba(0, 0, 0, 0.8)
- **Padding**: 12px 20px
- **Border Radius**: 8px
- **Message**: "Trial ended. Unlock to continue watching."
- **Animation**: fadeIn 0.3s

## Episode Purchase System

### Purchase Price
- **Price per Episode**: 0.1 (GCash currency)
- **Payment Method**: Deduct from user's wallet balance

### Purchase Flow
1. User clicks unlock button OR trial period ends
2. Purchase popup appears showing:
   - Episode information
   - Price (0.1)
   - Current wallet balance
3. User confirms purchase
4. System checks wallet balance
5. If sufficient: deduct amount, unlock episode, add to My Purchases
6. If insufficient: show error message

### Purchased Episode Storage
- Stored in user's `purchases` array in database
- Each purchase record contains:
  - _id (unique purchase id)
  - seriesId
  - episodeId
  - episodeNumber
  - episodeTitle
  - episodeThumbnail
  - seriesName
  - seriesCover
  - purchasedAt (timestamp)
  - price

### Purchase State Synchronization
After a successful purchase:
1. Backend persists the purchase to the user's `purchases` array in database
2. Backend returns the updated user object including `purchases`, `balance`, and `transactions`
3. Frontend updates:
   - `userStore.user` - for Player page purchase check
   - `accountStore.user` - for Account page display
   - `accountStore.myPurchases` - for My Purchases section
   - `accountStore.balance` - for wallet display
4. The lock icon immediately changes from gray stroke to orange fill (#F97316)
5. The episode appears in the "My Purchases" section on the Account page

### Purchase Check Logic
To determine if an episode is purchased:
1. Check the user's `purchases` array
2. Match by both `seriesId` AND (`episodeId` OR `episodeNumber`)
3. Using episodeNumber as fallback handles cases where episodeId is synthetic (e.g., `${seriesId}-ep1`)

## Confirmation Popups

### Favorite Confirmation Modal
- **Overlay**: Fixed, rgba(0, 0, 0, 0.7), z-index 1000
- **Modal**:
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 32px
  - Max Width: 400px
  - Animation: fadeIn 0.2s, slideUp 0.3s
- **Icon**: 48px heart emoji (❤️ for add, 💔 for remove)
- **Title**:
  - Adding: "Add to Favorites" - 20px, white
  - Removing: "Remove from Favorites" - 20px, white
- **Series Info Box**:
  - Background: #242428
  - Border Radius: 8px
  - Padding: 12px 16px
  - Margin Bottom: 20px
  - **Series Name**: 16px, font-weight 600, white
  - **Episode Info**: 14px, gray (#9CA3AF)
- **Message**:
  - Adding: "Add this series to your favorites?"
  - Removing: "Remove this series from your favorites?"
  - Font Size: 14px, Color: #9CA3AF, Line Height: 1.6
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
  - Confirm (blue, full width) - triggers favorite action
  - Cancel (gray, full width) - closes modal without action
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
  - Padding: 32px
  - Max Width: 400px
  - Animation: fadeIn 0.2s, slideUp 0.3s
- **Icon**: 64px lock emoji (🔓), horizontally flipped (transform: scaleX(-1))
- **Title**: "Unlock Episode" - 20px, white
- **Message**: "Unlock this episode to continue watching" - 14px, gray
- **Episode Info Box**:
  - Background: #242428
  - Border Radius: 8px
  - Padding: 12px 16px
  - Display: Flex column, gap 4px
  - **Series Name** (first line): 16px, font-weight 600, white
  - **Episode Name** (second line): 14px, font-weight 400, gray (#9CA3AF)
    - Format: "EP XX" or "EP XX {Episode Title}"
- **Price Display**:
  - GCash logo (24px)
  - Amount: "0.1" - 36px, bold, #3B82F6
- **Balance Display**:
  - Label: "Your balance:" - 14px, gray
  - Amount: Current wallet balance - 16px, white
- **Buttons**:
  - Confirm Purchase (blue, full width)
  - Cancel (gray, full width)
- **Loading State**: Show spinner during purchase processing
- **Error State**: Show red error message if purchase fails

### Purchase Result Modal
- **Overlay**: Fixed, rgba(0, 0, 0, 0.8), z-index 1000
- **Modal**:
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 40px 32px
  - Max Width: 400px
  - Text Align: Center
  - Animation: fadeIn 0.2s, slideUp 0.3s
- **Result Icon**:
  - Size: 64px × 64px
  - Drop Shadow: 0 4px 12px rgba(0, 0, 0, 0.3)
  - **Success**: Green circle (#22C55E) with white checkmark
  - **Error**: Red circle (#EF4444) with white X
- **Result Title**:
  - Font Size: 22px
  - Font Weight: 600
  - **Success**: "Unlock Episode Successfully!" - color #22C55E
  - **Error**: "Unlock Failed" - color #EF4444
- **Result Message**:
  - Font Size: 14px
  - Color: #9CA3AF
  - Line Height: 1.6
  - Margin Bottom: 28px
- **Result Button**:
  - Width: 100%
  - Padding: 14px 24px
  - Border Radius: 8px
  - Font Size: 16px
  - Font Weight: 600
  - Hover: scale(1.02)
  - Active: scale(0.98)
  - **Success Button**: Background #22C55E, hover #16A34A
  - **Error Button**: Background #EF4444, hover #DC2626
  - **Button Text**:
    - Default: "OK"
    - If insufficient balance error: "Go to Wallet" (navigates to /account?tab=wallet)

### Toast Notifications
- **Position**: Fixed, top 80px, right 24px
- **Padding**: 14px 24px
- **Border Radius**: 8px
- **Animation**: slideIn from right
- **Duration**: 3 seconds auto-dismiss
- **Types**:
  - **Success** (green #22C55E): "Episode unlocked successfully!"
  - **Error** (red #EF4444): "Failed to unlock episode" or "Insufficient balance"

## Navigation Actions

| Element | Action |
|---------|--------|
| Breadcrumb Link | Navigate to `/` |
| Episode Thumbnail | Navigate to `/player/{seriesId}/{episodeNumber}` |
| Series Card | Navigate to `/player/{seriesId}` |
| Tag Pill | Navigate to `/series?genre={tag}` |
| View More | Navigate to `/series` |

## Side Effects

### On Series Change
- Scroll to top of page
- Reset episode to 1 (if no episodeId)

### On Episode View
- Record to watch history via context

### Controls Auto-hide
- Hide after 3 seconds when playing
- Show on mouse move
- Hide on mouse leave (if playing)

## Responsive Design

### Breakpoints

#### 1200px
- **Player Content**: Column direction
- **Player Left**: Max width 100%
- **Episode Panel**: Width 100%, max-height 400px
- **Episode Grid**: 8 columns

#### 768px (Mobile)
- **Breadcrumb**: Padding 12px 20px, font 13px
- **Player Main**: Padding 0 20px 30px
- **Video Container**: Max height 500px
- **Episode Title**: 18px
- **Metadata Row**: Flex wrap, gap 12px
- **Episode Grid**: 5 columns
- **Series Card**: 160px width
- **Section Title**: 22px

#### 480px (Small Mobile)
- **Breadcrumb**: Padding 10px 15px
- **Player Main**: Padding 0 15px 20px
- **Episode Grid**: 4 columns
- **Series Card**: 140px width
- **Section Title**: 20px
- **View More Card**: 100px width, 60px circle
