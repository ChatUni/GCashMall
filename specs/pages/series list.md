# Series list page

## Layout
Vertical
- Shared top bar
- Main content area: Left - Genre filter sidebar, Right - Content grid
- Shared bottom bar

## Components

### Genre filter sidebar
#### Layout
- Vertical
- Fixed width on desktop
- Positioned on the left side of the page
- Scrollable if content exceeds viewport height

#### Style
Sidebar Container
- Background: black / near-black (#0B0B0E)
- Text color: light gray (#9CA3AF)
- Padding: vertical spacing between items
- Subtle divider or spacing between groups (optional)

Genre Item
- Font size: small–medium
- Color (default): light gray
- Cursor: pointer

Active Genre
- Text color: white
- Font weight: medium / semibold
- Visual indicator: Left accent line

Hover State
- Text color: white
- Subtle brightness increase

#### Interaction
- On click: Sets clicked genre as active, Updates the content grid on the right using the selected genre filter, Updates the Section Header text to match the selected genre
- Active genre remains highlighted
- Page does not reload (client-side filtering)

### Content Grid Section

#### Layout
Vertical
- section header
- series card list

#### Style
- Positioned on the right side of the page
- Full remaining width after sidebar

#### Section Header

##### Style
- Font size: medium–large
- Color: white
- Font weight: semibold
- Positioned at top-left of the content grid
- Spacing: small margin-bottom between header and grid

##### Interaction
- Header is not clickable (display-only)
- show result count on the right side of the header

#### Series Card List

##### Style

- Wrappable layout
- Number of items in a row: desktop - 4, mobile - 2
