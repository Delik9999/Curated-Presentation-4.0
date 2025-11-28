# Multi-Option Product Variants - Implementation Plan

## Overview
Handle products with **multiple independent option dimensions** (e.g., Sorrento with both Glass Type AND Canopy Finish). This creates a matrix of SKU combinations that need intuitive UI organization.

---

## Problem Discovery

### Sorrento Example (Complex Case)
The Sorrento collection has products with **two independent option dimensions**:

**SKU Structure**: `BASE-GLASS-CANOPY`
- **Base SKU**: `12166` (1 Light LED Pendant)
- **Glass Option** (middle segment):
  - `-017` = Clear
  - `-018` = Amber
  - `-019` = Smoke
  - `-020` = Copper
  - `-023` = Mixed
  - `-024` = Mixed with Copper Leaf
- **Canopy Finish** (last segment):
  - `-01` = Chrome
  - `-02` = Black (Matte Black)
  - `-07` = Gold

**Result**: `12166-017-01` = "Sorrento, 1 Light LED Pendant, Clear, Chrome Canopy"

### Matrix Complexity
For "Sorrento 1 Light Pendant":
- 4 glass options (Clear, Amber, Smoke, Copper)
- 3 canopy finishes (Chrome, Black, Gold)
- **Total: 12 SKU variants** for one product configuration!

For "Sorrento 12 Light Chandelier":
- 6 glass options (Clear, Amber, Smoke, Copper, Mixed, Mixed with Copper Leaf)
- 1 canopy finish (Chrome only)
- **Total: 6 SKU variants**

---

## SKU Pattern Classification

### Type 1: Single Option (Simple Variants)
**Pattern**: `BASE-FINISH`
- Example: `12121-02` (Calcolo, Matte Black)
- Most common case
- UI: Single row of finish buttons

### Type 2: Two Options (Matrix Variants)
**Pattern**: `BASE-OPTION1-OPTION2`
- Example: `12166-017-01` (Sorrento, Clear, Chrome)
- Less common, but needs special handling
- UI: Two rows of option selectors (Glass Type + Canopy Finish)

### Type 3: No Variants
**Pattern**: `BASE` (no dashes, or single variant only)
- Example: Some custom products
- UI: No selectors, just "Add to Selection"

---

## Detection Strategy

### SKU Analysis
```typescript
function analyzeSkuPattern(skus: string[]): {
  type: 'simple' | 'matrix' | 'none';
  dimensions: OptionDimension[];
} {
  // Count dashes in SKUs
  const dashCounts = skus.map(sku => (sku.match(/-/g) || []).length);
  const uniqueDashCounts = new Set(dashCounts);

  if (skus.length === 1) {
    return { type: 'none', dimensions: [] };
  }

  if (uniqueDashCounts.has(1)) {
    // Pattern: BASE-FINISH (single dash)
    return { type: 'simple', dimensions: [extractFinishDimension(skus)] };
  }

  if (uniqueDashCounts.has(2)) {
    // Pattern: BASE-OPTION1-OPTION2 (two dashes)
    return { type: 'matrix', dimensions: extractMatrixDimensions(skus) };
  }

  return { type: 'none', dimensions: [] };
}
```

---

## Data Model Update

### Option Dimension
```typescript
export interface OptionDimension {
  name: string; // "Glass Type", "Canopy Finish", "Finish"
  options: OptionValue[];
}

export interface OptionValue {
  code: string; // "017", "01", "02"
  label: string; // "Clear", "Chrome", "Matte Black"
  abbreviation: string; // "CL", "CR", "MB"
}

export interface ProductVariant {
  sku: string;
  fullProductName: string;
  price: number;
  imageUrl: string;
  options: Record<string, string>; // { "Glass Type": "Clear", "Canopy Finish": "Chrome" }
}

export interface ProductWithVariants {
  baseSku: string;
  baseProductName: string; // "Sorrento, 1 Light LED Pendant"
  collection: string;
  variantType: 'simple' | 'matrix' | 'none';
  dimensions: OptionDimension[]; // Array of option types
  variants: ProductVariant[];
  defaultVariant: ProductVariant;
}
```

