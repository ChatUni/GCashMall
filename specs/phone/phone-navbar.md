# Phone Navigation Bar Component Specification

## Overview

The Phone Navigation Bar is a fixed bottom navigation component providing primary navigation for the mobile UI. It follows standard mobile app patterns for thumb-friendly access.

## Layout

### Container
- **Position**: Fixed, bottom: 0, left: 0, right: 0
- **Z-Index**: 100
- **Height**: 64px (plus safe area inset on iOS)
- **Background**: #0B0B0E
- **Border Top**: 1px solid rgba(255, 255, 255, 0.1)
- **Display**: Flex, space-around, center aligned
- **Padding**: 0 16px

## Navigation Items

### Item Container
- **Display**: Flex column, centered
- **Gap**: 4px
- **Padding**: 8px 16px
- **Min Width**: 64px
- **Background**: Transparent
- **Border**: None
- **Cursor**: Pointer
- **Transition**: color 0.2s ease

### Item Icon
- **Size**: 24px × 24px
- **Stroke Width**: 2
- **Color**: Inherits from container

### Item Label
- **Font Size**: 11px
- **Font Weight**: 500
- **Color**: Inherits from container

## States

### Default State
- **Color**: #9CA3AF

### Active State
- **Color**: #3B82F6

## Navigation Items Configuration

| Key | Path | Icon | Label (EN) | Label (ZH) |
|-----|------|------|------------|------------|
| home | `/` | House | Home | 首页 |
| genre | `/genre` | Grid (2×2) | Genre | 分类 |
| account | `/account` | Person | Overview | 我的 |

## Icons

### Home Icon
- Circle with house shape
- Door detail at bottom

### Genre Icon
- 4 squares in 2×2 grid
- Equal spacing between squares

### Account Icon
- Person silhouette
- Circle head, body below

## Safe Area Support

On devices with home indicators (iPhone X and later):
- **Padding Bottom**: env(safe-area-inset-bottom)
- **Total Height**: calc(64px + env(safe-area-inset-bottom))

## Route Matching

| Path | Active Item |
|------|-------------|
| `/` | Home (exact match) |
| `/genre`, `/genre/*` | Genre (starts with) |
| `/account`, `/account/*` | Account (starts with) |

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Home | Tap | Navigate to `/` |
| Genre | Tap | Navigate to `/genre` |
| Account | Tap | Navigate to `/account` |
