# Account Page Specification

## Overview

The Account page is a comprehensive user profile and settings management interface for GCashTV. It features a sidebar navigation system with multiple content sections including profile management, watch history, favorites, downloads, settings, and wallet functionality.

## Page Structure

### Layout
- **Container**: Full viewport height, flexbox column layout
- **Background**: Dark theme (#0B0B0E)
- **Main Content**: Flexbox row with sidebar (280px) and content panel (flexible)
- **Padding**: 24px vertical, 40px horizontal
- **Gap**: 32px between sidebar and content

### Components Used
- TopBar (header navigation)
- BottomBar (footer navigation)
- LoginModal (authentication modal)

## Authentication

### Login Requirement
- Page automatically shows LoginModal if user is not logged in
- On successful login, modal closes and user can access account features
- If user closes modal without logging in, they are redirected to home page

### Logout Functionality
- Logout button in sidebar navigation
- Clears user session and redirects to home page

## Sidebar

### Profile Section
- **Avatar**: 56px circular, background #242428, displays user avatar or 👤 emoji
- **Name**: White (#FFFFFF), 16px, font-weight 600
- **Email**: Gray (#9CA3AF), 13px
- **Border**: Bottom border 1px solid #242428, margin-bottom 16px

### Navigation Items
| Key | Icon | Label |
|-----|------|-------|
| overview | 👤 | Overview |
| watchHistory | 📺 | Watch History |
| favorites | ❤️ | Favorites |
| downloads | ⬇️ | Downloads |
| settings | ⚙️ | Settings |
| wallet | 💰 | Wallet |

### Navigation Styling
- **Item Padding**: 12px 14px
- **Border Radius**: 8px
- **Icon Size**: 18px, width 24px
- **Label**: Gray (#9CA3AF), 14px, font-weight 500
- **Hover**: Label turns blue (#3B82F6)
- **Active State**: 
  - Background: rgba(59, 130, 246, 0.1)
  - Left border indicator: 3px wide, #3B82F6
  - Label color: #3B82F6

### Logout Button
- Positioned at bottom with margin-top: auto
- Top border: 1px solid #242428
- Hover: Label turns red (#EF4444)

## Content Sections

### 1. Overview (Profile Management)

#### Header
- **Title**: "Account Overview" - White, 28px, font-weight 600
- **Subtitle**: "Manage your profile and preferences" - Gray (#9CA3AF), 15px

#### Profile Information Section
Section card with form fields:

| Field | Type | Placeholder |
|-------|------|-------------|
| Nickname | text | Enter your nickname |
| Email | email | Enter your email |
| Phone Number | tel | Enter your phone number |
| Gender | select | Not specified / Male / Female / Other |
| Birthday | date | - |

- **Form Input Styling**:
  - Background: #1A1A1E
  - Border: 1px solid #242428
  - Border Radius: 8px
  - Padding: 12px 16px
  - Focus: Blue border (#3B82F6) with shadow

- **Save Button**: Primary blue button (#3B82F6)

#### Profile Picture Section
- **Current Avatar**: 80px circular preview
- **Actions**: Upload New Avatar button, Remove Avatar button (if avatar exists)
- **Hint Text**: "Recommended: Square image, at least 200x200px. Max size: 5MB"
- **File Validation**: Image files only, max 5MB

#### Change Password Section
| Field | Type | Placeholder |
|-------|------|-------------|
| Current Password | password | Enter current password |
| New Password | password | Enter new password |
| Confirm New Password | password | Confirm new password |

- **Validation**: Minimum 6 characters, passwords must match
- **Change Password Button**: Primary blue button

### 2. Watch History

#### Header
- **Title**: "Watch History"
- **Actions**: 
  - Clear History button (secondary)
  - Sync History toggle

#### Content Grid
- **Layout**: 5 columns, 20px gap
- **Responsive**: 4 cols at 1400px, 3 cols at 1200px, 2 cols at 768px

#### History Card
- **Poster Container**: 2:3 aspect ratio, 12px border radius
- **Episode Badge**: Bottom-left, blue background (rgba(59, 130, 246, 0.9)), "EP X"
- **Remove Button**: Top-right, appears on hover, 28px circular
- **Title**: 15px, white, 2-line clamp
- **Tag**: Gray pill badge

#### Empty State
- **Icon**: 📺 (64px, 50% opacity)
- **Title**: "No watch history yet"
- **Subtitle**: "Start watching to build your history"
- **Action**: "Explore Series" button

### 3. Favorites

#### Header
- **Title**: "Favorites"

#### Content Grid
- Same layout as Watch History (5 columns)

#### Favorite Card
- **Poster Container**: 2:3 aspect ratio, 12px border radius
- **Remove Button**: Top-right, appears on hover
- **Hover Effect**: Blue glow shadow, scale 1.05 on poster
- **Title**: 15px, white, turns blue on hover
- **Tag**: Gray pill badge (#2A2A2E background)

#### Empty State
- **Icon**: ❤️
- **Title**: "No favorites yet"
- **Subtitle**: "Add series to your favorites to see them here"
- **Action**: "Explore Series" button

### 4. Downloads

#### Header
- **Title**: "Downloads"
- **Actions**: Clear All button (secondary)

#### Content Grid
- Same layout as Favorites (5 columns)

#### Download Card
- **Poster Container**: 2:3 aspect ratio, 12px border radius
- **Episode Badge**: Bottom-left, blue background, "EP X"
- **Remove Button**: Top-right, appears on hover
- **Info Section**:
  - Title: 15px, white
  - Episode: Gray (#9CA3AF), 13px
  - File Size: Gray (#6B7280), 12px (optional)

#### Empty State
- **Icon**: ⬇️
- **Title**: "No downloads yet"
- **Subtitle**: "Download episodes to watch offline"
- **Action**: "Explore Series" button

### 5. Settings

#### Header
- **Title**: "Settings"

#### Preferences Section
| Setting | Control Type | Options |
|---------|--------------|---------|
| Language | Select | English, 中文 |
| Playback Speed | Select | 0.5x, 1x, 1.5x, 2x |
| Autoplay | Toggle | On/Off |
| Notifications | Toggle | On/Off |

- **Row Styling**: Flex between, padding 16px 0, border-bottom #242428
- **Toggle**: 44px × 24px, custom styled checkbox

### 6. Wallet

#### Header
- **Title**: "Wallet"
- **Subtitle**: "Manage your GCash balance"

#### Balance Card
- **Background**: Gradient (#1E3A5F to #0D1B2A)
- **Border**: 1px solid #3B82F6
- **Content**:
  - Wallet Icon: 💰 (48px)
  - Label: "Current Balance" - Gray, 14px
  - Amount: White, 36px, font-weight 700, with GCash logo (32px)

#### Top Up Section
- **Description**: "Select an amount to add to your wallet"
- **Grid**: 3 columns, 16px gap
- **Amount Options**: 5, 10, 20, 50, 100, 200

#### Top Up Button
- **Styling**: 
  - Background: #1A1A1E
  - Border: 2px solid #242428
  - Padding: 24px 16px
  - Border Radius: 12px
- **Hover**: Blue border, blue tint background, translateY(-2px)
- **Content**: GCash logo (24px) + amount value (28px, white)

#### Top Up Confirmation Popup
- **Overlay**: Fixed, black 80% opacity
- **Modal**: 
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 32px
  - Max Width: 400px
- **Content**:
  - GCash Logo: 80px
  - Title: "Confirm Top Up" - 24px, white
  - Message: "Add to your wallet" - 14px, gray
  - Amount: 48px, blue (#3B82F6), with logo
- **Buttons**:
  - Confirm: Green (#22C55E)
  - Cancel: Gray (#2A2A2E)

#### Transaction History
- Empty state: "No transactions yet"

## URL Parameters

The page supports tab navigation via URL query parameter:
- `?tab=overview`
- `?tab=watchHistory`
- `?tab=favorites`
- `?tab=downloads`
- `?tab=settings`
- `?tab=wallet`

## Context Dependencies

### AuthContext
- `user`: Current user object
- `isLoggedIn`: Boolean authentication state
- `logout()`: Logout function
- `updateUser()`: Update user profile

### FavoritesContext
- `favorites`: Array of favorite series
- `removeFavorite(seriesId)`: Remove from favorites

### WatchHistoryContext
- `watchHistory`: Array of watched episodes
- `removeFromHistory(seriesId)`: Remove from history
- `clearHistory()`: Clear all history

### DownloadsContext
- `downloads`: Array of downloaded episodes
- `removeDownload(seriesId, episodeNumber)`: Remove download
- `clearAllDownloads()`: Clear all downloads

### LanguageContext
- `t`: Translation object for i18n support

## Responsive Design

### Breakpoints

#### 1400px
- Grids: 4 columns

#### 1200px
- Grids: 3 columns

#### 1024px (Tablet)
- Main layout: Column direction
- Sidebar: Full width, horizontal layout
- Navigation: Horizontal wrap
- Active indicator: Hidden
- Profile actions: Full width buttons

#### 768px (Mobile)
- Padding: 16px
- Title: 24px
- Grids: 2 columns
- Header actions: Column layout
- Top-up grid: 2 columns
- Balance amount: 28px
- Membership plans: Single column

#### 480px (Small Mobile)
- Navigation labels: Hidden (icons only)
- Grids: 2 columns, 12px gap
- Top-up values: 22px
- Balance amount: 24px
- Popup amount: 36px

## Color Palette

| Element | Color |
|---------|-------|
| Page Background | #0B0B0E |
| Card Background | #121214 |
| Input Background | #1A1A1E |
| Border | #242428 |
| Primary Blue | #3B82F6 |
| Primary Blue Hover | #2563EB |
| Text White | #FFFFFF |
| Text Gray | #9CA3AF |
| Text Muted | #6B7280 |
| Success Green | #22C55E |
| Danger Red | #EF4444 |
| Warning Amber | #F59E0B |

## Button Styles

### Primary Button
- Background: #3B82F6
- Color: White
- Padding: 10px 20px
- Border Radius: 8px
- Hover: #2563EB

### Secondary Button
- Background: Transparent
- Border: 1px solid #242428
- Color: #9CA3AF
- Hover: Blue border and text

### Danger Button
- Background: Transparent
- Border: 1px solid #EF4444
- Color: #EF4444
- Hover: Red background, white text

## Section Card

- Background: #121214
- Border Radius: 12px
- Padding: 20px
- Box Shadow: 0 4px 20px rgba(0, 0, 0, 0.3)

## Animations & Transitions

- Navigation hover: 0.2s ease
- Card hover: translateY(-4px), 0.2s ease
- Poster scale: 1.05, 0.3s ease
- Button hover: 0.2s ease
- Toggle switch: 0.2s ease
- Remove button opacity: 0.2s ease (appears on card hover)

## Data Persistence

- Wallet balance: localStorage (`gcashtv-wallet-balance`)
- User profile: AuthContext (localStorage via context)
- Favorites: FavoritesContext (localStorage)
- Watch History: WatchHistoryContext (localStorage)
- Downloads: DownloadsContext (localStorage)
