# Phone Home Page Specification

## Overview

The Phone Home page is a TikTok-style vertical swipe video feed, featuring full-screen video playback with series information, action buttons, and smooth vertical scrolling between videos.

## Page Structure

### Layout
- Full-screen immersive video experience
- No header visible during video playback (immersive mode)
- Bottom navigation visible but semi-transparent
- Vertical snap scrolling between videos

### Content Sections (Per Video Card)
1. Full-screen Video Player
2. Series Information Overlay (bottom-left)
3. Action Buttons (right side)
4. Progress Indicator (optional)

## Video Feed Container

### Container
- Full viewport height (100vh / 100dvh)
- Vertical scroll with snap behavior
- scroll-snap-type: y mandatory
- overflow-y: scroll
- Hide scrollbar for clean appearance

### Scroll Behavior
- Each video card snaps to fill the entire viewport
- Smooth momentum scrolling
- scroll-snap-align: start on each video card
- Preload adjacent videos for smooth transitions

## Video Card

### Container
- Full viewport width and height
- Position: relative
- Background: #000 (black)
- scroll-snap-align: start

### Video Player
- Full-screen video element
- object-fit: cover (fills container, may crop)
- Autoplay when in view
- Muted by default (can unmute)
- Loop playback
- Tap to pause/play


## Series Information Overlay

### Container
- Position: absolute
- Bottom: 100px (above nav bar)
- Left: 16px
- Right: 80px (leave space for action buttons)
- Z-index: 10
- Pointer-events: auto

### Series Title
- Font size: 18px
- Font weight: 700
- Color: #ffffff
- Text shadow for readability
- Max 2 lines, truncated with ellipsis
- Margin bottom: 8px

### Series Description
- Font size: 14px
- Font weight: 400
- Color: rgba(255, 255, 255, 0.9)
- Text shadow for readability
- Max 2 lines, truncated with ellipsis
- Expandable on tap (show more/less)
- Margin bottom: 12px

### Tags Row
- Horizontal flex layout
- Gap: 8px
- Overflow: hidden (single line)

### Tag Pill
- Background: rgba(255, 255, 255, 0.2)
- Color: #ffffff
- Font size: 12px
- Padding: 4px 10px
- Border radius: 12px
- Backdrop filter: blur(4px)

## Action Buttons (Right Side)

### Container
- Position: absolute
- Right: 12px
- Bottom: 120px
- Flex direction: column
- Gap: 20px
- Align items: center
- Z-index: 10

### Button Style (Common)
- Width: 48px
- Height: 48px
- Border radius: 50%
- Background: rgba(0, 0, 0, 0.3)
- Backdrop filter: blur(4px)
- Display: flex
- Align items: center
- Justify content: center
- Transition: transform 0.2s, background 0.2s

### Button Active State
- Transform: scale(0.9)
- Background: rgba(0, 0, 0, 0.5)

### Button Label
- Font size: 11px
- Color: #ffffff
- Text align: center
- Margin top: 4px

### Favorite Button
- Heart icon (24x24)
- Default: white outline
- Active (favorited): red fill (#ef4444)
- Label: favorite count or "Like"

### Share Button
- Share icon (24x24)
- Color: white
- Label: "Share"
- On tap: Open native share dialog or copy link

### Comment Button (Optional)
- Comment icon (24x24)
- Color: white
- Label: comment count
- On tap: Open comments sheet

### Watch Button
- Play icon (24x24)
- Color: white
- Label: "Watch"
- On tap: Navigate to player page

### Series Avatar
- Position: above action buttons
- Size: 48x48
- Border radius: 50%
- Border: 2px solid white
- Shows series cover image
- On tap: Navigate to series detail

## Progress Indicator

### Container
- Position: absolute
- Bottom: 70px (just above nav)
- Left: 0
- Right: 0
- Height: 3px
- Background: rgba(255, 255, 255, 0.3)

### Progress Bar
- Height: 100%
- Background: #3B82F6 (blue)
- Width: percentage of video played
- Transition: width 0.1s linear

## Video Playback

### Autoplay and iframe Logic
- Video always auto plays
- Only 1 iframe, when current video/series changes, set the src of the video element in the iframe

### Scroll/Swipe
- after scroll/swipe
  - show the series cover with loading indicator
  - when video is loaded, start playing the video, do not show the thumbnail of the video

### Mute/Unmute
- Default: muted (for autoplay compliance)
- Tap volume icon to toggle

### Tap to Pause
- Single tap on video area toggles play/pause
- Show play icon overlay briefly when paused

## Data Loading

### Initial Load
- Fetch video feed from API (random videos/series from recommended series which contain videos)
- Load first 5 videos initially
- Show loading skeleton while fetching

### Infinite Scroll
- Load another 5 videos when the current position is length of list - 2
- Show loading indicator at bottom
- Append new videos to feed


## Loading State

### Skeleton
- Full-screen dark background
- Pulsing animation
- Centered loading spinner (optional)

### Error State
- Error message centered
- Retry button
- Pull to refresh support

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Video | Tap | Toggle play/pause |
| Video | Swipe up | Go to next video |
| Video | Swipe down | Go to previous video |
| Series Title | Tap | Navigate to series player |
| Tag | Tap | Navigate to genre with tag |
| Favorite Button | Tap | Toggle favorite (login required) |
| Share Button | Tap | Open share dialog |
| Watch Button | Tap | Navigate to series player |
| Series Avatar | Tap | Navigate to series player |
| Volume Icon | Tap | Toggle mute/unmute |

## Gestures

### Vertical Swipe
- Native scroll with snap
- Momentum scrolling
- Snap to nearest video

### Double Tap
- Double tap to favorite (like TikTok)
- Show heart animation on double tap

## Performance Optimizations

### Network Optimization
- Adaptive quality based on connection
- Progressive loading

## Accessibility

### Screen Reader
- Announce video title when focused
- Describe action buttons
- Provide skip navigation

### Reduced Motion
- Respect prefers-reduced-motion
- Disable autoplay if reduced motion preferred
- Use instant transitions instead of animations

## Internationalization

### Labels
- English: "Like", "Share", "Watch", "Comments"
- Chinese: "喜欢", "分享", "观看", "评论"
