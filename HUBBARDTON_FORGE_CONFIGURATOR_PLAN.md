# Hubbardton Forge Multi-Option Configurator Implementation Plan

## Overview

This document outlines the implementation plan for transforming Hubbardton Forge products from individual SKU listings into configurable products with multiple option selectors.

### Current Problem

Hubbardton Forge products have multiple finish options that create large SKU combination sets:

**Example: Coral Table Lamp (Base Item: 402749)**
- 11 Finish options × 11 Accent Finish options = 121 SKU variants
- Current system creates 121 separate catalog items
- User sees 121 individual products in the collection view

### Desired Behavior

- Show 1 base product: "Coral Table Lamp"
- Display configurator UI with:
  - **Finish** dropdown (11 options)
  - **Accent Finish** dropdown (11 options)
  - Shade/glass information display
- Generate final SKU based on selected options
- Add configured product to selection

---

## Phase 1: Data Structure Changes

### 1.1 Update CatalogItem Type

**File:** `lib/catalog/loadCatalog.ts`

Add new fields to support configurator products:

```typescript
export type CatalogItem = {
  sku: string;
  name: string;
  list: number;
  image: string | null;
  collectionName?: string;
  year?: number;
  vendor?: string;

  // Existing single-option variant fields
  finish?: string;
  baseItemCode?: string;

  // NEW: Multi-option configurator fields
  isConfigurable?: boolean;              // Flag for configurable products
  configuratorOptions?: ConfiguratorOption[];  // Available option sets
  skuVariants?: SkuVariant[];           // All possible SKU combinations
  shadeInfo?: string;                    // Shade/glass description
};

export type ConfiguratorOption = {
  optionName: string;           // e.g., "Finish", "Accent Finish"
  optionType: 'finish' | 'accent-finish' | 'glass' | 'canopy' | 'other';
  values: string[];             // e.g., ["Black", "Bronze", "Dark Smoke", ...]
  required: boolean;            // Is this option required?
};

export type SkuVariant = {
  sku: string;                  // Full SKU code
  optionCombination: Record<string, string>;  // e.g., { "Finish": "Bronze", "Accent Finish": "White" }
  price?: number;               // Price override if different from base
};
```

### 1.2 Update Hubbardton Forge Loader

**File:** `lib/catalog/loadHubbardton.ts`

Transform the loader to group products by Base Item / Design ID and extract options:

```typescript
export async function loadHubbardtonForgeCatalog(): Promise<CatalogItem[]> {
  const filePath = path.join(process.cwd(), 'data', 'hubbardtonspecs.json');

  try {
    const file = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(file) as Record<string, HubbardtonSpecRecord>;

    // Group products by Base Item / Design ID
    const groupedByBase = new Map<string, HubbardtonSpecRecord[]>();

    for (const [sku, record] of Object.entries(data)) {
      const baseItem = record['Base Item / Design ID'] || record['Part Num'];
      const collectionName = record['Family']?.trim();

      // Skip products without a collection
      if (!collectionName) continue;

      if (!groupedByBase.has(baseItem)) {
        groupedByBase.set(baseItem, []);
      }
      groupedByBase.get(baseItem)!.push({ ...record, 'Part Num': sku });
    }

    const catalogItems: CatalogItem[] = [];

    // Process each base item group
    for (const [baseItem, variants] of groupedByBase.entries()) {
      if (variants.length === 0) continue;

      const baseRecord = variants[0];
      const baseName = baseRecord['Product Name'] || '';
      const list = parsePrice(baseRecord['Internet/MAPP Price (CAD)'] || '0');
      const collectionName = baseRecord['Family']?.trim();
      const year = extractYearFromIntroYear(baseRecord['Intro Year']);

      // Check if this is a multi-option product
      const hasMultipleFinishes = variants.length > 1;

      if (hasMultipleFinishes) {
        // Extract unique option values
        const finishOptions = extractUniqueOptions(variants, 'Finish');
        const accentFinishOptions = extractUniqueOptions(variants, 'Accent Finish');

        // Determine if this is a multi-option configurator (multiple option types)
        const isMultiOption = finishOptions.length > 1 && accentFinishOptions.length > 1;

        if (isMultiOption) {
          // Create configurable product
          catalogItems.push({
            sku: baseItem,
            name: baseName,
            list,
            image: null,
            collectionName,
            year,
            vendor: 'hubbardton-forge',
            baseItemCode: baseItem,
            isConfigurable: true,
            shadeInfo: baseRecord['Shade'] || baseRecord['Glass'] || undefined,
            configuratorOptions: [
              {
                optionName: 'Finish',
                optionType: 'finish',
                values: finishOptions,
                required: true,
              },
              {
                optionName: 'Accent Finish',
                optionType: 'accent-finish',
                values: accentFinishOptions,
                required: true,
              },
            ],
            skuVariants: variants.map(v => ({
              sku: v['Part Num'],
              optionCombination: {
                'Finish': v['Finish']?.trim() || '',
                'Accent Finish': v['Accent Finish']?.trim() || '',
              },
              price: parsePrice(v['Internet/MAPP Price (CAD)'] || '0'),
            })),
          });
        } else {
          // Single-option variant (existing behavior for simple finish variants)
          for (const variant of variants) {
            catalogItems.push({
              sku: variant['Part Num'],
              name: `${baseName} - ${variant['Finish']}`,
              list: parsePrice(variant['Internet/MAPP Price (CAD)'] || '0'),
              image: null,
              collectionName,
              year,
              vendor: 'hubbardton-forge',
              finish: variant['Finish']?.trim(),
              baseItemCode: baseItem,
            });
          }
        }
      } else {
        // Single product with no variants
        catalogItems.push({
          sku: baseRecord['Part Num'],
          name: baseName,
          list,
          image: null,
          collectionName,
          year,
          vendor: 'hubbardton-forge',
        });
      }
    }

    return catalogItems;
  } catch (error) {
    console.error(`Failed to load Hubbardton Forge catalog: ${(error as Error).message}`);
    return [];
  }
}

// Helper function to extract unique option values
function extractUniqueOptions(
  variants: HubbardtonSpecRecord[],
  fieldName: keyof HubbardtonSpecRecord
): string[] {
  const options = new Set<string>();

  for (const variant of variants) {
    const value = variant[fieldName];
    if (value && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        options.add(trimmed);
      }
    }
  }

  return Array.from(options).sort();
}
```

---

## Phase 2: Configurator UI Component

### 2.1 Create Finish Color Mapping (Optional Enhancement)

**New File:** `lib/catalog/finishColors.ts`

Map finish names to visual color codes for swatches:

```typescript
export const FINISH_COLORS: Record<string, string> = {
  // Hubbardton Forge finishes
  'Black': '#000000',
  'Bronze': '#8B4513',
  'Dark Smoke': '#2F2F2F',
  'Ink': '#1A1A2E',
  'Modern Brass': '#B5A642',
  'Natural Iron': '#5A5A5A',
  'Oil Rubbed Bronze': '#4A3728',
  'Soft Gold': '#D4AF37',
  'Sterling': '#C0C0C0',
  'Vintage Platinum': '#9B9B9B',
  'White': '#FFFFFF',

  // Add more finishes as needed
};

export function getFinishColor(finishName: string): string | null {
  return FINISH_COLORS[finishName] || null;
}
```

### 2.2 Create FinishSwatch Component

**New File:** `components/product/finish-swatch.tsx`

Visual color swatch for finish options:

```typescript
'use client';

import { cn } from '@/lib/utils';
import { getFinishColor } from '@/lib/catalog/finishColors';

interface FinishSwatchProps {
  finishName: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function FinishSwatch({
  finishName,
  selected = false,
  onClick,
  size = 'md'
}: FinishSwatchProps) {
  const color = getFinishColor(finishName);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border-2 transition-all',
        sizeClasses[size],
        selected
          ? 'border-blue-600 ring-2 ring-blue-200'
          : 'border-gray-300 hover:border-gray-400',
        onClick && 'cursor-pointer'
      )}
      style={{ backgroundColor: color || '#E5E5E5' }}
      title={finishName}
      aria-label={finishName}
    >
      {!color && (
        <span className="text-xs text-gray-600">{finishName.charAt(0)}</span>
      )}
    </button>
  );
}
```