### Example Data Structure

#### Simple Variant (Calcolo)
```typescript
{
  baseSku: "12121",
  baseProductName: "Calcolo, 9 Light Round LED Chandelier",
  collection: "Calcolo",
  variantType: "simple",
  dimensions: [
    {
      name: "Finish",
      options: [
        { code: "02", label: "Matte Black", abbreviation: "MB" },
        { code: "030", label: "Painted Antique Brass", abbreviation: "AB" }
      ]
    }
  ],
  variants: [
    {
      sku: "12121-02",
      fullProductName: "Calcolo, 9 Light Round LED Chandelier, Matte Black",
      price: 5003,
      imageUrl: "https://libandco.com/cdn/shop/files/12121-02.jpg?v=1",
      options: { "Finish": "Matte Black" }
    },
    {
      sku: "12121-030",
      fullProductName: "Calcolo, 9 Light Round LED Chandelier, Painted Antique Brass",
      price: 5003,
      imageUrl: "https://libandco.com/cdn/shop/files/12121-030.jpg?v=1",
      options: { "Finish": "Painted Antique Brass" }
    }
  ],
  defaultVariant: { /* first variant */ }
}
```

#### Matrix Variant (Sorrento)
```typescript
{
  baseSku: "12166",
  baseProductName: "Sorrento, 1 Light LED Pendant",
  collection: "Sorrento",
  variantType: "matrix",
  dimensions: [
    {
      name: "Glass Type",
      options: [
        { code: "017", label: "Clear", abbreviation: "CL" },
        { code: "018", label: "Amber", abbreviation: "AM" },
        { code: "019", label: "Smoke", abbreviation: "SM" },
        { code: "020", label: "Copper", abbreviation: "CO" }
      ]
    },
    {
      name: "Canopy Finish",
      options: [
        { code: "01", label: "Chrome", abbreviation: "CR" },
        { code: "02", label: "Black", abbreviation: "BK" },
        { code: "07", label: "Gold", abbreviation: "GD" }
      ]
    }
  ],
  variants: [
    {
      sku: "12166-017-01",
      fullProductName: "Sorrento, 1 Light LED Pendant, Clear, Chrome Canopy",
      price: 485,
      imageUrl: "https://libandco.com/cdn/shop/files/12166-017-01.jpg?v=1",
      options: {
        "Glass Type": "Clear",
        "Canopy Finish": "Chrome"
      }
    },
    // ... 11 more variants (4 glass × 3 canopy = 12 total)
  ],
  defaultVariant: { /* first variant */ }
}
```

---

## UI Design

### Simple Variant (Single Row)
```
┌────────────────────────────────┐
│    [Product Image]             │
├────────────────────────────────┤
│ Calcolo, 9 Light LED           │
│ Chandelier                     │
│                                │
│ SKU: 12121-02                  │
│                                │
│ Finish:                        │
│ [MB] [AB]                      │
│ (Matte Black selected)         │
│                                │
│ WSP         $5,003.00          │
│ [➕ Add to Selection]          │
└────────────────────────────────┘
```

### Matrix Variant (Two Rows)
```
┌────────────────────────────────┐
│    [Product Image]             │
├────────────────────────────────┤
│ Sorrento, 1 Light LED          │
│ Pendant                        │
│                                │
│ SKU: 12166-017-01              │
│                                │
│ Glass Type:                    │
│ [CL] [AM] [SM] [CO]            │
│                                │
│ Canopy Finish:                 │
│ [CR] [BK] [GD]                 │
│                                │
│ Clear + Chrome selected        │
│                                │
│ WSP         $485.00            │
│ [➕ Add to Selection]          │
└────────────────────────────────┘
```

---

## Implementation

### Phase 1: Enhanced Variant Grouping

**File**: `lib/catalog/groupVariants.ts`

