# Phone Header Component Specification

## Overview

The Phone Header is a sticky top navigation component for the mobile UI. It provides branding, optional back navigation, page titles, and search functionality.

## Layout

### Container
- **Position**: Sticky, top: 0
- **Z-Index**: 100
- **Height**: 56px (plus safe area inset on iOS)
- **Background**: #0B0B0E
- **Padding**: 0 16px
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.05)
- **Display**: Flex, space-between, center aligned

### Left Section
- **Display**: Flex, center aligned
- **Min Width**: 48px

### Center Section
- **Flex**: 1
- **Text Align**: Center
- **Padding**: 0 12px

### Right Section
- **Display**: Flex, center aligned
- **Min Width**: 48px
- **Justify Content**: flex-end
- **Gap**: 8px

## Logo (Default Left State)

- **Height**: 32px
- **Width**: Auto
- **Cursor**: Pointer
- **Click Action**: Navigate to `/`

## Back Button (Alternative Left State)

- **Size**: 40px × 40px
- **Background**: Transparent
- **Border**: None
- **Border Radius**: 50%
- **Color**: #FFFFFF
- **Icon Size**: 24px
- **Active State**: Background rgba(255, 255, 255, 0.1)
- **Click Action**: Navigate back or custom handler

## Page Title

- **Font Size**: 18px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **White Space**: nowrap
- **Overflow**: Hidden
- **Text Overflow**: ellipsis

## Search Button

- **Size**: 48px × 48px
- **Background**: Transparent
- **Border**: None
- **Border Radius**: 50%
- **Color**: #FFFFFF
- **Icon Size**: 38px
- **Active State**: Background rgba(255, 255, 255, 0.1)
- **Click Action**: Navigate to `/search`

## Safe Area Support

On devices with notches (iPhone X and later):
- **Padding Top**: env(safe-area-inset-top)
- **Total Height**: calc(56px + env(safe-area-inset-top))

## Usage Variations

| Page Type | Left | Center | Right |
|-----------|------|--------|-------|
| Home | Logo | - | Search |
| Detail | Back | Title | Search |
| Search | Back | "Search" | - |
| Custom | Back | Title | Custom + Search |

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Logo | Tap | Navigate to home |
| Back Button | Tap | Go back or custom action |
| Search Button | Tap | Navigate to search |
