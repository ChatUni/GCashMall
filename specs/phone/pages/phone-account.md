# Phone Account Page Specification

## Overview

The Phone Account page provides user profile management, watch history, and settings for the mobile UI. Shows different content based on login status.

## Page Structure

### Layout
- Uses the standard phone layout
- Logo and search icon in header (or "Overview" title)
- Bottom navigation visible

### Content When Logged In
1. User Profile Header
2. Quick Actions
3. Continue Watching
4. Settings Menu

### Content When Logged Out
1. Login Prompt
2. App Information Links

## User Profile Header (Logged In)

### Container
- Vertical centered layout
- Background gradient from #1a1a1e to #0B0B0E
- 24 pixel vertical padding, 16 pixel horizontal padding

### Avatar
- 80 pixel circular container
- Background color #242428
- User's profile picture (circular with border-radius) or default user emoji (36 pixel)
- No overflow hidden on container (allows edit button to extend outside)

### Avatar Edit Button
- Positioned absolute at bottom-right of avatar
- 28 pixel circular button
- Blue background (#3B82F6)
- White pencil icon (16 pixel SVG)
- Extends slightly outside avatar boundary for visibility

### User Information
- Nickname: 18 pixel font, 600 weight, white color, 4 pixel bottom margin
- Email: 13 pixel font, gray color (#9CA3AF)

### Edit Button
- Circular button on right
- Pencil icon
- Tapping opens profile editor

## Quick Actions (Logged In)

### Container
- 4-column grid
- Rounded card background
- Horizontal margin

### Action Items
Each action shows:
- Icon above (32 pixels, blue)
- Label below (12 pixels, gray)

### Available Actions
- History: View watch history
- Favorites: View saved series
- Downloads: View offline content
- Settings: Open settings

## Continue Watching Section (Logged In)

### Section Header
- "Continue Watching" title
- "See All" link on right

### History Items
- Vertical list of recent watches
- Items sorted by updatedAt descending (most recent first)
- Each item shows:
  - Thumbnail with progress bar
  - Series title
  - Episode information
  - Remove button (X icon)

### Remove Button
- 32x32 pixel circular button (perfect circle)
- Fixed dimensions with max-width/max-height constraints
- Transparent background by default
- Gray X icon (#9CA3AF)
- Hover/active state: blue background (rgba(59, 130, 246, 0.9)), white icon
- Uses aspect-ratio: 1/1 to maintain circular shape
- Positioned at right side of history item

### Progress Bar
- Blue bar on thumbnail
- Width indicates watch progress percentage

## Password Section (Logged In - Overview Tab)

### Container
- Rounded card with dark background (#1a1a1e)
- 12 pixel border radius
- 16 pixel padding
- Displayed below profile information section

### Section Title
- "Change Password" or "Set Password" based on user status
- 16 pixel font size, 600 weight
- White color

### Password Fields
Each field includes:
- Label (13 pixel, gray)
- Password input with toggle visibility button
- Error message display (12 pixel, red)

### Field Types
- Current Password (only shown if user has password)
- New Password
- Confirm Password

### Password Input
- Dark background (#242428)
- 1 pixel border (#2a2a2e)
- 8 pixel border radius
- 12 pixel padding
- 48 pixel right padding to accommodate toggle button

### Password Visibility Toggle
- Positioned absolute on right side of input
- 12 pixel from right edge
- Transparent background
- Gray color (#9CA3AF)
- 20x20 pixel SVG icons
- Icon states:
  - Password hidden: Crossed-out eye icon (eye with diagonal line)
  - Password visible: Open eye icon (eye with pupil circle)

### Submit Button
- Blue background (#3B82F6)
- White text, 15 pixel font, 600 weight
- 14 pixel vertical padding
- 8 pixel border radius
- Full width
- Disabled state at 50% opacity when processing

## My Purchases Section (Logged In)

### Container
- Vertical list of purchase groups
- 20 pixel gap between groups

### Purchase Group
- Dark background (#1a1a1e)
- 12 pixel border radius
- Groups episodes by series

### Purchase Header
- Clickable, navigates to series player
- Series cover: 50x75 pixels, 6 pixel border radius
- Series name: 15 pixel font, 600 weight, white
- Episode count: 13 pixel font, gray (#9CA3AF)

### Episode Grid
- 3-column grid layout
- 12 pixel gap
- 12 pixel horizontal padding

### Episode Card
- Thumbnail: 16:9 aspect ratio, 6 pixel border radius
- Play overlay on tap (24 pixel play icon)
- Episode number: 12 pixel font, 600 weight, blue (#3B82F6)
- Episode title: 11 pixel font, gray, single line truncated

### Empty State
- Shopping cart icon (🛒)
- "No purchases yet" message
- "Explore Series" button

## Favorites Section (Logged In)

### Container
- Vertical list layout (same as Watch History)
- 12 pixel gap between items

### Data Loading
- On load: get the favorite list from the user's favorites field
- Items sorted by addedAt descending (most recent first)

### Clear Button
- Positioned at top-right
- Transparent background with border
- Gray text (#9CA3AF)
- On click: confirm then call clear favorites API

### Favorite Item
- Horizontal flex layout (same as Watch History item)
- Dark background (#1a1a1e)
- 12 pixel padding
- 8 pixel border radius
- Each item shows:
  - Cover: 60x80 pixels, 6 pixel border radius
  - Series name: 14 pixel font, white, 2 line clamp
  - Remove button (X icon)

### Remove Button
- 32x32 pixel circular button (perfect circle)
- Fixed dimensions with max-width/max-height constraints
- Transparent background by default
- Gray X icon (#9CA3AF)
- Hover/active state: blue background (rgba(59, 130, 246, 0.9)), white icon
- Uses aspect-ratio: 1/1 to maintain circular shape

### Interactions
- On item click: navigate to player with series
- On remove button click: call remove from favorites API

### Empty State
- Heart icon (❤️)
- "No favorites yet" message
- "Explore Series" button navigates to /genre

## My Series Section (Logged In)

### Container
- 3-column grid layout
- 12 pixel gap

### Series Card
- Cover: 2:3 aspect ratio, 8 pixel border radius
- Series name: 13 pixel font, white, 2 line clamp
- Shelved state: 70% opacity

### Shelved Badge
- Position: top-left of cover
- Background: red with 90% opacity
- Text: 10 pixel font, 600 weight, white
- Padding: 3x6 pixels

### Action Buttons
- Position: top-right of cover
- Appears on tap/hold
- 28 pixel circular buttons
- Dark background with 70% opacity
- Shelve/Unshelve icons (📥/📤)

### Empty State
- Film icon (🎬)
- "No series yet" message
- "Start creating your first series" subtext

### Shelve/Unshelve Confirmation Modal
- Overlay: black with 80% opacity
- Modal: dark background (#1a1a1e), 16 pixel border radius, 24 pixel padding
- Icon: 48 pixel emoji (📥 or 📤)
- Title: 20 pixel font, 600 weight, white
- Series name box: dark background (#242428), 8 pixel border radius
- Message: 14 pixel font, gray, 1.5 line height
- Buttons: vertical stack, 10 pixel gap
  - Confirm: blue background (#3B82F6), white text
  - Cancel: gray background (#2a2a2e), white text

## Settings Section (Logged In)

### Container
- Vertical flex layout
- 16 pixel gap between items

### Setting Item
- Horizontal flex layout with space-between
- Dark background (#1a1a1e)
- 16 pixel padding
- 8 pixel border radius
- Label: 15 pixel font, white
- Control: on right side

### Preferences
| Setting | Control Type | Options |
|---------|--------------|---------|
| Language | Select | English, 中文 |
| Playback Speed | Select | 0.5x, 1x, 1.5x, 2x |
| Autoplay | Toggle | On/Off |
| Notifications | Toggle | On/Off |

### Select Control
- Dark background (#242428)
- No border
- 6 pixel border radius
- Padding: 8 pixel vertical, 28 pixel right (for arrow), 12 pixel left
- White text, 14 pixel font
- Custom dropdown arrow: gray chevron icon (12 pixel), positioned 8 pixel from right
- Native appearance hidden (appearance: none)

### Toggle Switch
- 44x24 pixel dimensions
- Dark background (#2a2a2e) when off
- Blue background (#3B82F6) when on
- White circular knob (18 pixel)
- Smooth transition (0.3s)

### Logout Button
- Full width
- Red background (#ef4444)
- White text, 15 pixel font, 500 weight
- 14 pixel vertical padding
- 8 pixel border radius
- 20 pixel top margin
- Door emoji icon (🚪)

## Wallet Section (Logged In)

### Balance Card
- Gradient background (#1E3A5F to #0D1B2A)
- Blue border (#3B82F6)
- 16 pixel border radius
- 24 pixel padding
- Centered text
- Balance label: 13 pixel, white with 80% opacity
- Balance amount: 36 pixel, 700 weight, white
- GCash logo: 32 pixel

### Wallet Tabs
- Container: dark background (#121214), 12 pixel border radius, 4 pixel padding
- Two tabs: "Top Up" and "Withdraw"
- Tab styling:
  - Flex: 1 (equal width)
  - 12x16 pixel padding
  - 14 pixel font, 600 weight
  - 8 pixel border radius
  - Inactive: gray (#6B7280), transparent background
  - Active: white, blue background (#3B82F6)

### Amount Selection
- Header with title and optional "Withdraw All" button
- Header min-height: 32 pixel (ensures consistent height between Top Up and Withdraw tabs)
- Title: 16 pixel font, 600 weight, white
- Withdraw All button: blue background, 12 pixel font, 6x12 pixel padding
- Amount grid: 3 columns, 12 pixel gap
- Amount buttons:
  - Dark background (#1a1a1e)
  - 12 pixel border radius
  - 16 pixel padding
  - GCash logo (24 pixel) + amount (16 pixel, 600 weight)
  - Disabled state: 40% opacity when amount > balance
- Custom amount button:
  - Dashed blue border (2px, #3B82F6)
  - Transparent background
  - Edit icon (✎) in blue + "Custom" text
  - Opens custom amount popup

### Custom Amount Popup
- Same overlay and modal style as confirmation popups
- Title: "Custom Top Up" or "Custom Withdrawal" based on active tab
- Message: "Enter the amount to add" or "Enter the amount to withdraw"
- Input wrapper:
  - Dark background (#2a2a2e), 8 pixel border radius
  - GCash logo + number input
  - Input styling:
    - Transparent background, right-aligned text
    - Blue text (#3B82F6) when typing, 24 pixel font, 700 weight
    - Placeholder "0.00" in gray (#6B7280)
    - Cursor hidden by default (caret-color: transparent)
    - Cursor shows blue when focused (caret-color: #3B82F6)
    - Placeholder hides on focus
    - No spinner buttons (hidden)
- Confirm/Cancel buttons same as other popups
- Validation: shows error toast for invalid amount or insufficient balance

### Transaction History
- Header: flex row with title on left, filter dropdown on right
- Title: "Transaction History"
- Filter dropdown:
  - Options: All, Top Up, Withdraw, Purchase
  - Dark background (#2a2a2e), white text
  - Border: 1px solid #3a3a3e, 6 pixel border radius
  - Padding: 6 pixel vertical, 28 pixel right (for arrow), 12 pixel left
  - Font size: 12 pixel
  - Custom dropdown arrow: gray chevron icon (12 pixel), positioned 8 pixel from right
  - Native appearance hidden (appearance: none)
  - Focus state: blue border (#3B82F6)
- Data: Combined list of wallet transactions (top up, withdraw) and episode purchases, sorted by date descending
- Filtered by selected type (or show all if "All" selected)
- Empty state: "No transactions yet" - gray, centered, 40 pixel padding
- Transaction types:
  - Top Up: wallet balance additions (green text #22c55e)
  - Withdraw: wallet balance withdrawals (purple text #a855f7)
  - Purchase: episode purchases (yellow text #eab308)
- Transaction item:
  - Dark background (#1a1a1e)
  - 12 pixel padding, 8 pixel border radius
  - Flex column layout with 8 pixel gap
  - Top row: type/date on left, amount/status on right
  - Bottom row: Reference ID (monospace font, 12 pixel, gray #6B7280)
  - Amount colors match type colors:
    - Top Up: green (#22c55e) with + prefix
    - Withdraw: purple (#a855f7) with - prefix
    - Purchase: yellow (#eab308) with - prefix
  - Status badges: success (green), failed (red), processing (yellow)
- Purchase type display (two lines):
  - Series name: 14 pixel, 500 weight, yellow (#eab308)
  - Episode info: 12 pixel, gray (#9ca3af), format "EP {number} {title}"

### Confirmation Popup
- Overlay: black with 80% opacity
- Modal: dark background (#1a1a1e), 16 pixel border radius, 24 pixel padding
- Max width: 320 pixel
- Content:
  - GCash logo: 64 pixel
  - Title: 20 pixel, 600 weight, blue (#3B82F6)
  - Message: 14 pixel, gray
  - Amount: 36 pixel, 700 weight, blue
- Buttons: vertical stack, 10 pixel gap
  - Confirm: blue background (#3B82F6), white text
  - Cancel: gray background (#2a2a2e), white text
  - Disabled state: 60% opacity when processing

### Wallet Interactions
- Tab switch: click to toggle between Top Up and Withdraw
- Top Up flow: select amount → confirm popup → success toast
- Withdraw flow: select amount (if <= balance) → confirm popup → success/error toast
- Withdraw All: triggers withdraw with full balance amount

## Login Prompt (Logged Out)

### Container
- Centered content
- Generous vertical padding

### Icon
- Large user icon (64 pixels)
- Blue color

### Title
- "Sign In" heading
- Bold, white, 20 pixel font

### Description
- Explains benefits of signing in
- Gray text

### Login Button
- Blue background, white text
- Rounded pill shape
- "Sign In" label

### Register Link
- Blue text below button
- Links to registration

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Edit Profile | Tap | Open profile editor |
| Quick Action | Tap | Navigate to that section |
| History Item | Tap | Resume watching |
| Settings Item | Tap | Open setting or toggle |
| Login Button | Tap | Open login modal |
| Sign Out | Tap | Confirm and log out |

## Internationalization

### Labels
- English: "Overview", "Continue Watching", "See All", "Sign In", "Sign Out"
- Chinese: "我的", "继续观看", "查看全部", "登录", "退出登录"
