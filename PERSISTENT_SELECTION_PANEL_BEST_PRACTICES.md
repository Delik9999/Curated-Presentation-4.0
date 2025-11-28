# Best Practices for a B2B Persistent Selection Panel

## 1. Executive Summary

A persistent, collapsible side panel is a highly effective UI for B2B selection tools. It offers an always-on view of selected items, boosting user efficiency without interrupting workflow. Success hinges on an intuitive, space-efficient design tailored to goal-oriented B2B tasks. This guide covers best practices for implementing such a panel in the Curated Presentation application.

---

## 2. Core Principles

A B2B selection panel is a **professional workspace**, not a shopping cart. Prioritize the following:

### Efficiency
Minimize clicks and present clear information to accelerate the user's workflow. Users should be able to add, edit, and remove items with minimal friction.

### Clarity
Ensure selections are scannable with prominent display of key data:
- Product names
- SKU identifiers
- Quantities
- Pricing information (when applicable)

### Persistence
Automatically save selections across sessions to support long B2B decision cycles. Buyers often research over multiple days or weeks before finalizing orders.

### Context
Allow users to manage selections without leaving their main browsing or configuration context. The panel should complement, not interrupt, the browsing experience.

---

## 3. UI/UX Best Practices

### 3.1. Discoverability & Access

**Persistent Icon**
- Display a static, universally recognized icon (list, cart, clipboard) in a consistent location (e.g., top-right or fixed right edge)
- Icon should be visible at all times, regardless of scroll position

**State Indication**
- **Empty state**: Outline icon with subtle styling
- **Active state**: Solid/colored icon with badge count showing number of items
- Badge should be prominent but not distracting

**"Add" Feedback**
- Confirm item additions with brief, clear visual feedback
- Animation towards panel icon (item "flies" into panel)
- Toast notification confirming addition
- Panel can briefly highlight or pulse to draw attention

### 3.2. Appearance & Layout

**Slide-Out Panel**
- Slide from the right side of the viewport
- Can overlay content (recommended for collections tab) or push content aside
- Width: 380-420px on desktop, full-width on mobile
- Height: Full viewport height with internal scrolling

**Clear Header**
- Title: "My Selection" or "Working Selection"
- Item count: "(3 items)" next to title
- Prominent close icon ("×" or chevron ">")
- Optional: Minimize/maximize toggle

**Item List**
- Scrollable list with clear separation between items
- Each item shows:
  - Product thumbnail (optional but recommended)
  - Product name
  - SKU/Model number (prominent for B2B)
  - Quantity controls (+/- buttons or input)
  - Remove button (trash icon or "×")
  - Unit price and extended price (optional)

**Action Bar**
- Sticky footer that remains visible while scrolling item list
- Primary action button (e.g., "Save Selection", "Create Order", "Request Quote")
- Secondary actions (e.g., "Export PDF", "Share", "Clear All")
- Running total (item count, total value)

### 3.3. Interaction Model

**Click to Toggle**
- Click persistent icon to open/close panel
- Click close button ("×") to close panel
- Smooth slide-in/slide-out animation (250-300ms)

**Click Outside to Close**
- Clicking on the dimmed overlay closes the panel
- Overlay: Semi-transparent dark background (rgba(0,0,0,0.3-0.5))
- Optional: Allow users to disable auto-close in settings

**Smooth Transitions**
- Use CSS transitions or Framer Motion for animations
- Panel slides in from right: `translateX(100%)` → `translateX(0)`
- Overlay fades in: `opacity(0)` → `opacity(1)`
- Easing: `ease-out` for opening, `ease-in` for closing

**Remember State**
- Persist panel open/closed state to localStorage
- Remember scroll position within item list
- Restore state on page refresh

### 3.4. Content & Hierarchy

**Essential Information First**
Prioritize key identifiers in this order:
1. Product name (largest, most prominent)
2. SKU/Model number (B2B critical identifier)
3. Quantity
4. Price (if applicable)