```typescript
export interface OptionDimension {
  name: string;
  options: OptionValue[];
}

export interface OptionValue {
  code: string;
  label: string;
  abbreviation: string;
}

export interface ProductVariant {
  sku: string;
  fullProductName: string;
  price: number;
  imageUrl: string;
  options: Record<string, string>;
}

export interface ProductWithVariants {
  baseSku: string;
  baseProductName: string;
  collection: string;
  variantType: 'simple' | 'matrix' | 'none';
  dimensions: OptionDimension[];
  variants: ProductVariant[];
  defaultVariant: ProductVariant;
}

export function groupProductsByVariants(
  products: Array<{ sku: string; name: string; list: number }>
): ProductWithVariants[] {
  // Group by base SKU first
  const baseGroups = new Map<string, typeof products>();

  products.forEach(product => {
    const baseSku = extractBaseSku(product.sku);
    if (!baseGroups.has(baseSku)) {
      baseGroups.set(baseSku, []);
    }
    baseGroups.get(baseSku)!.push(product);
  });

  // Process each group
  return Array.from(baseGroups.entries()).map(([baseSku, products]) => {
    const variantType = detectVariantType(products.map(p => p.sku));
    const dimensions = extractDimensions(products, variantType);
    const baseProductName = extractBaseProductName(products[0].name, variantType);
    const collection = products[0].name.split(',')[0].trim();

    const variants: ProductVariant[] = products.map(product => ({
      sku: product.sku,
      fullProductName: product.name,
      price: product.list,
      imageUrl: `https://libandco.com/cdn/shop/files/${product.sku}.jpg?v=1`,
      options: extractOptions(product.sku, product.name, dimensions)
    }));

    return {
      baseSku,
      baseProductName,
      collection,
      variantType,
      dimensions,
      variants,
      defaultVariant: variants[0]
    };
  });
}

function extractBaseSku(sku: string): string {
  // For "12166-017-01", return "12166"
  // For "12121-02", return "12121"
  const firstDash = sku.indexOf('-');
  return firstDash > 0 ? sku.substring(0, firstDash) : sku;
}

function detectVariantType(skus: string[]): 'simple' | 'matrix' | 'none' {
  if (skus.length === 1) return 'none';

  const dashCounts = skus.map(sku => (sku.match(/-/g) || []).length);
  const maxDashes = Math.max(...dashCounts);

  if (maxDashes >= 2) return 'matrix';
  if (maxDashes === 1) return 'simple';
  return 'none';
}

function extractDimensions(
  products: Array<{ sku: string; name: string }>,
  variantType: 'simple' | 'matrix' | 'none'
): OptionDimension[] {
  if (variantType === 'none') return [];

  if (variantType === 'simple') {
    // Extract finish from name (last part after comma)
    const finishes = new Map<string, string>();
    products.forEach(product => {
      const finishCode = product.sku.split('-').pop() || '';
      const finishLabel = extractFinishFromName(product.name);
      finishes.set(finishCode, finishLabel);
    });

    return [{
      name: 'Finish',
      options: Array.from(finishes.entries()).map(([code, label]) => ({
        code,
        label,
        abbreviation: getFinishAbbreviation(label)
      }))
    }];
  }

  if (variantType === 'matrix') {
    // Extract glass type and canopy finish from name
    // "Sorrento, 1 Light LED Pendant, Clear, Chrome Canopy"
    // Glass = 3rd part, Canopy = 4th part

    const glassTypes = new Map<string, string>();
    const canopyFinishes = new Map<string, string>();

    products.forEach(product => {
      const parts = product.sku.split('-');
      const glassCode = parts[1] || '';
      const canopyCode = parts[2] || '';

      const nameParts = product.name.split(',').map(s => s.trim());
      const glassLabel = nameParts[2] || '';
      const canopyLabel = nameParts[3]?.replace(' Canopy', '') || '';

      glassTypes.set(glassCode, glassLabel);
      canopyFinishes.set(canopyCode, canopyLabel);
    });

    return [
      {
        name: 'Glass Type',
        options: Array.from(glassTypes.entries()).map(([code, label]) => ({
          code,
          label,
          abbreviation: getGlassAbbreviation(label)
        }))
      },
      {
        name: 'Canopy Finish',
        options: Array.from(canopyFinishes.entries()).map(([code, label]) => ({
          code,
          label,
          abbreviation: getFinishAbbreviation(label)
        }))
      }
    ];
  }

  return [];
}

