# Account Page Specification

## Overview

The Account page is a central hub where users manage everything related to their GCashTV account.  
It allows users to view and edit their personal profile, manage watch history and favorites, adjust settings, and handle wallet balance — all in one place.

The page uses a left-side navigation menu to switch between different sections, making it easy for users to understand where they are and what they can do.

This specification is written so that anyone (designers, product managers, QA, business stakeholders, and engineers) can clearly understand how the page works, what users see, and how data behaves.

---

## Page Structure

### Layout

- Overall layout: Full screen height
- Direction: Vertical stacking (top to bottom)
- Theme: Dark mode
  - Background color: #0B0B0E
- Main area:
  - Split into two parts:
    - Sidebar (fixed width: 280px)
    - Main content area (flexible width)
- Padding:
  - Vertical: 24px
  - Horizontal: 40px
- Spacing:
  - 32px gap between sidebar and content area

### Components Used

- TopBar: Global header navigation
- BottomBar: Global footer navigation
- LoginModal: Popup modal for login and registration

---

## Authentication

### Login Requirement

- When the Account page loads, the system checks the browser’s local storage for a saved user object called gcashtv-user
- If the user is not logged in:
  - The login popup automatically appears
- If the user logs in successfully:
  - The popup closes
  - User data is loaded into the Account page
- If the user closes the popup without logging in:
  - The user is redirected back to the home page

### User Data Loading

- All user information comes only from local storage
- No server request is made to fetch user profile data
- This prevents accidental overwriting of existing local data
- Display name logic:
  - If a nickname exists, it is shown first
  - Otherwise, the username is shown

### Logout Functionality

- A Logout button is located at the bottom of the sidebar
- When clicked:
  - User data is removed from local storage
  - The user is redirected to the home page

---

## LoginModal Component

### File Structure

- Login modal logic and layout are separated into:
  - A main component file
  - A dedicated stylesheet file

---

### Modal Behavior and States

The modal supports two modes:
- Login
- Register

It internally tracks:
- Current mode (login or register)
- Email input
- Password input
- Confirm password input (register only)
- Nickname input (register only)
- Error messages
- Loading state (while submitting)

---

### Modal Overlay

- Covers the entire screen
- Dark translucent background (85% black)
- Centers the modal visually
- Clicking outside the modal closes it
- Stays above all other content

---

### Modal Container

- Dark card-style popup
- Rounded corners (16px)
- Padding: 40px
- Maximum width: 420px
- Responsive to screen size
- Soft drop shadow for depth

---

### Close Button

- Circular button in the top-right corner
- Uses a ✕ icon
- Subtle hover animation:
  - Background becomes lighter
  - Icon turns white
- Smooth transition (0.2s)

---

### Brand Section

- Displays the GCashTV logo and name
- Centered horizontally
- Slight left offset for visual alignment

#### Logo

- Image loaded from Cloudinary
- Height: 66px
- Automatically scales width

#### Brand Name

- Text: GcashTV
- White color
- Font size: 30px
- Medium-bold weight (600)

---

### Header Section

- Centered text
- Changes based on mode

#### Title

- Login: “Welcome Back”
- Register: “Create Account”
- Font size: 25px
- Font weight: 600
- White color

#### Subtitle

- Login: “Sign in to access your account”
- Register: “Sign up to get started”
- Gray color
- Font size: 15px

---

### Form Section

- Vertical layout
- 20px spacing between fields

#### Form Groups

Each input includes:
- A label
- An input field
- Clear spacing for readability

#### Labels

- Gray text
- Font size: 14px
- Medium weight

#### Inputs

- Dark background
- White text
- Rounded corners
- Comfortable padding
- Clear focus state:
  - Blue border
  - Soft blue glow
  - No browser outline

---

### Form Fields

#### Login Mode

- Email
- Password

#### Register Mode (Additional Fields)

- Nickname
- Confirm Password

All labels and placeholders use translation keys to support multiple languages.

---

### Error Message Display

- Shown when validation or login fails
- Red tinted background and border
- Center-aligned text
- Clear, user-friendly messages such as:
  - Invalid email or password
  - Passwords do not match
  - Email already registered
  - Password too short

---

### Submit Button

- Primary blue button
- White text
- Rounded corners
- Large, easy-to-tap size
- Hover: darker blue
- Disabled:
  - Reduced opacity
  - Not clickable
- Loading state shows “...”
- Text changes based on mode:
  - Login: “Sign In”
  - Register: “Sign Up”

---

### Footer Section

- Appears below the form
- Separated by a thin border
- Allows switching between Login and Register

#### Switch Text

- Gray informational text

#### Switch Button

- Blue clickable text
- Underlines on hover
- Toggles between login and registration modes

---

### Validation Rules

#### Login

- Email: required
- Password: required

#### Register

- Nickname: required and cannot be empty
- Email: required and must be valid
- Password: minimum 6 characters
- Confirm password: must match password

---

### Data Storage on Success

- After successful login or registration:
  - User data is saved in local storage
  - Stored fields include:
    - Nickname
    - Username
    - Email
    - User ID
- Nickname always takes priority for display

---

### Responsive Design (Login Modal)

#### Small Mobile (≤480px)

- Reduced padding
- Slightly smaller title text
- Tighter spacing for better fit

---

## Sidebar

### Profile Section

- Circular avatar (56px)
- Shows user image or default 👤 icon
- Displays:
  - User name (white, bold)
  - Email (gray, smaller text)