**Editable Quantities**
- Simple, clear controls: +/- buttons flanking quantity input
- Input should allow direct typing for power users
- Validation: Prevent negative numbers, show error for invalid input
- Real-time updates to totals

**Running Total**
- Display total item count prominently
- Show total value if pricing is available
- Update in real-time as items are added/removed/edited

**Empty State**
- Clear, friendly message: "Your selection is empty"
- Illustration or icon to fill space
- Call-to-action: "Browse collections to get started"
- Optional: Show recently viewed items

### 3.5. Actions & Next Steps

**Primary Actions**
Located in sticky footer, ordered by importance:
1. **Save Selection**: Persist to working selection
2. **Export**: Download PDF/CSV/XLSX
3. **Request Quote**: Initiate quote request workflow
4. **Share**: Generate shareable link

**Secondary Actions**
- **Clear All**: Remove all items (requires confirmation)
- **Edit Notes**: Add notes to entire selection
- Less prominent styling (outline button vs. solid)

**B2B Language**
Use professional, industry-appropriate terminology:
- ❌ "Cart" → ✅ "Selection"
- ❌ "Checkout" → ✅ "Submit Order" or "Request Quote"
- ❌ "Add to Cart" → ✅ "Add to Selection"
- ❌ "Shopping" → ✅ "Browsing" or "Reviewing"

---

## 4. Technical Considerations

### 4.1. State Management

**Local State (Component Level)**
- Panel open/closed state
- Loading states for async operations
- UI-only state (hover, focus)

**Global State (Application Level)**
- Selection items array
- Total counts and prices
- User preferences (auto-save enabled, etc.)

**Recommended Tools**
- React Context API for simple cases
- Zustand for more complex state management
- React Query for server synchronization

### 4.2. Data Persistence

**Auto-Save Strategy**
```typescript
// Save to localStorage on every change
const saveToLocalStorage = (items: SelectionItem[]) => {
  localStorage.setItem('selection', JSON.stringify(items));
};

// Debounce for performance
const debouncedSave = debounce(saveToLocalStorage, 500);
```

**Server Sync (for logged-in users)**
- Sync to database every 30-60 seconds
- Sync immediately on critical actions (export, share)
- Handle conflicts: Server timestamp wins vs. local optimistic updates
- Show sync status indicator: "Synced", "Syncing...", "Offline"

**Cross-Device Access**
- Store selections with user ID in database
- Merge local and server selections on login
- Resolve conflicts: Ask user or use most recent timestamp

### 4.3. Performance

**Optimizations**
- Virtual scrolling for long item lists (100+ items)
- Debounce quantity input changes
- Lazy-load product thumbnails
- Memoize expensive calculations (totals, filtered lists)

**Animation Performance**
- Use CSS transforms (`translateX`) instead of `left`/`right`
- Use `will-change: transform` sparingly
- Avoid layout thrashing: Read then write DOM properties

**Bundle Size**
- Code-split panel component (load on demand)
- Lazy-load export functionality
- Use lightweight icon libraries

### 4.4. Accessibility

**Keyboard Navigation**
- `Escape` key to close panel
- `Tab` to cycle through interactive elements
- `Enter`/`Space` to activate buttons
- Arrow keys for quantity adjustment

**Screen Reader Support**
- Announce panel open/close state
- Label all buttons clearly
- Use semantic HTML (`<dialog>`, `<button>`, `<ul>`)
- Announce item count changes: "3 items in selection"

**ARIA Attributes**
```html
<div role="dialog" aria-labelledby="panel-title" aria-modal="true">
  <h2 id="panel-title">My Selection</h2>
  <button aria-label="Close selection panel">×</button>
  <ul role="list" aria-label="Selected items">
    <li role="listitem">...</li>
  </ul>
</div>
```

**Focus Management**
- Trap focus within panel when open
- Return focus to trigger button when closed
- Clear focus indicators for interactive elements

---

## 5. Design System Integration

