# Top bar component

## Layout
Horizontal
- app logo
- GcashReels
- nav links (“Home”)
- nav links (”Genre“)
- search bar
- watch history icon
- account icon (Account): Login Popout (Modal) — Triggered by Account Icon (Not Logged In)
- language switch

## Style
- Bg color: black / near-black  (#0B0B0E)
- height: 60px
- full window width
- Text color: white (#FFFFFF) (nav + icons)
- Hover: text/icon changes to blue (#3B82F6)
- Active nav: Text color: blue (#3B82F6), Underline appears: Thin underline, Same blue color as text

## Components

### App Logo
url: https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png

### “Home” （Nav item）
#### Style
- Font size: 14–16px
- Default state: white text, no underline

#### Interaction
- On hover: "Home" turns blue
- On active: Blue text "Home" and Blue underline appears
- On click: go to Home page

### “Genre”
#### Style
- Font size: 14–16px
- Default state: white text, no underline

#### Interaction
- On active: Blue text "Genre" and Blue underline appears
- On click: go to series list page

### Search bar
#### Layout
Horizontal, input box, search button

#### Style
Container
- Background: dark gray, slightly lighter than top bar (#1A1A1A)
- Shape: pill / soft rounded rectangle
- Height: ~40px
- Subtle edge highlight: very thin, low-contrast outline to separate from dark background
- Input field and search button share the same outer rounded corners (single combo component)

Input field
- User input text color: white (#FFFFFF)
- Caret / cursor color: white (#FFFFFF)
- Background: transparent (inherits container background)
- Placeholder text: "Enter the title of the series"
- Placeholder color: light gray (#9CA3AF)

search button
- Text: white (#FFFFFF)
- show a magnifying glass icon, no text

input box and search button are connected as a combo, rounded corner on the combo

#### Interaction
On focus
- Cursor appears in white
- Placeholder text disappears once the user starts typing
- Focus outline appears around the entire combo

On typing
- User input text is rendered in white
- Matching series titles automatically pop out below the search bar (Search Suggestions Popout)

On Enter key press or clicking the magnifying-glass icon
- Navigate to search results page with the search query

#### Search Suggestions Popout
Displayed only when the search input is focused and the user is typing.

##### Trigger
- Popout opens when query length ≥ 1 (or ≥ 2, optional)
- Popout updates in real time as the user types
- Popout closes when: user clicks outside OR user presses Esc OR query becomes empty OR user selects a suggestion

##### Layout
- Anchored to the search bar
- Appears directly below the search bar
- Width matches the search bar width
- Overlay layer (above page content)

##### Style
- Background: near-black / dark gray (slightly different from top bar for contrast)
- Subtle shadow for depth
- Suggestion items are displayed as a vertical list
- Each row has consistent height and padding
- On Hover state on a row: row background slightly brighter and text can turn blue (#3B82F6)

##### Content
Each row shows:
- series title (text)
- one small tag on the right

##### Interaction
- On hover: highlight the row
- On click: navigate to the selected player page
- On Keyboard: Up/Down - move highlight between rows，On Enter - if a suggestion is highlighted: navigate to that player page；otherwise: run normal search (navigate to search results page with query)

### Watch History Icon
#### Layout
- Icon-only button
- Positioned on the right side, after the search bar and before account/language
- Clickable area: 36–40px square (comfortable hit target)

#### Style
- Icon color: white (#FFFFFF)
- Default: no underline 

#### Interaction
On Hover
- Icon color becomes blue (#3B82F6)
- Show a History Popover (quick preview)
- Popover appears next to or below the icon
- Displays a short list of recently watched series
- Each item is clickable and navigates to the corresponding player page

Popover closes when
- User moves the mouse away from both the icon and the popover
- User clicks outside the popover

On click
- Navigate to the History page
- Icon stays blue (#3B82F6) and Blue underline appears (Active State)

##### History Popover
###### Layout
- Anchored to the history icon
- Opens below the icon (top-right area)
- Overlay layer above page content
- Width: ~280–360px (desktop), responsive on smaller screens

###### Style
- Background color: dark gray (e.g. #121214 / #151518)
- text color: white
- Rounded corners: 10–14px
- Subtle shadow for depth
- Header row: “Watch History”
- Content list: vertical list (scrollable if long)

Empty state:
- Icon + text: “You haven’t watched any series yet.”
- Light gray text (#9CA3AF)

###### Content (each row)
- series title + last watched episode
- Right side: small resume icon indicator 

###### Interaction
- On hover: row background slightly brighter, title can turn blue (#3B82F6)
- On click: navigate to last watched episode player page

### Account Icon
#### Layout
- Icon-only button
- Positioned next to History icon
- Clickable area: 36–40px square

#### Style
- Icon color: white (#FFFFFF)

#### Interaction
- On Hover: Icon color becomes blue (#3B82F6)
- On Active/open state: Icon stays blue
On click
- Navigate to the Account page
- Icon stays blue (#3B82F6) and Blue underline appears

Account Icon (Not Logged In)
- On click: open Login Modal Popout (overlay, centered)
- No navigation to Account page until logged in

Account Icon (Logged In)
- On click: navigate to Account page

##### Login Popout (Modal) — Triggered by Account Icon (Not Logged In)

###### Layout
Vertical
- title: "Login"
- email input (required)
- password input (required)
- "Forget password?" link (align right)
- "Login" button (primary green)
- "Or continue with" (center)
- Google icon (center)
- "Don't have an account?" followed by the "Sign up." link

###### Interaction

- on click “×” icon: close the modal without login, and reset sensitive fields
- on Google icon hover: scale up by 50%
- on Login button click:
  - verify email and password
    - if fail, show the error below the input box in red
    - otherwise, do nothing
- on Forget password click: do nothing
- on Sign up click: do nothing
- on Google icon click: redirect to Google sign in page with the account page as the redirect url

### Language switch
It shows the icon of the current selected language.

#### Interaction
- on click: shows a dropdown with all supported languages (icon and name). When a language icon or name  is clicked, switch to that language, re-render the page with the selected language.
