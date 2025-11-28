# Presentation Builder Enhancement Plan

## Executive Summary

Transform the Collections Manager from a simple list-based curator into a sophisticated **Presentation Builder** that enables reps to create visually engaging, strategically ordered customer experiences. This document outlines the technical architecture, implementation phases, and detailed specifications for building a best-in-class B2B showroom presentation tool.

## Current State Assessment

### What's Working ✅

**File**: `app/rep/_components/collections-manager.tsx`

- **Prominent vendor selection** (lines 492-534): Large visual cards replace dropdown
- **Dual-section layout** (lines 603-756):
  - "Your Presentation" section with selected items preview
  - "Available Collections" gallery with thumbnail-first design
- **Visual hierarchy**: Numbered badges (1, 2, 3...) show presentation order
- **Responsive grids**: 2/3/4/5 column layouts adapt to screen size
- **Selected item management**: Items toggle between available/selected states
- **Large thumbnails**: Aspect-video format with hover overlays
- **Vendor isolation**: Proper filtering prevents cross-vendor contamination

### Current Gaps 🚧

1. **No drag-and-drop reordering**: Order is append-only, can't rearrange
2. **No properties inspector**: Can't configure per-collection settings (auto-expand, etc.)
3. **No section headers**: Can't organize presentation into thematic groups
4. **Limited bulk operations**: No shift-select, no bulk property editing
5. **Two-pane vs three-pane**: Missing dedicated source library + properties panes
6. **Static presentation**: No "auto-expand" or other display behaviors

## Architecture Overview

### Three-Pane Layout

```
┌──────────────────────────────────────────────────────────────────┐
│                    Vendor Selector (Top Bar)                     │
├─────────────┬──────────────────────────────┬─────────────────────┤
│             │                              │                     │
│   Source    │    Presentation Canvas       │    Properties       │
│   Library   │    (Reorderable Preview)     │    Inspector        │
│             │                              │                     │
│  - Filter   │  ┌─────┐ ┌─────┐ ┌─────┐   │  Selection Context  │
│  - Search   │  │  1  │ │  2  │ │  3  │   │  - Start Expanded   │
│  - Browse   │  └─────┘ └─────┘ └─────┘   │  - Notes            │
│             │                              │  - Visibility       │
│  Available  │  + Add Section Header        │                     │
│  Grid       │                              │  Bulk Actions       │
│             │  ┌─────┐ ┌─────┐            │  - Apply to all     │
│  ┌─┐ ┌─┐   │  │  4  │ │  5  │            │                     │
│  └─┘ └─┘   │  └─────┘ └─────┘            │                     │
│             │                              │                     │
└─────────────┴──────────────────────────────┴─────────────────────┘
```

### Data Model Extensions

**Current State** (`collections-manager.tsx` line 489):
```typescript
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
```

**Enhanced State**:
```typescript
interface PresentationItem {
  id: string;
  type: 'collection' | 'section_header';
  order: number;

  // For collections
  collectionData?: {
    collectionName: string;
    productCount: number;
    heroVideoUrl?: string;
    vendor: string;
  };

  // For section headers
  headerData?: {
    title: string;
    subtitle?: string;
  };

  // Display properties
  properties: {
    startExpanded: boolean;
    showProductCount: boolean;
    customNotes?: string;
  };
}

interface PresentationState {
  vendorFilter: string;
  items: PresentationItem[];
  selectedItemIds: Set<string>; // For bulk operations
  inspectorTarget: string | null; // Currently selected for properties editing
}
```

### Persistence Model

**Update**: `data/promotions.json` (currently stores collections array)

**Before**:
```json
{
  "id": "653d59bd-c505-4a9a-b27c-2b7797ab5a23",
  "vendor": "lib-and-co",
  "collections": [
    {
      "collectionName": "Adelfia",
      "includeAllYears": true
    }
  ]
}
```

**After**:
```json
{
  "id": "653d59bd-c505-4a9a-b27c-2b7797ab5a23",
  "vendor": "lib-and-co",
  "presentationItems": [
    {
      "id": "item_1",
      "type": "section_header",
      "order": 0,
      "headerData": {
        "title": "New Arrivals",
        "subtitle": "Fresh designs for Spring 2025"
      }
    },
    {
      "id": "item_2",
      "type": "collection",
      "order": 1,
      "collectionData": {
        "collectionName": "Adelfia",
        "includeAllYears": true
      },
      "properties": {
        "startExpanded": true,
        "showProductCount": true
      }
    }
  ]
}
```

