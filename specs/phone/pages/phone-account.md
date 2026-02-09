# Phone Account Page Specification

## Overview

The Phone Account page provides user profile management, watch history, and settings for the mobile UI.

## Page Structure

### Layout
- PhoneLayout wrapper
- No back button
- Title: "Overview" / "我的"
- Search icon visible
- Bottom navigation visible

### Content (Logged In)
1. User Profile Header
2. Quick Actions
3. Continue Watching
4. Settings Menu

### Content (Logged Out)
1. Login Prompt
2. App Info Links

## User Profile Header

### Container
- **Padding**: 24px 16px
- **Display**: Flex, center aligned
- **Gap**: 16px

### Avatar
- **Size**: 64px × 64px
- **Border Radius**: 50%
- **Border**: 2px solid #3B82F6
- **Object Fit**: Cover

### User Info
- **Flex**: 1

### Nickname
- **Font Size**: 18px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin Bottom**: 4px

### Email
- **Font Size**: 13px
- **Color**: #9CA3AF

### Edit Button
- **Size**: 40px × 40px
- **Background**: rgba(255, 255, 255, 0.1)
- **Border Radius**: 50%
- **Icon Size**: 20px

## Quick Actions

### Container
- **Display**: Grid
- **Grid Template**: repeat(4, 1fr)
- **Gap**: 16px
- **Padding**: 16px
- **Background**: #121214
- **Margin**: 0 16px
- **Border Radius**: 12px

### Action Item
- **Display**: Flex column, centered
- **Gap**: 8px

### Action Icon
- **Size**: 32px × 32px
- **Color**: #3B82F6

### Action Label
- **Font Size**: 12px
- **Color**: #9CA3AF

### Actions
| Icon | Label (EN) | Label (ZH) |
|------|------------|------------|
| Clock | History | 观看历史 |
| Heart | Favorites | 我的收藏 |
| Download | Downloads | 我的下载 |
| Gear | Settings | 设置 |

## Continue Watching

### Section Header
- **Display**: Flex, space-between
- **Padding**: 16px

### Title
- **Font Size**: 16px
- **Font Weight**: 600
- **Color**: #FFFFFF

### See All
- **Font Size**: 14px
- **Color**: #3B82F6

### History Item
- **Display**: Flex
- **Gap**: 12px
- **Padding**: 12px 16px
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.05)

### Thumbnail
- **Size**: 100px × 60px
- **Border Radius**: 6px
- **Position**: Relative

### Progress Bar
- **Position**: Absolute, bottom: 0
- **Height**: 3px
- **Background**: #3B82F6

### Item Title
- **Font Size**: 14px
- **Font Weight**: 500
- **Color**: #FFFFFF

### Item Episode
- **Font Size**: 12px
- **Color**: #9CA3AF

## Settings Menu

### Section Container
- **Background**: #121214
- **Margin**: 16px
- **Border Radius**: 12px

### Menu Item
- **Display**: Flex, space-between, center aligned
- **Padding**: 16px
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.05)

### Item Icon
- **Size**: 20px
- **Color**: #9CA3AF

### Item Label
- **Font Size**: 15px
- **Color**: #FFFFFF

### Item Value
- **Font Size**: 14px
- **Color**: #9CA3AF

### Item Arrow
- **Size**: 16px
- **Color**: #6B7280

### Menu Items
| Icon | Label (EN) | Label (ZH) | Type |
|------|------------|------------|------|
| Globe | Language | 语言 | Selector |
| Bell | Notifications | 通知 | Toggle |
| Shield | Privacy | 隐私 | Link |
| Info | About | 关于 | Link |
| Mail | Contact | 联系我们 | Link |
| Logout | Sign Out | 退出登录 | Action |

## Login Prompt (Logged Out)

### Container
- **Display**: Flex column, centered
- **Padding**: 48px 16px
- **Text Align**: Center

### Icon
- **Size**: 64px
- **Color**: #3B82F6

### Title
- **Font Size**: 20px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin Bottom**: 8px

### Description
- **Font Size**: 14px
- **Color**: #9CA3AF
- **Margin Bottom**: 24px

### Login Button
- **Background**: #3B82F6
- **Color**: #FFFFFF
- **Font Size**: 16px
- **Font Weight**: 600
- **Padding**: 14px 48px
- **Border Radius**: 24px

### Register Link
- **Font Size**: 14px
- **Color**: #3B82F6
- **Margin Top**: 16px

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Edit Profile | Tap | Open profile editor |
| Quick Action | Tap | Navigate to section |
| History Item | Tap | Resume watching |
| Menu Item | Tap | Execute action |
| Login Button | Tap | Open login modal |
| Sign Out | Tap | Confirm and logout |

## Internationalization

| Key | English | Chinese |
|-----|---------|---------|
| overview | Overview | 我的 |
| continueWatching | Continue Watching | 继续观看 |
| seeAll | See All | 查看全部 |
| signIn | Sign In | 登录 |
| signOut | Sign Out | 退出登录 |
