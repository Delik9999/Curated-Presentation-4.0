# Product Finish Variants System - Implementation Plan

## Overview
Add finish variant selection to product cards, allowing users to switch between different finishes (e.g., Matte Black, Gold, Chrome) of the same base product. The image and SKU will update dynamically based on the selected finish.

---

## Problem Statement

Currently, each SKU variant (e.g., `12121-02`, `12121-030`) is displayed as a separate product card. This creates a cluttered catalog experience where the same product appears multiple times with different finishes.

### Current State:
- `12121-02` - Calcolo, 9 Light Round LED Chandelier, **Matte Black** - $5,003
- `12121-030` - Calcolo, 9 Light Round LED Chandelier, **Painted Antique Brass** - $5,003

Both appear as separate cards in the collection grid.

### Desired State:
One product card for "Calcolo, 9 Light Round LED Chandelier" with:
- Finish selector buttons (Matte Black, Painted Antique Brass)
- Image updates when finish is clicked
- SKU updates to reflect selected finish
- "Add to Selection" button

---

## Data Model

### SKU Structure
Lib&Co SKUs follow this pattern:
- **Base SKU**: `12121` (5-digit product identifier)
- **Finish Code**: `-02`, `-030`, `-01`, etc.
- **Full SKU**: `12121-02`

### Finish Codes (from LibSpecs.json data)
Common finish codes observed:
- `-01` - Chrome / Polished Chrome
- `-02` - Matte Black
- `-03` - Brass (various)
- `-030` - Painted Antique Brass
- `-031` - Painted Brushed Brass
- `-04` - Bronze
- `-05` - Silver

### Product Grouping Strategy

Products should be grouped by:
1. **Base SKU** (first 5 digits before the dash)
2. **Product dimensions/configuration** (to distinguish 9-light vs 19-light versions)

Example grouping:
```typescript
{
  baseSku: "12121",
  baseProductName: "Calcolo, 9 Light Round LED Chandelier",
  variants: [
    {
      sku: "12121-02",
      finish: "Matte Black",
      finishCode: "02",
      price: 5003,
      imageUrl: "https://libandco.com/cdn/shop/files/12121-02.jpg?v=1"
    },
    {
      sku: "12121-030",
      finish: "Painted Antique Brass",
      finishCode: "030",
      price: 5003,
      imageUrl: "https://libandco.com/cdn/shop/files/12121-030.jpg?v=1"
    }
  ]
}
```

---

## UI Design

### Product Card with Finish Selector

```
┌────────────────────────────────────┐
│                                    │
│         [Product Image]            │
│                                    │
├────────────────────────────────────┤
│  Collection Badge                  │
│                                    │
│  Product Name (2 lines max)        │
│                                    │
│  SKU: 12121-02                     │
│                                    │
│  ┌────┐ ┌────┐ ┌────┐             │
│  │ MB │ │ AB │ │ CR │  Finish     │
│  └────┘ └────┘ └────┘             │
│  (Matte Black selected)            │
│                                    │
│  WSP            $5,003.00          │
│                                    │
│  [➕ Add to Selection]             │
└────────────────────────────────────┘
```

### Finish Selector Component
- **Visual style**: Small circular or square buttons
- **Hover**: Tooltip showing full finish name
- **Active state**: Primary border + darker background
- **Abbreviations** (max 2-3 chars):
  - MB = Matte Black
  - AB = Antique Brass
  - CR = Chrome
  - BR = Bronze
  - etc.

---

## Technical Implementation

### Phase 1: Data Processing

#### 1.1 Create Variant Grouping Utility

**File**: `lib/catalog/groupVariants.ts`