**Backward compatibility**: Keep reading `collections` array if `presentationItems` doesn't exist.

## Phase 1: Drag-and-Drop Implementation

### Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2"
  }
}
```

### Component Structure

**File**: `app/rep/_components/collections-manager.tsx`

**Replace** lines 603-677 (current "Your Presentation" section) with:

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
function SortableCollectionCard({
  item,
  index,
  onRemove,
  onSelect
}: {
  item: PresentationItem;
  index: number;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group cursor-pointer ${isDragging ? 'z-50' : ''}`}
      onClick={onSelect}
    >
      {/* Drag Handle - visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded p-1 cursor-grab active:cursor-grabbing"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Order Badge */}
      <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
        {index + 1}
      </div>

      {/* Card Content */}
      {/* ... existing thumbnail, title, etc ... */}
    </div>
  );
}

// Main Presentation Canvas
function PresentationCanvas({
  items,
  onReorder,
  onRemove,
  onSelectForInspector
}: {
  items: PresentationItem[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  onRemove: (id: string) => void;
  onSelectForInspector: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item, index) => (
            <SortableCollectionCard
              key={item.id}
              item={item}
              index={index}
              onRemove={() => onRemove(item.id)}
              onSelect={() => onSelectForInspector(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

### State Management

**Update** state handling (around line 489):

```typescript
const [presentationItems, setPresentationItems] = useState<PresentationItem[]>([]);
const [inspectorTarget, setInspectorTarget] = useState<string | null>(null);

// Convert selectedItems Set to ordered PresentationItem array
useEffect(() => {
  const items: PresentationItem[] = Array.from(selectedItems).map((id, index) => ({
    id,
    type: 'collection' as const,
    order: index,
    collectionData: {
      // Find collection data from filteredItems
      collectionName: id.replace('collection-', ''),
      vendor: vendorFilter,
      // ... other fields
    },
    properties: {
      startExpanded: false,
      showProductCount: true,
    },
  }));
  setPresentationItems(items);
}, [selectedItems]);

function handleReorder(oldIndex: number, newIndex: number) {
  setPresentationItems((items) => {
    const reordered = arrayMove(items, oldIndex, newIndex);
    // Update order numbers
    return reordered.map((item, idx) => ({ ...item, order: idx }));
  });
}
```

### Visual Feedback

Add drop zone indicators:

```typescript
// In DndContext
import { DragOverlay } from '@dnd-kit/core';

<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext items={items.map(i => i.id)}>
    {/* ... sortable items ... */}
  </SortableContext>

  <DragOverlay>
    {activeId ? (
      <div className="opacity-70 scale-105 shadow-2xl">
        {/* Render dragged item preview */}
      </div>
    ) : null}
  </DragOverlay>
</DndContext>
```

## Phase 2: Properties Inspector

### Component Structure

**New file**: `app/rep/_components/properties-inspector.tsx`

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface PropertiesInspectorProps {
  selectedItem: PresentationItem | null;
  onUpdate: (id: string, properties: Partial<PresentationItem['properties']>) => void;
  onBulkUpdate: (properties: Partial<PresentationItem['properties']>) => void;
  selectionCount: number;
}

export function PropertiesInspector({
  selectedItem,
  onUpdate,
  onBulkUpdate,
  selectionCount,
}: PropertiesInspectorProps) {
  if (!selectedItem && selectionCount === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Properties</CardTitle>
          <CardDescription className="text-xs">
            Select a collection to edit its properties
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isBulkMode = selectionCount > 1;

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Properties</span>
          {isBulkMode && (
            <Badge variant="secondary" className="text-xs">
              {selectionCount} selected
            </Badge>
          )}
        </CardTitle>
        {selectedItem && !isBulkMode && (
          <CardDescription className="text-xs">
            {selectedItem.collectionData?.collectionName}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Start Expanded Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="start-expanded" className="text-sm">
            Start Expanded
          </Label>
          <Switch
            id="start-expanded"
            checked={selectedItem?.properties.startExpanded ?? false}
            onCheckedChange={(checked) => {
              if (isBulkMode) {
                onBulkUpdate({ startExpanded: checked });
              } else if (selectedItem) {
                onUpdate(selectedItem.id, { startExpanded: checked });
              }
            }}
          />
        </div>

        {/* Show Product Count Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="show-count" className="text-sm">
            Show Product Count
          </Label>
          <Switch
            id="show-count"
            checked={selectedItem?.properties.showProductCount ?? true}
            onCheckedChange={(checked) => {
              if (isBulkMode) {
                onBulkUpdate({ showProductCount: checked });
              } else if (selectedItem) {
                onUpdate(selectedItem.id, { showProductCount: checked });
              }
            }}
          />
        </div>

        {/* Custom Notes */}
        {!isBulkMode && selectedItem && (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add notes for this collection..."
              value={selectedItem.properties.customNotes ?? ''}
              onChange={(e) => onUpdate(selectedItem.id, { customNotes: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>
        )}

        {/* Bulk Actions */}
        {isBulkMode && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Changes will apply to all {selectionCount} selected collections
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Integration into Collections Manager

**File**: `app/rep/_components/collections-manager.tsx`

Update layout to three-pane (around line 560):

```typescript
return (
  <div className="h-screen flex flex-col">
    {/* Vendor Selector - stays at top */}
    <div className="p-6 border-b">
      {/* ... existing vendor selector cards ... */}
    </div>

    {/* Three-Pane Layout */}
    <div className="flex-1 flex overflow-hidden">
      {/* Left Pane: Source Library */}
      <div className="w-80 border-r overflow-auto p-6 space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Available Collections</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Click to add to presentation
          </p>
        </div>

        {/* Search/Filter */}
        <Input
          placeholder="Search collections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />

        {/* Available Collections Grid */}
        <div className="grid grid-cols-2 gap-2">
          {availableCollections.map((item) => (
            <button
              key={item.id}
              onClick={() => addToPresentation(item.id)}
              className="relative group cursor-pointer border rounded-lg overflow-hidden hover:border-primary transition-colors"
            >
              {/* Compact thumbnail card */}
            </button>
          ))}
        </div>
      </div>

      {/* Center Pane: Presentation Canvas */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Your Presentation</h2>
              <p className="text-sm text-muted-foreground">
                Drag to reorder • Click to edit properties
              </p>
            </div>
            <Button onClick={handleCommit} disabled={!canCommit}>
              Commit {vendorName} Presentation
            </Button>
          </div>

          {presentationItems.length > 0 ? (
            <PresentationCanvas
              items={presentationItems}
              onReorder={handleReorder}
              onRemove={removeFromPresentation}
              onSelectForInspector={setInspectorTarget}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No collections selected yet</p>
              <p className="text-sm">Choose from available collections on the left</p>
            </div>
          )}

          {/* Add Section Header Button */}
          <Button
            variant="outline"
            onClick={addSectionHeader}
            className="w-full"
          >
            + Add Section Header
          </Button>
        </div>
      </div>

      {/* Right Pane: Properties Inspector */}
      <div className="w-80 border-l overflow-auto p-6">
        <PropertiesInspector
          selectedItem={presentationItems.find(i => i.id === inspectorTarget) ?? null}
          onUpdate={handlePropertyUpdate}
          onBulkUpdate={handleBulkPropertyUpdate}
          selectionCount={bulkSelectedIds.size}
        />
      </div>
    </div>
  </div>
);
```

## Phase 3: Bulk Selection

### Keyboard Shortcuts Implementation

Add to `collections-manager.tsx`:

```typescript
const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

function handleCardClick(id: string, event: React.MouseEvent) {
  // Open inspector on single click
  if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
    setInspectorTarget(id);
    setBulkSelectedIds(new Set([id]));
    setLastSelectedId(id);
    return;
  }

  // Ctrl/Cmd + Click: Toggle individual selection
  if (event.metaKey || event.ctrlKey) {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
    return;
  }

  // Shift + Click: Range selection
  if (event.shiftKey && lastSelectedId) {
    const startIndex = presentationItems.findIndex(i => i.id === lastSelectedId);
    const endIndex = presentationItems.findIndex(i => i.id === id);
    const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];

    const rangeIds = presentationItems.slice(min, max + 1).map(i => i.id);
    setBulkSelectedIds(new Set(rangeIds));
  }
}
```

### Bulk Action Bar

Add persistent action bar when items are selected:

```typescript
{bulkSelectedIds.size > 1 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
    <Card className="shadow-2xl border-2 border-primary">
      <CardContent className="p-4 flex items-center gap-4">
        <Badge variant="secondary" className="text-sm">
          {bulkSelectedIds.size} selected
        </Badge>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkSelectedIds(new Set(presentationItems.map(i => i.id)))}
          >
            Select All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkSelectedIds(new Set())}
          >
            Deselect All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkPropertyUpdate({ startExpanded: true })}
          >
            Expand All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkRemove(Array.from(bulkSelectedIds))}
          >
            Remove All
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

## Phase 4: Section Headers

### Section Header Component

**New file**: `app/rep/_components/section-header-card.tsx`

```typescript
'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface SectionHeaderCardProps {
  item: PresentationItem;
  index: number;
  onUpdate: (id: string, headerData: { title: string; subtitle?: string }) => void;
  onRemove: () => void;
}

export function SectionHeaderCard({ item, index, onUpdate, onRemove }: SectionHeaderCardProps) {
  const [isEditing, setIsEditing] = useState(!item.headerData?.title);

  return (
    <div className="col-span-full border-2 border-dashed border-primary/30 rounded-lg p-6 bg-primary/5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            Section Header
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Input
            placeholder="Section Title (e.g., 'New Arrivals')"
            value={item.headerData?.title ?? ''}
            onChange={(e) => onUpdate(item.id, {
              title: e.target.value,
              subtitle: item.headerData?.subtitle,
            })}
            className="text-lg font-semibold"
          />
          <Textarea
            placeholder="Optional subtitle..."
            value={item.headerData?.subtitle ?? ''}
            onChange={(e) => onUpdate(item.id, {
              title: item.headerData?.title ?? '',
              subtitle: e.target.value,
            })}
            rows={2}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={!item.headerData?.title}
          >
            Done
          </Button>
        </div>
      ) : (
        <div onClick={() => setIsEditing(true)} className="cursor-pointer">
          <h3 className="text-xl font-bold">{item.headerData?.title}</h3>
          {item.headerData?.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {item.headerData.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

### Add Section Handler

```typescript
function addSectionHeader() {
  const newHeader: PresentationItem = {
    id: `section_${Date.now()}`,
    type: 'section_header',
    order: presentationItems.length,
    headerData: {
      title: '',
      subtitle: '',
    },
    properties: {
      startExpanded: false,
      showProductCount: false,
    },
  };

  setPresentationItems((items) => [...items, newHeader]);
}
```

## Phase 5: Customer Display Integration

### Update Collections Tab Client

**File**: `app/customers/[id]/_components/collections-tab-client.tsx`

Respect `startExpanded` property:

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function CollectionsTabClient({
  sortedCollections,
  presentationItems, // NEW: Pass presentation items with properties
}: {
  sortedCollections: Array<[string, CollectionProduct[]]>;
  presentationItems?: PresentationItem[];
}) {
  // Map presentation properties to expandedCollections state
  const initialExpanded = new Set(
    presentationItems
      ?.filter(item => item.properties.startExpanded)
      .map(item => item.collectionData?.collectionName)
      .filter(Boolean) ?? []
  );

  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(initialExpanded);

  // Render section headers
  const renderItem = (item: PresentationItem, products?: CollectionProduct[]) => {
    if (item.type === 'section_header') {
      return (
        <div className="my-8 border-b-2 pb-4">
          <h2 className="text-3xl font-bold">{item.headerData?.title}</h2>
          {item.headerData?.subtitle && (
            <p className="text-lg text-muted-foreground mt-2">
              {item.headerData.subtitle}
            </p>
          )}
        </div>
      );
    }

    // Render collection with products
    const isExpanded = expandedCollections.has(item.collectionData?.collectionName ?? '');

    return (
      <CollectionSection
        key={item.id}
        collection={item.collectionData?.collectionName ?? ''}
        products={products ?? []}
        isExpanded={isExpanded}
        onToggle={() => toggleCollection(item.collectionData?.collectionName ?? '')}
        showProductCount={item.properties.showProductCount}
      />
    );
  };

  // Render presentation items in order
  return (
    <div className="space-y-6">
      {presentationItems?.map((item) => {
        const products = sortedCollections.find(
          ([name]) => name === item.collectionData?.collectionName
        )?.[1];
        return renderItem(item, products);
      })}
    </div>
  );
}
```

### Update Collections Tab Server

**File**: `app/customers/[id]/_components/collections-tab.tsx`

Pass presentation items to client:

```typescript
// After filtering collections, get presentation items
const promotion = await getPromotionConfig(undefined, vendorFilter);
const presentationItems = promotion?.presentationItems ?? [];

// If no presentation items, create default from collections
const itemsToPass = presentationItems.length > 0
  ? presentationItems
  : filteredCollections.map(([name], index) => ({
      id: `collection-${name}`,
      type: 'collection' as const,
      order: index,
      collectionData: {
        collectionName: name,
        vendor: vendorFilter ?? '',
      },
      properties: {
        startExpanded: false,
        showProductCount: true,
      },
    }));

return (
  <CollectionsTabClient
    sortedCollections={sortedCollections}
    presentationItems={itemsToPass}
    customerId={customer.id}
    authorizedVendors={authorizedVendors}
    selectedVendor={vendorFilter}
  />
);
```

## API Route Updates

### Update Save Endpoint

**File**: `app/api/rep/collections/route.ts`

Update POST handler to save presentation items:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, presentationItems, vendor } = body;

    console.log('[POST /api/rep/collections] Received request:');
    console.log('  vendor:', vendor);
    console.log('  customerId:', customerId);
    console.log('  presentationItems:', JSON.stringify(presentationItems, null, 2));

    if (!presentationItems || !Array.isArray(presentationItems)) {
      return NextResponse.json({ error: 'Presentation items array is required' }, { status: 400 });
    }

    // Validate all items
    for (const item of presentationItems) {
      if (item.type === 'collection' && item.collectionData?.vendor !== vendor) {
        return NextResponse.json({
          error: `Cannot save: Collection "${item.collectionData?.collectionName}" belongs to vendor "${item.collectionData?.vendor}", not "${vendor}"`
        }, { status: 400 });
      }
    }

    const promotion = await savePromotionConfig(customerId, presentationItems, vendor);

    console.log('[POST /api/rep/collections] Saved promotion:');
    console.log('  id:', promotion.id);
    console.log('  vendor:', promotion.vendor);
    console.log('  presentationItems:', JSON.stringify(promotion.presentationItems, null, 2));

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error saving promotion config:', error);
    return NextResponse.json({ error: 'Failed to save promotion config' }, { status: 500 });
  }
}
```

### Update Store Functions

**File**: `lib/selections/store.ts`

Update save function signature:

```typescript
export async function savePromotionConfig(
  customerId: string | undefined,
  presentationItems: PresentationItem[],
  vendor?: string
): Promise<PromotionConfig> {
  noStore();
  const promotions = await loadPromotions();

  const existingIndex = promotions.findIndex(
    (p) =>
      (customerId ? p.customerId === customerId : !p.customerId) &&
      (!vendor || p.vendor === vendor)
  );

  const config: PromotionConfig = {
    id: existingIndex >= 0 ? promotions[existingIndex].id : `promo_${Date.now()}`,
    customerId,
    vendor,
    presentationItems,
    // Keep backward compatibility with collections array
    collections: presentationItems
      .filter(item => item.type === 'collection')
      .map(item => ({
        collectionName: item.collectionData!.collectionName,
        includeAllYears: true,
      })),
    createdAt: existingIndex >= 0 ? promotions[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    promotions[existingIndex] = config;
  } else {
    promotions.push(config);
  }

  await fs.writeFile(
    path.join(process.cwd(), 'data', 'promotions.json'),
    JSON.stringify(promotions, null, 2)
  );

  return config;
}
```

## Testing Strategy

### Manual Testing Checklist

**Phase 1: Drag-and-Drop**
- [ ] Collections can be dragged to reorder
- [ ] Visual feedback during drag (opacity, drop indicators)
- [ ] Order persists after save
- [ ] Keyboard navigation works (tab, arrow keys, space/enter)
- [ ] Mobile: long-press drag works on touch devices

**Phase 2: Properties Inspector**
- [ ] Clicking collection opens inspector
- [ ] "Start Expanded" toggle updates state
- [ ] Changes persist after save
- [ ] Customer view respects startExpanded property
- [ ] Notes field saves correctly

**Phase 3: Bulk Selection**
- [ ] Shift+click selects range
- [ ] Cmd/Ctrl+click toggles individual items
- [ ] Action bar appears with correct count
- [ ] "Select All" / "Deselect All" work
- [ ] Bulk property changes apply to all selected

**Phase 4: Section Headers**
- [ ] "Add Section Header" button works
- [ ] Headers can be edited inline
- [ ] Headers appear in customer view
- [ ] Headers can be reordered with collections
- [ ] Headers can be removed

**Phase 5: Customer Display**
- [ ] Section headers render correctly
- [ ] Collections start expanded when configured
- [ ] Product count shows/hides based on property
- [ ] Presentation order matches rep configuration

### Automated Tests

**File**: `tests/presentation-builder.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Presentation Builder', () => {
  test('should reorder collections via drag-and-drop', async ({ page }) => {
    await page.goto('/rep');
    await page.click('text=Lib & Co');
    await page.click('text=Adelfia');
    await page.click('text=Calcolo');

    // Drag Calcolo above Adelfia
    const calcolo = page.locator('text=Calcolo').first();
    const adelfia = page.locator('text=Adelfia').first();

    await calcolo.dragTo(adelfia);

    // Verify order changed
    const firstCard = page.locator('[data-presentation-order="1"]');
    await expect(firstCard).toContainText('Calcolo');
  });

  test('should apply start expanded property', async ({ page }) => {
    await page.goto('/rep');
    await page.click('text=Lib & Co');
    await page.click('text=Adelfia');

    // Click card to open inspector
    await page.click('text=Adelfia');

    // Toggle start expanded
    await page.click('label:has-text("Start Expanded")');

    // Save
    await page.click('button:has-text("Commit")');

    // Navigate to customer view
    await page.goto('/customers/test-customer?tab=collections&vendor=lib-and-co');

    // Verify Adelfia is expanded
    const adelfiaSection = page.locator('text=Adelfia').first();
    const products = adelfiaSection.locator('~ div [data-testid="product-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should support bulk selection and actions', async ({ page }) => {
    await page.goto('/rep');
    await page.click('text=Lib & Co');
    await page.click('text=Adelfia');
    await page.click('text=Calcolo');
    await page.click('text=Corato');

    // Select all via Shift+click
    await page.click('text=Adelfia');
    await page.keyboard.down('Shift');
    await page.click('text=Corato');
    await page.keyboard.up('Shift');

    // Verify action bar appears
    await expect(page.locator('text=3 selected')).toBeVisible();

    // Bulk expand
    await page.click('button:has-text("Expand All")');

    // Verify all have expanded property
    const inspector = page.locator('[data-testid="properties-inspector"]');
    await expect(inspector).toContainText('3 selected');
  });
});
```

## Implementation Timeline

### Sprint 1: Foundation (Week 1)
- Install @dnd-kit dependencies
- Refactor state from Set to PresentationItem array
- Implement basic drag-and-drop in presentation canvas
- Update save endpoint to accept presentation items
- Backward compatibility: read old collections format

### Sprint 2: Properties & Inspection (Week 2)
- Build PropertiesInspector component
- Add click-to-select for single item editing
- Implement startExpanded toggle
- Update customer display to respect properties
- Add visual indicators on cards for active properties

### Sprint 3: Bulk Operations (Week 3)
- Implement keyboard shortcuts (Shift, Cmd/Ctrl)
- Build bulk action bar
- Add "Select All" / "Deselect All"
- Bulk property editing
- Visual selection state on cards

### Sprint 4: Section Headers (Week 4)
- Create SectionHeaderCard component
- Add "Add Section Header" button
- Inline editing UI
- Render headers in customer view
- Sort headers with collections in drag-and-drop

### Sprint 5: Polish & Testing (Week 5)
- Mobile touch drag support
- Loading states during save
- Error handling for failed saves
- Playwright test suite
- Performance optimization (virtualization for large catalogs)
- Documentation updates

## Success Metrics

1. **Rep Efficiency**
   - Time to create presentation: < 5 minutes (vs. 15 minutes list-based)
   - Collections reordered per session: 3-5x increase
   - Properties configured per collection: 80%+ adoption

2. **Customer Engagement**
   - Time on collections page: +40%
   - Collections expanded: +60% (via startExpanded)
   - Products viewed per session: +50%

3. **Technical Performance**
   - Page load time: < 2s
   - Drag-and-drop latency: < 50ms
   - Save operation: < 1s

## Future Enhancements

### Phase 6: Advanced Features

1. **Shoppable Hotspots** (Q2 2025)
   - Click specific SKU in hero video thumbnail
   - Product modal with add-to-cart
   - Video timestamp links

2. **AI-Powered Recommendations** (Q3 2025)
   - "Suggested Collections" based on customer history
   - Auto-expand high-engagement collections
   - Dynamic section headers based on customer segment

3. **Collaboration** (Q4 2025)
   - Multiple reps edit same presentation
   - Comment threads on collections
   - Approval workflows for large accounts

4. **Analytics Dashboard** (Q4 2025)
   - Which collections are most viewed
   - Where customers drop off
   - Optimize presentation order based on data

## Conclusion

This enhancement plan transforms the Collections Manager from a simple list curator into a powerful presentation builder that enables reps to create engaging, strategically ordered customer experiences. The phased approach ensures incremental value delivery while maintaining system stability.

**Next Step**: Begin Sprint 1 implementation with drag-and-drop foundation.
