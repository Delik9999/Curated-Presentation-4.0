# Customer Selection Tab - Design Improvement Plan

## Overview
This document outlines design improvements for the Customer Selection tab based on a comprehensive UX review conducted on 2025-10-17.

## Current Design Assessment

### Strengths ✅
- Clean card-based layout with modern styling
- Clear information hierarchy
- Consistent indigo/purple brand colors with good contrast
- Proper tabular numbers for pricing alignment
- Eye-catching promotion progress indicator
- Well-organized export dropdown menu
- Prominent primary action button
- Dark mode support

### Issues Identified ⚠️

#### Visual Density
- Table feels sparse with excessive vertical padding
- Notes fields always expanded, consuming space even when empty
- Inconsistent field sizing between quantity inputs and notes

#### Input Field Design
- Basic number fields lack stepper controls (+/- buttons)
- No visual indication of modified but unsaved fields
- Notes textareas are fixed height and always visible

#### Interactivity
- No inline editing states or loading indicators
- No keyboard shortcuts for common actions
- No bulk selection or bulk actions
- No undo/redo functionality

#### Missing Features
- No product images/thumbnails
- No search or filter for large selections
- No ability to reorder items
- No collapsible notes to save space

#### Accessibility
- Promotion progress bar may lack proper ARIA labels
- Wide table difficult on mobile devices
- No visible focus indicators on form controls

#### Mobile Responsiveness
- 7-column table challenging on smaller screens
- No responsive design patterns implemented

#### Visual Feedback
- No unsaved changes indicator
- No field validation or error states
- No success/error states on individual items

---

## Improvement Plan

### Phase 1: Quick Wins (Low Effort, High Impact)

#### 1.1 Enhanced Quantity Inputs
**Change**: Replace basic number inputs with stepper buttons (+/-)
**Why**: Better UX, prevents typing errors, mobile-friendly
**Component**: Create NumberInput component with increment/decrement buttons
**File**: `app/customers/[id]/_components/selection-tab.tsx:356-370`

```tsx
// Proposed component
<NumberInput
  value={draft.qty}
  onChange={(value) => handleQtyChange(item.sku, value)}
  min={0}
  max={999}
  className="w-24"
/>
```

#### 1.2 Collapsible Notes Fields
**Change**: Show notes as expandable button when empty, textarea when active
**Why**: Reduces clutter, saves vertical space, faster scanning
**Pattern**: Click to expand, show character count, auto-save on blur
**File**: `app/customers/[id]/_components/selection-tab.tsx:383-396`

```tsx
// Proposed pattern
{isNotesExpanded[item.sku] ? (
  <Textarea
    value={draft.notes}
    onChange={(e) => handleNotesChange(item.sku, e.target.value)}
    onBlur={() => setNotesExpanded({...isNotesExpanded, [item.sku]: false})}
    autoFocus
  />
) : (
  <Button variant="ghost" onClick={() => toggleNotes(item.sku)}>
    {draft.notes ? 'Edit notes...' : 'Add notes...'}
  </Button>
)}
```

#### 1.3 Modified Field Indicators
**Change**: Add visual indicator (dot/highlight) to changed but unsaved fields
**Why**: Clear feedback on pending changes, reduces confusion
**Implementation**: Track dirty fields in state, show indicator on changed inputs

```tsx
// Track dirty state
const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());

// Show indicator
{dirtyFields.has(item.sku) && (
  <span className="absolute top-1 right-1 h-2 w-2 bg-amber-500 rounded-full" />
)}
```

#### 1.4 Table Density Adjustment
**Change**: Reduce vertical padding in table cells for tighter layout
**Why**: Show more items without scrolling, aligns with modern table trends
**CSS**: Adjust TableCell padding from default to compact

```tsx
<TableCell className="py-2 px-4"> {/* Reduced from py-4 */}
```

---

### Phase 2: Enhanced Functionality (Medium Effort, High Value)

#### 2.1 Product Thumbnails
**Change**: Add 60x60px product image column at start of each row
**Why**: Visual identification, professional look, easier recognition
**Data Source**: `https://libandco.com/cdn/shop/files/${SKU}.jpg`
**Component**: Add image column with lazy loading and fallback

```tsx
<TableCell className="w-16">
  <img
    src={`https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
    alt={item.name}
    className="w-14 h-14 object-cover rounded"
    loading="lazy"
    onError={(e) => e.currentTarget.src = '/placeholder-product.png'}
  />