function extractBaseProductName(fullName: string, variantType: 'simple' | 'matrix' | 'none'): string {
  const parts = fullName.split(',').map(s => s.trim());

  if (variantType === 'none') {
    return fullName;
  }

  if (variantType === 'simple') {
    // "Calcolo, 9 Light Round LED Chandelier, Matte Black"
    // Return: "Calcolo, 9 Light Round LED Chandelier"
    return parts.slice(0, -1).join(', ');
  }

  if (variantType === 'matrix') {
    // "Sorrento, 1 Light LED Pendant, Clear, Chrome Canopy"
    // Return: "Sorrento, 1 Light LED Pendant"
    return parts.slice(0, 2).join(', ');
  }

  return fullName;
}

function extractFinishFromName(name: string): string {
  const parts = name.split(',').map(s => s.trim());
  return parts[parts.length - 1] || 'Standard';
}

function extractOptions(
  sku: string,
  name: string,
  dimensions: OptionDimension[]
): Record<string, string> {
  const options: Record<string, string> = {};
  const nameParts = name.split(',').map(s => s.trim());

  dimensions.forEach((dimension, index) => {
    if (dimension.name === 'Finish') {
      options['Finish'] = nameParts[nameParts.length - 1];
    } else if (dimension.name === 'Glass Type') {
      options['Glass Type'] = nameParts[2] || '';
    } else if (dimension.name === 'Canopy Finish') {
      options['Canopy Finish'] = nameParts[3]?.replace(' Canopy', '') || '';
    }
  });

  return options;
}

function getGlassAbbreviation(glass: string): string {
  const abbreviations: Record<string, string> = {
    'Clear': 'CL',
    'Amber': 'AM',
    'Smoke': 'SM',
    'Copper': 'CO',
    'Mixed': 'MX',
    'Mixed with Copper Leaf': 'ML',
  };
  return abbreviations[glass] || glass.substring(0, 2).toUpperCase();
}

function getFinishAbbreviation(finish: string): string {
  const abbreviations: Record<string, string> = {
    'Matte Black': 'MB',
    'Matte black': 'MB',
    'Black': 'BK',
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
  };
  return abbreviations[finish] || finish.substring(0, 2).toUpperCase();
}
```

---

### Phase 2: Enhanced Product Card UI

**File**: `components/ui/product-card-modern.tsx`

```typescript
'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge-modern';
import { Button } from '@/components/ui/button-modern';
import { ProductWithVariants, OptionDimension } from '@/lib/catalog/groupVariants';

export interface ProductCardProps {
  productWithVariants: ProductWithVariants;
  index?: number;
  onAddToSelection?: (sku: string) => void;
}

