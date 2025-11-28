# Working Selection UI Consolidation - Technical Specification

## Overview
This document provides a complete technical specification for consolidating the Dallas and Selection tabs into a unified "Working Selection" experience with dual-state functionality.

## Status: Phase 1 Complete ✅

### Completed Work
- ✅ Hidden Dallas tab from customer navigation
- ✅ Renamed "Selection" tab to "Working Selection"
- ✅ Updated both desktop and mobile navigation

---

## Architecture Overview

### Current State
```
Customer sees 3 tabs:
├── Presentation (Collections)
├── Dallas (Market History) ← HIDDEN NOW
└── Selection (Working Cart) ← RENAMED TO "Working Selection"
```

### Target State
```
Customer sees 3 tabs:
├── Presentation (Collections)
├── Working Selection (Dual-State Component)
│   ├── Mode 1: Live Cart (editable)
│   └── Mode 2: Historical Review (read-only with restore/merge)
└── Promotions (Financial Messaging)
```

---

## Phase 2: Extract Promotional Modules

### Goal
Move promotional widgets from Selection tab to dedicated Promotions tab.

### Files to Create

#### 1. `/app/customers/[id]/_components/promotions-tab.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Customer } from '@/lib/customers/loadCustomers';
import { Selection } from '@/lib/selections/types';
import { Promotion, PromotionCalculation } from '@/lib/promotions/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PromotionProgress } from './promotion-progress';
import { TotalSavingsKPI } from './total-savings-kpi';
import { WhatIfCalculator } from './what-if-calculator';
import { calculatePromotion } from '@/lib/promotions/calculator';
import { useMemo } from 'react';

type WorkingResponse = {
  selection: Selection | null;
};

type PromotionsTabProps = {
  customer: Customer;
  workingData: WorkingResponse;
  selectedVendor?: string;
};

export default function PromotionsTab({ customer, workingData, selectedVendor }: PromotionsTabProps) {
  // Query for working selection
  const workingQuery = useQuery<WorkingResponse>({
    queryKey: ['customer-working', customer.id, selectedVendor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendor) params.set('vendor', selectedVendor);
      const url = `/api/customers/${customer.id}/selection/working${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load selection');
      return response.json();
    },
    initialData: workingData,
    refetchOnWindowFocus: false,
  });

  // Query for promotion config
  const promotionQuery = useQuery<{ promotion: Promotion | null }>({
    queryKey: ['customer-promotion', customer.id, selectedVendor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendor) params.set('vendor', selectedVendor);
      const url = `/api/customers/${customer.id}/promotion${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) return { promotion: null };
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  const selection = workingQuery.data?.selection ?? null;
  const promotion = promotionQuery.data?.promotion ?? null;

  // Filter selection by vendor
  const filteredSelection = selection && selectedVendor && (selection.vendor || 'lib-and-co') !== selectedVendor ? null : selection;

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredSelection) return { subtotal: 0, discount: 0, net: 0 };

    const subtotal = filteredSelection.items.reduce((acc, item) => {
      return acc + item.unitList * item.qty;
    }, 0);

    const net = filteredSelection.items.reduce((acc, item) => {
      const displayQty = item.displayQty ?? item.qty;
      const backupQty = item.backupQty ?? 0;
      const displayDiscount = (item.displayDiscountPercent ?? 0) / 100;
      const backupDiscount = (item.backupDiscountPercent ?? 0) / 100;
      const displayNet = item.unitList * (1 - displayDiscount) * displayQty;
      const backupNet = item.unitList * (1 - backupDiscount) * backupQty;
      return acc + displayNet + backupNet;
    }, 0);

    return { subtotal, net, discount: subtotal - net };
  }, [filteredSelection]);

  // Calculate promotion savings
  const promotionCalculation = useMemo<PromotionCalculation | null>(() => {
    if (!promotion || !filteredSelection) return null;

    const lineItems = filteredSelection.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      collection: item.collection ?? '',
      year: item.year ?? new Date().getFullYear(),
      displayQty: item.displayQty ?? item.qty,
      backupQty: item.backupQty ?? 0,
      unitList: item.unitList,
      notes: item.notes,
    }));

    return calculatePromotion(promotion, lineItems);
  }, [promotion, filteredSelection]);

  if (!filteredSelection || !promotion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promotion Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {!filteredSelection
              ? 'No working selection available. Create a selection to see promotion progress.'
              : 'No active promotion for this vendor.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Savings KPI */}
      {promotionCalculation && promotionCalculation.totalSavings > 0 && (
        <TotalSavingsKPI
          savings={promotionCalculation.totalSavings}
          percentage={promotionCalculation.bestTierDiscount}
          wspTotal={totals.subtotal}
          netTotal={totals.net}
          animate={true}
        />
      )}

      {/* Promotion Progress */}
      <PromotionProgress selection={filteredSelection} promotion={promotion} />

      {/* What-If Calculator */}
      {promotionCalculation && (
        <WhatIfCalculator promotion={promotion} currentCalculation={promotionCalculation} />
      )}
    </div>
  );
}
```

### Files to Modify

#### 2. `/app/customers/[id]/_components/selection-tab.tsx`

**Remove lines 280-313** (promotional modules section):

```typescript
// DELETE THESE LINES:
{/* Total Savings KPI */}
{promotionCalculation && promotionCalculation.totalSavings > 0 && (
  <TotalSavingsKPI
    savings={promotionCalculation.totalSavings}
    percentage={promotionCalculation.bestTierDiscount}
    wspTotal={totals.subtotal}
    netTotal={totals.net}
    animate={true}
  />
)}

