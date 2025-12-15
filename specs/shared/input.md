# Input components

## Multi Select Tags

A list of individually selectable tags

### Style

- wrappable
- when not selected: black border, black text, white bg
- when selected: blue bg, white text
- rounded corner: 2px

### Interaction

- on tag click: toggle the tag's selected status

## Image Upload

The component to upload a single image

### Layout

- an image preview box

### Style

- 500px by 500px
- dashed border
- when no image selected: a big plus sign at the center of the preview box
- when image selected: show the image in contain mode
- rounded corner: 4px

### Interaction

- on preview box click: when no image selected, show the system file picker dialog, otherwise show the large version of the image in a popup overlay (dim the background), click anywhere/press any key to dismiss the popup overlay
- on upload (upload will be triggered by the page/form that uses the image upload component): Upload the image to cloudinary under GCash folder