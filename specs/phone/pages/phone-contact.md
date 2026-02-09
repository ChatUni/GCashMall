# Phone Contact Page Specification

## Overview

The Phone Contact page provides a contact form and support information for users to reach out to the GCashTV team.

## Page Structure

### Layout
- PhoneLayout wrapper
- Back button visible
- Title: "Contact" / "联系我们"
- No search icon
- Bottom navigation visible

### Content Sections
1. Contact Header
2. Contact Form
3. Alternative Contact
4. FAQ Link

## Contact Header

### Container
- **Padding**: 24px 16px
- **Text Align**: Center

### Icon
- **Size**: 48px
- **Color**: #3B82F6
- **Margin Bottom**: 12px

### Title
- **Font Size**: 20px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin Bottom**: 8px

### Subtitle
- **Font Size**: 14px
- **Color**: #9CA3AF

## Contact Form

### Container
- **Padding**: 0 16px 24px

### Form Field
- **Margin Bottom**: 16px

### Label
- **Font Size**: 14px
- **Font Weight**: 500
- **Color**: #FFFFFF
- **Margin Bottom**: 8px

### Input
- **Width**: 100%
- **Height**: 48px
- **Background**: #1A1A1A
- **Border**: 1px solid rgba(255, 255, 255, 0.1)
- **Border Radius**: 8px
- **Padding**: 0 16px
- **Font Size**: 16px
- **Color**: #FFFFFF
- **Focus Border**: #3B82F6

### Textarea
- **Width**: 100%
- **Min Height**: 120px
- **Background**: #1A1A1A
- **Border**: 1px solid rgba(255, 255, 255, 0.1)
- **Border Radius**: 8px
- **Padding**: 12px 16px
- **Font Size**: 16px
- **Color**: #FFFFFF
- **Resize**: Vertical

### Form Fields
| Field | Type | Required |
|-------|------|----------|
| Name | text | Yes |
| Email | email | Yes |
| Subject | select | Yes |
| Message | textarea | Yes |

### Subject Options
| Value | Label (EN) | Label (ZH) |
|-------|------------|------------|
| general | General Inquiry | 一般咨询 |
| technical | Technical Support | 技术支持 |
| billing | Billing Question | 账单问题 |
| feedback | Feedback | 意见反馈 |
| other | Other | 其他 |

### Submit Button
- **Width**: 100%
- **Height**: 48px
- **Background**: #3B82F6
- **Color**: #FFFFFF
- **Font Size**: 16px
- **Font Weight**: 600
- **Border Radius**: 24px
- **Margin Top**: 8px
- **Disabled**: Opacity 0.5

### Validation Error
- **Font Size**: 12px
- **Color**: #EF4444
- **Margin Top**: 4px

## Alternative Contact

### Container
- **Padding**: 24px 16px
- **Background**: #121214
- **Margin**: 0 16px
- **Border Radius**: 12px

### Section Title
- **Font Size**: 16px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin Bottom**: 16px

### Contact Method
- **Display**: Flex
- **Gap**: 12px
- **Padding**: 12px 0
- **Border Bottom**: 1px solid rgba(255, 255, 255, 0.05)

### Method Icon
- **Size**: 20px
- **Color**: #3B82F6

### Method Label
- **Font Size**: 13px
- **Color**: #9CA3AF

### Method Value
- **Font Size**: 15px
- **Color**: #FFFFFF

### Contact Methods
| Icon | Label (EN) | Label (ZH) | Value |
|------|------------|------------|-------|
| Mail | Email | 邮箱 | support@gcashtv.com |
| Phone | Phone | 电话 | +1 (555) 123-4567 |
| Clock | Hours | 工作时间 | Mon-Fri, 9AM-6PM |

## FAQ Link

### Container
- **Padding**: 24px 16px
- **Text Align**: Center

### Link
- **Font Size**: 15px
- **Color**: #3B82F6

## Success State

### Container
- **Display**: Flex column, centered
- **Padding**: 48px 16px

### Icon
- **Size**: 64px
- **Color**: #10B981

### Title
- **Font Size**: 20px
- **Font Weight**: 600
- **Color**: #FFFFFF
- **Margin**: 16px 0 8px

### Message
- **Font Size**: 14px
- **Color**: #9CA3AF
- **Margin Bottom**: 24px

### Button
- **Background**: #3B82F6
- **Color**: #FFFFFF
- **Padding**: 12px 32px
- **Border Radius**: 20px

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Back | Tap | Return to previous |
| Input | Focus | Show keyboard |
| Submit | Tap | Validate and submit |
| Email | Tap | Open email app |
| Phone | Tap | Open dialer |
| FAQ | Tap | Navigate to FAQ |

## Internationalization

| Key | English | Chinese |
|-----|---------|---------|
| contact | Contact | 联系我们 |
| getInTouch | Get in Touch | 联系我们 |
| name | Name | 姓名 |
| email | Email | 邮箱 |
| subject | Subject | 主题 |
| message | Message | 留言 |
| send | Send Message | 发送消息 |
| successTitle | Message Sent! | 发送成功！ |
