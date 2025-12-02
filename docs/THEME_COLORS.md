# Theme Colors System

## Overview

The Glanz Rental application uses a centralized color system for consistent theming across all components. All theme colors are defined in `lib/constants/colors.ts`.

## Brand Colors

### Primary Color
- **Main**: `#273492` (Dark Blue)
- **Hover**: `#1f2a7a` (Darker Blue)
- **Light**: `#27349210` (10% opacity)
- **Medium**: `#27349230` (30% opacity)

### Secondary Color
- **Main**: `#e7342f` (Red)
- **Hover**: `#d12a26` (Darker Red)
- **Light**: `#e7342f10` (10% opacity)
- **Medium**: `#e7342f30` (30% opacity)

## Usage

### In Tailwind Classes

Use the color values directly in Tailwind classes:

```tsx
// Primary color
<button className="bg-[#273492] hover:bg-[#1f2a7a] text-white">
  Click Me
</button>

// Secondary color
<button className="bg-[#e7342f] hover:bg-[#d12a26] text-white">
  Delete
</button>

// With opacity
<div className="bg-[#273492]/10 border-[#273492]/20">
  Light background
</div>
```

### Importing Color Constants

```tsx
import { COLORS, COLOR_CLASSES, ORDER_STATUS_COLORS } from "@/lib/constants/colors";

// Use in JavaScript/TypeScript
const primaryColor = COLORS.primary; // "#273492"

// Use in className strings (if needed)
const buttonClass = `${COLOR_CLASSES.primary} ${COLOR_CLASSES.primaryHover}`;
```

## Order Status Badge Colors

Order status badges use predefined colors from `ORDER_STATUS_COLORS`:

- **Scheduled**: Primary blue (`#273492`)
- **Active/Ongoing**: Green (`bg-green-100 text-green-700`)
- **Returned**: Primary blue (`#273492`)
- **Partially Returned**: Orange (`bg-orange-100 text-orange-700`)
- **Late**: Secondary red (`#e7342f`)
- **Cancelled**: Gray (`bg-gray-100 text-gray-700`)

## CSS Variables

The theme colors are also available as CSS variables in `app/globals.css`:

```css
:root {
  --primary: #273492;
  --primary-foreground: #ffffff;
  --primary-hover: #1f2a7a;
  --secondary: #e7342f;
  --secondary-foreground: #ffffff;
  --destructive: #e7342f;
  --destructive-foreground: #ffffff;
}
```

## Changing Theme Colors

To change the entire application theme:

1. **Update `lib/constants/colors.ts`**: Change the color values in the `COLORS` object
2. **Update `app/globals.css`**: Update the CSS variables in `:root`
3. **Rebuild**: Run `npm run build` to see changes

### Example: Changing Primary Color

```typescript
// lib/constants/colors.ts
export const COLORS = {
  primary: "#YOUR_NEW_COLOR",  // Change this
  primaryHover: "#YOUR_NEW_HOVER_COLOR",  // And this
  // ... rest of colors
};
```

```css
/* app/globals.css */
:root {
  --primary: #YOUR_NEW_COLOR;  /* Change this */
  --primary-hover: #YOUR_NEW_HOVER_COLOR;  /* And this */
  /* ... rest of variables */
}
```

## Files Updated

All components have been updated to use the new theme colors:

- ✅ `components/ui/button.tsx`
- ✅ `components/ui/badge.tsx`
- ✅ `components/ui/tabs.tsx`
- ✅ `components/ui/breadcrumb.tsx`
- ✅ `components/layout/desktop-sidebar.tsx`
- ✅ `components/layout/mobile-sidebar.tsx`
- ✅ `components/layout/orders-header.tsx`
- ✅ `components/shared/*` (all shared components)
- ✅ `app/(dashboard)/**/*` (all dashboard pages)
- ✅ `app/(auth)/login/page.tsx`
- ✅ All order, customer, and calendar components

## Best Practices

1. **Always use the centralized colors**: Don't hardcode color values
2. **Use Tailwind classes**: Prefer `bg-[#273492]` over inline styles
3. **Maintain consistency**: Use the same color for similar UI elements
4. **Test accessibility**: Ensure sufficient contrast ratios (WCAG AA minimum)

## Color Accessibility

- Primary color (`#273492`) on white: ✅ WCAG AA compliant
- Secondary color (`#e7342f`) on white: ✅ WCAG AA compliant
- White text on primary: ✅ WCAG AA compliant
- White text on secondary: ✅ WCAG AA compliant

