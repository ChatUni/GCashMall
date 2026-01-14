# Global Style Specification

## Overview

This document defines the global styling standards for GCashTV, including the color palette, typography, spacing, and common UI patterns used throughout the application.

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary Blue | #3B82F6 | Buttons, links, active states, accents |
| Primary Blue Hover | #2563EB | Button hover states |
| Primary Blue Light | rgba(59, 130, 246, 0.1) | Active backgrounds |
| Primary Blue Glow | rgba(59, 130, 246, 0.2) | Shadows, focus rings |
| Primary Blue Strong Glow | rgba(59, 130, 246, 0.3) | Poster hover glow |

### Background Colors
| Name | Hex | Usage |
|------|-----|-------|
| Page Background | #0B0B0E | Main page background |
| Card Background | #121214 | Cards, panels, sidebars |
| Input Background | #1A1A1E | Form inputs, search bars |
| Elevated Background | #151518 | Dropdowns, popovers |
| Hover Background | #1a1a1e | List item hover states |
| Tag Background | #2A2A2E | Tags, pills, badges |
| Border | #242428 | Dividers, borders |
| Black | #000000 | Footer, video player |
| Sidebar Background | #0B0B0E |
| Card Placeholder | #1A1A1E |
| Border | #1A1A1E |
| Search Background | #1A1A1A |
| Active Background | rgba(59, 130, 246, 0.1) |
| Hover Background | rgba(255, 255, 255, 0.05) |
| Overlay | rgba(0, 0, 0, 0.4) |
| Progress Bar | rgba(255, 255, 255, 0.3) |
| Controls Gradient | linear-gradient(transparent, rgba(0, 0, 0, 0.8)) |
| Popover Background | #121214 |
| Border | rgba(255, 255, 255, 0.1) |
| Divider | #242428 |

### Text Colors
| Name | Hex | Usage |
|------|-----|-------|
| Text Primary/White | #FFFFFF | Headings, primary text |
| Text Secondary/Gray | #9CA3AF | Descriptions, labels |
| Text Muted | #6B7280 | Hints, placeholders |
| Text Link | #3B82F6 | Links, active items |

### Status Colors
| Name | Hex | Usage |
|------|-----|-------|
| Success Green | #22C55E | Success states, downloaded |
| Danger Red | #EF4444 | Errors, favorites, delete |
| Danger Red Hover | #DC2626 | Danger hover states |
| Warning Amber | #F59E0B | VIP badges, featured |

## Typography

### Font Family
```css
font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
```

### Font Weights
| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Labels, nav items |
| Semi-Bold | 600 | Headings, titles |
| Bold | 700 | Large headings, prices |

### Font Sizes
| Size | Pixels | Usage |
|------|--------|-------|
| xs | 10px | Episode badges |
| sm | 12px | Tags, captions |
| base | 13-14px | Body text, inputs |
| md | 15px | Descriptions |
| lg | 16px | Nav links, buttons |
| xl | 18px | Section titles |
| 2xl | 20px | Card titles |
| 3xl | 22-24px | Page subtitles |
| 4xl | 28px | Section headers |
| 5xl | 36px | Hero titles |

### Line Heights
| Value | Usage |
|-------|-------|
| 1 | Single line elements |
| 1.1 | Headings |
| 1.2 | Titles |
| 1.3 | Card titles |
| 1.4 | Descriptions |
| 1.5 | Body text |
| 1.6 | Popup messages |
| 1.7 | Long descriptions |

## Spacing

### Base Unit
8px grid system

### Common Spacing Values
| Size | Pixels | Usage |
|------|--------|-------|
| xs | 4px | Tight gaps |
| sm | 8px | Small gaps |
| md | 12px | Medium gaps |
| lg | 16px | Standard padding |
| xl | 20px | Section gaps |
| 2xl | 24px | Large padding |
| 3xl | 30px | Section spacing |
| 4xl | 40px | Major sections |
| 5xl | 60px | Page padding |

## Border Radius

| Size | Pixels | Usage |
|------|--------|-------|
| sm | 4px | Cards, inputs |
| md | 6px | Buttons, thumbnails |
| lg | 8px | Panels, nav items |
| xl | 10px | Dropdowns |
| 2xl | 12px | Large cards, modals |
| 3xl | 16px | Popups |
| pill | 20px | Tags, pills |
| full | 50% | Avatars, circular buttons |

## Shadows

### Box Shadows
```css
/* Card hover */
box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2);

/* Poster glow */
box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);

/* Dropdown */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);

/* Modal */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);

/* Panel */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

/* Focus ring */
box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);

/* Button glow */
box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
```

## Transitions

### Standard Durations
| Duration | Usage |
|----------|-------|
| 0.1s | Progress bars |
| 0.2s | Colors, opacity, borders |
| 0.25s | Button borders |
| 0.3s | Transforms, shadows |

### Easing Functions
| Function | Usage |
|----------|-------|
| ease | Most transitions |
| linear | Progress bars |

