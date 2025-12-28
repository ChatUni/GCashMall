# Product List Page Specification

## Overview

The Product List page displays a grid of products fetched from a backend API. It supports filtering by category and search query through URL parameters. This page is designed for e-commerce functionality within the GCashTV application.

## Page Structure

### Layout
- **Container**: Full viewport height, flexbox column layout
- **Content Max Width**: 1200px (centered)
- **Width**: 100%
- **Box Sizing**: border-box

### Components Used
- TopBar (header navigation)
- BottomBar (footer navigation)
- Card (reusable card component)

## URL Parameters

The page supports filtering via URL query parameters:
- `?category={categoryName}` - Filter products by category
- `?search={searchTerm}` - Filter products by search term
- Both parameters can be combined

### Examples
- `/products?category=electronics`
- `/products?search=phone`
- `/products?category=electronics&search=phone`

## Data Structure

### Product Interface
```typescript
interface Product {
  _id: string
  name: string
  description: string
  price: number
  image: string
  category?: string
}
```

## API Integration

### Endpoint
```
GET /.netlify/functions/api?type=products
```

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Always "products" |
| category | string | Optional category filter |
| search | string | Optional search term |

### Response Format
```typescript
{
  success: boolean
  data: Product[]
}
```

## State Management

### Component State
| State | Type | Default | Description |
|-------|------|---------|-------------|
| products | Product[] | [] | Array of fetched products |
| loading | boolean | true | Loading state indicator |

### Data Fetching
- Fetches products on component mount
- Re-fetches when URL search params change
- Uses `useEffect` with `searchParams` dependency

## Loading State

### Container
- **Display**: Flex, centered
- **Flex**: 1 (fills available space)
- **Font Size**: 18px
- **Color**: #666
- **Text**: "Loading products..."

## Products Grid

### Grid Container
- **Class**: `products-grid card-list`
- **Imports**: Shared styles from `CardList.css`

### Grid Layout (from CardList.css)
- Responsive grid layout
- Gap between cards
- Automatic column sizing

## Product Card

### Card Container
- **Aspect Ratio**: 0.8 (taller than wide)
- **Padding**: 0
- **Overflow**: Hidden

### Card Content
- **Height**: 100%
- **Display**: Flex column

### Product Image
- **Width**: 100%
- **Height**: 60% of card
- **Object Fit**: Cover
- **Transition**: opacity 0.2s ease
- **Hover Effect**: opacity 0.7

### Product Info Section
- **Padding**: 15px
- **Flex**: 1 (fills remaining space)
- **Display**: Flex column
- **Text Align**: Left

### Product Name
- **Color**: Blue
- **Font Weight**: Bold
- **Font Size**: 20px
- **Margin**: 0 0 8px 0

### Product Description
- **Color**: Black
- **Font Size**: 14px
- **Margin**: 0 0 8px 0
- **Flex**: 1 (expands to fill space)
- **Line Height**: 1.4

### Product Price
- **Color**: Red
- **Font Weight**: Bold
- **Font Size**: 20px
- **Margin**: 0
- **Format**: "$XX.XX" (2 decimal places)

## Empty State

### No Products Message
- **Display**: Flex, centered
- **Flex**: 1
- **Font Size**: 18px
- **Color**: #666
- **Text**: "No products found."

## Responsive Design

### Breakpoints

#### 768px (Mobile)
- **Product Name**: 16px
- **Product Description**: 12px
- **Product Price**: 16px
- **Product Info Padding**: 10px

## Component Dependencies

### Imports
```typescript
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import type { Product } from '../types'
import './ProductList.css'
```

### CSS Imports
```css
@import '../components/CardList.css';
```

## Error Handling

- Catches fetch errors and logs to console
- Sets loading to false regardless of success/failure
- Displays empty state if no products returned

## Color Palette

| Element | Color |
|---------|-------|
| Product Name | blue |
| Product Description | black |
| Product Price | red |
| Loading/Empty Text | #666 |

## Animations & Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Product Image | opacity | 0.2s | ease |

## Usage Notes

### Navigation
This page is typically accessed via:
- Direct URL navigation
- Category links from other pages
- Search functionality from TopBar

### Data Flow
1. Component mounts
2. `useEffect` triggers `fetchProducts()`
3. API call made with current URL params
4. Products state updated
5. Grid renders with product cards

### Re-fetching
Products are automatically re-fetched when:
- URL search params change
- Component remounts

## Future Enhancements

Potential improvements for this page:
- Pagination for large product lists
- Sort options (price, name, date)
- Filter sidebar for categories
- Product detail modal/page
- Add to cart functionality
- Wishlist integration
- Price range filter
- Grid/List view toggle
