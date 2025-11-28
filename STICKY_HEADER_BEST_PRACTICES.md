# Best Practices for Persistent Top Navigation ("Sticky" Headers)

## 1. Executive Summary

A sticky header remains visible at the top of the viewport during scrolling. It's essential for long pages, like those with expanding content (such as accordion-style collections), as it keeps users oriented and provides constant access to navigation. This guide covers the key principles for creating an effective sticky header in the Curated Presentation application.

---

## 2. Core Principles

A sticky header improves UX on content-rich pages by providing:

### Orientation
A constant frame of reference so users don't feel lost when scrolling through large collections of products.

### Efficiency
Immediate access to key links and actions (switching tabs, accessing selection panel), reducing the need to scroll back to the top.

### Brand Reinforcement
Persistent visibility of the customer name and branding elements.

### Context Awareness
Always shows where the user is in the application (current tab, customer name).

---

## 3. UI/UX Best Practices

### 3.1. Design and Layout

A sticky header needs to be compact and intentional to save screen space, especially when viewing product collections.

**Minimize Height**
- Initial header can be taller with more information
- On scroll, header shrinks to a compact version
- Typical heights: 80-100px initial → 60-70px sticky
- Only essential elements remain visible

**Prioritize Essentials**
Include only the most critical items:
- Customer name/logo
- Primary navigation (tab switcher)
- Selection panel trigger
- User account/logout

**Visual Distinction**
- Solid background color (not transparent)
- Subtle drop shadow (`shadow-sm` or `shadow-md`)
- Border-bottom for clear separation
- Backdrop blur on dark backgrounds for depth

**Avoid Clutter**
- Hide descriptive text on scroll
- Collapse secondary navigation
- Use icons instead of text labels where appropriate
- Maintain generous whitespace

### 3.2. Interaction and Behavior

The transition to a sticky state should feel natural and non-disruptive.

**Scroll-Triggered Sticky**
```css
/* Modern CSS approach */
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  transition: all 0.3s ease-out;
}

.header.scrolled {
  height: 60px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

**Smooth Transitions**
- Use CSS transitions for height changes: `transition: height 0.3s ease-out`
- Fade out/in elements with opacity transitions
- Scale down logo if needed: `transform: scale(0.85)`
- Duration: 200-300ms (not too fast, not too slow)

**Smart Hiding (Optional)**
For less intrusive headers on mobile:
- Show header on scroll-up (user wants to navigate)
- Hide header on scroll-down (user wants to read content)
- Always show at top of page
- Use `IntersectionObserver` or scroll delta detection

**Active State Highlighting**
- Highlight current tab in navigation
- Use distinct color for active state (blue-600)
- Underline or bottom border for clarity
- Maintain sufficient contrast with background

### 3.3. Content-Specific Behavior

**For Collection Pages:**
- Show collection name when scrolled into specific collection
- Breadcrumb trail: Customer → Collections → [Current Collection]
- Quick jump menu to other collections
- Selection count badge always visible

**For Selection Tab:**
- Show selection summary (item count, total value)
- Quick action buttons (Save, Export)
- Promotion progress indicator (compact version)

**For Dallas Tab:**
- Show snapshot name/date
- Market order count
- Import/create buttons

### 3.4. Mobile & Responsiveness

Vertical space on mobile is limited, so headers must be extra compact.

**Mobile-First Design**
- Design for 375px width first (iPhone SE)
- Maximum header height: 56px on mobile
- Use hamburger menu for navigation
- Single-row layout with overflow menu

**Touch Targets**
- Minimum touch target: 44px × 44px (iOS guidelines)
- Adequate spacing between interactive elements
- No tiny text or icon-only buttons without labels

**Responsive Breakpoints**
```typescript
// Tailwind breakpoints
sm: '640px',   // Small tablets
md: '768px',   // Tablets
lg: '1024px',  // Desktop
xl: '1280px',  // Large desktop
```

**Mobile Navigation Patterns**
- Hamburger menu for collections tab switcher
- Bottom navigation bar for primary actions
- Slide-out drawer for full navigation menu
- Floating action button for selection panel

**Bottom Navigation (Mobile Web Apps)**
Consider bottom navigation on mobile for:
- Tab switching (Collections, Dallas, Selection)
- Primary actions (Add to Selection, View Selection)
- Better thumb reach on large phones
- Native app-like experience

---

## 4. Technical Implementation

### 4.1. CSS Approach (Recommended)

Modern browsers support `position: sticky` with excellent performance:

```css
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 40; /* Above content, below modals */
  background: white;
  transition: all 0.3s ease-out;
}