### Common Transition Patterns
```css
/* Color change */
transition: color 0.2s ease;

/* Background change */
transition: background-color 0.2s ease;

/* Transform */
transition: transform 0.3s ease;

/* Multiple properties */
transition: transform 0.3s ease, box-shadow 0.3s ease;

/* All common */
transition: all 0.2s ease;
```

## Animations

| Animation | Properties |
|-----------|------------|
| fadeIn | opacity 0 → 1, 0.2s |
| slideUp | translateY(20px) → 0, opacity 0 → 1, 0.3s |
| Controls | opacity 0.3s ease |
| Progress | width 0.1s linear |
| Hover effects | 0.2s ease |
| Poster scale | 0.3s ease |
| Poster Image | transform | 0.3s | ease |
| Poster Overlay | opacity | 0.3s | ease |
| Play Button | transform, background | 0.2s | ease |
| Tag | background, color | 0.2s | ease |
| Series Title | color | 0.2s | ease |
| Carousel Arrow | background, border, shadow | 0.2s | ease |
| View More Card | transform | 0.2s | ease |
| View More Content | background, shadow | 0.2s | ease |
| View More Arrow/Text | color | 0.2s | ease |
| Logo | opacity | 0.2s | ease |
| Nav Link | color | 0.2s | ease |
| Search Combo | border-color, box-shadow | 0.2s | ease |
| Search Button | color | 0.2s | ease |
| Suggestion Item | background-color | 0.2s | ease |
| Icon Button | color | 0.2s | ease |
| Avatar | border-color | 0.2s | ease |
| Popover Item | background-color | 0.2s | ease |
| Language Option | background-color | 0.2s | ease |
| Genre Item | color, background | 0.2s | ease |
| Card Container | transform | 0.3s | ease |
| Card Image | transform | 0.3s | ease |
| Card Title | color | 0.2s | ease |
| Genre Item | color, background | 0.2s | ease |
| Dropdown Trigger | border-color | 0.2s | ease |
| Dropdown Arrow | transform | 0.2s | ease |
| Dropdown Item | background-color, color | 0.2s | ease |

## Common UI Patterns

### Buttons

#### Primary Button
```css
background-color: #3B82F6;
color: #FFFFFF;
padding: 10px 20px;
border-radius: 8px;
font-size: 14px;
font-weight: 500;
```

#### Secondary Button
```css
background-color: transparent;
color: #9CA3AF;
border: 1px solid #242428;
padding: 10px 20px;
border-radius: 8px;
```

#### Danger Button
```css
background-color: transparent;
color: #EF4444;
border: 1px solid #EF4444;
padding: 10px 20px;
border-radius: 8px;
```

### Form Inputs
```css
background-color: #1A1A1E;
color: #FFFFFF;
border: 1px solid #242428;
border-radius: 8px;
padding: 12px 16px;
font-size: 15px;
```

### Tags/Pills
```css
background-color: #2A2A2E;
color: #9CA3AF;
font-size: 13px;
padding: 6px 14px;
border-radius: 20px;
```

### Cards
```css
background-color: #121214;
border-radius: 12px;
padding: 20px;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
```

### Posters
```css
aspect-ratio: 2/3;
border-radius: 12px;
overflow: hidden;
```

## Responsive Breakpoints

| Breakpoint | Width | Description |
|------------|-------|-------------|
| sm | 480px | Small mobile |
| md | 768px | Mobile/Tablet |
| lg | 1024px | Tablet/Desktop |
| xl | 1200px | Desktop |
| 2xl | 1400px | Large desktop |

### Media Query Patterns
```css
/* Mobile first */
@media (max-width: 480px) { }
@media (max-width: 768px) { }
@media (max-width: 1024px) { }
@media (max-width: 1200px) { }
@media (max-width: 1400px) { }

/* Desktop first */
@media (min-width: 769px) and (max-width: 1024px) { }
```

## Z-Index Scale

| Value | Usage |
|-------|-------|
| 1 | Elevated elements |
| 10 | Floating elements |
| 100 | Sticky headers |
| 1000 | Top bar, modals |
| 1001 | Dropdowns, popovers |

## Global Styles (index.css)

### Root Variables
```css
:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Body Defaults
```css
body {
  margin: 0;
  display: flex;
  flex-direction: column;
  min-width: 320px;
  min-height: 100vh;
}
```

### Link Styles
```css
a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}
```

### Button Defaults
```css
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}
```

## Text Truncation

### Single Line
```css
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

### Multi-line (Webkit)
```css
display: -webkit-box;
-webkit-line-clamp: 2; /* or 3, 4 */
-webkit-box-orient: vertical;
overflow: hidden;
```

## Scrollbar Hiding
```css
scrollbar-width: none; /* Firefox */
-ms-overflow-style: none; /* IE/Edge */

&::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

## Accessibility

### Focus States
- Visible focus rings on interactive elements
- Sufficient color contrast (WCAG AA)
- Keyboard navigation support

### Color Contrast
- Text on dark backgrounds: minimum 4.5:1 ratio
- Large text: minimum 3:1 ratio
- Interactive elements: clear visual distinction

## Card List

- wrappable layout
- number of items per row: desktop - 4, tablet - 3, mobile - 2
- all items have the same width and height regardless of content
- item gap 20px
- padding: 24px
