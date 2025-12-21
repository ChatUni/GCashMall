# Home page

## Layout

Vertical

- Shared top bar
- Large hero banner (Hero Section)
- Shared Recommendation section
- Shared New Releases section
- Shared bottom bar

## Components

### Large hero banner (Hero Section)

#### Layout
- Left: featured poster image
- Right: content information panel

#### Style
- Full-width
- Large height, occupying most of the first viewport

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

##### Layout
Vertical
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
