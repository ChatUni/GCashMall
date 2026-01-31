# Top Bar Component Specification

## Overview

The Top Bar is a sticky header navigation component for GCashTV that provides branding, navigation links, search functionality, watch history access, account management, and language switching. It integrates with authentication and watch history contexts.

## Component Structure

### Layout
- **Position**: Sticky, top: 0
- **Z-Index**: 1000
- **Height**: 60px
- **Background**: #0B0B0E
- **Padding**: 0 60px
- **Width**: 100%
- **Box Sizing**: border-box

### Content Container
- **Display**: Flex, space-between, center aligned
- **Width**: 100%
- **Gap**: 30px

## Left Side Group

### Container
- **Display**: Flex, center aligned
- **Gap**: 30px
- **Flex Shrink**: 0

### App Logo
- **Height**: 44px
- **Cursor**: Pointer
- **Transition**: opacity 0.2s ease
- **Hover**: opacity 0.8
- **Flex Shrink**: 0
- **Source**: Cloudinary hosted image
- **Click Action**: Navigate to `/`

### Brand Name
- **Text**: "GcashTV"
- **Color**: #FFFFFF
- **Font Size**: 18px
- **Font Weight**: 600
- **Margin Right**: 20px
- **Flex Shrink**: 0
- **Line Height**: 1

