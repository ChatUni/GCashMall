# Genre Page Specification

## Overview

The Genre page is a content discovery and browsing page for GCashTV.  
Its purpose is to help users easily explore and filter series by genre or category, so they can quickly find content that matches their interests.

The page is designed to feel familiar and intuitive:
- A genre sidebar on the left allows users to select categories
- A responsive content grid on the right displays the filtered results
- The experience works smoothly across desktop, tablet, and mobile devices

This document explains the page in clear, non-technical language, while preserving all functional, visual, and behavioral details.

---

## Page Structure

### Layout

- Overall height: Fills the full browser viewport
- Layout direction: Vertical page structure
- Theme: Dark mode
  - Background color: #0B0B0E
- Main content area:
  - Horizontal layout with:
    - Genre sidebar on the left
    - Content grid section on the right

---

### Components Used

- TopBar: Global header navigation
- BottomBar: Global footer navigation

---

## URL Parameters

The Genre page supports direct linking and deep navigation using URL parameters.

### Category Parameter

- ?category={genreName}
- Automatically selects a genre when the page loads

Example  
/genre?category=Romance

This opens the Genre page with Romance already selected.

---

### URL Behavior

- When the page loads:
  - It checks the URL for a category parameter
- If a valid genre is found:
  - That genre becomes the active filter
- When a user selects a genre:
  - The URL updates to reflect the selected category
- When “All” is selected:
  - The category parameter is removed from the URL

This allows:
- Bookmarking specific genres
- Sharing filtered pages
- Restoring state on refresh

---

## Data Structure (Conceptual)

Each series displayed on this page contains:
- A unique ID
- A title
- A poster image
- A primary tag
- One or more associated genres

This structure allows flexible filtering and grouping across categories.

---

## Genre List

The following genres are available for filtering:

1. All  
2. Romance  
3. Drama  
4. Thriller  
5. Comedy  
6. Action  
7. Fantasy  
8. Sci-Fi  
9. Horror  
10. Adventure  
11. Teenagers  
12. Humor  
13. Time Travel & Rebirth  
14. Mystery & Suspense  
15. Revenge  
16. Miracle Healer  
17. Substitute  
18. Celebrity  
19. Hidden Identity  
20. Princess  
21. Security Guard  
22. Criminal Investigation  

---

## Genre Sidebar

### Sidebar Container

- Width: 240px (fixed)
- Minimum width: 240px
- Background: Same dark background as the page
- Padding: 30px top and bottom
- Scrolling: Vertical scroll enabled if content exceeds height
- Sticky behavior:
  - Remains visible while scrolling
  - Positioned below the TopBar
- Height: Full screen minus TopBar height
- Divider: Thin border on the right

---

### Genre List Layout

- Vertical list
- Small spacing between items
- Horizontal padding for comfortable clicking

---

### Genre Item (Button)

Each genre is displayed as a clickable button with:
- No visible border
- Muted gray text by default
- Left-aligned text
- Comfortable padding
- Rounded corners
- Smooth hover and selection transitions

---

### Hover State

- Text becomes white
- Subtle light background appears

---

### Active State

- Text becomes white
- Slightly bolder font weight
- Light blue-tinted background

#### Active Indicator

- A blue vertical bar appears on the left of the active genre
- Helps users instantly recognize the current selection

---

## Content Grid Section

### Container

- Fills all remaining horizontal space
- Vertical scrolling enabled
- Generous padding to frame content comfortably

---

### Section Header

Located above the grid and contains:
- The currently selected genre name
- The number of matching results

---

### Genre Title

- Large white text
- Displays:
  - Selected genre name
  - Or “All” when no filter is applied

---

### Genre Count

- Smaller gray text
- Displays:
  - “{number} results”

---

## Content Grid

### Grid Layout

- Displays series as cards
- Default layout:
  - 4 columns
- Consistent spacing between cards

---

## Genre Card

Each card represents one series.

### Card Container

- Fully clickable
- Slight scale-up animation on hover
- Clicking a card navigates to the series player page

---

### Poster Container

- Fixed 2:3 aspect ratio
- Rounded corners
- Image overflow hidden
- Dark placeholder background while loading

---

### Card Image

- Fills the container completely
- Cropped proportionally
- Smooth zoom-in effect on hover

---

### Hover Effects

When hovering over a card:
- Poster image zooms slightly
- Blue glow shadow appears around the poster
- Title text turns blue

---

### Card Title

- White text by default
- Medium weight
- Limited to two lines
- Turns blue on hover

---

### Card Tag

- Small gray text
- Indicates the primary genre or category

---

## Filtering Logic (User Experience)

### Default State

- When “All” is selected:
  - All available series are shown

### Genre Selected

- A series appears if:
  - Its main tag matches the selected genre, OR
  - One of its associated genres matches the selected genre

This ensures flexible and intuitive filtering behavior.

---

## Navigation Actions

| User Action | Result |
|------------|--------|
| Click a genre | Updates active genre and URL |
| Click a series card | Navigates to the player page |

---

## Context Dependencies

### Language Support

- All user-facing text supports internationalization
- Examples include:
  - “All”
  - “results”

Text automatically updates based on the selected language.

---

## Responsive Design

The Genre page adapts smoothly across devices.

---

### 1200px and Below

- Grid reduces to 3 columns

---

### 1024px (Tablet)

- Sidebar becomes narrower
- Content padding is reduced for better fit

---

### 768px (Mobile)

- Layout switches to vertical stacking
- Sidebar moves to the top
- Genres display as a horizontal, wrapped list
- Active genre appears as a blue pill button
- Grid reduces to 2 columns
- Smaller spacing and font sizes for readability

---

### 480px (Small Mobile)

- Header stacks vertically
- Titles and card text slightly reduced in size

---

## Color Palette

| Usage | Color |
|------|------|
| Page Background | #0B0B0E |
| Sidebar Background | #0B0B0E |
| Card Placeholder | #1A1A1E |
| Borders | #1A1A1E |
| Primary Blue | #3B82F6 |
| Active Background | rgba(59, 130, 246, 0.1) |
| Hover Background | rgba(255, 255, 255, 0.05) |
| White Text | #FFFFFF |
| Gray Text | #9CA3AF |
| Blue Glow | rgba(59, 130, 246, 0.3) |

---

## Animations & Transitions

The page uses subtle motion to feel responsive and polished:

| Element | Behavior |
|------|--------|
| Genre item | Smooth color and background transitions |
| Card container | Gentle scale on hover |
| Card image | Zoom-in effect |
| Card title | Color change on hover |

All animations are short and unobtrusive.

---

## Mock Data

The page includes 16 sample series items for testing and demonstration.

Each item includes:
- A unique ID
- A title
- A poster image
- A primary tag
- Multiple genre associations

This mock data simulates real browsing behavior.

---

## Accessibility

- All genre buttons can be navigated using the keyboard
- Images include descriptive alternative text
- Clickable elements clearly indicate interactivity
- Color contrast meets accessibility standards

---

## User Experience Goals

- Make content discovery fast and intuitive
- Allow users to browse without friction
- Support deep linking and sharing
- Feel consistent with the rest of GCashTV
- Work beautifully on all screen sizes
