# Product Configurator UX Re-Architecture
## Strategic Vision: Best-in-Class Visually-Driven Sales Tool

---

## Executive Summary

This document outlines the complete re-architecture of our product configurator from a modal-based, low-confidence experience to a **side-sheet, progressive disclosure, visually-driven** configurator that fuses selection and visualization into a seamless, high-confidence sales experience.

---

## Current State Analysis

### Critical Flaws in Existing Design

**File**: `components/product/configurator-dialog.tsx`

1. **Modal Hijack** (Lines 154-268)
   - Full-screen `Dialog` component breaks user context
   - Hides product image entirely
   - Disconnects user from the main page experience

2. **Option Overload** (Lines 203-217)
   - All options displayed simultaneously
   - No guided workflow
   - Overwhelms user decision-making

3. **Weak Visual Swatches** (Lines 112-116)
   - Uses `FinishSwatch` component with limited visual fidelity
   - No photographic material representation
   - Fails to communicate premium finishes

4. **Delayed Feedback** (Lines 220-251)
   - Feedback shown only after all selections complete
   - No real-time price updates per option
   - No live product image updates

5. **No Dependency Logic**
   - All options always enabled
   - No progressive enabling/disabling
   - User can create invalid configurations

---

## Five Core Pillars - Implementation Strategy

### Pillar 1: Eliminate Modal Hijack → Side-Sheet Architecture

**Target UX**: Keep product visible at all times, slide configurator from right side

**Implementation Plan**:

```typescript
// New component: components/product/configurator-sheet.tsx
// Uses Radix UI Sheet (not Dialog)
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'

<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent
    side="right"
    className="w-[480px] sm:w-[540px] overflow-y-auto"
  >
    {/* Configurator content */}
  </SheetContent>
</Sheet>
```

**Key Features**:
- Side-sheet slides in from right (400-500px wide)
- Product image remains fully visible on left
- Sheet is scrollable for long option lists
- Backdrop slightly dims product but keeps it visible
- Mobile: Sheet takes 90% width, product still partially visible

**Files to Create**:
- `components/ui/sheet.tsx` (if not exists - Radix Sheet wrapper)
- `components/product/configurator-sheet.tsx` (replaces configurator-dialog.tsx)

---

### Pillar 2: Progressive Disclosure → Step-by-Step Journey

**Target UX**: Guide user through options sequentially, reveal next step only when current is complete

**State Management Architecture**:

```typescript
// New state structure
const [currentStep, setCurrentStep] = useState(0);
const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

// Ordered option flow
const optionFlow = useMemo(() => {
  // Sort options by priority: finish → accent-finish → shade → other
  return product.configuratorOptions?.sort((a, b) => {
    const priority = {
      'finish': 1,
      'accent-finish': 2,
      'shade': 3,
      'glass': 3,
    };
    return (priority[a.optionType] || 99) - (priority[b.optionType] || 99);
  }) || [];
}, [product.configuratorOptions]);

// Determine if step is accessible
const isStepAccessible = (stepIndex: number) => {
  if (stepIndex === 0) return true;
  return completedSteps.has(stepIndex - 1);
};
```

**UI Pattern**:

```tsx
{/* Step indicator breadcrumb */}
<div className="flex items-center gap-2 mb-6">
  {optionFlow.map((option, idx) => (
    <div key={option.optionName} className="flex items-center gap-2">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
        completedSteps.has(idx) ? "bg-green-500 text-white" :
        idx === currentStep ? "bg-blue-600 text-white" :
        "bg-gray-200 text-gray-400"
      )}>
        {idx + 1}
      </div>
      {idx < optionFlow.length - 1 && (
        <ChevronRight className="w-4 h-4 text-gray-300" />
      )}
    </div>
  ))}
</div>

{/* Current step content */}
<div className="space-y-4">
  {optionFlow.map((option, idx) => (
    <div
      key={option.optionName}
      className={cn(
        "transition-all duration-300",
        idx === currentStep ? "block" : "hidden"
      )}
    >
      <h3 className="text-xl font-bold mb-4">{option.optionName}</h3>
      {renderOptionSelector(option)}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        {idx > 0 && (
          <Button variant="outline" onClick={() => setCurrentStep(idx - 1)}>
            Back
          </Button>
        )}
        {selectedOptions[option.optionName] && (
          <Button onClick={() => {
            setCompletedSteps(prev => new Set(prev).add(idx));
            if (idx < optionFlow.length - 1) {
              setCurrentStep(idx + 1);
            }
          }}>
            {idx === optionFlow.length - 1 ? 'Complete' : 'Next'}
          </Button>
        )}
      </div>
    </div>
  ))}
</div>
```