### Genre Icon (Mobile Only)
- **Position**: After brand name, before nav-links
- **Visibility**: Hidden on desktop and tablet (>768px), visible on mobile (≤768px)
- **Icon**: Grid icon (4 squares in 2x2 layout)
- **Stroke Width**: 2
- **Click**: Navigate to `/genre`
- **Active State**: When on `/genre` route, shows blue color (#3B82F6)

### Navigation Links
- **Display**: Flex, center aligned
- **Gap**: 8px

#### Nav Link Button
- **Background**: None
- **Border**: None
- **Color**: #FFFFFF
- **Font Size**: 15px
- **Font Weight**: 500
- **Padding**: 8px 16px
- **Cursor**: Pointer
- **Hover**: Color #3B82F6
- **Active State**: Color #3B82F6 with underline indicator

#### Active Indicator (::after)
- **Position**: Absolute bottom
- **Width**: calc(100% - 32px)
- **Height**: 2px
- **Background**: #3B82F6
- **Border Radius**: 1px
- **Centered**: translateX(-50%)

### Navigation Items
| Label | Path | Translation Key |
|-------|------|-----------------|
| Home | `/` | t.topBar.home |
| Genre | `/genre` | t.topBar.genre |

## Search Bar

### Container
- **Flex**: 1
- **Max Width**: 600px
- **Position**: Relative

### Search Combo
- **Display**: Flex
- **Background**: #1A1A1A
- **Border Radius**: 20px
- **Height**: 40px
- **Border**: 1px solid rgba(255, 255, 255, 0.1)
- **Focus Within**: Border #3B82F6, box-shadow 0 0 0 2px rgba(59, 130, 246, 0.2)

### Search Input
- **Flex**: 1
- **Background**: Transparent
- **Border**: None
- **Padding**: 0 16px
- **Font Size**: 14px
- **Color**: #FFFFFF
- **Placeholder Color**: #9CA3AF

### Search Button
- **Width**: 56px
- **Height**: 40px
- **Background**: Transparent
- **Border Radius**: 0 20px 20px 0
- **Color**: #FFFFFF
- **Hover**: Color #3B82F6
- **Icon Size**: 32px

### Search Functionality
- **Trigger**: Enter key or button click
- **Navigation**: `/search?q={query}`
- **Minimum Query Length**: 1 character for suggestions

## Search Suggestions Popout

### Container
- **Position**: Absolute, top calc(100% + 8px)
- **Background**: #151518
- **Border Radius**: 12px
- **Box Shadow**: 0 8px 24px rgba(0, 0, 0, 0.4)
- **Z-Index**: 1001

### Suggestion Item
- **Display**: Flex, space-between, center aligned
- **Padding**: 12px 16px
- **Cursor**: Pointer
- **Hover/Highlighted**: Background #1a1a1e, title color #3B82F6

### Suggestion Title
- **Color**: #FFFFFF
- **Font Size**: 14px

### Suggestion Tag
- **Color**: #9CA3AF
- **Font Size**: 12px
- **Background**: #242428
- **Padding**: 4px 8px
- **Border Radius**: 4px

### Keyboard Navigation
| Key | Action |
|-----|--------|
| ArrowDown | Highlight next suggestion |
| ArrowUp | Highlight previous suggestion |
| Enter | Select highlighted or search |
| Escape | Close suggestions |

## Right Side Group

### Container
- **Display**: Flex, center aligned
- **Gap**: 20px
- **Flex Shrink**: 0

### Icon Button (Base)
- **Size**: 40px × 40px
- **Display**: Flex, centered
- **Cursor**: Pointer
- **Position**: Relative
- **Icon Size**: 22px
- **Icon Color**: #FFFFFF
- **Hover**: Icon color #3B82F6
- **Active**: Icon color #3B82F6 with underline indicator

## Watch History Icon

### History Wrapper
The history icon and popover are wrapped in a container to ensure proper hover behavior:
- **Class**: `.history-wrapper`
- **Position**: Relative
- **Purpose**: Contains both the icon and popover so mouse events work correctly when moving between them

### Icon
- **SVG**: Clock icon (circle with hands)
- **Stroke Width**: 2

### Behavior
- **Hover**: Shows history popover with delayed hide behavior
  - **Mouse Enter**: Immediately shows popover and cancels any pending hide timeout
  - **Mouse Leave**: Waits 150ms before hiding popover (allows user to move mouse to popover content)
  - **Hover Area**: Entire wrapper including both icon and popover
- **Click**:
  - If logged in (localStorage has `gcashtv-user`): Navigate to `/account?tab=watchHistory`
  - If not logged in: Open LoginModal

### History Popover
- **Position**: Absolute (relative to wrapper), top calc(100% + 8px), right 0
- **Width**: 320px
- **Background**: #121214
- **Border Radius**: 12px
- **Box Shadow**: 0 8px 24px rgba(0, 0, 0, 0.4)
- **Z-Index**: 1001

### Popover Header
- **Padding**: 14px 16px
- **Color**: #FFFFFF
- **Font Size**: 15px
- **Font Weight**: 600
- **Border Bottom**: 1px solid #242428

### Popover Empty State
- **Display**: Flex column, centered
- **Padding**: 32px 16px
- **Icon**: 📺 (32px, 50% opacity)
- **Text**: Gray (#9CA3AF), 14px

### Popover List
- **Max Height**: 300px
- **Overflow-Y**: Auto
- **Items**: Up to 5 recent history items

### Popover Item
- **Display**: Flex, center aligned
- **Gap**: 12px
- **Padding**: 12px 16px
- **Cursor**: Pointer
- **Hover**: Background #1a1a1e, title color #3B82F6

### Popover Item Thumbnail
- **Size**: 48px × 64px
- **Border Radius**: 6px
- **Object Fit**: Cover

### Popover Item Info
- **Title**: #FFFFFF, 14px
- **Episode**: #9CA3AF, 12px

### Popover Item Resume
- **Icon**: ▶
- **Color**: #9CA3AF, hover #3B82F6

## Account Icon

### Icon States
- **Logged Out**: User SVG icon (person silhouette)
- **Logged In**: User avatar image (28px circular)

### Avatar Styling
- **Size**: 28px × 28px
- **Border Radius**: 50%
- **Object Fit**: Cover
- **Border**: 2px solid transparent
- **Hover/Active**: Border color #3B82F6

### Behavior
- **Login Check**: Uses localStorage (`gcashtv-user`) OR `isLoggedIn` prop
- **Logged In**: Navigate to `/account`
- **Logged Out**: Open LoginModal
- **Title**: User nickname or "Sign In"

## Language Switch

### Container
- **Position**: Relative
- **Cursor**: Pointer
- **Padding**: 8px
- **Flex Shrink**: 0

### Language Icon
- **Font Size**: 22px
- **Content**: Flag emoji based on current language

### Language Dropdown
- **Position**: Absolute, top calc(100% + 8px), right 0
- **Background**: #151518
- **Border Radius**: 10px
- **Box Shadow**: 0 8px 24px rgba(0, 0, 0, 0.4)
- **Min Width**: 150px
- **Z-Index**: 1001

### Language Option
- **Display**: Flex, center aligned
- **Padding**: 12px 16px
- **Cursor**: Pointer
- **Hover**: Background #1a1a1e, name color #3B82F6

### Language Option Icon
- **Font Size**: 18px
- **Margin Right**: 10px

### Language Option Name
- **Font Size**: 14px
- **Color**: #FFFFFF

### Supported Languages
| Language | Icon | Name Key |
|----------|------|----------|
| en | 🇺🇸 | t.languages.en |
| zh | 🇨🇳 | t.languages.zh |

## Login Modal Integration

The TopBar includes the LoginModal component:
- **Trigger**: Account icon click when not logged in
- **On Success**: Close modal, navigate to `/account`
- **On Close**: Just close modal

## Context Dependencies

### LanguageContext
- `language`: Current language code
- `setLanguage()`: Change language
- `t`: Translation object

### AuthContext
- `isLoggedIn`: Boolean authentication state
- `user`: Current user object (nickname, avatarUrl)

## Data Sources

### Watch History
- **Storage**: localStorage (`gcashtv-watch-history`)
- **Loading**: Fetched on hover of history icon
- **Display**: Shows up to 5 most recent items in popover
- **Structure**: `{ _id, seriesId, seriesTitle, episodeId, episodeNumber, thumbnail, tag, watchedAt }`
- **Click Action**: Navigate to `/player/{seriesId}/{episodeNumber}` to resume watching

## State Management

| State | Type | Default | Description |
|-------|------|---------|-------------|
| searchQuery | string | '' | Current search input |
| showLanguageDropdown | boolean | false | Language dropdown visibility |
| showSearchSuggestions | boolean | false | Search suggestions visibility |
| showHistoryPopover | boolean | false | History popover visibility |
| highlightedSuggestion | number | -1 | Keyboard navigation index |
| showLoginModal | boolean | false | Login modal visibility |

## Click Outside Handling

Uses `useEffect` with document event listener to close:
- Search suggestions when clicking outside search container
- History popover when clicking outside icon and popover

## Responsive Design

### Breakpoints

#### 1024px (Tablet)
- **Top Bar Padding**: 0 20px
- **Search Container**: Max width 300px
- **Top Bar Left Gap**: 20px
- **Brand Name**: Visible (same as desktop)
- **Nav Links**: Visible (same as desktop)
- **Genre Icon**: Hidden

#### 768px (Mobile)
- **Top Bar Padding**: 0 16px
- **Content Gap**: 12px
- **Top Bar Left Gap**: 12px
- **Brand Name**: Hidden
- **Nav Links**: Hidden
- **Genre Icon**: Visible (replaces nav links)
- **Search Container**: Flex 1, no max width
- **App Logo**: Height 30px
- **Icon Button**: 36px × 36px
- **Icon Size**: 20px
- **History Popover**: Width 280px, right -40px

#### 480px (Small Mobile)
- **Language Switch**: Hidden
- **History Popover**: Width 260px, right -80px

