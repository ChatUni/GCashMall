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

## Tab Navigation

### Container
- Horizontal flex layout
- Horizontal scrollable (overflow-x: auto)
- 16 pixel horizontal padding
- 8 pixel gap between tabs
- Bottom border: 1px solid rgba(255, 255, 255, 0.08)
- Hidden scrollbar (scrollbar-width: none)

### Tab Item
- Vertical flex layout (icon above label)
- 4 pixel gap between icon and label
- Padding: 12 pixel vertical, 8 pixel horizontal
- Fixed width: 70 pixel (min-width and flex-basis)
- Transparent background
- No border
- Font size: 11 pixel
- Color: Gray (#9CA3AF)
- White-space: nowrap
- Position: relative
- Transition: color 0.2s ease

### Tab Item Indicator (::after pseudo-element)
- Position: absolute, bottom: 0, centered horizontally
- Height: 2 pixel
- Background: Blue (#3B82F6)
- Width: 0 (default), expands on interaction
- Transition: width 0.2s ease
- Straight line indicator (no border-radius)

### Tab Item (Hover)
- Color: Light Blue (#60A5FA)
- Indicator width: 40 pixel

### Tab Item (Active/Pressed)
- Color: Blue (#3B82F6)
- Indicator width: 50 pixel

### Tab Item (Selected)
- Color: Blue (#3B82F6)
- Indicator width: 50 pixel

### Tab Icon
- Font size: 20 pixel (emoji)

### Available Tabs
| Key | Icon | English | Chinese |
|-----|------|---------|---------|
| overview | 👤 | Overview | 概览 |
| watchHistory | 📺 | Watch History | 观看历史 |
| favorites | ❤️ | Favorites | 收藏夹 |
| settings | ⚙️ | Settings | 设置 |
| wallet | 💰 | Wallet | 钱包 |
| myPurchases | 🛒 | My Purchases | 我的购买 |
| mySeries | 🎬 | My Series | 我的剧集 |
| about | ℹ️ | About | 关于 |
| contact | ✉️ | Contact | 联系我们 |

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
- Vertical flex layout
- 16 pixel gap

### Header
- Horizontal flex layout with space-between
- Title: 18 pixel font, 600 weight, white
- "Add Series" button on right side (when series exist)

### Add Series Button
- Background: Blue (#3B82F6)
- Color: White
- Padding: 8 pixel vertical, 16 pixel horizontal
- Border radius: 8 pixel
- Font: 13 pixel, 500 weight
- Hover: Darker blue (#2563EB)
- Active: Even darker blue (#1D4ED8)

### Series List
- Vertical flex layout (list mode, similar to Watch History)
- 12 pixel gap between items

### Series Item
- Horizontal flex layout
- 12 pixel gap between elements
- 12 pixel padding
- Background: Dark (#1A1A1E)
- Border radius: 8 pixel
- Cursor: pointer
- Shelved state: 70% opacity

### Series Item Cover
- Width: 60 pixel
- Height: 80 pixel
- Border radius: 6 pixel
- Flex shrink: 0

### Series Item Placeholder
- Background: #242428
- Centered film emoji (🎬)
- Font size: 24 pixel

### Shelved Badge
- Position: top-left of cover
- Background: red with 90% opacity
- Text: 8 pixel font, 600 weight, white
- Padding: 2x4 pixels
- Border radius: 3 pixel

### Series Item Info
- Flex: 1 (takes remaining space)
- Vertical flex layout
- 4 pixel gap

### Series Item Name
- Font size: 14 pixel
- Font weight: 500
- Color: White
- 2 line clamp with ellipsis

### Series Item Tags
- Font size: 12 pixel
- Color: Gray (#9CA3AF)
- 1 line clamp with ellipsis
- Shows first 2 tags separated by bullet

### Action Buttons
- Horizontal flex layout on right side
- 8 pixel gap between buttons
- Flex shrink: 0
- 36x36 pixel circular buttons (perfect circle)
  - Width: 36 pixel
  - Height: 36 pixel
  - Min-width: 36 pixel
  - Min-height: 36 pixel
  - Aspect ratio: 1:1
  - Border radius: 50%
  - Padding: 0
  - Flex shrink: 0
- Default Background: Blue with 20% opacity (rgba(59, 130, 246, 0.2))
- Delete Button Background: Red with 20% opacity (rgba(239, 68, 68, 0.2))
- Font size: 16 pixel
- Hover: 40% opacity (blue for default, red for delete)
- Active: Scale 0.95
- Icons:
  - Shelve: 📥 (when series is not shelved)
  - Unshelve: 📤 (when series is shelved)
  - Edit: ✏️
  - Delete: 🗑️

### Empty State
- Film icon (🎬)
- "No series yet" message
- "Start creating your first series" subtext
- "Add Series" button (same styling as header button)

### Series Edit View
- Shown when editingSeriesId is set
- Header with title: "Add Series" (add mode) or "Edit Series" (edit mode)
- Title: 20 pixel font, 600 weight, white
- Uses SeriesEditContent component (which includes its own Cancel Confirmation Modal)
- Cancel: SeriesEditContent shows its own confirmation modal with warning icon (⚠️)
- Save Complete: returns to series list and refreshes

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

### Delete Confirmation Modal
- Overlay: black with 80% opacity
- Modal: dark background (#1a1a1e), 16 pixel border radius, 24 pixel padding
- Icon: 48 pixel emoji (🗑️)
- Title: 20 pixel font, 600 weight, white ("Confirm Delete")
- Series name box: dark background (#242428), 8 pixel border radius
- Message: 14 pixel font, gray, 1.5 line height (warning about permanent deletion)
- Buttons: vertical stack, 10 pixel gap
  - Confirm: red background (#ef4444), white text
    - Hover: darker red (#dc2626)
    - Active: even darker red (#b91c1c)
  - Cancel: gray background (#2a2a2e), white text

### Cancel Edit Confirmation Modal
- Shown when clicking Cancel in Add Series or Edit Series view
- Handled by SeriesEditContent component (shared with desktop)
- Overlay: black with 80% opacity
- Modal: dark background (#1a1a1e), 16 pixel border radius, 24 pixel padding
- Icon: 48 pixel emoji (⚠️)
- Title: 20 pixel font, 600 weight, white ("Discard Changes?")
- Message: 14 pixel font, gray, 1.5 line height ("Are you sure you want to cancel? Any unsaved changes will be lost.")
- Buttons: vertical stack, 10 pixel gap
  - Confirm ("Discard Changes"): orange/amber background (#f59e0b), white text
    - Hover: darker orange (#d97706)
  - Cancel ("Keep Editing"): gray background (#2a2a2e), white text

### Interactions
- On load: fetch my series list via API
- On card click: navigate to player page for that series
- On Shelve button click: show Shelve Confirmation Modal
- On Unshelve button click: show Unshelve Confirmation Modal
- On Edit button click: show series edit view in edit mode
- On Delete button click: show Delete Confirmation Modal
- On Delete confirm: call delete API, remove series from list, show success toast
- On Add Series button click: show series edit view in add mode
- On Cancel button click (in edit view): SeriesEditContent shows its own confirmation modal
- On Cancel confirm: return to series list
- On Cancel cancel: stay in edit view

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

When the user is not logged in, the account page shows a login prompt instead of the account content.

### Container
- Vertical flex layout, centered
- Min-height: 60vh
- Padding: 24 pixel
- Text align: center

### Icon
- User emoji (👤)
- Font size: 64 pixel
- Margin bottom: 24 pixel
- Opacity: 0.8

### Title
- "Login" heading (from translations)
- Font size: 24 pixel
- Font weight: 600
- Color: White (#FFFFFF)
- Margin: 0 0 12px 0

### Message
- "Please log in to access your account"
- Font size: 14 pixel
- Color: Gray (#9CA3AF)
- Margin: 0 0 32px 0
- Line height: 1.5

### Login Button
- Background: Blue (#3B82F6)
- Color: White (#FFFFFF)
- Border: none
- Padding: 14 pixel vertical, 48 pixel horizontal
- Border radius: 8 pixel
- Font size: 16 pixel
- Font weight: 600
- Hover: Darker blue (#2563EB)
- Active: Even darker blue (#1D4ED8)

### Interaction
- On Login Button click: Show LoginModal
- On LoginModal close (without login): Navigate to home page
- On LoginModal success: Initialize user data, fetch account data, and show account content

### State Management
- Login prompt is shown when `isLoggedIn` is `false` (checked before loading state)
- No automatic login modal popup - user must click the Login button
- After successful login, data fetch flags are reset and account data is re-fetched

## Logout Flow

### Trigger
- User clicks "Sign Out" button in Settings tab

### Process
1. Reset all initialization flags (accountInitialized, userDataFetched, etc.)
2. Clear authentication data from localStorage (token and user)
3. Reset account store to initial state
4. Navigate to home page

### Post-Logout Behavior
- When user navigates back to Account page:
  - `checkLoginStatus` is called
  - No token found → `isLoggedIn` set to `false`, `loading` set to `false`
  - Login prompt is displayed
  - User can click Login button to show LoginModal

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Edit Profile | Tap | Open profile editor |
| Quick Action | Tap | Navigate to that section |
| History Item | Tap | Resume watching |
| Settings Item | Tap | Open setting or toggle |
| Login Button | Tap | Open login modal |
| Sign Out | Tap | Confirm and log out |

## About Section (Logged In)

### Container
- Vertical flex layout
- 16 pixel gap between sections

### Hero Section
- Centered layout
- 48 pixel vertical padding, 16 pixel horizontal padding
- Minimum height: 180 pixel

#### Logo
- Image URL: https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png
- Size: 64x64 pixels
- Animation: pulse (2s ease-in-out infinite)
  - 0%, 100%: scale(1)
  - 50%: scale(1.05)
- 16 pixel bottom margin

#### Title
- Text: "GcashTV"
- Font size: 28 pixel
- Font weight: 700
- Color: Gradient (135deg, #3B82F6 to #60A5FA)
- 8 pixel bottom margin

#### Tagline
- Font size: 14 pixel
- Color: Gray (#9CA3AF)
- Line height: 1.6
- Max width: 300 pixel

### Mission Section
- Card container: dark background (#121214), 12 pixel border radius, 20 pixel padding
- Centered text
- Icon: 🎯 (40 pixel)
- Title: 18 pixel font, 600 weight, white
- Text: 14 pixel font, gray (#D1D5DB), 1.8 line height

### Features Section
- Card container: same as Mission Section
- Title: 18 pixel font, 600 weight, white, centered
- Features grid: single column, 16 pixel gap

#### Feature Item
- Background: #1A1A1E
- Border radius: 12 pixel
- Padding: 16 pixel
- Centered text
- Icon: 32 pixel emoji
- Title: 16 pixel font, 600 weight, white
- Text: 13 pixel font, gray (#9CA3AF), 1.6 line height

#### Features List
| Icon | Title | Description |
|------|-------|-------------|
| 🎬 | Exclusive Content | Access a wide variety of exclusive series and movies you won't find anywhere else. |
| 💰 | Easy Payments | Pay for episodes seamlessly with your Gcash wallet. Top up anytime, anywhere. |
| 🌍 | Multi-Language Support | Enjoy content in multiple languages with our built-in language switching feature. |
| 📱 | Watch Anywhere | Stream on any device - desktop, tablet, or mobile. Your entertainment, your way. |

### How It Works Section
- Card container: same as Mission Section
- Title: 18 pixel font, 600 weight, white, centered
- Steps container: single column, 12 pixel gap

#### Step Item
- Background: #1A1A1E
- Border radius: 12 pixel
- Padding: 16 pixel
- Horizontal flex layout, 16 pixel gap
- Left-aligned text

#### Step Number
- Size: 36x36 pixels
- Background: Linear gradient (135deg, #3B82F6 to #1D4ED8)
- Border radius: 50%
- Font size: 16 pixel
- Font weight: 700
- Color: White

#### Step Content
- Title: 16 pixel font, 600 weight, white
- Text: 13 pixel font, gray (#9CA3AF), 1.6 line height

#### Steps List
| Step | Title | Description |
|------|-------|-------------|
| 1 | Create an Account | Sign up for free using your email or social media accounts. It only takes a minute. |
| 2 | Top Up Your Wallet | Add funds to your Gcash wallet to unlock premium episodes and content. |
| 3 | Start Watching | Browse our library, unlock episodes, and enjoy unlimited streaming. |

### Footer
- Font size: 13 pixel
- Color: Dark gray (#6B7280)
- Centered text
- 8 pixel top margin

## Contact Section (Logged In)

### Container
- Vertical flex layout
- 16 pixel gap between sections

### Header Section
- Centered layout
- 48 pixel vertical padding, 16 pixel horizontal padding
- Minimum height: 180 pixel

#### Icon
- Emoji: ✉️
- Font size: 48 pixel (scaled 1.5x via transform)
- Animation: bounce (2s ease-in-out infinite)
  - 0%, 100%: translateY(0) scale(1.5)
  - 50%: translateY(-10px) scale(1.5)
- 20 pixel bottom margin

#### Title
- Text: "Contact Us"
- Font size: 24 pixel
- Font weight: 700
- Color: White
- 8 pixel bottom margin

#### Subtitle
- Text: "We'd love to hear from you"
- Font size: 14 pixel
- Color: Gray (#9CA3AF)

### Contact Card
- Background: #121214
- Border radius: 12 pixel
- Padding: 20 pixel
- 20 pixel gap between elements

#### Welcome Message
- Font size: 16 pixel
- Color: Light gray (#E5E7EB)
- Line height: 1.8
- Centered text

#### Email Info Section
- Background: #1A1A1E
- Border radius: 12 pixel
- Padding: 24 pixel vertical, 20 pixel horizontal
- Minimum height: 140 pixel
- Centered content (both horizontal and vertical)
- 12 pixel gap between elements

##### Icon Container
- Size: 48x48 pixels
- Background: Linear gradient (135deg, #3B82F6 to #1D4ED8)
- Border radius: 12 pixel
- Centered content
- Icon: 📧 (24 pixel)

##### Details
- Vertical flex layout, centered
- 4 pixel gap
- Label: "Email Address", 13 pixel font, gray (#9CA3AF)
- Value: "chatuni.ai@gmail.com", 16 pixel font, 600 weight, blue (#3B82F6)
- Value hover: color #60A5FA, underline

#### CTA Section
- Centered layout
- 12 pixel gap
- CTA text: 13 pixel font, gray (#9CA3AF)
- Send Email button:
  - Full width
  - Background: Linear gradient (135deg, #3B82F6 to #1D4ED8)
  - Color: White
  - Padding: 14 pixel vertical, 24 pixel horizontal
  - Border radius: 12 pixel
  - Font size: 16 pixel
  - Font weight: 600
  - Icon: ✉️ with 8 pixel gap
  - Hover: translateY(-2px), box-shadow 0 8px 24px rgba(59, 130, 246, 0.4)
  - Link: mailto:chatuni.ai@gmail.com

### Footer
- Font size: 13 pixel
- Color: Dark gray (#6B7280)
- Centered text
- 8 pixel top margin
- Text: "We typically respond within 24-48 hours."

## Internationalization

### Labels
- English: "Overview", "Continue Watching", "See All", "Sign In", "Sign Out", "About", "Contact"
- Chinese: "我的", "继续观看", "查看全部", "登录", "退出登录", "关于", "联系我们"