- Bottom border separates it from navigation

---

### Navigation Items

| Section | Icon | Label |
|------|------|------|
| Overview | 👤 | Overview |
| Watch History | 📺 | Watch History |
| Favorites | ❤️ | Favorites |
| Settings | ⚙️ | Settings |
| Wallet | 💰 | Wallet |

---

### Navigation Styling

- Rounded clickable items
- Icon and text aligned horizontally
- Hover:
  - Text turns blue
- Active state:
  - Light blue background
  - Blue left indicator bar
  - Blue text

---

### Logout Button

- Fixed at bottom of sidebar
- Separated by a top border
- Hover turns text red

---

## Content Sections

## 1. Overview (Profile Management)

### Header

- Title: Account Overview
- Subtitle: “Manage your profile and preferences”

---

### Profile Information Section

Users can edit:
- Nickname
- Email
- Phone number
- Gender
- Birthday

Inputs follow the same dark theme styling as login fields.

A Save button confirms changes.

---

### Profile Picture Section

- Shows current avatar preview
- Allows:
  - Uploading a new image
  - Removing the current image
- Guidelines:
  - Square image
  - Minimum 200×200px
  - Maximum size: 5MB
  - Image files only

---

### Change Password Section

Users must enter:
- Current password
- New password
- Confirm new password

Rules:
- Minimum 6 characters
- Passwords must match

---

## 2. Watch History

### Header

- Title: “Watch History”
- Actions:
  - Clear history
  - Sync toggle

---

### Content Grid

- Default: 5 columns
- Responsive layout adapts to screen width

---

### History Card

Each item shows:
- Series poster
- Episode badge (e.g. EP 3)
- Remove button (appears on hover)
- Series title
- Tag label

---

### Empty State

- Icon: 📺
- Message encouraging users to start watching
- “Explore Series” button

---

## 3. Favorites

- Same grid layout as Watch History
- Cards highlight on hover
- Removing favorites is easy and immediate

---

## 4. Settings

Users can control:
- Language
- Playback speed
- Autoplay
- Notifications

Each setting is shown in a clean row with clear controls.

---

## 5. Wallet

### Balance Card

- Displays current wallet balance
- Blue gradient background (linear gradient from #3b82f6 to #1d4ed8)
- Left side shows:
  - "Balance" label (white, 14px, 80% opacity)
  - Amount with G logo icon (36px) followed by the number (36px, bold, white)
- Right side shows: 💰 emoji (48px, full opacity)
- Rounded corners (16px)
- Box shadow for depth

---

### Currency Display

- All currency amounts use the G logo image instead of ₱ symbol
- G logo is loaded from Cloudinary (same as TopBar logo)
- Icon sizes vary by context:
  - Balance amount: 36px
  - Amount buttons: 20px
  - Transaction amounts: 16px
  - Modal confirmation: 18px
- Icons are vertically aligned with numbers using flexbox

---

### Action Buttons

- Two toggle buttons: "Top Up" and "Withdraw"
- Displayed side by side with equal width
- Styling:
  - Inactive: Dark background (#1a1a1a), gray text, gray border
  - Active: Blue background (#3b82f6), white text, blue border
  - Hover: Blue border, white text
- Clicking a button sets the current wallet action mode

---

### Amount Selection Section

- Title changes based on selected action:
  - Top Up mode: "Select Top Up Amount"
  - Withdraw mode: "Select Withdraw Amount"
- Grid layout with 6 predefined amounts: 10, 20, 50, 100, 200, 500
- 3 columns on desktop, 2 columns on mobile
- Each button shows G logo + amount
- Hover effects: blue border, slight scale, blue tinted background

---

### Wallet Action Confirmation Popup

- Dark overlay (85% black)
- Centered modal with dark background
- Title changes based on action:
  - Top Up: "Confirm Top Up"
  - Withdraw: "Confirm Withdraw"
- Message shows selected amount with G logo icon
- Two buttons: Cancel (secondary) and Confirm (primary)
- Withdraw validation: Cannot withdraw more than current balance

---

### Transaction History

- Shows past wallet activity
- Each transaction displays:
  - Description (e.g., "Top up 100" or "Withdraw 50")
  - Date
  - Amount with G logo icon
- Amount styling:
  - Top up: Green color (#22c55e) with + prefix
  - Withdraw: Red color (#ef4444) with - prefix
- Empty state message if no transactions exist

---

## URL Parameters

The Account page supports direct navigation using URL tabs:

- ?tab=overview
- ?tab=watchHistory
- ?tab=favorites
- ?tab=settings
- ?tab=wallet

---

## Responsive Design Summary

Supports:
- Desktop
- Tablet
- Mobile
- Small mobile

Layout, font sizes, grids, and spacing adapt smoothly at:
- 1400px
- 1200px
- 1024px
- 768px
- 480px

---

## Color Palette

All colors are predefined and consistent across the page, including:
- Backgrounds
- Borders
- Text
- Primary actions
- Success and error states

---

## Animations & Transitions

- Subtle hover animations
- Smooth button feedback
- Gentle card lift effects
- Fast but unobtrusive transitions

---

## Data Persistence

All key data is saved locally to ensure fast loading and offline resilience:
- User profile
- Wallet balance
- Favorites
- Watch history

Limits and replacement rules ensure data stays clean and relevant.

---

## User Experience Goals

- Clear and friendly for non-technical users
- Visually consistent and modern
- Predictable behavior
- Fast feedback
- No confusion about login state or saved data
