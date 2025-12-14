# Series list page

## Layout

Vertical

- shared top bar
- series list content
- shared bottom bar

## Components

### Series List Content

### Layout

#### Desktop

Horizontal
- genre list
- series list

#### Mobile

- series list

### Genre List

A vertical list of genre, plus 'All' at the top. Sorted by text.

#### Style

- width: 200px
- vertically scrollable

#### Interaction

- on genre click: filter the series list by the genre

### Series List

#### Style

Use shared card list style

### Series

Use shared card

#### Layout

Vertical
- cover
- series info

#### Interaction

- on hover:
  - cover image is enlarged by 5%
  - show a play icon (white) with round background (black, 50% opaque) at the center of the cover
- show full description in tooltip
- on click: go to series page with the series id

### Cover

#### Style

- aspect ratio 3:4

### Series Info

#### Layout

Vertical
- name
- description

#### Style

- align left
- name: blue, bold, size 20
- description: black, size 14, only 3 lines, overflow use ...