### 2.3 Create Enhanced ConfiguratorDialog Component

**New File:** `components/product/configurator-dialog.tsx`

Enhanced configurator with visual swatches, live SKU display, and better layout:

```typescript
'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FinishSwatch } from './finish-swatch';
import type { CatalogItem, ConfiguratorOption } from '@/lib/catalog/loadCatalog';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ConfiguratorDialogProps {
  product: CatalogItem;
  open: boolean;
  onClose: () => void;
  onAddToSelection: (sku: string, configuration: Record<string, string>) => void;
}

export function ConfiguratorDialog({
  product,
  open,
  onClose,
  onAddToSelection,
}: ConfiguratorDialogProps) {
  // State for selected options
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Find matching SKU based on selected options
  const matchingSku = useMemo(() => {
    if (!product.skuVariants) return null;

    const variant = product.skuVariants.find(v => {
      return Object.entries(selectedOptions).every(
        ([optionName, value]) => v.optionCombination[optionName] === value
      );
    });

    return variant || null;
  }, [selectedOptions, product.skuVariants]);

  // Check if all required options are selected
  const isComplete = useMemo(() => {
    if (!product.configuratorOptions) return false;

    return product.configuratorOptions
      .filter(opt => opt.required)
      .every(opt => selectedOptions[opt.optionName]);
  }, [selectedOptions, product.configuratorOptions]);

  // Calculate price range if prices vary
  const priceRange = useMemo(() => {
    if (!product.skuVariants || product.skuVariants.length === 0) {
      return { min: product.list, max: product.list, varies: false };
    }

    const prices = product.skuVariants
      .map(v => v.price || product.list)
      .filter(p => p > 0);

    if (prices.length === 0) {
      return { min: product.list, max: product.list, varies: false };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return { min, max, varies: min !== max };
  }, [product.skuVariants, product.list]);

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const handleAddToSelection = () => {
    if (!matchingSku || !isComplete) return;

    onAddToSelection(matchingSku.sku, selectedOptions);

    // Reset and close
    setSelectedOptions({});
    onClose();
  };

  const renderOptionSelector = (option: ConfiguratorOption) => {
    const isFinishType = option.optionType === 'finish' || option.optionType === 'accent-finish';
    const currentValue = selectedOptions[option.optionName];

    if (isFinishType) {
      // Render visual swatch selector for finish options
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {option.values.map((value) => (
              <div
                key={value}
                onClick={() => handleOptionChange(option.optionName, value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all cursor-pointer',
                  currentValue === value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <FinishSwatch
                  finishName={value}
                  selected={currentValue === value}
                  size="lg"
                />
                <span className="text-xs font-medium text-center max-w-[80px]">
                  {value}
                </span>
                {currentValue === value && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Render radio group for other option types
    return (
      <RadioGroup
        value={currentValue || ''}
        onValueChange={(value) => handleOptionChange(option.optionName, value)}
      >
        <div className="grid grid-cols-2 gap-3">
          {option.values.map((value) => (
            <div key={value} className="flex items-center space-x-2">
              <RadioGroupItem value={value} id={`${option.optionName}-${value}`} />
              <Label
                htmlFor={`${option.optionName}-${value}`}
                className="cursor-pointer"
              >
                {value}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configure {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Info Card */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                  Collection
                </div>
                <div className="font-semibold">{product.collectionName}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-muted-foreground">
                  Price
                </div>
                {priceRange.varies ? (
                  <div className="font-semibold">
                    ${priceRange.min.toFixed(2)} - ${priceRange.max.toFixed(2)} CAD
                  </div>
                ) : (
                  <div className="font-semibold">
                    ${product.list.toFixed(2)} CAD
                  </div>
                )}
              </div>
            </div>

            {product.shadeInfo && (
              <div className="pt-2 border-t">
                <div className="text-sm font-medium text-muted-foreground">Shade</div>
                <div className="text-sm">{product.shadeInfo}</div>
              </div>
            )}

            {product.skuVariants && product.skuVariants.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  {product.skuVariants.length} available configurations
                </div>
              </div>
            )}
          </div>

          {/* Option Selectors */}
          <div className="space-y-6">
            {product.configuratorOptions?.map((option) => (
              <div key={option.optionName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-base font-semibold">
                    {option.optionName}
                  </label>
                  {option.required && (
                    <span className="text-red-500 text-sm">*Required</span>
                  )}
                </div>
                {renderOptionSelector(option)}
              </div>
            ))}
          </div>

          {/* Selected Configuration Display */}
          {matchingSku ? (
            <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <div className="font-semibold text-green-900">Configuration Complete</div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-mono font-medium">{matchingSku.sku}</span>
                </div>
                {matchingSku.price && matchingSku.price !== product.list && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Final Price:</span>
                    <span className="font-semibold">${matchingSku.price.toFixed(2)} CAD</span>
                  </div>
                )}
              </div>
            </div>
          ) : isComplete ? (
            <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
              <div className="text-sm text-amber-900">
                No matching SKU found for this configuration. Please try different options.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
              <div className="text-sm text-muted-foreground text-center">
                Select all required options to see final SKU and pricing
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToSelection}
              disabled={!isComplete || !matchingSku}
              className="min-w-[160px]"
            >
              {!isComplete ? 'Select Options' : 'Add to Selection'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 2.2 Update SkuCard Component

**File:** `components/SkuCard.tsx` (or wherever product cards are rendered)

Add logic to detect configurable products and show "Configure" button:

```typescript
'use client';

