# Genre page

## Layout
- Horizontal (two-column layout)
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
- Page does not reload (client-side filtering recommended)

#### Data
- “All” (default)
- Genre list items:
- Romance
- Teenagers
- Humor
- Time Travel & Rebirth
- Mystery & Suspense
- Revenge
- Miracle Healer
- Substitute
- Celebrity
- Hidden Identity
- Princess
- Security Guard
- Criminal Investigation
...

### Content Grid Section
Use shared card

#### Layout
- Positioned on the right side of the page
- Grid layout
- Full remaining width after sidebar
- Wrappable layout
- Number of items in a row: desktop - 4, mobile - 2

#### Section Header
Displayed above the content grid. The header must reflect the currently selected genre from the left sidebar.
i.e. If selected genre is “All”: Header text = “All”;
If selected genre is any other genre: Header text = the selected genre name

##### Style
- Font size: medium–large
- Color: white
- Font weight: semibold
- Positioned at top-left of the content grid
- Spacing: small margin-bottom between header and grid

##### Interaction
- Header is not clickable (display-only)
- show result count on the right side of the header