```typescript
export interface ProductVariant {
  sku: string;
  finish: string;
  finishCode: string;
  price: number;
  imageUrl: string;
  fullProductName: string; // Original name from LibSpecs
}

export interface ProductWithVariants {
  baseSku: string;
  baseProductName: string; // Name without finish (e.g., "Calcolo, 9 Light Round LED Chandelier")
  collection: string;
  variants: ProductVariant[];
  defaultVariant: ProductVariant; // First variant in list
}

export function groupProductsByVariants(
  products: Array<{ sku: string; name: string; list: number }>
): ProductWithVariants[] {
  // 1. Extract base SKU (everything before last dash)
  // 2. Extract finish from product name (last part after comma)
  // 3. Group products with same base SKU + base name
  // 4. Return array of grouped products
}

export function extractBaseSku(sku: string): string {
  const lastDashIndex = sku.lastIndexOf('-');
  return lastDashIndex > 0 ? sku.substring(0, lastDashIndex) : sku;
}

export function extractFinishFromName(name: string): string {
  // "Calcolo, 9 Light Round LED Chandelier, Matte Black"
  // Returns: "Matte Black"
  const parts = name.split(',').map(s => s.trim());
  return parts[parts.length - 1] || 'Standard';
}

export function extractBaseProductName(name: string): string {
  // "Calcolo, 9 Light Round LED Chandelier, Matte Black"
  // Returns: "Calcolo, 9 Light Round LED Chandelier"
  const parts = name.split(',');
  return parts.slice(0, -1).join(',').trim();
}

export function getFinishAbbreviation(finish: string): string {
  const abbreviations: Record<string, string> = {
    'Matte Black': 'MB',
    'Matte black': 'MB',
    'Painted Antique Brass': 'AB',
    'Antique Brass': 'AB',
    'Painted Brushed Brass': 'BB',
    'Brushed Brass': 'BB',
    'Chrome': 'CR',
    'Polished Chrome': 'CR',
    'Bronze': 'BZ',
    'Oil Rubbed Bronze': 'ORB',
    'Brushed Nickel': 'BN',
    'Polished Nickel': 'PN',
    'Silver': 'SV',
    'Gold': 'GD',
    'White': 'WH',
    'Black': 'BK',
  };

  return abbreviations[finish] || finish.substring(0, 2).toUpperCase();
}
```

---

### Phase 2: Update Collections Tab

#### 2.1 Modify `collections-tab.tsx`

**File**: `app/customers/[id]/_components/collections-tab.tsx`

```typescript
import { groupProductsByVariants } from '@/lib/catalog/groupVariants';

export default async function CollectionsTab({ customer }: { customer: Customer }) {
  const catalog = await loadCatalog();

  // Group products by variants BEFORE grouping by collection
  const productsWithVariants = groupProductsByVariants(catalog);

  // Group by collection
  const groupedByCollection: Record<string, typeof productsWithVariants> = {};
  productsWithVariants.forEach((product) => {
    const collectionName = product.collection;
    if (!groupedByCollection[collectionName]) {
      groupedByCollection[collectionName] = [];
    }
    groupedByCollection[collectionName].push(product);
  });

  // ... rest of component

  return (
    <AccordionContent className="px-6 py-8 bg-neutral-50">
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((product, itemIndex) => (
          <ProductCard
            key={product.baseSku}
            // Pass full product with variants
            productWithVariants={product}
            customerName={customer.name}
            index={itemIndex}
          />
        ))}
      </div>
    </AccordionContent>
  );
}
```

---

### Phase 3: Enhance Product Card Component

#### 3.1 Add Variant Support to `ProductCard`

**File**: `components/ui/product-card-modern.tsx`