{/* Promotion Progress Indicator */}
{promotion && filteredSelection && (
  <PromotionProgress selection={filteredSelection} promotion={promotion} />
)}

{/* What-If Calculator */}
{promotion && promotionCalculation && (
  <WhatIfCalculator promotion={promotion} currentCalculation={promotionCalculation} />
)}
```

**Also remove related imports** (lines 19-23):
```typescript
// DELETE THESE IMPORTS:
import type { Promotion, PromotionCalculation } from '@/lib/promotions/types';
import { PromotionProgress } from './promotion-progress';
import { TotalSavingsKPI } from './total-savings-kpi';
import { WhatIfCalculator } from './what-if-calculator';
import { calculatePromotion } from '@/lib/promotions/calculator';
```

**And remove promotion-related state** (lines 71-87, 162-177):
```typescript
// DELETE promotionQuery
// DELETE promotionCalculation useMemo
```

#### 3. `/app/customers/[id]/_components/customer-page-layout.tsx`

**Add Promotions tab to navigation** (after Working Selection):

```typescript
// Around line 107, add:
<Link
  href={`/customers/${customerId}?tab=promotions${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
  className={cn(
    'inline-flex min-w-[130px] items-center justify-center whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium transition-all',
    activeTab === 'promotions'
      ? 'bg-card text-foreground shadow-sm'
      : 'text-slate-500 hover:text-foreground'
  )}
>
  Promotions
</Link>
```

**Add to mobile navigation** (around line 150):

```typescript
<Link
  href={`/customers/${customerId}?tab=promotions${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
  className={cn(
    'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all',
    activeTab === 'promotions'
      ? 'bg-card text-foreground shadow-sm'
      : 'text-slate-500 hover:text-foreground'
  )}
>
  Promotions
</Link>
```

**Add to props and render section** (around lines 12-18 and 155-157):

```typescript
// Props interface
interface CustomerPageLayoutProps {
  customer: Customer;
  activeTab: string;
  collectionsTab: ReactNode;
  dallasTab: ReactNode;
  selectionTab: ReactNode;
  promotionsTab: ReactNode; // ADD THIS
}

// Render section
<main className="mx-auto flex w-full max-w-6xl flex-col px-4 md:px-6 pb-16 mt-2 md:mt-6">
  {activeTab === 'collections' && <div className="-mx-4 md:-mx-6">{collectionsTab}</div>}
  {activeTab === 'dallas' && <div>{dallasTab}</div>}
  {activeTab === 'selection' && <div>{selectionTab}</div>}
  {activeTab === 'promotions' && <div>{promotionsTab}</div>} {/* ADD THIS */}
</main>
```

#### 4. `/app/customers/[id]/page.tsx`

**Import and pass promotionsTab**:

```typescript
// Add import
import PromotionsTab from './_components/promotions-tab';

// Update CustomerPageLayout props (around line 55-63)
return (
  <CustomerPageLayout
    customer={customer}
    activeTab={activeTab}
    collectionsTab={<CollectionsTab customer={customer} selectedVendor={selectedVendor} />}
    dallasTab={<DallasTab customer={customer} data={dallasData} selectedVendor={selectedVendor} />}
    selectionTab={<SelectionTab customer={customer} dallasData={dallasData} workingData={workingData} selectedVendor={selectedVendor} />}
    promotionsTab={<PromotionsTab customer={customer} workingData={workingData} selectedVendor={selectedVendor} />} {/* ADD THIS */}
  />
);
```

---

## Phase 3: Build Dual-State Working Selection Component

### Goal
Create a new component that combines live cart editing with historical market order review.

### Component Architecture

```
WorkingSelectionTab
├── State: viewMode ('live-cart' | 'historical-review')
├── State: selectedSnapshot (DallasSnapshot | null)
│
├── Header Section
│   ├── Title (changes based on mode)
│   └── Selection Source Control (dropdown)
│
├── Mode 1: Live Cart View (editable)
│   ├── Product table with qty inputs
│   ├── Apply Changes button
│   └── Export dropdown
│
└── Mode 2: Historical Review (read-only)
    ├── Read-only product table
    ├── Restore as Working Selection button
    ├── Merge with Working Selection button
    └── Back to Working Selection button
```

### Files to Create

#### 5. `/app/customers/[id]/_components/working-selection-tab.tsx`

```typescript
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Customer } from '@/lib/customers/loadCustomers';
import { Selection, DallasSnapshot } from '@/lib/selections/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

import type { DallasApiResponse } from './dallas-tab';
import { SelectionTableView } from './selection-table-view'; // We'll create this

type ViewMode = 'live-cart' | 'historical-review';

type WorkingResponse = {
  selection: Selection | null;
};

type WorkingSelectionTabProps = {
  customer: Customer;
  dallasData: DallasApiResponse;
  workingData: WorkingResponse;
  selectedVendor?: string;
};

export default function WorkingSelectionTab({
  customer,
  dallasData,
  workingData,
  selectedVendor
}: WorkingSelectionTabProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('live-cart');
  const [selectedSnapshot, setSelectedSnapshot] = useState<DallasSnapshot | null>(null);

  const workingQuery = useQuery<WorkingResponse>({
    queryKey: ['customer-working', customer.id, selectedVendor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendor) params.set('vendor', selectedVendor);
      const url = `/api/customers/${customer.id}/selection/working${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load selection');
      return response.json();
    },
    initialData: workingData,
    refetchOnWindowFocus: false,
  });

  const selection = workingQuery.data?.selection ?? null;
  const filteredSelection = selection && selectedVendor && (selection.vendor || 'lib-and-co') !== selectedVendor ? null : selection;

  // Get available Dallas snapshots for dropdown
  const availableSnapshots = dallasData.versions || [];

  // Handle loading a historical snapshot
  const handleLoadSnapshot = (snapshotId: string) => {
    const snapshot = availableSnapshots.find(s => s.id === snapshotId);
    if (snapshot) {
      setSelectedSnapshot(snapshot);
      setViewMode('historical-review');
    }
  };

  // Handle returning to live cart
  const handleBackToLiveCart = () => {
    setViewMode('live-cart');
    setSelectedSnapshot(null);
  };

  // Restore snapshot as working selection
  const restoreMutation = useMutation({
    mutationFn: async (snapshot: DallasSnapshot) => {
      const response = await fetch(`/api/customers/${customer.id}/selection/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: snapshot.id }),
      });
      if (!response.ok) throw new Error('Unable to restore selection');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Selection Restored', description: 'Historical order restored as working selection.' });
      workingQuery.refetch();
      handleBackToLiveCart();
    },
    onError: (error: Error) => {
      toast({ title: 'Restore Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Merge snapshot with working selection
  const mergeMutation = useMutation({
    mutationFn: async (snapshot: DallasSnapshot) => {
      const response = await fetch(`/api/customers/${customer.id}/selection/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: snapshot.id }),
      });
      if (!response.ok) throw new Error('Unable to merge selection');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Selection Merged', description: 'Historical order merged with working selection.' });
      workingQuery.refetch();
      handleBackToLiveCart();
    },
    onError: (error: Error) => {
      toast({ title: 'Merge Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Determine what to display
  const displaySelection = viewMode === 'historical-review' && selectedSnapshot
    ? selectedSnapshot.selection
    : filteredSelection;

  const isReadOnly = viewMode === 'historical-review';

  return (
    <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 shadow-sm">
      <CardHeader className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between pb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {viewMode === 'live-cart' ? 'My Working Selection' : `Viewing: ${selectedSnapshot?.name}`}
            </CardTitle>
            {viewMode === 'historical-review' && (
              <span className="text-sm text-neutral-500 dark:text-neutral-500 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Read-Only
              </span>
            )}
          </div>

          {/* Selection Source Control */}
          {viewMode === 'live-cart' && availableSnapshots.length > 0 && (
            <div className="mt-4">
              <Select onValueChange={handleLoadSnapshot}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Load a Market Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Market Order History</SelectLabel>
                    {availableSnapshots.map((snapshot) => (
                      <SelectItem key={snapshot.id} value={snapshot.id}>
                        {snapshot.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Action Buttons - Change based on mode */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'live-cart' ? (
            <>
              {/* Live cart actions - Export, Apply Changes */}
              {/* (use existing selection-tab.tsx code here) */}
            </>
          ) : (
            <>
              {/* Historical review actions */}
              <Button
                onClick={handleBackToLiveCart}
                variant="outline"
                size="default"
              >
                ← Back to Working Selection
              </Button>
              <Button
                onClick={() => selectedSnapshot && mergeMutation.mutate(selectedSnapshot)}
                disabled={mergeMutation.isPending}
                variant="outline"
                size="default"
              >
                Merge with Working Selection
              </Button>
              <Button
                onClick={() => selectedSnapshot && restoreMutation.mutate(selectedSnapshot)}
                disabled={restoreMutation.isPending}
                size="default"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {restoreMutation.isPending ? 'Restoring...' : 'Restore as Working Selection'}
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Table view component - pass isReadOnly prop */}
        <SelectionTableView
          selection={displaySelection}
          isReadOnly={isReadOnly}
          customer={customer}
        />
      </CardContent>
    </Card>
  );
}
```

### API Routes to Create

#### 6. `/app/api/customers/[id]/selection/restore/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const customerId = params.id;
  const { snapshotId } = await request.json();

  // Load the Dallas snapshot
  // Copy snapshot.selection to working selection
  // Return success

  return NextResponse.json({
    success: true,
    selectionId: 'new-working-selection-id'
  });
}
```

#### 7. `/app/api/customers/[id]/selection/merge/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const customerId = params.id;
  const { snapshotId } = await request.json();

  // Load the Dallas snapshot
  // Load current working selection
  // Merge snapshot items into working selection (combine quantities for duplicates)
  // Return success

  return NextResponse.json({
    success: true,
    selectionId: 'merged-selection-id'
  });
}
```

---

## Phase 4: Refactor Selection Table into Reusable Component

### Goal
Extract the table rendering logic into a shared component that can be used in both read-only and editable modes.

#### 8. `/app/customers/[id]/_components/selection-table-view.tsx`

Move the table rendering code from `selection-tab.tsx` (lines 315-601) into this new component with an `isReadOnly` prop to control editability.

---

## Testing Checklist

### Phase 2: Promotions Tab
- [ ] Promotions tab appears in navigation
- [ ] Total Savings KPI displays correctly
- [ ] Promotion Progress shows accurate data
- [ ] What-If Calculator functions properly
- [ ] Tab is empty when no selection exists
- [ ] Tab is empty when no promotion is active

### Phase 3: Dual-State Working Selection
- [ ] Default mode is "live cart"
- [ ] "Load a Market Order" dropdown appears
- [ ] Dropdown shows all available Dallas snapshots
- [ ] Clicking a snapshot switches to "historical review" mode
- [ ] Historical mode shows read-only table
- [ ] "Back to Working Selection" button returns to live cart
- [ ] "Restore as Working Selection" copies historical data
- [ ] "Merge with Working Selection" combines historical + current
- [ ] Live cart mode remains editable
- [ ] Apply Changes button works in live cart mode
- [ ] Export works in both modes

---

## Migration Notes

### Data Preservation
- All existing APIs remain unchanged
- No database schema changes required
- Existing Dallas snapshots remain accessible
- Working selections continue to function

### User Experience
- Customers see cleaner navigation (2 tabs instead of 3)
- All functionality remains available
- New workflow is more intuitive
- Promotional messaging is centralized

### Rollback Strategy
If issues arise, revert by:
1. Un-hiding Dallas tab in `customer-page-layout.tsx`
2. Moving promotional modules back to `selection-tab.tsx`
3. Removing `promotions-tab.tsx`
4. Keeping `working-selection-tab.tsx` for future use

---

## Implementation Order

1. ✅ **Phase 1: Navigation** (COMPLETE)
2. **Phase 2: Promotions Tab** (Next)
   - Create promotions-tab.tsx
   - Update navigation
   - Remove from selection-tab.tsx
3. **Phase 3: Dual-State Component**
   - Create working-selection-tab.tsx
   - Create API routes (restore, merge)
4. **Phase 4: Refactor Table**
   - Extract SelectionTableView component
   - Update working-selection-tab to use it

---

## Estimated Effort
- Phase 2: ~1-2 hours
- Phase 3: ~3-4 hours
- Phase 4: ~1 hour
- Testing: ~2 hours

**Total: ~7-9 hours**