/* Dark mode */
.dark .sticky-header {
  background: rgb(17 24 39); /* gray-900 */
  border-bottom-color: rgb(55 65 81); /* gray-700 */
}
```

**Advantages:**
- No JavaScript required for basic stickiness
- Excellent performance (GPU-accelerated)
- Works with CSS Grid and Flexbox
- Respects scroll containers

**Browser Support:**
- Chrome/Edge: 91%+
- Firefox: 89%+
- Safari: 89%+
- Mobile browsers: Full support

### 4.2. JavaScript Enhancement

For advanced behaviors (smart hiding, height transitions):

```typescript
'use client';

import { useEffect, useState } from 'react';

export function useStickyHeader(threshold = 100) {
  const [isSticky, setIsSticky] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Sticky state (shrink header)
      setIsSticky(currentScrollY > threshold);

      // Smart hiding (scroll direction)
      if (currentScrollY > lastScrollY && currentScrollY > threshold) {
        setIsHidden(true); // Scrolling down
      } else {
        setIsHidden(false); // Scrolling up
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, lastScrollY]);

  return { isSticky, isHidden };
}
```

### 4.3. Performance Optimization

**Debounce Scroll Events**
```typescript
import { useEffect, useState } from 'react';

function useDebounce(value: number, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

**Use Passive Event Listeners**
```typescript
window.addEventListener('scroll', handleScroll, { passive: true });
```

**Minimize Repaints**
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid changing `width`, `height`, `margin` during scroll
- Use `will-change: transform` sparingly (memory cost)
- Batch DOM reads and writes

**Intersection Observer**
For detecting when header should stick:
```typescript
const observer = new IntersectionObserver(
  ([entry]) => {
    setIsSticky(!entry.isIntersecting);
  },
  { threshold: 0 }
);

observer.observe(headerRef.current);
```

### 4.4. Accessibility (a11y)

**Focus Management**
- Header doesn't obscure focused elements
- Skip link to main content: `<a href="#main">Skip to main content</a>`
- Keyboard navigation works seamlessly

**ARIA Roles**
```html
<header role="banner" aria-label="Main navigation">
  <nav role="navigation" aria-label="Primary">
    <ul role="list">
      <li><a href="#collections" aria-current="page">Collections</a></li>
      <li><a href="#dallas">Dallas</a></li>
      <li><a href="#selection">Selection</a></li>
    </ul>
  </nav>
</header>
```

**Color Contrast**
- Text: Minimum 4.5:1 contrast ratio (WCAG AA)
- Interactive elements: Minimum 3:1 contrast
- Use tools like Stark or Accessible Colors to verify

**Reduced Motion**
```css
@media (prefers-reduced-motion: reduce) {
  .sticky-header {
    transition: none;
  }
}
```

**Screen Reader Announcements**
```html
<div role="status" aria-live="polite" class="sr-only">
  Scrolled to Collections section
</div>
```

---

## 5. Design Patterns by Context

### 5.1. For E-commerce (Collections Tab)

**Essential Elements:**
- Customer name (always visible)
- Tab navigation (Collections, Dallas, Selection)
- Selection count badge
- User account menu

**Optional Elements (hide on scroll):**
- Customer tagline or description
- Secondary navigation
- Search bar (show icon only when sticky)

**Sticky Behavior:**
- Show at top of page (full height)
- Shrink on scroll past 100px
- Show collection name when scrolled into collection
- Always show selection panel trigger

### 5.2. For Data Tables (Selection Tab)

**Essential Elements:**
- Customer name
- Tab navigation
- Action buttons (Save, Export)
- Summary metrics (item count, total)

**Optional Elements:**
- Filters and sorting (keep visible or make sticky)
- Bulk actions toolbar
- Pagination controls

**Sticky Behavior:**
- Table header row also sticky (below main header)
- Two-tier stickiness: header + table header
- Ensure proper z-index layering

### 5.3. For Long Forms (Dallas Tab)

**Essential Elements:**
- Form title
- Save/Cancel buttons
- Validation status
- Progress indicator

**Optional Elements:**
- Help text and instructions
- Autosave status

**Sticky Behavior:**
- Action buttons always accessible
- Show validation errors at top
- Progress bar for multi-step forms

---

## 6. Implementation Plan for Curated Presentation

### Phase 1: Core Sticky Header Component

**Create Reusable Component:**
```typescript
// components/ui/sticky-header.tsx
interface StickyHeaderProps {
  children: React.ReactNode;
  shrinkHeight?: number;
  threshold?: number;
  smartHide?: boolean;
}

export function StickyHeader({
  children,
  shrinkHeight = 60,
  threshold = 100,
  smartHide = false,
}: StickyHeaderProps) {
  const { isSticky, isHidden } = useStickyHeader(threshold);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-white dark:bg-gray-900',
        'border-b border-neutral-200 dark:border-neutral-800',
        'transition-all duration-300 ease-out',
        isSticky && 'shadow-md',
        smartHide && isHidden && '-translate-y-full'
      )}
      style={{
        height: isSticky ? `${shrinkHeight}px` : 'auto',
      }}
    >
      {children}
    </header>
  );
}
```

### Phase 2: Customer Page Header

**Update Customer Page Layout:**
- Extract header section into dedicated component
- Wrap in StickyHeader component
- Add shrinking behavior on scroll
- Test with all three tabs

**Header Content:**
```typescript
<StickyHeader threshold={100}>
  <div className="max-w-6xl mx-auto px-6 py-4">
    {/* Customer Name */}
    <h1 className={cn(
      'text-2xl font-semibold transition-all',
      isSticky && 'text-lg'
    )}>
      {customer.name}
    </h1>

    {/* Tab Navigation */}
    <Tabs value={activeTab}>
      <TabsList>
        <TabsTrigger value="collections">Collections</TabsTrigger>
        <TabsTrigger value="dallas">Dallas</TabsTrigger>
        <TabsTrigger value="selection">Selection</TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
</StickyHeader>
```

### Phase 3: Mobile Optimization

**Add Responsive Behavior:**
- Hamburger menu for mobile
- Compact header (56px on mobile)
- Touch-optimized buttons
- Bottom navigation bar (optional)

### Phase 4: Tab-Specific Enhancements

**Collections Tab:**
- Show current collection name when scrolled
- Quick jump menu to collections
- Selection count always visible

**Dallas Tab:**
- Show snapshot name in sticky header
- Quick action buttons

**Selection Tab:**
- Show selection summary
- Sticky table headers

---

## 7. Testing Checklist

### Functional Testing
- [ ] Header sticks to top on scroll
- [ ] Header shrinks smoothly (if implemented)
- [ ] Header doesn't obscure content
- [ ] Z-index hierarchy correct (header above content, below modals)
- [ ] Works across all tabs
- [ ] Smart hiding works (if implemented)

### Visual Testing
- [ ] Smooth transitions (no jank)
- [ ] Proper shadows and borders
- [ ] Dark mode works correctly
- [ ] Typography scales appropriately
- [ ] Adequate whitespace maintained

### Responsive Testing
- [ ] Mobile (375px - iPhone SE)
- [ ] Tablet (768px - iPad)
- [ ] Desktop (1280px+)
- [ ] Touch targets adequate on mobile (44px+)
- [ ] Hamburger menu works

### Performance Testing
- [ ] Scroll performance smooth (60fps)
- [ ] No layout thrashing
- [ ] Minimal JavaScript execution
- [ ] CPU usage acceptable

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] Focus indicators visible
- [ ] Skip links work
- [ ] Color contrast passes WCAG AA
- [ ] Reduced motion respected