```typescript
'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge-modern';
import { Button } from '@/components/ui/button-modern';
import { ProductWithVariants } from '@/lib/catalog/groupVariants';
import { getFinishAbbreviation } from '@/lib/catalog/groupVariants';

export interface ProductCardProps {
  productWithVariants: ProductWithVariants;
  index?: number;
  customerName?: string;
  onAddToSelection?: (sku: string) => void;
}

export function ProductCard({
  productWithVariants,
  index = 0,
  customerName,
  onAddToSelection,
}: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = React.useState(
    productWithVariants.defaultVariant
  );
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [hoveredFinish, setHoveredFinish] = React.useState<string | null>(null);

  // Reset image loading state when variant changes
  React.useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [selectedVariant.sku]);

  const handleAddToSelection = () => {
    if (onAddToSelection) {
      onAddToSelection(selectedVariant.sku);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all shadow-sm hover:shadow-md"
    >
      {/* Image Section */}
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedVariant.sku}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {selectedVariant.imageUrl && !imageError ? (
              <>
                <img
                  src={selectedVariant.imageUrl}
                  alt={selectedVariant.fullProductName}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={cn(
                    'h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                <span className="text-4xl font-bold text-neutral-400">
                  {productWithVariants.baseSku}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content Section */}
      <div className="relative z-10 flex flex-1 flex-col gap-3 p-5">
        {/* Collection Badge */}
        <Badge variant="outline" className="w-fit text-xs">
          {productWithVariants.collection}
        </Badge>

        {/* Product Name */}
        <h3 className="text-lg font-semibold text-neutral-900 line-clamp-2 group-hover:text-primary-700 transition-colors">
          {productWithVariants.baseProductName}
        </h3>

        {/* SKU */}
        <p className="text-sm text-neutral-500">
          <span className="font-medium">SKU:</span> {selectedVariant.sku}
        </p>

        {/* Finish Selector */}
        {productWithVariants.variants.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Finish
            </p>
            <div className="flex flex-wrap gap-2">
              {productWithVariants.variants.map((variant) => {
                const isSelected = variant.sku === selectedVariant.sku;
                const abbreviation = getFinishAbbreviation(variant.finish);

                return (
                  <button
                    key={variant.sku}
                    onClick={() => setSelectedVariant(variant)}
                    onMouseEnter={() => setHoveredFinish(variant.finish)}
                    onMouseLeave={() => setHoveredFinish(null)}
                    className={cn(
                      'relative flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all',
                      isSelected
                        ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                    )}
                    aria-label={variant.finish}
                  >
                    {abbreviation}

                    {/* Tooltip on hover */}
                    {hoveredFinish === variant.finish && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white shadow-lg z-50"
                      >
                        {variant.finish}
                        {/* Arrow */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-neutral-900" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-neutral-600 italic">
              {selectedVariant.finish}
            </p>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-2 border-t border-neutral-100">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-neutral-500">WSP</span>
            <span className="text-xl font-bold text-neutral-900">
              {selectedVariant.price.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}
            </span>
          </div>
        </div>

        {/* Add to Selection Button */}
        <Button
          onClick={handleAddToSelection}
          className="w-full mt-2"
          size="sm"
          variant="default"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add to Selection
        </Button>
      </div>

      {/* Hover Accent Bar */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary-500 to-accent-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.article>
  );
}
```

---

### Phase 4: Selection Integration

#### 4.1 Create Selection Context/Hook

**File**: `lib/selections/useAddToSelection.ts`

```typescript
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export function useAddToSelection(customerId: string) {
  const router = useRouter();
  const [isAdding, setIsAdding] = React.useState(false);

  const addToSelection = async (sku: string) => {
    setIsAdding(true);

    try {
      // Get current selection ID from localStorage or create new one
      const selectionId = localStorage.getItem(`current-selection-${customerId}`) ||
                          `sel-${Date.now()}`;

      // Add item to selection via API
      const response = await fetch(`/api/customers/${customerId}/selections/${selectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          qty: 1,
        }),
      });

      if (!response.ok) throw new Error('Failed to add to selection');

      // Store selection ID for later
      localStorage.setItem(`current-selection-${customerId}`, selectionId);

      // Show success toast (if implemented)
      console.log(`Added ${sku} to selection`);

      // Optionally refresh data
      router.refresh();
    } catch (error) {
      console.error('Failed to add to selection:', error);
      alert('Failed to add item to selection');
    } finally {
      setIsAdding(false);
    }
  };

  return { addToSelection, isAdding };
}
```

#### 4.2 Wire Up Collections Tab

**File**: `app/customers/[id]/_components/collections-tab.tsx`

```typescript
'use client';

import { useAddToSelection } from '@/lib/selections/useAddToSelection';

