# Dallas Market Order Builder - UX Redesign Plan

## Current Issues Identified

### 1. **Confusing Entry Point**
- Users see "Create New Market Selection" button even when no draft exists
- Creates a false sense that there's a draft workflow
- The button text is misleading - it just opens a dialog to add SKUs

### 2. **Awkward Layout Flow**
- "Draft Items" section sits in the middle, taking attention
- Empty state shows even when no work has been done
- Summary panel on the right feels disconnected from the workflow

### 3. **Market Context Placement**
- Customer/Month/Year selectors feel buried
- Should be more prominent since they define the entire order scope
- The "Create New Market Selection" button placement is confusing

---

## Proposed Redesign

### **New Visual Hierarchy**

```
┌─────────────────────────────────────────────────────────┐
│  HERO SECTION                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Dallas Market Order Builder                      │  │
│  │                                                    │  │
│  │  [Customer Dropdown ▼] [January ▼] [2025 ▼]     │  │
│  │                                                    │  │
│  │  Build market orders for January 2025            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ORDER BUILDER (main workspace)                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  🔍 Search catalog or [+ Add SKU] [📋 Bulk]     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Current Order Items (4 items)                    │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │ SKU-123  |  Name  |  Qty  |  Price  | [X] │  │  │
│  │  │ SKU-456  |  Name  |  Qty  |  Price  | [X] │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  Net Total: $4,250 | Add $750 to reach Tier 1   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [💾 Save Market Order]  [📥 Export]                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ORDER HISTORY (collapsible/below)                      │
│  Previous orders for this customer...                    │
└─────────────────────────────────────────────────────────┘
```

---

## Detailed Changes

### 1. **Redesigned Hero Section** ✨
**Current**: Small header + separate context card
**New**: Unified hero with prominent market context

```tsx
<div className="bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-2xl p-8 mb-6">
  <h1 className="text-3xl font-bold mb-2">Dallas Market Order Builder</h1>
  <p className="text-muted-foreground mb-6">
    Create and manage market orders for your customers
  </p>

  {/* Inline context selectors - ALWAYS visible */}
  <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
    <div className="flex-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
        Customer
      </Label>
      <CustomerSelect /> {/* Large, prominent */}
    </div>
    <div className="w-40">
      <Label>Market</Label>
      <Select> {/* January 2025 */}
    </div>
  </div>
</div>
```

**Benefits**:
- Market context is always visible and prominent
- No confusion about "creating" vs "building"
- Clearer purpose and scope

---