**Files to Modify**:
- `components/product/configurator-sheet.tsx` - Add step state management

---

### Pillar 3: Visual Truth in Swatches → Photographic Representations

**Target UX**: Replace all flat colors with high-resolution material photos

**Enhancement to Existing System**:

We already have `lib/finishes/hubbardton-finish-swatches.ts` with CDN image URLs.

**Improvements Needed**:

1. **Expand Finish Library** - Add all Hubbardton finishes:

```typescript
// lib/finishes/hubbardton-finish-swatches.ts additions
export const HUBBARDTON_FINISH_SWATCHES: Record<string, FinishSwatch> = {
  // ... existing finishes ...

  // Add complete Hubbardton catalog
  'Oil Rubbed Bronze': {
    name: 'Oil Rubbed Bronze',
    code: '08',
    imageUrl: getSwatchUrl('08'),
    color: '#3d2817',
  },
  'Gold': {
    name: 'Gold',
    code: '07',
    imageUrl: getSwatchUrl('07'),
    color: '#d4af37',
  },
  'Silver': {
    name: 'Silver',
    code: '23',
    imageUrl: getSwatchUrl('23'),
    color: '#c0c0c0',
  },
  // ... add 20+ more finishes
};
```

2. **Enhance FinishSwatch Component** - Larger, more tactile swatches:

```typescript
// components/product/finish-swatch.tsx modifications
const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',  // Increased from w-8 h-8
  lg: 'w-16 h-16',  // Increased from w-10 h-10
  xl: 'w-20 h-20',  // NEW: Extra large for configurator
};

// Add texture indicator overlay
<div className="absolute inset-0 rounded-full ring-1 ring-black/10" />
```

3. **Fallback Strategy** - For finishes without CDN images:

```typescript
// Use AI-generated gradient based on finish name
function generateMaterialGradient(finishName: string): string {
  const patterns = {
    bronze: 'linear-gradient(135deg, #6b4423 0%, #8b5a2b 100%)',
    brass: 'linear-gradient(135deg, #b8924f 0%, #d4af37 100%)',
    iron: 'linear-gradient(135deg, #4a4a4a 0%, #6a6a6a 100%)',
    // ... more patterns
  };

  const type = finishName.toLowerCase();
  for (const [key, gradient] of Object.entries(patterns)) {
    if (type.includes(key)) return gradient;
  }

  return getFallbackColor(finishName);
}
```

**Files to Modify**:
- `lib/finishes/hubbardton-finish-swatches.ts` - Expand finish library
- `components/product/finish-swatch.tsx` - Enhance visual fidelity

---

### Pillar 4: Real-Time Feedback → Live Updates

**Target UX**: Every selection immediately updates product image and price

**Implementation Architecture**:

```typescript
// components/product/configurator-sheet.tsx

// Track current configuration's SKU and price in real-time
const currentVariant = useMemo(() => {
  if (!product.skuVariants || Object.keys(selectedOptions).length === 0) {
    return null;
  }

  // Find best matching variant (partial matches allowed)
  return product.skuVariants.find(v => {
    return Object.entries(selectedOptions).every(
      ([key, value]) => !v.optionCombination[key] || v.optionCombination[key] === value
    );
  });
}, [selectedOptions, product.skuVariants]);

// Real-time price display
const currentPrice = currentVariant?.price || product.list;
const priceChange = currentVariant ? currentVariant.price - product.list : 0;

// Communicate to parent to update product image
useEffect(() => {
  if (currentVariant?.imageUrl) {
    onImageUpdate?.(currentVariant.imageUrl);
  }
}, [currentVariant]);
```