### Cross-Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, both desktop and iOS)
- [ ] Mobile browsers (Chrome, Safari)

---

## 8. Common Pitfalls and Solutions

### Pitfall 1: Header Jumps on Scroll
**Cause:** Changing height causes layout shift
**Solution:** Use `position: sticky` with fixed heights or smooth transitions

### Pitfall 2: Content Hidden Behind Header
**Cause:** Anchor links scroll content under sticky header
**Solution:** Use `scroll-margin-top` or `scroll-padding-top`:
```css
:target {
  scroll-margin-top: 80px;
}
```

### Pitfall 3: Z-Index Conflicts
**Cause:** Other elements (dropdowns, modals) overlap header
**Solution:** Establish z-index scale:
- Base content: z-0 to z-10
- Sticky elements: z-40
- Overlays: z-50
- Modals: z-50

### Pitfall 4: Poor Mobile Performance
**Cause:** Complex JavaScript scroll handlers
**Solution:** Use CSS `position: sticky`, passive listeners, and debouncing

### Pitfall 5: Header Obscures Focused Elements
**Cause:** No offset for keyboard navigation
**Solution:** Ensure focused elements scroll into view with offset:
```javascript
element.scrollIntoView({ block: 'center' });
```

---

## 9. Conclusion

A well-implemented sticky header is a powerful usability tool for content-heavy websites like the Curated Presentation collections page. By balancing constant access with a minimalist footprint through:

- **Clean design** - Only essential elements visible
- **Smooth transitions** - Natural, performant animations
- **Mobile-first approach** - Compact, touch-optimized
- **Accessibility** - Keyboard, screen reader, reduced motion support

You significantly improve the user's navigation experience, especially on long pages with expanding accordion content.

---

## 10. References and Resources

### Documentation
- [MDN: position sticky](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Framer Motion Documentation](https://www.framer.com/motion/)

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance auditing
- [axe DevTools](https://www.deque.com/axe/devtools/) - Accessibility testing
- [Polypane](https://polypane.app/) - Responsive testing

### Inspiration
- [Stripe](https://stripe.com) - Elegant sticky navigation
- [Apple](https://www.apple.com) - Smooth header transitions
- [Airbnb](https://www.airbnb.com) - Mobile-first sticky headers