### 5.1. Color Scheme Alignment

Following the B2B Strategic Sales Design Blueprint:

**Panel Background**
- Light mode: `bg-white` with subtle border `border-neutral-200`
- Dark mode: `bg-gray-900` with `border-neutral-800`
- Elevation: Use shadow instead of borders for depth

**Interactive Elements**
- Primary actions: Blue (`blue-600`) for trust and professionalism
- Success indicators: Green (`green-600`) for saved/completed
- Destructive actions: Red (`red-600`) for remove/delete
- Neutral actions: Gray (`neutral-600`) for secondary options

**State Colors**
- Empty state: Muted gray text
- Active items: Full color saturation
- Hover states: Slight background tint
- Selected/focused: Blue outline or background

### 5.2. Typography

**Hierarchy**
1. Panel title: `text-xl font-semibold`
2. Item count: `text-sm text-neutral-500`
3. Product names: `text-base font-medium`
4. SKUs: `text-sm font-mono text-neutral-600`
5. Quantities: `text-sm tabular-nums`

**Font Families**
- UI text: System sans-serif stack
- SKUs/quantities: Monospace for alignment
- Prices: Tabular numbers for alignment

### 5.3. Spacing & Layout

**Panel Dimensions**
- Width: `400px` desktop, `100vw` mobile
- Padding: `p-6` for header/footer, `p-4` for items
- Item spacing: `gap-4` between items
- Action spacing: `gap-3` between buttons

**Visual Rhythm**
- Consistent vertical spacing using 4px grid
- Grouped related elements (quantity controls)
- Whitespace around primary actions

---

## 6. Mobile Considerations

### 6.1. Responsive Behavior

**Mobile (<768px)**
- Full-screen panel (100vw × 100vh)
- Slide up from bottom (alternative to right-side)
- Larger touch targets (min 44px × 44px)
- Simplified layout (single column)

**Tablet (768px-1024px)**
- 50-60% screen width
- Overlay with backdrop
- Touch-optimized but with desktop features

**Desktop (>1024px)**
- Fixed width (400px)
- Can be resized by user (optional)
- Keyboard shortcuts enabled

### 6.2. Touch Interactions

**Swipe Gestures**
- Swipe right to close panel
- Swipe left on item to reveal delete button
- Pull-to-refresh for syncing (optional)

**Touch Targets**
- Minimum size: 44px × 44px (iOS guidelines)
- Spacing between targets: 8px minimum
- Visual feedback on tap (ripple effect)

---

## 7. Error Handling & Edge Cases

### 7.1. Common Errors

**Failed to Add Item**
- Show error toast: "Unable to add item. Please try again."
- Keep panel open
- Allow retry without losing context

**Failed to Save**
- Show persistent warning banner in panel
- Indicate offline mode if network issue
- Queue changes for retry

**Failed to Load Selection**
- Show error state in panel
- Offer "Retry" button
- Don't block browsing experience

### 7.2. Edge Cases

**Maximum Items**
- Enforce reasonable limit (e.g., 500 items)
- Show warning as limit approaches
- Graceful handling: "Selection full. Please save or export."

**Duplicate Items**
- Prevent duplicates OR allow with quantity increment
- Show clear feedback: "Item already in selection. Quantity increased by 1."

**Concurrent Users (Multi-device)**
- Last write wins OR conflict resolution UI
- Show sync conflicts clearly
- Allow user to choose which version to keep

**Large Selections**
- Lazy-load items in panel (virtual scrolling)
- Paginate export operations
- Show loading states for slow operations

---

## 8. Analytics & Metrics

### 8.1. Key Metrics to Track

**Engagement**
- Panel open rate (% of sessions)
- Average items per selection
- Time spent in panel
- Actions taken (add, remove, edit quantity)

**Conversion**
- Selection-to-order conversion rate
- Export rate
- Share rate
- Abandonment rate

**Performance**
- Panel load time
- Animation frame rate
- API response times
- Error rates

