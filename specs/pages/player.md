# Player page

## Layout
Vertical
- Shared top bar
- Breadcrumb navigation
- Main player section
- Shared Recommendation section
- Shared New Releases section
- Social Buttons
- Shared bottom bar

## Components

### Breadcrumb Navigation

#### Layout
- Horizontal
- Positioned below the top bar
- Left-aligned

#### Style
- Font size: small
- Color: light gray
- Separator: “>”
- Current page series title highlighted in white
- Example: GcashReels > Current page series title

#### Interaction
- Clicking previous breadcrumb navigates （GcashReels）back to that page
- Current page is not clickable

### Main Player Section

#### Layout
- Centered main content area
- Vertical layout
- Player area is the visual focus of the page

##### Video Player
###### Layout
- Vertical video player (mobile-first aspect)
- Centered horizontally
- Fixed max width on desktop
- Adaptive height based on aspect ratio

###### Style
- Background color: black
- Rounded corners
- Subtle shadow for depth

###### Player Controls
- Play / Pause button
- Progress bar
- Current time / total duration
- Volume toggle
- Playback speed selector (e.g. 0.25x 0.5x 1.0x 1.25x 1.5x 2.0x 3.0x)
- Fullscreen toggle

###### Interaction
- Autoplay on page load (optional)
- On hover: player controls fade in
- On inactivity: controls fade out
- On click fullscreen: player enters fullscreen mode

##### Episode Title & Metadata
###### Layout
- Vertical stack
- Positioned directly below the video player

###### Content
- Episode title (e.g. “Seris Title" + "Episode number displayed i.e. 01, 02, 03,...”)
- Language selector (e.g. English)
- Tag list

###### Style
Episode Title
- Font size: medium–large
- Font weight: semibold
- Color: white

Language Selector
- Inline dropdown
- Font size: small
- Color: light gray
- Icon: globe

Tag List
- Horizontal
- Wrappable
- Each tag rendered as pill / chip
- Background color: dark gray
- Text color: light gray
- Font size: small
- Rounded corners
- Even spacing between tags

##### Download
###### Layout
- Horizontal action row
- Shares the same visual hierarchy as the Play button
- Button height matches the Play button
- Minimum clickable area: 36–40px

###### Style
Download Button
- Button type: icon + text (recommended)
- Label: Download

Default state:
- Text / icon color: white (#FFFFFF)
- Background color: transparent or dark gray surface (#1A1A1A)

Hover state:
- Text / icon color changes to blue (#3B82F6)
- subtle scale-up animation (same behavior as Play)

Active state:
- Text / icon remains blue (#3B82F6)

Icon
- Download icon (arrow-down)
- Icon appears before the text
- Icon color follows text state

###### Interaction
On hover
- Button highlights (text / icon turns blue)
- tooltip: Download

On click
- If the user is logged in: Open the shared Download Modal
- If the user is not logged in: Open the shared Login Modal 

##### Episode Description
###### Layout
- Positioned below metadata
- Full width of player container

###### Style
- Font size: small–medium
- Color: light gray
- Max lines: 3–4
- Line height optimized for readability
- Truncated with ellipsis if too long

##### Episode List Panel (Right Sidebar)
###### Layout
- Vertical
- Fixed width on desktop
- Positioned on the right side of the player
- Scrollable independently from main page

###### Content
- Section title: “Episodes”
- Episode range selector (e.g. 01–40, 41–77)
- Episode thumbnails grid

###### Style
Panel Container
- Background color: dark gray / near-black
- Rounded corners
- Subtle shadow

Episode Thumbnail
- Vertical thumbnail
- Rounded corners
- Episode number displayed (e.g. EP 01)

Active Episode
- Highlighted border or glow
- Higher brightness

###### Interaction
- On click episode thumbnail: switch to that episode
- Active episode updates instantly without page reload

### Social Buttons
#### Layout
- Vertical floating buttons on the right side

#### Content
- Share (Facebook, Twitter, Pinterest, WhatsApp)
- Add to favorites / save

#### Style
- Circular buttons
- Icon-only
- Background color: dark gray
- Icon color: white

#### Interaction
- On hover: icon turns blue
- On click: trigger corresponding action