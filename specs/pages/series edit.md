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
- Cancel and Save button

#### Episode List

- horizontal, wrappable
- each one is a Episode Edit component
- the "Add Episode" button below the list 

#### Episode Edit

- episode number
- title followed by edit icon
- video (shared media upload in video mode)
- "Delete Episode" button 

#### Interaction

- on Cancel click: confirm, then discard changes and go back
- if episode list is empty, add a new video upload component automatically
- Add Episode button disabled when the last video upload component doesn't have a video
- on Add Episode click: add a new video upload component to the end of the episode list
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
    - upload new video to cloud for each episode added
    - set the returned video id to the videoId field on the episode
    - show the delete/upload progress in a popup dialog 
  - save the series to db (with the current user as the uploader)
  - show success/error message
    - if success, go back to previous page
    - otherwise stay on the editing page
