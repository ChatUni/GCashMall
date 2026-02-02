# Account Page Specification

## Overview

The Account page is a comprehensive user profile and settings management interface for GCashTV. It features a sidebar navigation system with multiple content sections including profile management, watch history, favorites, settings, wallet and manage my series functionality.

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
- On successful login:
  - Modal closes and user can access account features
  - All data fetch flags are reset (userDataFetched, myPurchasesFetched, mySeriesFetched)
  - User data, My Purchases, and My Series are explicitly fetched from the server
  - This ensures data persists correctly after logout and re-login
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
| settings | ⚙️ | Settings |
| wallet | 💰 | Wallet |
| myPurchases | 🛒 | My Purchases |
| mySeries | 🎬 | My Series |

### Navigation Styling
- **Item Padding**: 13px 14px
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
- Top border: 1px solid #242428 (straight line, no rounded corners)
- Border radius: top corners set to 0 to ensure straight separator line
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
  - Border: 1px solid #2A2A2E
  - Border Radius: 8px
  - Padding: 12px 16px
  - Hover: Border #3B82F6, Background #242428
  - Focus: Blue border (#3B82F6) with shadow
  - **Select elements**: Flat dark theme (see Global Style Specification)
    - Custom dropdown arrow (SVG-based, no browser default)
    - Padding-right: 36px (for arrow space)

- **Save Button**: Primary blue button (#3B82F6)

##### Interaction

- Save button disabled when no changes in this section, otherwise enabled
- on save button click
  - validate email, phone number, birthday, show the error in red below each input
  - call the update profile API
  - show the success/fail message in a Toast Notification box (top right, fly-in and disapear after 3 seconds)
  - on success, disable the save button
  - on leaving the section/page without saving changes: show confirm dialog. if user cancel changes, clear the changes

#### Profile Picture Section
- **Current Avatar**: 80px circular preview
- **Actions**: Upload New Avatar button
- **Hint Text**: "Recommended: Square image, at least 200x200px. Max size: 5MB"

##### Interaction

- on Upload New Avatar click:
  - show the system file picker (for images)
  - validate image selected (max 5MB)
  - validation fail: show error in red under the button
  - validation success:
    - delete the current image on the cloud (if any)
    - upload the image to the cloud (under /GCash/users/{_id} folder)
    - get the returned url
    - call the update profile picture API with the url
  - show the success/fail result in toast notification
  - on success, show the new avatar in the preview

#### Change Password Section
| Field | Type | Placeholder |
|-------|------|-------------|
| Current Password | password | Enter current password |
| New Password | password | Enter new password |
| Confirm New Password | password | Confirm new password |

- **Change Password Button**: Primary blue button

##### Interaction

- if there is no current password (logged in through OAuth), then Current Password input should be hidden and Change Password Button should be Set Password Button
- on Change/Set Password click:
  - validation:
    - current password not empty (if there is a current password)
    - new password not empty
    - confirm new password not empty
    - new password and confirm new password match
    - valid new password
  - validation fail: show error in red under the input boxes
  - validation success: call the update/set password API
  - show the success/fail result in toast notification

### 2. Watch History

#### Header
- **Title**: "Watch History"
- **Actions**: 
  - Clear History button (secondary)

#### Content Grid
- **Layout**: 4 columns, 20px gap
- **Responsive**: 3 cols at 1200px, 2 cols at 768px

#### History Card
- Use the shared series card
- **Episode Badge**: Bottom-left, blue background (rgba(59, 130, 246, 0.9)), "EP X"
- **Remove Button**: Top-right, appears on hover, 28px circular

#### Empty State
- **Icon**: 📺 (64px, 50% opacity)
- **Title**: "No watch history yet"
- **Subtitle**: "Start watching to build your history"
- **Action**: "Explore Series" button

#### Interactions

- on load: get the watch list from the user's watchList field
- on remove button click: confirm then call remove from watch list API with the selected series
- on clear button click: confirm then call clear watch list API

### 3. Favorites

#### Header
- **Title**: "Favorites"

#### Content Grid
- Same layout as Watch History (4 columns)

#### Favorite Card
- Use the shared series card
- **Remove Button**: Top-right, appears on hover, 28px circular

#### Interactions

- on load: get the favorite list from the user's favorites field
- on remove button click: confirm then call remove from favorite list API with the selected series
- on clear button click: confirm then call clear favorite list API

#### Empty State
- **Icon**: ❤️
- **Title**: "No favorites yet"
- **Subtitle**: "Add series to your favorites to see them here"
- **Action**: "Explore Series" button

### 4. Settings

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
- **Select Control Styling**: Flat dark theme (see Global Style Specification)
  - Background: #1A1A1E
  - Border: 1px solid #2A2A2E
  - Border Radius: 6px
  - Padding: 8px 32px 8px 12px
  - Custom dropdown arrow (SVG-based)
  - Hover: Border #3B82F6, Background #242428
  - Focus: Border #3B82F6 with blue glow
- **Toggle**: 44px × 24px, custom styled checkbox

### 5. Wallet

#### Header
- **Title**: "Wallet"
- **Subtitle**: "Manage your Gcash balance"

#### Balance Card
- **Background**: Gradient (#1E3A5F to #0D1B2A)
- **Border**: 1px solid #3B82F6
- **Border Radius**: 16px
- **Padding**: 32px
- **Layout**: Flexbox row, align-items center
- **Gap**: 16px (between icon and balance info)
- **Content**:
  - Wallet Icon: 💰 (48px)
  - Balance Info (flex column, gap: 4px):
    - Label: "Current Balance" - Gray (#9CA3AF), 14px
    - Amount: White, 36px, font-weight 700, with GCash logo (32px) https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png
- **Mobile (768px)**:
  - Flex Direction: column
  - Text Align: center
  - Padding: 24px
  - Gap: 12px

#### Wallet Tabs
- **Container**: Background #121214, border-radius 12px, padding 4px
- **Tabs**: Two tabs - "Top Up" and "Withdraw"
- **Tab Styling**:
  - Flex: 1 (equal width)
  - Padding: 14px 24px
  - Font: 16px, font-weight 600
  - Border Radius: 8px
  - Inactive: Gray (#6B7280), transparent background
  - Active: White (#FFFFFF), blue background (#3B82F6)
  - Hover (inactive): Lighter gray (#9CA3AF)

#### Amount Selection Section
- **Header** (`.amount-section-header`):
  - Display: Flexbox row
  - Justify Content: space-between
  - Align Items: center
  - Min Height: 36px (ensures consistent height with or without button)
  - Margin Bottom: 0
  - **Title** (`.card-title`): "Select Top Up Amount" or "Select Withdrawal Amount" (based on active tab)
    - Margin Bottom: 0 (overrides default card-title margin)
  - **Withdraw All Button** (`.btn-withdraw-all`, only visible in withdraw tab when balance > 0):
    - Background: Blue (#3B82F6)
    - Color: White (#FFFFFF)
    - Padding: 8px 16px
    - Border Radius: 6px
    - Font: 13px, font-weight 500
    - Hover: Darker blue (#2563EB)
    - Click: Triggers withdraw flow with full balance amount (formatted to 2 decimal places)
- **Description** (`.amount-description`):
  - Font: 14px, Gray (#9CA3AF)
  - Margin: 16px 0 16px 0
  - Top Up: "Select an amount to add to your wallet"
  - Withdraw: "Select an amount to withdraw from your wallet"
- **Grid**: 4 columns, 16px gap
- **Amount Options**: 1, 5, 10, 20, 50, 100, 200, 500

#### Amount Button
- **Styling**:
  - Background: #1A1A1E
  - Border: 2px solid #242428
  - Padding: 24px 16px
  - Border Radius: 12px
- **Hover**: Blue border, blue tint background, translateY(-2px)
- **Content**: GCash logo (24px) + amount value (28px, white)
- **Disabled State** (for withdraw when amount > balance):
  - Opacity: 0.4
  - Cursor: not-allowed
  - No hover effects

#### Top Up Confirmation Popup
- **Overlay**: Fixed, black 80% opacity
- **Modal**:
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 32px
  - Max Width: 400px
- **Content**:
  - GCash Logo: 80px
  - Title: "Confirm Top Up" - 24px, blue (#3B82F6)
  - Message: "Add to your wallet" - 14px, gray
  - Amount: 48px, blue (#3B82F6), with logo
- **Buttons**:
  - Confirm: Blue (#3B82F6), hover: darker blue (#2563EB)
  - Cancel: Gray (#2A2A2E)

#### Withdraw Confirmation Popup
- **Overlay**: Fixed, black 80% opacity
- **Modal**:
  - Background: #1A1A1E
  - Border Radius: 16px
  - Padding: 32px
  - Max Width: 400px
- **Content**:
  - GCash Logo: 80px
  - Title: "Confirm Withdrawal" - 24px, blue (#3B82F6)
  - Message: "Withdraw from your wallet" - 14px, gray
  - Amount: 48px, blue (#3B82F6), with logo
- **Buttons**:
  - Confirm: Blue (#3B82F6), hover: darker blue (#2563EB)
  - Cancel: Gray (#2A2A2E)
- **Disabled State**: Both buttons disabled while processing, opacity 0.6

#### Wallet Interactions
- **Tab Switch**: Click on tab to switch between Top Up and Withdraw views
- **Top Up Flow**:
  1. Click amount button to select top up amount
  2. Confirmation popup appears
  3. Click Confirm to add balance
  4. Success toast notification appears
  5. Balance updates immediately
- **Withdraw Flow**:
  1. Click amount button (only enabled if amount <= balance)
  2. Confirmation popup appears
  3. Click Confirm to withdraw
  4. Success/error toast notification appears
  5. Balance updates on success
- **Insufficient Balance**:
  - Amount buttons disabled when amount > current balance
  - If somehow clicked, shows "Insufficient balance" error toast

#### Transaction History Section
- **Title**: "Transaction History"
- **Container**: Section card below amount selection
- **Empty State**: "No transactions yet" - Gray (#6B7280), centered, padding 40px
- **Data**: Combined list of wallet transactions (top up, withdraw) and purchases, sorted by date descending

#### Transaction Table
- **Container**: Overflow-x auto for mobile responsiveness
- **Table Width**: 100%
- **Border Collapse**: collapse

##### Table Headers
| Column | Label | Alignment |
|--------|-------|-----------|
| Time | Time | Left |
| Type | Type | Left |
| Amount | Amount | Left |
| Status | Status | Left |
| Reference ID | Reference ID | Left |

- **Header Styling**:
  - Background: #1A1A1E
  - Color: Gray (#9CA3AF)
  - Font: 14px, font-weight 500
  - Padding: 12px 16px
  - Border Bottom: 1px solid #242428

##### Table Rows
- **Row Styling**:
  - Padding: 14px 16px
  - Border Bottom: 1px solid #242428
  - Hover: Background rgba(59, 130, 246, 0.05)

##### Column Styling
- **Time**: Gray (#9CA3AF), 13px, white-space nowrap
- **Type**:
  - Font-weight: 500
  - White-space: nowrap (prevents "Top Up" from wrapping to two lines)
  - Top Up: Green (#22C55E)
  - Withdraw: Purple (#A855F7)
  - Purchase: Yellow (#EAB308), displayed in two lines:
    - Line 1: Series Name (14px, font-weight 500, #EAB308)
    - Line 2: "EP X Episode Title" (12px, gray #9CA3AF)
- **Amount**:
  - Font-weight: 600
  - Monospace font
  - Positive (Top Up): Green (#22C55E) with "+" prefix
  - Negative (Withdraw): Purple (#A855F7) with "-" prefix
  - Negative (Purchase): Yellow (#EAB308) with "-" prefix
- **Status**:
  - Text style: font-weight 500, font-size 13px
  - Success: Emerald text (#10B981) - different from top up green for contrast
  - Failed: Red text (#EF4444)
  - Processing: Amber text (#F59E0B)
- **Reference ID**: Monospace font, 12px, gray (#6B7280)
  - Fallback: "-" if referenceId is not available (for legacy purchase records)

#### Transaction Flow
1. When user initiates top up or withdraw, the API is called with the amount
2. Backend creates a transaction record with status "success" and updates the user's balance
3. Backend returns the updated user data including new balance and transaction history
4. Frontend updates the store with the new user data
5. Transaction appears in the history table with "success" status
6. Balance and transactions are persisted to the database and retained after page refresh
7. All transactions (top up, withdraw, purchases) are combined and sorted by createdAt descending (newest first)

#### Combined Transaction Data
- Wallet transactions (top up, withdraw) from user.transactions
- Purchases from user.purchases, converted to transaction format with type "purchase"
- For purchases:
  - Type displays as "Series Name - EP X Episode Title"
  - Amount shows the purchase price with "-" prefix
  - Status defaults to "success" if not present (for legacy records)
  - Reference ID displays "-" if not present (for legacy records)

### 6. My Purchases

#### Header
- **Title**: "My Purchases"
- **Subtitle**: "Episodes you have purchased"

#### Content Layout
- **Container**: Section with purchases grouped by series
- **Empty State**: Shown when no purchases exist

#### Purchase Series Group
- **Container**: Section card (#121214), border-radius 12px, padding 20px
- **Header**: Clickable, navigates to series player
  - **Cover**: 60px × 90px, border-radius 8px
  - **Series Name**: White, 18px, font-weight 600
  - **Episode Count**: Gray (#9CA3AF), 14px, e.g., "3 episodes"
- **Episodes Grid**: Auto-fill grid, min 140px per item, gap 16px

#### Purchase Episode Card
- **Thumbnail**: 16:9 aspect ratio, border-radius 8px
- **Overlay**: Play icon appears on hover
- **Episode Number**: Blue (#3B82F6), 14px, font-weight 600
- **Episode Title**: Gray (#9CA3AF), 12px, single line truncated

#### Empty State
- **Icon**: 🛒 (64px, 50% opacity)
- **Title**: "No purchases yet"
- **Subtitle**: "Browse series and purchase episodes to watch"
- **Action**: "Explore Series" button

#### Interactions
- On login: Purchases are loaded from `user.purchases` array and stored in `myPurchases` state
- On load: Display purchases from `myPurchases` state (already populated from user data on login)
- On series header click: Navigate to series player
- On episode card click: Navigate to player with specific episode

#### Responsive Design
- **768px**: Cover 50px × 75px, grid min 120px
- **480px**: Padding 16px, 2-column grid

### 7. My Series

#### Section Container
- **Class**: `.my-series-section`
- **Padding Bottom**: 40px

#### Header
- **Layout**: `.section-header` - Standard section header
- **Title**: "My Series" - White (#FFFFFF), 28px, font-weight 600
- **Conditional Content** (below title):
  - **When series list is empty**: Show subtitle "Series you have created" - Gray (#9CA3AF), 15px
  - **When series list has items**: Show "Add Series" button instead of subtitle
    - Class: `.add-series-btn`
    - Primary blue button (#3B82F6)
    - Text: "Add Series"
    - Padding: 10px 20px
    - Border Radius: 8px
    - Font: 14px, font-weight 500
    - Margin Top: 8px
    - Click: Opens series edit view in add mode

#### Content Grid
- Same layout as Watch History (4 columns, 20px gap)
- **Responsive**: 3 cols at 1200px, 2 cols at 768px

#### My Series Card
- **Class**: `.my-series-card`
- Use the shared series card styling
- **Cursor**: pointer
- **Transition**: transform 0.2s ease, opacity 0.2s ease
- **Hover**: translateY(-4px)

##### Shelved State
- **Class**: `.my-series-card.shelved`
- **Opacity**: 1

##### Shelved Badge
- **Position**: Absolute, top 8px, left 8px
- **Background**: rgba(239, 68, 68, 0.9) (red)
- **Color**: White (#FFFFFF)
- **Font**: 10px, font-weight 600
- **Padding**: 4px 8px
- **Border Radius**: 4px
- **Text**: "Shelved"

##### Action Icons Container
- **Class**: `.series-action-icons`
- **Position**: Absolute, top 8px, right 8px
- **Display**: flex, gap 8px
- **Z-index**: 10
- **Visibility**: Appears on card hover

##### Action Icon Button
- **Class**: `.action-icon-btn`
- **Size**: 28px × 28px
- **Border Radius**: 50% (circular)
- **Background**: rgba(0, 0, 0, 0.7)
- **Border**: none
- **Font Size**: 14px
- **Cursor**: pointer
- **Transition**: background-color 0.2s ease, transform 0.2s ease
- **Hover**:
  - Background: rgba(59, 130, 246, 0.9) (blue)
  - Transform: scale(1.1)
- **Icons**:
  - Shelve: 📥 (when series is not shelved)
  - Unshelve: 📤 (when series is shelved)
  - Edit: ✏️

#### Empty State
- **Class**: `.empty-state`
- **Display**: flex column, center aligned
- **Padding**: 60px 20px
- **Text Align**: center

##### Empty State Elements
- **Icon**: 🎬
  - Font Size: 64px
  - Opacity: 0.5
  - Margin Bottom: 16px
- **Title**: "No series yet"
  - Font Size: 18px
  - Font Weight: 600
  - Color: White (#FFFFFF)
  - Margin: 0 0 8px 0
- **Subtitle**: "Start creating your first series"
  - Font Size: 14px
  - Color: Gray (#9CA3AF)
  - Margin: 0 0 24px 0
- **Action Button**: "Add Series"
  - Primary blue button (#3B82F6)
  - Padding: 10px 20px
  - Border Radius: 8px
  - Font: 14px, font-weight 500

#### Interactions

- on load: get my series list by calling get my series API
- on card click: navigate to player page for that series
- on Shelve button click: confirm then call shelve series API with the selected series
- on Unshelve button click: confirm then call unshelve series API with the selected series
- on edit click: show the series edit page (in the content pane) in edit mode with the selected series
- on add series click (from empty state): show the series edit page (in the content pane) in add mode

#### Add Series / Edit Series View

When adding or editing a series, the content pane switches to show the SeriesEditContent component.

##### Header
- **Title**: "Add Series" (add mode) or "Edit Series" (edit mode)
- **Font**: White (#FFFFFF), 28px, font-weight 600

##### Navigation
- **Cancel**: Returns to the My Series list view
- **Save Complete**: Returns to the My Series list view and refreshes the series list

## URL Parameters

The page supports tab navigation via URL query parameter:
- `?tab=overview`
- `?tab=watchHistory`
- `?tab=favorites`
- `?tab=settings`
- `?tab=wallet`
- `?tab=myPurchases`
- `?tab=mySeries`

## Responsive Design

### Breakpoints

#### 1200px
- Grids: 3 columns

#### 1024px (Tablet)
- Main layout: Column direction
- Sidebar: Full width, horizontal layout
- Navigation: Horizontal wrap
- Active indicator: Hidden
- Profile actions: Full width buttons
- Logout button: Full width (flex-basis: 100%), border-radius: 0, straight separator line above

#### 768px (Mobile)
- Padding: 16px
- Title: 24px
- Grids: 2 columns
- Header actions: Column layout
- Top-up/Amount grid: 2 columns
- Balance amount: 28px
- Membership plans: Single column

#### 480px (Small Mobile)
- Navigation labels: Hidden (icons only)
- Grids: 2 columns, 12px gap
- Top-up values: 22px
- Balance amount: 24px
- Popup amount: 36px

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

## Login Popout (Modal) — Triggered by Account Icon (Not Logged In)

### Layout
Vertical
- title: "Login"
- email input (required)
- password input (required)
- "Forget password?" link (align right)
- "Login" button (primary blue)
- "Or continue with" (center)
- OAuth icons (center, Google, Facebook, Twitter, LinkedIn)
- "Don't have an account?" followed by the "Sign up" link

### Interaction

- on click “×” icon: close the modal without login, and reset sensitive fields
- on each OAuth icon hover: scale up by 50%
- on each OAuth icon click:
  - redirect to that OAuth provider's signin
  - on fail, stay in the popout modal
  - on success
    - get the OAuth id, name, email and photo from the profile
    - call the check email API to see if the user exists
    - if exists, call the login API with the OAuth id and type, log the user in, and show the account page
    - if not exists, call the email register API with OAuth id, type, name, email and photo url, then log the user in, and show the account page
- on Login button click:
  - verify email (valid email address)
  - verify password (not empty)
  - if fail, show the error below the input box in red
  - otherwise, call the login API
  - on success, log the user in, and show the account page
- on Forget password click: switch to reset password popout
- on Sign up click: switch to Sign up Popout

## Sign up Popout (Modal)

### Layout
Vertical
- title: "Sign Up"
- email input (required)
- password input (required)
- "Create an Account" button (primary green)
- "Or continue with" (center)
- OAuth icons
- "Already have an account?" followed by the "Log in" link

### Interaction

- on click “×” icon: close the modal without sign up, and reset sensitive fields
- on each OAuth icon hover and click: same as Login in popout
- on Create Account button click:
  - verify email (valid email address, not exists in db by calling the check email API)
  - verify password (min 6 chars, 1 upper, 1 lower, 1 number, 1 special char)
  - if fail, show the error below the input box in red
  - otherwise, call the email register API
  - on success, log the user in, and show the account page
- on Log in link click: switch to Login Popout

## Reset Password Popout (Modal)

### Layout
Vertical
- title: "Reset Password"
- email input (required)
- "Reset Password" button (amber)

### Interaction

- on click “×” icon: close the modal
- on Reset Password button click:
  - verify email (valid email address)
  - if fail, show the error below the input box in red
  - otherwise, call the reset password API
  - show the message "An email has been sent to {email} with password reset instruction."

