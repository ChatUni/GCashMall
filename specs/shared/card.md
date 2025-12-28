# Card Component Specification

## Overview

The Card component is a reusable UI element for GCashTV that supports two modes: a Series Card for displaying video content with poster, title, and tag, and a Generic Card that accepts children for custom content. It features a dark theme design with hover effects.

## Component Modes

### 1. Series Card Mode
Used for displaying video series with structured content.

### 2. Generic Card Mode
Used for custom content passed as children.

## Props Interface

### Series Card Props
```typescript
interface SeriesCardProps {
  id: string           // Series ID for navigation
  poster: string       // Poster image URL
  title: string        // Series title
  tag: string          // Category/genre tag
  onClick?: () => void // Optional click handler
  className?: string   // Additional CSS classes
  children?: never     // Not allowed in series mode
}
```

### Generic Card Props
```typescript
interface GenericCardProps {
  children: React.ReactNode  // Card content
  onClick?: () => void       // Optional click handler
  className?: string         // Additional CSS classes
  id?: never                 // Not allowed in generic mode
  poster?: never             // Not allowed in generic mode
  title?: never              // Not allowed in generic mode
  tag?: never                // Not allowed in generic mode
}
```

## Base Card Styling

### Container
- **Border Radius**: 4px
- **Background**: #0B0B0E
- **Overflow**: Hidden
- **Cursor**: Pointer
- **Transition**: transform 0.3s ease, box-shadow 0.3s ease

### Hover Effects
- **Transform**: scale(1.02)
- **Box Shadow**: 0 4px 20px rgba(59, 130, 246, 0.2)

## Series Card Styling

### Layout
- **Display**: Flex column

### Poster Container
- **Aspect Ratio**: 2:3
- **Border Radius**: 4px
- **Overflow**: Hidden
- **Background**: #0B0B0E

### Poster Image
- **Width**: 100%
- **Height**: 100%
- **Object Fit**: Cover
- **Transition**: transform 0.3s ease
- **Hover**: scale(1.05)

### Poster Container Hover
- **Box Shadow**: 0 0 20px rgba(59, 130, 246, 0.3)

### Card Title
- **Font Size**: 14px
- **Font Weight**: 500
- **Color**: #FFFFFF
- **Margin**: 10px 0 4px 0
- **Line Height**: 1.3
- **Text Clamp**: 2 lines max
- **Transition**: color 0.2s ease
- **Hover**: Color #3B82F6

### Card Tag
- **Font Size**: 12px
- **Color**: #9CA3AF

## Navigation Behavior

### Default Click Behavior
- If `onClick` prop is provided, it is called
- If no `onClick` and it's a Series Card with `id`, navigates to `/player/{id}`

### Navigation Method
Uses React Router's `useNavigate` hook.

## Card List Layout

### Container (CardList.css)
- **Display**: Flex wrap
- **Gap**: 20px
- **Padding**: 24px
- **Width**: 100%
- **Box Sizing**: border-box

### Card Width Calculation
- **Desktop (>1024px)**: 4 items per row - `calc((100% - 60px) / 4)`
- **Tablet (769px-1024px)**: 3 items per row - `calc((100% - 40px) / 3)`
- **Mobile (≤768px)**: 2 items per row - `calc((100% - 20px) / 2)`

## Responsive Design

### Breakpoints

#### Desktop (>1024px)
- 4 cards per row
- Gap: 20px (3 gaps × 20px = 60px)

#### Tablet (769px - 1024px)
- 3 cards per row
- Gap: 20px (2 gaps × 20px = 40px)

#### Mobile (≤768px)
- 2 cards per row
- Gap: 20px (1 gap × 20px = 20px)

## Color Palette

| Element | Color |
|---------|-------|
| Card Background | #0B0B0E |
| Title Text | #FFFFFF |
| Title Hover | #3B82F6 |
| Tag Text | #9CA3AF |
| Hover Shadow | rgba(59, 130, 246, 0.2) |
| Poster Glow | rgba(59, 130, 246, 0.3) |

## Animations & Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Card | transform, box-shadow | 0.3s | ease |
| Poster | transform | 0.3s | ease |
| Title | color | 0.2s | ease |

## Usage Examples

### Series Card
```tsx
<Card
  id="series-1"
  poster="https://example.com/poster.jpg"
  title="Amazing Series"
  tag="Drama"
/>
```

### Series Card with Custom Click
```tsx
<Card
  id="series-1"
  poster="https://example.com/poster.jpg"
  title="Amazing Series"
  tag="Drama"
  onClick={() => console.log('Custom click')}
/>
```

### Generic Card
```tsx
<Card className="product-card">
  <div className="product-content">
    <img src="product.jpg" alt="Product" />
    <h3>Product Name</h3>
    <p>$19.99</p>
  </div>
</Card>
```

### Card List
```tsx
<div className="card-list">
  {series.map(item => (
    <Card
      key={item.id}
      id={item.id}
      poster={item.poster}
      title={item.title}
      tag={item.tag}
    />
  ))}
</div>
```

## Component Dependencies

### Imports
```typescript
import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Card.css'
```

## Accessibility

- Cards are keyboard accessible via cursor pointer
- Images have alt attributes with series titles
- Hover states provide visual feedback
- Focus states inherited from base button styles
