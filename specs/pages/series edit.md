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
- cover (shared image upload)
- Cancel and Save button

#### Interaction

- on Cancel: confirm, then discard changes and go back
- on Save:
  - confirm save
    - if no, go back to previous page
  - if cover is changed:
    - delete existing cover on cloud
    - upload new cover to cloud
    - set the cover url to the cover field on the series being edited
  - save the series to db
  - show success/error message
    - if success, go back to previous page
    - otherwise stay on the editing page
