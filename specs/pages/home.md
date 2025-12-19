# Home page

## Layout

Vertical

- Shared top bar
- Large hero banner (Hero Section)
- Recommendation sections - “You Might Like” 
- New Releases section - “New Releases” 
- Shared bottom bar

## Components

### Large hero banner (Hero Section)

#### Layout
- Full-width
- Large height, occupying most of the first viewport
- Left: featured poster image
- Right: content information panel

#### featured poster image
##### style
Featured Poster
- Image only
- Aspect ratio: vertical poster (approximately 2:3)
- Rounded corners
- Fixed width on desktop
- Image fully covers the container (no distortion)

##### Interaction
- on hover: Poster slightly scales up，A semi-transparent gray play icon appears centered on the image
- on click: Navigate to the player page

#### Content Information Panel
- Vertical stack
- Title
- Tag list
- Description
- Primary action button

##### style
Title
- Font size: large (28–36px)
- Font weight: bold
- Color: white
- Single line or max 2 lines with ellipsis

Tag List
- Horizontal
- Wrappable
- Each tag rendered as pill / chip
- Background: dark gray
- Text: light gray
- Font size: small
- Rounded corners
- Even spacing between tags

Description
- Font size: small–medium
- Color: light gray
- Max lines: 3–4 (truncate overflow)
- Line height: relaxed for readability

Primary Action Button "Play"
- Background: blue (#3B82F6)
- Text color: white
- Pill-shaped rounded corners
- Icon: play icon displayed before text
- Medium height 

##### Interaction
- On hover of the Play button: Button slightly scales up to provide visual feedback
- On click of the Play button: Navigate to the content player page

### Series List
#### Style
- Wrappable layout
- Number of items in a row: desktop - 4, mobile - 2
- All items have equal width and height regardless of content
- Items evenly distributed across each row
- Full window width
- Displayed in two rows, horizontally scrollable (carousel)

### Recommendation Section - “You Might Like”
#### Content Card
Use shared card component

##### Layout
- Vertical
- poster image
- title text
- tag (only one, the most representative one)
- Horizontal carousel

##### Style
Poster Image
- Aspect ratio: vertical (2:3)
- Rounded corners
- Image fully covers the container

Title
- Font size: small–medium
- Color: white
- Maximum lines: 1–2 with ellipsis
- Small margin above the title for spacing

##### Interaction
- On hover: Poster image slightly scales up，subtle glows and slightly scales up
- On click: Navigate to the player page

### New Releases Section – “New Releases”
Uses the same layout, styling, and interaction as the You Might Like section above.