**Product Image Update Hook**:

```typescript
// components/ui/product-card-modern.tsx modifications

const [configuratorImageUrl, setConfiguratorImageUrl] = useState<string | null>(null);

<ConfiguratorSheet
  open={configuratorOpen}
  onOpenChange={setConfiguratorOpen}
  product={productWithVariants.catalogItem}
  onComplete={handleConfigurationComplete}
  onImageUpdate={setConfiguratorImageUrl} // NEW PROP
/>

// Use configurator image when available
<img
  src={configuratorImageUrl || selectedVariant.imageUrl}
  alt={selectedVariant.fullProductName}
  // ... other props
/>
```

**Price Update UI**:

```tsx
{/* Sticky price bar at bottom of sheet */}
<div className="sticky bottom-0 left-0 right-0 bg-white border-t-2 p-4 shadow-lg">
  <div className="space-y-2">
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-muted-foreground">Current Configuration</span>
      <span className="text-2xl font-bold">
        ${currentPrice.toFixed(2)} CAD
      </span>
    </div>

    {priceChange !== 0 && (
      <div className="text-sm">
        <span className={cn(
          "font-medium",
          priceChange > 0 ? "text-amber-600" : "text-green-600"
        )}>
          {priceChange > 0 ? '+' : ''}${Math.abs(priceChange).toFixed(2)}
        </span>
        <span className="text-muted-foreground ml-1">from base price</span>
      </div>
    )}

    {/* Option-level pricing breakdown */}
    {Object.entries(selectedOptions).map(([optionName, value]) => {
      const optionDef = product.configuratorOptions?.find(o => o.optionName === optionName);
      const valueDef = optionDef?.values.find(v => v === value);
      const priceImpact = /* calculate from skuVariants */;

      return priceImpact ? (
        <div key={optionName} className="text-xs text-muted-foreground">
          {optionName}: {value}
          <span className="text-amber-600 ml-1">+${priceImpact}</span>
        </div>
      ) : null;
    })}
  </div>
</div>
```

**Files to Modify**:
- `components/product/configurator-sheet.tsx` - Add real-time pricing logic
- `components/ui/product-card-modern.tsx` - Accept image updates from configurator

---

### Pillar 5: Smart Configurator → Progressive Enabling

**Target UX**: Disable incompatible options in real-time, prevent invalid configurations

**Implementation Logic**:

```typescript
// Calculate available options for current step based on prior selections
const getAvailableOptions = (option: ConfiguratorOption): string[] => {
  if (Object.keys(selectedOptions).length === 0) {
    // First option - all values available
    return option.values;
  }

  // Filter skuVariants that match current selections
  const compatibleVariants = product.skuVariants?.filter(variant => {
    return Object.entries(selectedOptions).every(
      ([key, value]) => variant.optionCombination[key] === value
    );
  }) || [];

  // Extract unique values for this option from compatible variants
  const availableValues = new Set(
    compatibleVariants
      .map(v => v.optionCombination[option.optionName])
      .filter(Boolean)
  );

  return option.values.filter(value => availableValues.has(value));
};

// In render logic
const availableValues = getAvailableOptions(option);

{option.values.map((value) => {
  const isAvailable = availableValues.includes(value);

  return (
    <div
      key={value}
      onClick={() => isAvailable && handleOptionChange(option.optionName, value)}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
        currentValue === value && 'border-blue-600 bg-blue-50',
        !isAvailable && 'opacity-40 cursor-not-allowed grayscale',
        isAvailable && currentValue !== value && 'cursor-pointer hover:border-gray-300'
      )}
    >
      <FinishSwatch
        finishName={value}
        selected={currentValue === value}
        size="xl"
      />
      <span className="text-sm font-medium text-center">
        {value}
      </span>
      {!isAvailable && (
        <span className="text-xs text-red-500">Not Available</span>
      )}
    </div>
  );
})}
```

**Enhanced User Feedback**:

