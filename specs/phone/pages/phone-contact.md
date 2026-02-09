# Phone Contact Page Specification

## Overview

The Phone Contact page provides a contact form and support information for users to reach out to the GCashTV team.

## Page Structure

### Layout
- Uses the standard phone layout
- Back button and "Contact" title in header
- No search icon
- Bottom navigation visible

### Content Sections
1. Contact Header
2. Contact Form
3. Alternative Contact Methods
4. FAQ Link

## Contact Header

### Container
- Centered content
- Generous padding

### Icon
- Mail or message icon
- Blue color, 48 pixels

### Title
- "Get in Touch" heading
- Bold, white, 20 pixel font

### Subtitle
- "We'd love to hear from you"
- Gray text, 14 pixel font

## Contact Form

### Container
- Horizontal padding
- Vertical spacing between fields

### Form Fields

**Name Field**
- Label: "Name"
- Text input
- Required field
- Placeholder: "Your name"

**Email Field**
- Label: "Email"
- Email input type
- Required field
- Placeholder: "Your email"
- Validates email format

**Subject Field**
- Label: "Subject"
- Dropdown selector
- Required field
- Options: General Inquiry, Technical Support, Billing Question, Feedback, Other

**Message Field**
- Label: "Message"
- Multi-line text area
- Required field
- Placeholder: "Your message"
- Minimum 120 pixel height

### Input Styling
- Full width
- 48 pixel height (text inputs)
- Dark gray background
- Subtle border, blue when focused
- 16 pixel font (prevents iOS zoom)
- White text
- Rounded corners

### Submit Button
- Full width
- Blue background, white text
- "Send Message" label
- Bold, 16 pixel font
- Rounded pill shape
- Disabled state when form invalid

### Validation
- Required field indicators
- Error messages below fields
- Red color for errors

## Alternative Contact Methods

### Container
- Rounded card background
- Horizontal margin

### Section Title
- "Other Ways to Reach Us"
- Bold, white, 16 pixel font

### Contact Methods
Each method shows:
- Icon on left (blue)
- Label and value stacked
- Label in gray, value in white

**Email**
- Mail icon
- Label: "Email"
- Value: support@gcashtv.com

**Phone**
- Phone icon
- Label: "Phone"
- Value: Contact number

**Hours**
- Clock icon
- Label: "Hours"
- Value: Business hours

## FAQ Link

### Container
- Centered text
- Padding above and below

### Link
- Blue text
- "Check our FAQ for quick answers"
- Tapping navigates to FAQ page

## Success State

After successful submission:

### Container
- Centered content
- Generous padding

### Icon
- Green checkmark circle
- 64 pixels

### Title
- "Message Sent!"
- Bold, white, 20 pixel font

### Message
- "We'll get back to you soon"
- Gray text

### Button
- "Back to Home" button
- Blue background
- Navigates to home page

## Form Submission

### Process
1. Validate all required fields
2. Show loading state on button
3. Submit form data to server
4. Show success or error state

### Loading State
- Button shows "Sending..."
- Button disabled during submission

### Error Handling
- Shows error message if submission fails
- Allows retry

## Interactions

| Element | Action | Result |
|---------|--------|--------|
| Back Button | Tap | Return to previous page |
| Input Field | Tap | Focus and show keyboard |
| Subject | Tap | Open dropdown selector |
| Submit | Tap | Validate and submit form |
| Email Link | Tap | Open email app |
| Phone Link | Tap | Open phone dialer |
| FAQ Link | Tap | Navigate to FAQ |

## Internationalization

### Labels
- English: "Contact", "Get in Touch", "Name", "Email", "Subject", "Message", "Send Message", "Message Sent!"
- Chinese: "联系我们", "联系我们", "姓名", "邮箱", "主题", "留言", "发送消息", "发送成功！"

### Subject Options
- English: General Inquiry, Technical Support, Billing Question, Feedback, Other
- Chinese: 一般咨询, 技术支持, 账单问题, 意见反馈, 其他