### 2. **Streamlined Order Builder** 🎯
**Current**: Separate dialogs for Add SKU and Bulk
**New**: Integrated search-first workflow

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">Build Order</h2>
        <p className="text-sm text-muted-foreground">
          Search catalog and add items for {marketMonth} {year}
        </p>
      </div>
      {items.length > 0 && (
        <Badge variant="secondary">{items.length} items</Badge>
      )}
    </div>
  </CardHeader>

  <CardContent>
    {/* SEARCH-FIRST: No modal needed */}
    <div className="mb-6">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search catalog by SKU or name..."
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Inline search results - no dialog */}
      {searchResults && (
        <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto">
          {/* Results appear immediately below */}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <Button variant="outline" size="sm">
          <Upload /> Bulk Add
        </Button>
        <Button variant="ghost" size="sm">
          View Catalog
        </Button>
      </div>
    </div>

    {/* ITEMS TABLE - Only shows when items exist */}
    {items.length > 0 ? (
      <div>
        <Table>
          {/* Cleaner table */}
        </Table>

        {/* Inline totals */}
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {formatCurrency(totalsDisplay.netTotal)}
              </div>
              <div className="text-sm text-muted-foreground">
                Net Total ({items.length} items)
              </div>
            </div>

            {/* Tier progress inline */}
            {!isQualified && (
              <div className="text-right">
                <div className="text-sm font-medium text-amber-700">
                  +{formatCurrency(qualificationGap)} to Tier 1
                </div>
                <div className="text-xs text-muted-foreground">
                  $5,000 minimum
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex gap-3 mt-6">
          <Button className="flex-1" size="lg">
            <Save /> Save Market Order
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg">
                <Download /> Export
              </Button>
            </DropdownMenuTrigger>
          </DropdownMenu>
        </div>
      </div>
    ) : (
      <EmptyState
        icon={<PlusCircledIcon />}
        title="No items yet"
        description="Search the catalog above to start building this market order"
      />
    )}
  </CardContent>
</Card>
```

**Benefits**:
- No confusing "Create" button
- Search is the primary action - always visible
- Results appear inline (no modal)
- Table only shows when there's data
- Totals and actions stay with the items

---

### 3. **History Section - Collapsible** 📚
**Current**: Always visible, takes up space
**New**: Accordion/collapsible section

```tsx
<Accordion type="single" collapsible defaultValue="history">
  <AccordionItem value="history">
    <AccordionTrigger>
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">Order History</h3>
        <Badge variant="secondary">
          {historyQuery.data?.history.length ?? 0} saved
        </Badge>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      <div className="pt-4">
        {/* History table */}
      </div>
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

**Benefits**:
- Reduces visual clutter
- Still easily accessible
- Badge shows count at a glance

---

### 4. **Remove Right Sidebar** ❌→✅
**Current**: Sticky sidebar with summary
**New**: Inline summary within builder card (see above)

**Rationale**:
- Most work happens in the main area
- Summary info can be inline with items
- Better use of screen real estate
- Mobile-friendly by default

---

### 5. **Smart Empty States** 💡

**When no customer selected**:
```tsx
<div className="text-center py-16">
  <PersonIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
  <h3 className="font-semibold mb-2">Select a customer to begin</h3>
  <p className="text-sm text-muted-foreground">
    Choose a customer from the dropdown above to start building their market order
  </p>
</div>
```

**When customer selected, no items**:
```tsx
<div className="text-center py-12 border-2 border-dashed rounded-lg">
  <MagnifyingGlassIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
  <h3 className="font-semibold mb-1">Build your first order</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Search the catalog above or paste SKUs to get started
  </p>
  <Button variant="outline" onClick={() => focusSearch()}>
    <Search /> Start searching
  </Button>
</div>
```

---

## Layout Comparison

### Before
```
[Small Header]
[Context Card] → Market/Year/Customer/Create Button ❌
[Draft Items Card] → Empty state or table
[Summary Sidebar] → Sticky on right
[History Card] → Always expanded
```

### After
```
[Hero Section] → Customer/Market prominent ✅
[Order Builder Card]
  ├─ Search (always visible) ✅
  ├─ Results (inline)
  ├─ Items table (conditional)
  ├─ Totals (inline with items)
  └─ Actions (Save/Export)
[History Accordion] → Collapsed by default ✅
```

---

## Implementation Checklist

### Phase 1: Hero & Context
- [ ] Create new hero section component
- [ ] Move customer/market/year selectors to hero
- [ ] Style as prominent gradient card
- [ ] Remove old context card

### Phase 2: Order Builder
- [ ] Add persistent search bar to card header
- [ ] Implement inline search results (no dialog)
- [ ] Move "Bulk Add" to secondary button
- [ ] Remove "Create New Market Selection" button entirely

### Phase 3: Inline Summary
- [ ] Remove right sidebar
- [ ] Add totals section below items table
- [ ] Integrate tier progress inline
- [ ] Move save button below totals

### Phase 4: History
- [ ] Convert history card to accordion
- [ ] Default to collapsed state
- [ ] Add item count badge to header

### Phase 5: Empty States
- [ ] Create contextual empty states
- [ ] Add helpful CTAs
- [ ] Use EmptyState component from our new library

### Phase 6: Polish
- [ ] Test keyboard shortcuts still work
- [ ] Ensure mobile responsive
- [ ] Add loading states
- [ ] Test with real data

---

## Key UX Principles Applied

1. **Progressive Disclosure**: Show complexity as needed
2. **Search-First**: Make finding products the primary action
3. **Context Clarity**: Market/customer always visible
4. **Reduce Modals**: Inline interactions where possible
5. **Visual Hierarchy**: Most important actions most prominent
6. **Smart Defaults**: Sensible initial states

---

## Migration Notes

- Existing functionality preserved (no feature removal)
- URL parameters still work (customer, year)
- API calls unchanged
- Keyboard shortcuts maintained (A, B, Cmd+S)
- History/visibility toggle preserved

---

**Next Step**: Get approval on this plan, then implement Phase 1-2 as proof of concept.
