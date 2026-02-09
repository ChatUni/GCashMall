# Phone About Page Specification

## Overview

The Phone About page displays information about the GCashTV application, including app details, features, and legal information.

## Page Structure

### Layout
- PhoneLayout wrapper
- Back button visible
- Title: "About" / "关于我们"
- No search icon
- Bottom navigation visible

### Content Sections
1. App Logo & Version
2. About Description
3. Features List
4. Legal Links
5. Copyright Footer

## App Logo Section

### Container
- **Display**: Flex column, centered
- **Padding**: 32px 16px

### Logo
- **Height**: 64px
- **Margin Bottom**: 12px

### App Name
- **Font Size**: 24px
- **Font Weight**: 700
- **Color**: #FFFFFF
- **Margin Bottom**: 4px

### Version
- **Font Size**: 14px
- **Color**: #9CA3AF

## About Description

### Container
- **Padding**: 0 16px 24px
- **Text Align**: Center

### Text
- **Font Size**: 15px
- **Color**: #9CA3AF
- **Line Height**: 1.7

## Features Section

### Container
- **Padding**: 16px
- **Background**: #121214
- **Margin**: 0 16px
- **Border Radius**: 12px

### Section Title
- **Font Size**: 16px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin Bottom**: 16px

### Feature Item
- **Display**: Flex
- **Gap**: 12px
- **Padding**: 12px 0
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.05)

### Feature Icon
- **Size**: 24px
- **Color**: #3B82F6

### Feature Text
- **Font Size**: 14px
- **Color**: #FFFFFF

### Features
| Icon | Feature (EN) | Feature (ZH) |
|------|--------------|--------------|
| Play | HD Video Streaming | 高清视频播放 |
| Globe | Multi-language Support | 多语言支持 |
| Clock | Watch History Sync | 观看历史同步 |
| Download | Offline Downloads | 离线下载 |
| Shield | Secure & Private | 安全隐私保护 |

## Legal Links

### Container
- **Padding**: 24px 16px
- **Display**: Flex column
- **Gap**: 12px

### Link Item
- **Display**: Flex, space-between, center aligned
- **Padding**: 16px
- **Background**: #121214
- **Border Radius**: 8px

### Link Text
- **Font Size**: 15px
- **Color**: #FFFFFF

### Link Arrow
- **Size**: 16px
- **Color**: #6B7280

### Links
| Label (EN) | Label (ZH) | Path |
|------------|------------|------|
| Terms of Service | 服务条款 | /terms |
| Privacy Policy | 隐私政策 | /privacy |
| Open Source Licenses | 开源许可 | /licenses |

## Copyright Footer

### Container
- **Padding**: 24px 16px
- **Text Align**: Center

### Text
- **Font Size**: 12px
- **Color**: #6B7280
- **Content**: © 2024 GCashTV. All rights reserved.

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Back | Tap | Return to previous |
| Legal Link | Tap | Navigate to page |

## Internationalization

| Key | English | Chinese |
|-----|---------|---------|
| about | About | 关于我们 |
| version | Version | 版本 |
| features | Features | 功能特点 |
| termsOfService | Terms of Service | 服务条款 |
| privacyPolicy | Privacy Policy | 隐私政策 |
| licenses | Open Source Licenses | 开源许可 |