### 8.2. Event Tracking

**Critical Events**
```typescript
// Panel interactions
track('panel_opened', { source: 'icon_click' | 'auto' });
track('panel_closed', { source: 'close_button' | 'overlay_click' | 'escape_key' });

// Item management
track('item_added', { sku, source: 'collection_card' | 'search' });
track('item_removed', { sku, quantity });
track('quantity_changed', { sku, old_qty, new_qty });

// Actions
track('selection_saved', { item_count, total_value });
track('selection_exported', { format: 'pdf' | 'csv' | 'xlsx', item_count });
track('selection_shared', { method: 'link' | 'email' });
```

---

## 9. Testing Strategy

### 9.1. Unit Tests

**Component Tests**
- Panel open/close behavior
- Item addition/removal
- Quantity adjustments
- Total calculations

**State Tests**
- localStorage persistence
- State updates
- Edge cases (empty, max items)

### 9.2. Integration Tests

**User Flows**
- Add item → Open panel → Adjust quantity → Save
- Browse → Add multiple items → Export
- Load page → Panel restores previous state

**Cross-browser**
- Chrome, Firefox, Safari, Edge
- iOS Safari, Chrome Mobile
- Test animations and transitions

### 9.3. E2E Tests (Playwright)

**Critical Paths**
```typescript
test('User can add items and save selection', async ({ page }) => {
  await page.goto('/customers/test-customer?tab=collections');

  // Add item
  await page.click('[data-testid="add-to-selection-btn"]');

  // Open panel
  await page.click('[data-testid="selection-panel-trigger"]');

  // Verify item appears
  await expect(page.locator('[data-testid="selection-item"]')).toBeVisible();

  // Adjust quantity
  await page.click('[data-testid="increase-qty-btn"]');

  // Save selection
  await page.click('[data-testid="save-selection-btn"]');

  // Verify success
  await expect(page.locator('text=Selection saved')).toBeVisible();
});
```

---

## 10. Implementation Checklist

### Phase 1: Core Functionality
- [ ] Create panel component structure
- [ ] Implement slide-in/slide-out animation
- [ ] Add persistent trigger icon with badge
- [ ] Implement item list rendering
- [ ] Add quantity controls
- [ ] Add remove item functionality
- [ ] Implement localStorage persistence

### Phase 2: User Experience
- [ ] Add overlay backdrop
- [ ] Implement click-outside-to-close
- [ ] Add empty state design
- [ ] Implement smooth animations
- [ ] Add loading states
- [ ] Remember panel open/closed state

### Phase 3: Actions & Integration
- [ ] Connect to existing selection API
- [ ] Add "Save Selection" action
- [ ] Add "Export" functionality
- [ ] Add "Clear All" with confirmation
- [ ] Sync with working selection tab

### Phase 4: Polish & Optimization
- [ ] Add keyboard shortcuts (Escape to close)
- [ ] Implement accessibility features (ARIA, focus trap)
- [ ] Optimize performance (virtual scrolling if needed)
- [ ] Add responsive mobile behavior
- [ ] Add error handling and edge cases

### Phase 5: Testing & Launch
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Cross-browser testing
- [ ] Performance testing
- [ ] Analytics implementation

---

## 11. Conclusion

An intuitive, persistent selection panel is a major asset for any B2B tool. By prioritizing an accessible, collapsible design focused on clarity, efficiency, and persistence, you empower professional users to manage their selections effectively.

### Key Success Factors

1. **Always accessible**: Persistent trigger icon visible at all times
2. **Non-intrusive**: Panel doesn't disrupt browsing flow
3. **Auto-save**: Selections persist across sessions
4. **Clear feedback**: Users always know what's in their selection
5. **Professional design**: B2B-appropriate language and styling
6. **Performance**: Smooth animations and fast interactions
7. **Accessibility**: Keyboard navigation and screen reader support

By following these best practices, the Curated Presentation application will provide a best-in-class selection management experience for lighting professionals.