</TableCell>
```

#### 2.2 Inline Edit Modes
**Change**: Make cells click-to-edit with clear visual states (view/edit)
**Why**: Cleaner default view, progressive disclosure, better mobile UX
**States**: Hover shows edit icon, click activates, blur/Enter saves

#### 2.3 Unsaved Changes Warning
**Change**: Add persistent banner when there are unsaved changes
**Why**: Prevents accidental data loss, clear system state
**Location**: Sticky bar above table or badge on "Apply Changes" button

```tsx
{hasUnsavedChanges && (
  <div className="sticky top-0 z-10 bg-amber-50 border-b border-amber-200 px-4 py-2">
    <p className="text-sm text-amber-800">
      You have unsaved changes. Click "Apply Changes" to save.
    </p>
  </div>
)}
```

#### 2.4 Keyboard Shortcuts
**Change**: Add shortcuts (Cmd+S to save, Tab through qty fields)
**Why**: Power user efficiency, accessibility
**Implementation**: Add keyboard event listeners with visual hints

```tsx
useEffect(() => {
  const handleKeyboard = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      updateMutation.mutate();
    }
  };
  window.addEventListener('keydown', handleKeyboard);
  return () => window.removeEventListener('keydown', handleKeyboard);
}, [updateMutation]);
```

---

### Phase 3: Advanced Features (Higher Effort, Nice to Have)

#### 3.1 Search & Filter
**Change**: Add search bar to filter items by SKU or name
**Why**: Essential for selections with 10+ items
**Location**: Above table, below promotion progress
**Features**: Real-time filtering, highlight matches, show result count

```tsx
<div className="mb-4">
  <Input
    type="search"
    placeholder="Search by SKU or product name..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="max-w-md"
  />
  {filteredItems.length < selection.items.length && (
    <p className="text-sm text-muted-foreground mt-2">
      Showing {filteredItems.length} of {selection.items.length} items
    </p>
  )}
</div>
```

#### 3.2 Bulk Actions
**Change**: Add checkboxes for multi-select, bulk edit quantities or delete
**Why**: Efficiency for large selections, industry standard
**UI**: Checkbox column, bulk action bar when items selected

#### 3.3 Drag-to-Reorder
**Change**: Allow drag handles to reorder items
**Why**: Custom presentation order for exports
**Library**: `@dnd-kit/core` or similar
**Visual**: Show drag handle icon on row hover

#### 3.4 Mobile-Responsive Table
**Change**: Implement responsive table (card view on mobile)
**Why**: Better mobile/tablet experience
**Breakpoint**: Switch to cards below 768px
**Pattern**: Each row becomes a card with labeled values

#### 3.5 Product Details Popover
**Change**: Click SKU/name to see expanded details
**Why**: Access full product info without leaving page
**Component**: Modal or popover with specs and larger image

#### 3.6 Export Preview
**Change**: Show preview before downloading
**Why**: Confidence in format, catch errors early
**UI**: Modal with PDF/CSV/XLSX preview

---

### Phase 4: Performance & Polish

#### 4.1 Optimistic Updates
**Change**: Update UI immediately, rollback on error
**Why**: Feels faster, better UX
**Implementation**: Update local state, show loading on save button

#### 4.2 Field Validation
**Change**: Add inline validation (min qty 0, reasonable max)
**Why**: Prevent errors before submission
**Visual**: Red border and error message on invalid values

```tsx
{qty < 0 && (
  <p className="text-xs text-red-600 mt-1">Quantity must be at least 0</p>
)}
```

#### 4.3 Loading States
**Change**: Add skeleton loaders for initial fetch
**Why**: Better perceived performance
**Component**: Use skeleton UI for table rows

#### 4.4 Success Animations
**Change**: Brief animation when changes saved successfully
**Why**: Clear positive feedback
**Animation**: Fade-in checkmark or toast

---

## Design System Components Needed

To implement these improvements efficiently:

1. **NumberInput** - Stepper input with +/- buttons
2. **ExpandableTextarea** - Collapsible notes field
3. **DataTable** - Table with sorting, filtering, selection
4. **ImageWithFallback** - Product thumbnails with error handling
5. **KeyboardShortcut** - Command palette pattern helper
6. **DirtyFieldIndicator** - Change tracking component

---

## Recommended Implementation Timeline

### Sprint 1 (1-2 weeks)
- ✅ 1.1 Enhanced Quantity Inputs
- ✅ 1.2 Collapsible Notes Fields
- ✅ 1.4 Table Density Adjustment
- ✅ 2.1 Product Thumbnails

### Sprint 2 (2-3 weeks)
- ✅ 1.3 Modified Field Indicators
- ✅ 2.3 Unsaved Changes Warning
- ✅ 3.1 Search & Filter
- ✅ 4.1 Optimistic Updates

### Future Iterations
- 3.2 Bulk Actions
- 3.3 Drag-to-Reorder
- 3.4 Mobile-Responsive Table
- Phase 4 polish items

---

## Screenshots Reference

Captured on 2025-10-17:
- `test-results/selection-tab-full-light.png` - Full page light mode
- `test-results/selection-tab-bottom-light.png` - Totals section
- `test-results/selection-tab-full-dark.png` - Full page dark mode

## Related Files

- **Main Component**: `app/customers/[id]/_components/selection-tab.tsx`
- **Parent Page**: `app/customers/[id]/page.tsx`
- **Table Components**: `components/ui/table.tsx`
- **Form Components**: `components/ui/input.tsx`, `components/ui/textarea.tsx`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-17
**Status**: Plan approved, ready for implementation