import { useState } from 'react';
import { ConfiguratorDialog } from '@/components/product/configurator-dialog';
import type { CatalogItem } from '@/lib/catalog/loadCatalog';

interface SkuCardProps {
  product: CatalogItem;
  onAddToSelection?: (sku: string, qty: number, configuration?: Record<string, string>) => void;
  // ... other props
}

export function SkuCard({ product, onAddToSelection, ...otherProps }: SkuCardProps) {
  const [configuratorOpen, setConfiguratorOpen] = useState(false);

  const handleAddClick = () => {
    if (product.isConfigurable) {
      // Open configurator dialog
      setConfiguratorOpen(true);
    } else {
      // Add directly to selection (existing behavior)
      onAddToSelection?.(product.sku, 1);
    }
  };

  const handleConfiguredAdd = (sku: string, configuration: Record<string, string>) => {
    onAddToSelection?.(sku, 1, configuration);
  };

  return (
    <>
      <div className="sku-card">
        {/* Existing card UI */}

        {/* Update "Add" button */}
        <button onClick={handleAddClick}>
          {product.isConfigurable ? 'Configure' : 'Add to Selection'}
        </button>

        {/* Show configurator badge */}
        {product.isConfigurable && (
          <div className="text-xs text-blue-600 font-medium">
            Configurable ({product.skuVariants?.length} options)
          </div>
        )}
      </div>

      {/* Configurator Dialog */}
      {product.isConfigurable && (
        <ConfiguratorDialog
          product={product}
          open={configuratorOpen}
          onClose={() => setConfiguratorOpen(false)}
          onAddToSelection={handleConfiguredAdd}
        />
      )}
    </>
  );
}
```

---

## Phase 3: Selection Store Integration

### 3.1 Update SelectionLine Type

**File:** `lib/selections/types.ts`

Add configuration metadata to selection lines:

```typescript
export type SelectionLine = {
  sku: string;
  qty: number;
  notes: string;
  pickedBy: string[];
  favorites: string[];
  collectionId?: string;

  // NEW: Configuration metadata for configurable products
  configuration?: {
    baseItemCode: string;           // Base item this was configured from
    options: Record<string, string>; // Selected options (e.g., { "Finish": "Bronze", "Accent Finish": "White" })
    productName: string;             // Human-readable name with options
  };
};
```

### 3.2 Update Selection Store Actions

**File:** `lib/selections/store.ts`

Modify `addLine` action to accept configuration:

```typescript
addLine: (
  line: Omit<SelectionLine, 'id'>,
  actorName: string,
  configuration?: {
    baseItemCode: string;
    options: Record<string, string>;
    productName: string;
  }
) => {
  set((state) => {
    const existing = state.lines.find((l) => l.sku === line.sku);

    if (existing) {
      // Increment quantity if already in selection
      existing.qty += line.qty;
      if (actorName && !existing.pickedBy.includes(actorName)) {
        existing.pickedBy.push(actorName);
      }
    } else {
      // Add new line with configuration if provided
      state.lines.push({
        ...line,
        pickedBy: actorName ? [actorName] : [],
        configuration,
      });
    }
  });
},
```

---

## Phase 4: Display Configuration in Selection Panel

### 4.1 Update Selection Panel Display

**File:** `components/SelectionPanel.tsx`

Show configuration details for configured products:

```typescript
{selectionLines.map((line) => (
  <div key={line.sku} className="selection-line-item">
    <div className="font-medium">{line.sku}</div>

    {/* Show configuration if present */}
    {line.configuration && (
      <div className="text-sm text-muted-foreground space-y-1 mt-1">
        <div>Base: {line.configuration.baseItemCode}</div>
        {Object.entries(line.configuration.options).map(([optionName, value]) => (
          <div key={optionName}>
            {optionName}: <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    )}

    <div className="text-sm">Qty: {line.qty}</div>
    {/* ... rest of line item UI */}
  </div>
))}
```

---

## Phase 5: PDF Export Updates

### 5.1 Update PDF Template

**File:** `lib/selections/pdf.tsx`

Include configuration details in exported PDFs:

```typescript
{selection.lines.map((line) => (
  <View key={line.sku} style={styles.lineItem}>
    <Text style={styles.sku}>{line.sku}</Text>

    {line.configuration && (
      <View style={styles.configDetails}>
        <Text style={styles.configLabel}>Configuration:</Text>
        {Object.entries(line.configuration.options).map(([name, value]) => (
          <Text key={name} style={styles.configOption}>
            {name}: {value}
          </Text>
        ))}
      </View>
    )}

    <Text style={styles.qty}>Qty: {line.qty}</Text>
    {/* ... rest of line item */}
  </View>
))}
```

---

## Implementation Phases Summary

### Phase 1: Data Layer (Week 1)
- [ ] Update `CatalogItem` type with configurator fields
- [ ] Modify `loadHubbardton.ts` to group by Base Item and extract options
- [ ] Test data loading with console logs
- [ ] Verify Coral collection shows 1 item instead of 121

### Phase 2: UI Components (Week 2)
- [ ] Create `ConfiguratorDialog` component
- [ ] Add UI dependencies (Select component if not present)
- [ ] Update `SkuCard` to detect configurable products
- [ ] Test configurator UI with Coral Table Lamp

### Phase 3: Selection Integration (Week 2)
- [ ] Update `SelectionLine` type with configuration field
- [ ] Modify selection store `addLine` action
- [ ] Test adding configured products to selection
- [ ] Verify SKU matching works correctly

### Phase 4: Display Updates (Week 3)
- [ ] Update Selection Panel to show configuration details
- [ ] Add configuration display to collection views
- [ ] Test full user flow: browse → configure → add → view in selection

### Phase 5: Export & PDF (Week 3)
- [ ] Update PDF export template
- [ ] Update CSV export to include configuration
- [ ] Test exports with configured products
- [ ] Verify configuration details appear correctly

---

## Testing Checklist

- [ ] Coral Table Lamp shows as 1 configurable product (not 121)
- [ ] Configurator dialog opens when clicking "Configure"
- [ ] All 11 Finish options appear in first dropdown
- [ ] All 11 Accent Finish options appear in second dropdown
- [ ] Shade information displays correctly
- [ ] Correct SKU is matched when options are selected
- [ ] "Add to Selection" button is disabled until all required options selected
- [ ] Configured product appears in selection panel with configuration details
- [ ] Configuration details appear in PDF export
- [ ] Configuration details appear in CSV export
- [ ] Multiple configured variants of same base product can be added separately

---

## Rollout Strategy

### Option A: Hubbardton Forge Only (Recommended for MVP)
- Implement configurator system only for Hubbardton Forge products
- Other vendors continue with existing behavior
- Allows testing and refinement before broader rollout

### Option B: All Multi-Option Products
- Detect multi-option products across all vendors
- Apply configurator UI universally
- More complex initial implementation

**Recommendation:** Start with Option A, then expand to other vendors once proven stable.

---

## Edge Cases to Handle

1. **Price Variations by Option**
   - Some SKU variants may have different prices
   - Display price range in card if prices vary
   - Show final price in configurator once all options selected

2. **Out of Stock Variants**
   - May need to disable certain option combinations if out of stock
   - Requires stock data integration

3. **Image Handling**
   - Base product may not have image URL
   - Consider showing first variant's image as placeholder
   - Or generate image URLs dynamically based on selected options

4. **Products with 1 Base Item but Only 1 Variant**
   - Skip configurator, show as regular product
   - Already handled by `hasMultipleFinishes` check

5. **Missing Option Values**
   - Some variants may have null/empty finish values
   - Filter these out when building option lists
   - Already handled by `extractUniqueOptions` function

---

## Visual Enhancements Included

The enhanced plan includes several UX improvements beyond the basic dropdown approach:

1. **Visual Finish Swatches** ✅
   - Color-coded circular swatches for finish options
   - Shows actual finish colors with selectable cards
   - Falls back to text initials for unknown finishes
   - Responsive grid layout with hover states

2. **Live SKU Display** ✅
   - Real-time SKU matching as options are selected
   - Green confirmation panel when configuration is complete
   - Warning state if no matching SKU found

3. **Price Range Display** ✅
   - Shows price range if variants have different prices
   - Updates to show final price once configuration is complete

4. **Status Feedback** ✅
   - Visual indicators for selection state (checkmarks, borders)
   - Clear messaging for incomplete configurations
   - Disabled state for "Add to Selection" until complete

5. **Better Information Architecture** ✅
   - Product info card with collection, pricing, shade details
   - Configuration count displayed
   - Organized sections with clear visual hierarchy

## Future Enhancements (Phase 2+)

1. **Product Images**
   - Show product image updating based on selected options
   - Requires variant-specific images or image URL patterns

2. **Option Dependencies**
   - Disable certain option combinations if incompatible
   - Requires dependency rules in data structure

3. **Bulk Configure**
   - Select multiple finish combinations at once
   - Add several configured variants in one action
   - Useful for dealers who want to stock multiple variants

4. **Default Selections**
   - Pre-select popular finish combinations
   - "Most Popular" badges on common choices
   - Requires analytics or manual curation

5. **Finish Samples & References**
   - Link to finish sample images
   - Show finish details (e.g., "Hand-forged bronze with oil-rubbed patina")
   - Comparison view for similar finishes

6. **Configuration History**
   - Remember recently selected configurations
   - Quick-add from previous selections
   - "Frequently configured together" suggestions

---

## Data Migration Notes

### Existing Hubbardton Forge Data
- Current loader already creates 121 separate items for Coral
- New loader will replace these with 1 configurable item
- No data file changes needed - logic changes only

### Backward Compatibility
- Products without `isConfigurable` flag continue to work with existing UI
- Selection lines without `configuration` field display normally
- Existing selections (if any) remain valid

---

## Questions for Product Owner

1. **Shade/Glass Display:** Should shade information be just informational, or should users be able to select shade options?

2. **Pricing Display:** For products with price variations, show range (e.g., "$100 - $150") or base price only?

3. **Image Strategy:** What images should we show for configurable products? Base product only, or first variant?

4. **Option Naming:** Are "Finish" and "Accent Finish" the only option types for Hubbardton Forge, or are there others (glass, canopy, etc.)?

5. **Required vs Optional:** Are all finish options always required, or can some be optional?

---

## Success Criteria

- **User Experience:** Dealers can configure products with 2+ clicks instead of scrolling through 121+ items
- **Data Accuracy:** Generated SKUs match existing SKU structure exactly
- **Selection Export:** Configuration details appear clearly in PDF/CSV exports
- **Performance:** Configurator UI opens instantly (<100ms)
- **Collection Views:** Collections with configurable products show correct item counts (1 per base item, not 121 per variant set)