export default function CollectionsTab({ customer }: { customer: Customer }) {
  const { addToSelection, isAdding } = useAddToSelection(customer.id);

  return (
    // ... existing accordion code
    <ProductCard
      productWithVariants={product}
      customerName={customer.name}
      index={itemIndex}
      onAddToSelection={addToSelection}
    />
  );
}
```

---

## Implementation Checklist

### Phase 1: Data Layer (Core Functionality)
- [ ] Create `lib/catalog/groupVariants.ts` utility
- [ ] Implement `extractBaseSku()` function
- [ ] Implement `extractFinishFromName()` function
- [ ] Implement `extractBaseProductName()` function
- [ ] Implement `getFinishAbbreviation()` function
- [ ] Implement `groupProductsByVariants()` function
- [ ] Write unit tests for grouping logic
- [ ] Test with real LibSpecs.json data

### Phase 2: UI Components
- [ ] Update `ProductCard` component to accept `productWithVariants` prop
- [ ] Add finish selector button UI
- [ ] Implement variant state management (useState for selectedVariant)
- [ ] Add image transition animation when variant changes
- [ ] Add finish tooltip on hover
- [ ] Style active/inactive finish buttons
- [ ] Add "Add to Selection" button
- [ ] Remove "Featured for {customerName}" text (lines 125-129)

### Phase 3: Collections Tab Integration
- [ ] Update `collections-tab.tsx` to use `groupProductsByVariants()`
- [ ] Pass grouped products to ProductCard
- [ ] Test that collections still display correctly
- [ ] Verify product count is correct (should be lower now)

### Phase 4: Selection System
- [ ] Create `useAddToSelection` hook
- [ ] Implement localStorage-based selection tracking
- [ ] Create API endpoint `/api/customers/[id]/selections/[selectionId]/items` (POST)
- [ ] Wire up "Add to Selection" button click handler
- [ ] Add loading state to button while adding
- [ ] Show success feedback (toast notification)
- [ ] Handle errors gracefully

### Phase 5: Testing & Polish
- [ ] Test with products that have 1 variant (should hide finish selector)
- [ ] Test with products that have 2+ variants
- [ ] Test image loading states for each variant
- [ ] Test on mobile (finish buttons should wrap properly)
- [ ] Test keyboard navigation (Tab through finish buttons)
- [ ] Verify CDN image URLs are correct for all finishes
- [ ] Test "Add to Selection" with different products
- [ ] Verify selection persists across page refreshes

### Phase 6: Edge Cases
- [ ] Handle products with missing finish information
- [ ] Handle products with malformed SKUs
- [ ] Handle CDN image 404s for certain finishes
- [ ] Test with products that have 5+ finishes
- [ ] Ensure abbreviations are unique within a product

---

## Example Data Flow

### Input (from LibSpecs.json):
```json
[
  {
    "sku": "12121-02",
    "name": "Calcolo, 9 Light Round LED Chandelier, Matte Black",
    "list": 5003,
    "image": null
  },
  {
    "sku": "12121-030",
    "name": "Calcolo, 9 Light Round LED Chandelier, Painted Antique Brass",
    "list": 5003,
    "image": null
  }
]
```

### After `groupProductsByVariants()`:
```typescript
[
  {
    baseSku: "12121",
    baseProductName: "Calcolo, 9 Light Round LED Chandelier",
    collection: "Calcolo",
    variants: [
      {
        sku: "12121-02",
        finish: "Matte Black",
        finishCode: "02",
        price: 5003,
        imageUrl: "https://libandco.com/cdn/shop/files/12121-02.jpg?v=1",
        fullProductName: "Calcolo, 9 Light Round LED Chandelier, Matte Black"
      },
      {
        sku: "12121-030",
        finish: "Painted Antique Brass",
        finishCode: "030",
        price: 5003,
        imageUrl: "https://libandco.com/cdn/shop/files/12121-030.jpg?v=1",
        fullProductName: "Calcolo, 9 Light Round LED Chandelier, Painted Antique Brass"
      }
    ],
    defaultVariant: { /* first variant */ }
  }
]
```

### Rendered UI:
One product card showing:
- Image of `12121-02` (default)
- Finish buttons: [MB] [AB]
- When user clicks [AB], image updates to `12121-030.jpg`
- SKU updates to `12121-030`
- "Add to Selection" button adds `12121-030` to cart

---

## Benefits

1. **Cleaner Catalog**: Reduces visual clutter by consolidating variants
2. **Better UX**: Users can browse finishes without scrolling through duplicates
3. **E-commerce Standard**: Matches how most online stores handle product variants
4. **Faster Selection**: Add button right on the card (no need to navigate away)
5. **Clear SKU Tracking**: Selected SKU is always visible
6. **Smooth Transitions**: Framer Motion animations make finish changes feel polished

---

## Future Enhancements

1. **Swatch Colors**: Show actual finish colors instead of abbreviations
2. **Bulk Add**: "Add all finishes" button
3. **Recently Viewed Finishes**: Remember user's preferred finishes
4. **Filter by Finish**: Allow filtering collection by available finishes
5. **Compare Variants**: Side-by-side comparison of multiple finishes
6. **Stock Availability**: Show which finishes are in stock
7. **Finish Recommendations**: "Most Popular" or "Staff Pick" badges

---

## Migration Notes

- **Backward Compatible**: Existing single-variant products work unchanged
- **No Database Changes**: All processing happens at data load time
- **No API Changes**: Selection endpoints remain the same (just receive different SKUs)
- **Gradual Rollout**: Can be enabled per collection or customer

---

**Next Step**: Get approval on this plan, then implement Phase 1 (Data Layer) to validate the grouping logic with real data.
