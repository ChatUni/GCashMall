# Bottom Bar Component Specification

## Overview

The Bottom Bar is a simple footer at the bottom of all pages in GCashTV.  
It provides links to informational pages like About and Contact.  
It uses a minimal dark theme design and stays at the bottom of the viewport even when the page content is short.

---

## Component Structure

### Layout
- Position: Static (pushed to bottom via `margin-top: auto`)
- Height: 60px
- Width: 100%
- Background: Black (#000000)
- Display: Flex, center aligned, center justified

### Content Container
- Display: Flex, center aligned
- Gap: 40px

---

## Navigation Links

### Link Buttons
Two navigation buttons are provided:

| Label   | Path       | Description |
|---------|------------|-------------|
| About   | `/about`   | About page |
| Contact | `/contact` | Contact page |

### Link Button Styling
- Background: None (transparent)
- Border: None
- Color: White (#FFFFFF)
- Font Size: 16px
- Cursor: Pointer
- Padding: 10px 20px
- Text Decoration: None
- Transition: color 0.2s ease
- Hover: Color #CCCCCC (light gray)

---

## Component Dependencies

### Imports
```typescript
import React from 'react'
import { useNavigate } from 'react-router-dom'
import './BottomBar.css'
