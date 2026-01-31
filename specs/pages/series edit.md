# Series Edit page

To add or edit series

## Layout

Vertical

- shared top bar
- series edit
- shared bottom bar

## Components

### Series Edit

#### Layout

Vertical

- name (input box)
- description (text area, 5 rows)
- genre (shared multi select tags)
- cover (shared media upload in image mode)
- episode list
- shelved (checkbox, default true)
- Cancel and Save button

#### Episode List

- 4-column responsive grid layout (same as Watch History grid in Account page)
  - 4 columns on large screens (>1200px)
  - 3 columns on medium screens (768px-1200px)
  - 2 columns on small screens (<768px)
- each one is a Episode Edit component
- the "Add Episode" button below the list

#### Episode Edit

- card with 8px border-radius on all four corners
- episode number displayed as "Total EPs {number}" (e.g., "Total EPs 01")
- title followed by edit icon
- video (shared media upload in video mode, no remove button)
- "Delete Episode" button with 8px border-radius

#### Interaction

- on Cancel click: confirm, then discard changes and go back
- if episode list is empty, add a new video upload component automatically with title "EP 01"
- Add Episode button disabled when the last video upload component doesn't have a video
- on Add Episode click: add a new video upload component to the end of the episode list, default title "EP {number of episodes in the list + 1}"
- on Delete Episode click: remove the episode from the list, update the episode number for the remaining episodes
- on Save click:
  - confirm save
    - if no, do nothing
  - if cover is changed:
    - delete existing cover on cloud
    - upload new cover to cloud
    - set the cover url to the cover field on the series being edited
  - if episode list is changed:
    - delete existing video on cloud for each episode deleted
    - remove the last episode from the list if it is empty (no video selected)
    - upload new video to cloud for each episode added
    - set the returned video id to the videoId field on the episode
    - show the delete/upload progress in a popup dialog 
  - save the series to db (with the current user as the uploader)
  - show success/error message
    - if success, go back to previous page
    - otherwise stay on the editing page
