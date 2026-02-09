# Phone Account Page Specification

## Overview

The Phone Account page provides user profile management, watch history, and settings for the mobile UI. Shows different content based on login status.

## Page Structure

### Layout
- Uses the standard phone layout
- Logo and search icon in header (or "Overview" title)
- Bottom navigation visible

### Content When Logged In
1. User Profile Header
2. Quick Actions
3. Continue Watching
4. Settings Menu

### Content When Logged Out
1. Login Prompt
2. App Information Links

## User Profile Header (Logged In)

### Container
- Horizontal layout
- Subtle background gradient
- Generous padding

### Avatar
- 64 pixel circular image
- Blue border
- User's profile picture or default icon

### User Information
- Nickname in bold, white, 18 pixel font
- Email or ID in gray, smaller font

### Edit Button
- Circular button on right
- Pencil icon
- Tapping opens profile editor

## Quick Actions (Logged In)

### Container
- 4-column grid
- Rounded card background
- Horizontal margin

### Action Items
Each action shows:
- Icon above (32 pixels, blue)
- Label below (12 pixels, gray)

### Available Actions
- History: View watch history
- Favorites: View saved series
- Downloads: View offline content
- Settings: Open settings

## Continue Watching Section (Logged In)

### Section Header
- "Continue Watching" title
- "See All" link on right

### History Items
- Vertical list of recent watches
- Each item shows:
  - Thumbnail with progress bar
  - Series title
  - Episode information
  - Time since watched

### Progress Bar
- Blue bar on thumbnail
- Width indicates watch progress percentage

## Settings Menu (Logged In)

### Container
- Rounded card sections
- Horizontal margin

### Menu Items
Each item shows:
- Icon on left (gray)
- Label text (white)
- Current value or arrow on right (gray)

### Available Settings
- Language: Shows current language, opens selector
- Notifications: Toggle switch
- Privacy: Opens privacy settings
- About: Opens about page
- Contact: Opens contact page
- Sign Out: Logs out user (with confirmation)

## Login Prompt (Logged Out)

### Container
- Centered content
- Generous vertical padding

### Icon
- Large user icon (64 pixels)
- Blue color

### Title
- "Sign In" heading
- Bold, white, 20 pixel font

### Description
- Explains benefits of signing in
- Gray text

### Login Button
- Blue background, white text
- Rounded pill shape
- "Sign In" label

### Register Link
- Blue text below button
- Links to registration

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Edit Profile | Tap | Open profile editor |
| Quick Action | Tap | Navigate to that section |
| History Item | Tap | Resume watching |
| Settings Item | Tap | Open setting or toggle |
| Login Button | Tap | Open login modal |
| Sign Out | Tap | Confirm and log out |

## Internationalization

### Labels
- English: "Overview", "Continue Watching", "See All", "Sign In", "Sign Out"
- Chinese: "我的", "继续观看", "查看全部", "登录", "退出登录"