export function ProductCard({
  productWithVariants,
  index = 0,
  onAddToSelection,
}: ProductCardProps) {
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string>>(() => {
    // Initialize with default variant's options
    return productWithVariants.defaultVariant.options;
  });

  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [hoveredOption, setHoveredOption] = React.useState<string | null>(null);

  // Find the selected variant based on current option selections
  const selectedVariant = React.useMemo(() => {
    return productWithVariants.variants.find(variant => {
      return Object.entries(selectedOptions).every(([dimension, value]) => {
        return variant.options[dimension] === value;
      });
    }) || productWithVariants.defaultVariant;
  }, [selectedOptions, productWithVariants]);

  // Reset image loading when variant changes
  React.useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [selectedVariant.sku]);

  const handleOptionChange = (dimensionName: string, optionLabel: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [dimensionName]: optionLabel
    }));
  };

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

        {/* Option Selectors */}
        {productWithVariants.variantType !== 'none' && (
          <div className="space-y-3">
            {productWithVariants.dimensions.map((dimension) => (
              <div key={dimension.name} className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-neutral-500">
                  {dimension.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {dimension.options.map((option) => {
                    const isSelected = selectedOptions[dimension.name] === option.label;

                    return (
                      <button
                        key={option.code}
                        onClick={() => handleOptionChange(dimension.name, option.label)}
                        onMouseEnter={() => setHoveredOption(`${dimension.name}:${option.label}`)}
                        onMouseLeave={() => setHoveredOption(null)}
                        className={cn(
                          'relative flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all',
                          isSelected
                            ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                        )}
                        aria-label={option.label}
                      >
                        {option.abbreviation}

                        {/* Tooltip on hover */}
                        {hoveredOption === `${dimension.name}:${option.label}` && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white shadow-lg z-50"
                          >
                            {option.label}
                            {/* Arrow */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-neutral-900" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Selected options summary */}
            <p className="text-xs text-neutral-600 italic">
              {Object.values(selectedOptions).join(' + ')}
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

## Implementation Checklist

### Phase 1: Data Processing (Multi-Option Support)
- [ ] Update `groupVariants.ts` with `detectVariantType()` function
- [ ] Implement `extractDimensions()` for matrix variants
- [ ] Add `getGlassAbbreviation()` helper
- [ ] Update `extractBaseProductName()` to handle 2+ option dimensions
- [ ] Update `extractOptions()` to parse matrix SKUs
- [ ] Test with Sorrento data (12166, 10162)
- [ ] Test with Calcolo data (12121)
- [ ] Verify all SKU patterns are correctly classified

### Phase 2: UI Components
- [ ] Update ProductCard to accept `ProductWithVariants`
- [ ] Implement multi-dimensional option selector UI
- [ ] Add state management for selected options
- [ ] Implement `selectedVariant` lookup based on option combination
- [ ] Add option summary text (e.g., "Clear + Chrome")
- [ ] Ensure tooltips work for all options
- [ ] Test with 12-variant products (Sorrento 1 Light)
- [ ] Test with 6-variant products (Sorrento 12 Light)

### Phase 3: Integration & Testing
- [ ] Update collections-tab to pass grouped products
- [ ] Test that matrix products render correctly
- [ ] Verify simple products still work (no regression)
- [ ] Test image loading for all variant combinations
- [ ] Test on mobile (options should wrap properly)
- [ ] Verify "Add to Selection" uses correct SKU for combination
- [ ] Test edge case: Changing glass type, then canopy finish

---

## Benefits of Matrix UI

1. **Reduces Clutter**: 12 SKUs → 1 card with option selectors
2. **Intuitive Combinations**: Users see how glass + canopy interact
3. **Visual Feedback**: Image updates to show selected combination
4. **Clear Pricing**: Price updates if combinations have different costs
5. **Flexible**: System handles 1, 2, or more option dimensions

---

## Edge Cases to Handle

1. **Inconsistent matrices**: Not all glass/canopy combinations may exist
   - Solution: Disable unavailable option buttons
2. **Price variation**: Some combinations may have different prices
   - Solution: Show price range or update price dynamically
3. **Image availability**: Some SKUs may not have CDN images
   - Solution: Fallback to base SKU initials
4. **Option order**: Glass vs Canopy order matters
   - Solution: Consistent order based on SKU structure

---

## Future Enhancements

1. **Visual swatches**: Show actual colors/textures instead of abbreviations
2. **Matrix view**: Show all combinations in a grid (popup/modal)
3. **Recommended combinations**: "Staff Pick" or "Most Popular"
4. **Stock indicators**: Show which combinations are in stock
5. **Bulk add**: "Add all glass types" for a single canopy finish

---

**Next Step**: Get approval, then implement Phase 1 to validate the matrix detection and dimension extraction logic.