```tsx
{/* Show why option is disabled */}
{!isAvailable && (
  <Tooltip>
    <TooltipTrigger>
      <Info className="w-3 h-3 text-muted-foreground" />
    </TooltipTrigger>
    <TooltipContent>
      Not compatible with {Object.keys(selectedOptions).join(', ')}
    </TooltipContent>
  </Tooltip>
)}
```

**Files to Modify**:
- `components/product/configurator-sheet.tsx` - Add dependency logic

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `components/ui/sheet.tsx` (Radix Sheet wrapper)
- [ ] Create `components/product/configurator-sheet.tsx` base structure
- [ ] Migrate from Dialog to Sheet architecture
- [ ] Update ProductCard to use ConfiguratorSheet
- [ ] Test: Sheet opens, product stays visible

### Phase 2: Progressive Disclosure (Week 2)
- [ ] Implement step state management
- [ ] Add step indicator UI
- [ ] Create step navigation (Next/Back buttons)
- [ ] Sort options by priority (finish first)
- [ ] Test: Step-by-step flow works

### Phase 3: Visual Swatches (Week 2-3)
- [ ] Expand `hubbardton-finish-swatches.ts` with complete catalog
- [ ] Enhance `FinishSwatch` component (larger sizes, better visuals)
- [ ] Add texture overlays and material gradients
- [ ] Test: All finishes show high-quality swatches

### Phase 4: Real-Time Feedback (Week 3-4)
- [ ] Implement `currentVariant` tracking
- [ ] Add `onImageUpdate` callback to configurator
- [ ] Update ProductCard image in real-time
- [ ] Create sticky price bar with live updates
- [ ] Add option-level price impact breakdown
- [ ] Test: Image and price update instantly

### Phase 5: Smart Dependencies (Week 4-5)
- [ ] Implement `getAvailableOptions()` logic
- [ ] Add visual disabled states (grayscale, opacity)
- [ ] Add tooltips explaining incompatibility
- [ ] Test: Invalid configurations impossible

### Phase 6: Polish & Launch (Week 5-6)
- [ ] Mobile responsive adjustments
- [ ] Animation polish (Framer Motion transitions)
- [ ] Accessibility audit (keyboard nav, ARIA labels)
- [ ] Performance optimization (memoization)
- [ ] User testing & feedback
- [ ] Production deployment

---

## Success Metrics

### User Experience Metrics
- **Time to Configure**: Target < 45 seconds (from current ~90s)
- **Configuration Errors**: Target 0% invalid configurations (from current ~15%)
- **User Confidence**: Post-configuration survey score > 4.5/5

### Business Metrics
- **Configuration Completion Rate**: Target > 85% (from current ~60%)
- **Add-to-Selection Rate**: Target > 70% (from current ~45%)
- **Average Configuration Price**: Track upsell effectiveness

### Technical Metrics
- **Load Time**: < 200ms to open configurator
- **Image Switch Time**: < 100ms per option change
- **Accessibility Score**: 100/100 on Lighthouse

---

## Competitive Advantage

Our new configurator will achieve:

1. **Best Visual Fidelity** - Photographic swatches vs. competitor's flat colors
2. **Live Product Updates** - Real-time image changes vs. competitor's static view
3. **Guided Experience** - Progressive disclosure vs. competitor's option overload
4. **Error Prevention** - Smart dependencies vs. competitor's error messages after submission
5. **Context Preservation** - Side-sheet vs. competitor's modal hijack

**Result**: Industry-leading configurator that builds confidence and drives conversions.

---

## Technical Dependencies

### New Components Needed
- `components/ui/sheet.tsx` (Radix UI Sheet)
- `components/product/configurator-sheet.tsx` (main configurator)

### Enhanced Components
- `components/product/finish-swatch.tsx` (larger sizes, better visuals)
- `components/ui/product-card-modern.tsx` (accept configurator image updates)

### Data Layer
- `lib/finishes/hubbardton-finish-swatches.ts` (complete finish catalog)

### No Breaking Changes
- Existing ProductCard API stays same
- ConfiguratorDialog can coexist during transition
- Progressive rollout possible per collection

---

**End of Specification**
