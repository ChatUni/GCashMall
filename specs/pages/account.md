# Account page

## Layout
- Horizontal (two-column layout)
- Shared top bar
- Main content area: Left - Account sidebar (profile + navigation); Right - Account content panel (changes by selected tab)
- Shared bottom bar

## Style
- Page background: black / near-black (#0B0B0E)
- Primary text: white (#FFFFFF)
- Secondary text: light gray (#9CA3AF)
- Accent / active / hover: blue (#3B82F6)
- Surface panels: dark gray (#121214 / #151518)
- Dividers / subtle borders: very low-contrast gray (e.g. #242428)
- Rounded corners: 10–14px for panels/cards
- Shadow: subtle, soft shadow for depth (no hard border look)

## Components

### Account Sidebar (Left)
#### Layout
- Vertical
- Fixed width on desktop (~260–320px)
- Full height within viewport
- Scrollable if content exceeds viewport height

#### Style
Sidebar container
- Background color: dark gray surface (#121214 / #151518)
- Rounded corners
- Subtle shadow
- Padding: 16–20px

Profile block (top)
- Avatar (circle, 48–64px)
- Username / display name (white, semibold)
- Optional subtitle (email/ID) in light gray

Navigation list
- Vertical list of items
- Each item row height: ~40–44px
- Icon + label layout (left icon, right label)

Nav item states
- Default: light gray text
- Hover: text turns blue (#3B82F6)
- Active: blue text + left accent line (2–3px) + subtle background tint

Nav items
- Account Overview (default)
- Watch History
- Favorites
- Downloads
- Settings
- Wallet
- Payment
- Membership
- Logout (placed at bottom)

#### Interaction
- On click nav item: updates right content panel
- Active item remains highlighted

### Account Content Panel (Right)
#### Layout
- Takes remaining width
- Max content width recommended (~900–1100px)
- Top area: page header + optional quick actions
- Below: content section(s) depending on selected tab

#### Style
- Content panel background: transparent (page background)
Each section uses “surface card” blocks:
- Background color: #121214 / #151518
- Rounded corners 10–14px
- Padding 18–24px
- Subtle shadow

#### Default Tab: Account Overview

##### Section: Header
###### Layout
- Title row on top-left
- Optional right-side actions (small buttons)

###### Content
- Page title: “Account”
- Subtitle: “Manage your profile and preferences”

###### Style
- Title: white, 24–30px, semibold
- Subtitle: light gray, 14–16px

##### Section: Profile Summary Card
###### Layout
- Horizontal (desktop): avatar + info + quick actions
- Vertical (mobile): stacked

###### Content
- Avatar
- Display name
- Email / user id
- Account status : “Logged in” / “Guest”
Quick actions:
- Edit Profile
- Change Language 

###### Style
- Primary text white, secondary gray
Buttons:
- Primary button: blue bg (#3B82F6) + white text
- Secondary button: dark surface + blue border/text on hover

###### Interaction
- Edit Profile: opens modal or navigates to profile edit page
- Avatar click: upload/change avatar

##### Section: Recent Activity (Watch History Preview)
###### Layout
- Section header + list
- Shows the most recent 3–6 watched items

###### Content (each row)
- Small poster thumbnail (rounded corners)
- Series title (white)
- Last watched episode (gray)
- “Resume” icon/button on the right

###### Style
- Row hover: background slightly brighter + title turns blue
- “Resume” button: icon-only, turns blue on hover

###### Interaction
- Clicking row: navigates to last watched episode player page
- “View all”: navigates to full Watch History page

##### Section: Saved / Favorites Preview
Same pattern as Recent Activity.

#### Tab: Watch History (Full Page)
##### Layout
- Section header row + filters/actions row + history list/grid

##### Style
Header row
- Title: “Watch History”
Right side actions:
- “Clear History”
- “Sync history” toggle 

Empty State
- Centered icon + text: “You haven’t watched any series yet.”
- Subtext in light gray
- CTA button: “Explore series” (go to Home/Genre)

Non-empty State
- Grid or list (your choice): Desktop - 3–5 columns grid, Mobile - 2 columns
- Each item uses shared Card component plus “Resume” action

#### Tab: Settings
##### Section: Preferences
###### Layout
- Language
- Playback defaults (speed, autoplay)
- Notifications 
- Each setting is a row: label (left) + control (right)

###### Style
- Controls use dark surface inputs
- Focus ring: blue (#3B82F6)

#### Authentication Behavior (Not Logged In)
When user clicks Account icon (top bar) and is not logged in.
Open the shared Login modal popout (overlay) instead of navigating to account page.

##### Interaction
- Click the close icon "x": close modal
- Successful login: close modal → update top bar to “logged-in state” and navigate to Account page