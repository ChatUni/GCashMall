# Input components

## Multi Select Tags

A list of individually selectable tags

### Style

- wrappable
- when not selected: black border, black text, white bg
- when selected: blue bg, white text
- rounded corner: 2px
- max 4 rows, vertical scrollable

### Interaction

- on tag click: toggle the tag's selected status

## Media Upload

The component to upload a single media file

### Layout

- a media preview box

### Style

- 500px by 500px
- dashed border
- when no media selected: a big plus sign at the center of the preview box
- when media selected:
  - show the image/thumbnail in contain mode
  - remove button: Top-right, appears on hover, 28px circular (optional)
- rounded corner: 4px

### Interaction

- on preview box click: when no media selected, show the system file picker dialog, otherwise show the large version of the image or the video player in a popup overlay (dim the background), click anywhere/press any key to dismiss the popup overlay
- on remove button click: remove the selected media
- on upload (upload will be triggered by the page/form that uses the media upload component):
  - for image: Upload the image to cloudinary under GCash folder (for deletion, extract public_id from url)
  - for video: Upload the video to bunny.net under video library 569096
