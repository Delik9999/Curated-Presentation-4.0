# Customer Selection Tab Redesign Plan
## Implementing Design Principles for B2B Trade Show Excellence

**Date**: 2025-10-17
**Status**: Planning Phase
**Reference**: `DESIGN_PRINCIPLES.md`

---

## Executive Summary

Transform the Customer Selection tab from a functional selection tool into a **high-impact sales motivator** that leverages tiered discount psychology, financial transparency, and trade show-optimized visuals to drive larger orders and higher customer engagement.

### Current State Analysis

**Strengths**:
- ✅ Functional promotion tracking with linear progress bar
- ✅ Shows current discount percentage prominently
- ✅ Displays total savings when applicable
- ✅ Professional gradient design

**Gaps vs. Design Principles**:
- ❌ Linear bar doesn't emphasize discrete achievement milestones
- ❌ Messaging is quantity-focused, not financially-focused
- ❌ Total Savings is buried in promotion card, not a primary KPI
- ❌ Pricing table doesn't follow visual hierarchy (NET vs. WSP)
- ❌ No "What If" calculator for proactive planning
- ❌ No radial goal meter for immediate next tier
- ❌ Missing celebratory micro-interactions on tier achievement
- ❌ Product thumbnails added but table density could be improved further

---

## Phase 1: Promotion Progress Transformation

### 1.1 Replace Linear Bar with Stepped Milestone Tracker

**Current Implementation**:
- Single horizontal bar with tier markers
- "You" indicator shows current position
- Vertical lines mark tier thresholds

**New Design** (Following `DESIGN_PRINCIPLES.md` Section I.A):

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ┌────┐          ┌────┐          ┌────┐          ┌────┐     │
│    │ ✓  │══════════│ 🎯 │··········│    │··········│ 🔒 │     │
│    └────┘          └────┘          └────┘          └────┘     │
│   Start         30% OFF         50% OFF         60% OFF       │
│   0 SKUs         5 SKUs         10 SKUs         15 SKUs       │
│                                                                 │
│                $2,450          +$5,200          +$3,800        │
│                SAVED!          potential        potential      │
└─────────────────────────────────────────────────────────────────┘
```

**Components to Build**:

1. **`MilestoneNode`** - Individual tier achievement marker
   - Props: `status` (completed | active | locked), `tier`, `threshold`, `savingsAmount`
   - Visual states:
     - **Completed**: Green background, checkmark icon, "SAVED!" badge
     - **Active**: Indigo background, target icon, pulsing animation
     - **Locked**: Gray background, lock icon, muted opacity
   - Size: 72×72px nodes (large enough for trade show visibility)

2. **`MilestoneConnector`** - Line between nodes
   - Props: `status` (completed | active | future)
   - Visual states:
     - **Completed**: Solid green line (4px thick)
     - **Active**: Gradient from green to indigo with animated progress fill
     - **Future**: Dotted gray line (2px)

3. **`SteppedMilestoneTracker`** - Container component
   - Horizontal flex layout
   - Responsive: Stacks vertically on mobile (<768px)
   - Auto-calculates progress percentage between milestones
   - Triggers celebration animation when new tier achieved

**Color Scheme** (Per Design Principles VI.A):
- 30% OFF tier: Amber/Gold `#F59E0B`
- 50% OFF tier: Emerald `#10B981`
- 60% OFF tier: Indigo `#6366F1`

**Trade Show Optimization**:
- Minimum node size: 72×72px (easily visible from 10+ feet)
- Font size for savings: 24px bold
- High contrast borders on all nodes
- Avoid pure white backgrounds (reduce glare)

---

### 1.2 Add Radial Goal Meter

**Purpose**: Provide immediate, visceral feedback on progress toward the **next** tier only.

**Placement**: Top-right of promotion card, floating above the stepped tracker

**Design Specification**:

```
        ┌─────────────────┐
        │                 │
        │   ╱────────╲   │
        │  │   3/5    │  │  ← Current / Target
        │  │          │  │
        │  │   60%    │  │  ← Percentage complete
        │   ╲────────╱   │
        │                 │
        │  2 more SKUs    │  ← Gap to close
        │  to unlock      │
        │  30% OFF        │
        └─────────────────┘
```

**Component**: `RadialGoalMeter`
- Props: `current`, `target`, `tierName`, `savingsProjection`
- Size: 180×180px circular SVG
- Arc progress indicator (270° max, starts at top)
- Color transitions:
  - 0-33%: Gray
  - 34-66%: Amber (warming up)
  - 67-99%: Indigo (almost there!)
  - 100%: Green with burst animation

**Animation**:
- Arc fills smoothly with 0.5s easing on value change
- Pulse animation at 90%+ progress
- Confetti burst at 100% (tier achieved)

---

### 1.3 Dynamic Financial Messaging (DTR)

**Current Messaging** (promotion-progress.tsx:84):
```typescript
`You've selected ${current} SKUs (${nextTier.skusNeeded} more to unlock ${nextTier.tier.discountPercent}% OFF)`
```

**New Messaging Pattern** (Per Design Principles I.B):

**No discount yet**:
```
"Add 5 SKUs to unlock 30% OFF and save $2,450+ on your current order!"
```

**First tier achieved, approaching second**:
```
"You're saving $2,450! Add 5 more SKUs to unlock 50% OFF and save an additional $5,200!"
```

**Maximum tier achieved**:
```
"🎉 Maximum tier achieved! You're saving $11,450 (45% off total order)!"
```

**Implementation**:

```typescript
const getDynamicMessage = (
  calculation: PromotionCalculation,
  nextTier: NextTierInfo | null
): string => {
  const currentSavings = calculation.totalSavings;
  const hasDiscount = currentSavings > 0;

  if (!nextTier) {
    return `🎉 Maximum tier achieved! You're saving ${formatCurrency(currentSavings)} (${calculation.bestTierDiscount}% off)!`;
  }

  const gap = nextTier.skusNeeded || nextTier.amountNeeded;
  const projectedSavings = calculateProjectedSavings(nextTier);

  if (hasDiscount) {
    return `You're saving ${formatCurrency(currentSavings)}! Add ${gap} to unlock ${nextTier.tier.discountPercent}% OFF and save an additional ${formatCurrency(projectedSavings)}!`;
  } else {
    return `Add ${gap} to unlock ${nextTier.tier.discountPercent}% OFF and save ${formatCurrency(projectedSavings)}+ on your current order!`;
  }
};
```

**Typography**:
- Financial amounts: Bold, 18-20px, success green color
- Tier names: Bold, accent color (amber/emerald/indigo)
- Action text: Medium weight, neutral dark

---

## Phase 2: Total Savings KPI Prominence

### 2.1 Move Total Savings to Primary Position

**Current**: Small card at bottom of promotion component (line 250-264)

**New**: Large, prominent KPI card that's **always visible**, positioned strategically

**Placement Options** (In order of preference):

1. **Option A - Top Right Header** (Recommended for trade shows)
   - Floats in top-right of Selection tab header
   - Sticky position (always visible when scrolling)
   - Maximum visual prominence

2. **Option B - Dedicated Row Above Table**
   - Full-width card between promotion and table
   - Side-by-side with "What If" calculator
   - Easy to point at during sales conversation

3. **Option C - Sidebar Widget**
   - Persistent right rail (for desktop/trade show displays only)
   - Collapses on smaller screens

**Component**: `TotalSavingsKPI`

**Design Specification** (Per Design Principles IV.B):

```
┌──────────────────────────────────────────────────┐
│ ┃                                                 │ ← 4px green left border
│ ┃  TOTAL SAVINGS                                 │
│ ┃                                                 │
│ ┃  $12,840.50                                    │ ← 42px bold, green
│ ┃                                                 │
│ ┃  38% off WSP • $45,200 → $32,359.50            │ ← Context
│ ┃                                                 │
│ ┃  ↑ +$2,450 from last change                    │ ← Trend indicator
└──────────────────────────────────────────────────┘
```

**Features**:
- **Animated Counter**: Number animates when value changes (odometer effect)
- **Trend Arrow**: Shows increase/decrease since last update
- **Percentage Badge**: Shows savings as % of WSP total
- **Background**: Subtle gradient from green-50 to emerald-50
- **Shadow**: Elevated with `shadow-lg`
- **Responsive**: Scales font size based on screen width

**Implementation**:

```typescript
<div className="sticky top-0 z-20 bg-white dark:bg-gray-900 pb-4">
  <div className="flex items-center justify-between gap-4">
    <h2>Working Selection</h2>
    <TotalSavingsKPI
      savings={calculation.totalSavings}
      percentage={savingsPercentage}
      wspTotal={wspTotal}
      netTotal={netTotal}
      previousSavings={previousSavings} // From state
      animate={true}
    />
  </div>
</div>
```

**Trade Show Readiness**:
- Minimum font size for dollar amount: 42px (desktop), 32px (tablet)
- High contrast (7:1 ratio minimum)
- Visible from 15+ feet away
- No complex animations that distract

---

## Phase 3: Pricing Table Visual Hierarchy

### 3.1 Redesign Column Priorities

**Current State**:
All columns have roughly equal visual weight

**New Hierarchy** (Per Design Principles I.B):

| Column | Priority | Treatment |
|--------|----------|-----------|
| **Image** | Secondary | 60×60px, rounded, muted border |
| **SKU** | Tertiary | 14px mono, medium weight |
| **Name** | Secondary | 16px, medium weight, truncate if long |
| **Qty** | Primary (editable) | NumberInput with steppers, 18px |
| **Unit WSP** | Tertiary (context) | ~~Strikethrough~~, 14px, gray-500 |
| **Unit NET** | **PRIMARY** | **Bold, 18px, indigo-600, emphasis** |
| **Extended NET** | **PRIMARY** | **Bold, 20px, tabular-nums** |
| **Notes** | Secondary | Collapsible button (already implemented) |

### 3.2 Enhanced Discount Badge Display

**Current**: Small green badge next to NET price

**New Design**:

```
Unit WSP      Unit NET
$5,003.00     $4,252.55
(grayed,      (BOLD, indigo)
struck)
              ┌─────────────┐
              │ 15% OFF 🎉  │  ← Larger, more celebratory
              └─────────────┘
              (emerald bg, white text)
```

**Implementation**:
```tsx
<TableCell className="text-right">
  <div className="flex flex-col items-end gap-2">
    <div className="text-xs text-gray-500 line-through tabular-nums">
      {formatCurrency(item.unitList)}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
        {formatCurrency(item.netUnit)}
      </span>
      {discountPercent > 0 && (
        <Badge className="bg-emerald-500 text-white border-0 text-xs font-bold animate-in fade-in">
          {discountPercent}% OFF
        </Badge>
      )}
    </div>
  </div>
</TableCell>
```

### 3.3 Extended NET Column - The Bottom Line

**Purpose**: This is the number that matters most - what the customer actually pays for this line item.

**Visual Treatment**:
- Largest font in the row: 20px bold
- Tabular numbers for perfect alignment
- Optional: Subtle background highlight on hover
- Color: Neutral dark (not green - this is cost, not savings)

**Total Row Enhancement**:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Subtotal (WSP)                          $45,200.00        │ ← Gray, struck
│  Program Discounts                      -$12,840.50        │ ← Amber, negative
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│  NET TOTAL                               $32,359.50        │ ← 28px bold, indigo
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 4: "What If" Savings Calculator

### 4.1 Component Design

**Purpose**: Empower proactive decision-making by projecting financial benefits of reaching next tier

**Placement**: Side-by-side with Total Savings KPI (above table) OR floating widget (bottom-right)

**Component**: `WhatIfCalculator`

**Design** (Per Design Principles III.A):

```
┌─────────────────────────────────────────────────────────┐
│ 🧮 What If Calculator                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ What if you add 2 more SKUs?                           │
│                                                         │
│ ┌─────────────────┬─────────────────┐                  │
│ │ Current         │ Projected       │                  │
│ ├─────────────────┼─────────────────┤                  │
│ │ 3 SKUs          │ 5 SKUs          │                  │
│ │ 0% discount     │ 30% discount    │                  │
│ │ $32,359         │ $37,800         │                  │
│ │                 │                 │                  │
│ │ $0 saved        │ $7,640 saved 💰 │                  │
│ └─────────────────┴─────────────────┘                  │
│                                                         │
│ [Explore Products to Add →]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features**:
1. **Auto-Calculation**: Automatically suggests adding items to reach next tier
2. **Interactive Input**: Allow manual "what if" scenarios
3. **Visual Comparison**: Side-by-side current vs. projected
4. **Call-to-Action**: Button to jump to product catalog
5. **Smart Defaults**: If 2 away from tier, show "add 2 SKUs" scenario

**States**:
- **Default**: Shows next tier projection
- **Manual Mode**: User can input custom SKU count or dollar amount
- **Max Tier**: Shows "You've maxed out! Great job!" message

**Implementation**:

```typescript
const WhatIfCalculator = ({
  currentState,
  nextTier,
  onExploreProducts
}) => {
  const [hypotheticalSKUs, setHypotheticalSKUs] = useState(
    nextTier?.skusNeeded || 0
  );

  const projection = useMemo(() => {
    return calculateProjectedState(
      currentState,
      hypotheticalSKUs
    );
  }, [currentState, hypotheticalSKUs]);

  return (
    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
      {/* Component UI */}
    </Card>
  );
};
```

---

## Phase 5: Micro-Interactions & Celebrations

### 5.1 Tier Achievement Animation

**Trigger**: When `calculation.bestTierDiscount` increases

**Animation Sequence** (0.5s total):

1. **Burst Effect** (0.1s)
   - Radial confetti burst from milestone node
   - 8-12 particles in tier color
   - Particles fade and fall with gravity

2. **Node Transformation** (0.3s)
   - Scale up 1.0 → 1.2 → 1.0 (bounce easing)
   - Icon changes: 🎯 → ✓
   - Background: Indigo → Green gradient
   - Glow effect pulses 3 times

3. **Sound** (Optional, 0.1s)
   - Short, pleasant "ding" sound
   - Only if user preference allows

4. **Toast Notification** (3s display)
   ```
   ┌────────────────────────────────────┐
   │ 🎉 Tier Unlocked!                  │
   │ You're now saving 30% on display   │
   │ items. Total savings: $7,640!      │
   └────────────────────────────────────┘
   ```

**Implementation**:

```typescript
useEffect(() => {
  if (currentDiscount > previousDiscount) {
    // Trigger celebration
    triggerConfetti(currentTierNode);
    playAchievementSound();
    showToast({
      title: "🎉 Tier Unlocked!",
      description: `You're now saving ${currentDiscount}% on display items. Total savings: ${formatCurrency(totalSavings)}!`,
      variant: "success",
      duration: 5000
    });
  }
  setPreviousDiscount(currentDiscount);
}, [currentDiscount]);
```

### 5.2 Hover States & Interactivity

**Milestone Nodes**:
- Hover: Slight scale (1.05), show tooltip with tier details
- Locked nodes: Show "Add X more SKUs to unlock" tooltip

**Radial Goal Meter**:
- Hover: Expand slightly, show projected savings
- Click: Focus on product catalog filtered to items that help reach tier

**What If Calculator**:
- Interactive slider for SKU count
- Real-time recalculation (debounced 300ms)
- Hover on projected savings shows breakdown

---

## Phase 6: Responsive & Trade Show Optimization

### 6.1 Breakpoint Adaptations

**Trade Show Display (1920px+)**:
```
┌──────────────────────────────────────────────────────────┐
│  Header                            [Total Savings KPI]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Stepped Milestone Tracker - Full Width]    [Radial]   │
│                                                          │
├─────────────────────────────┬────────────────────────────┤
│                             │                            │
│  [Table - 8 columns]        │  [What If Calculator]     │
│  - Large images (80x80)     │  - Always visible         │
│  - 24px body text           │  - Sticky position        │
│  - Extra padding            │                            │
│                             │                            │
└─────────────────────────────┴────────────────────────────┘
```

**Desktop (1280-1919px)**:
- Stepped tracker: Horizontal
- Radial meter: Floats above tracker (absolute positioning)
- What If calculator: Below Total Savings KPI
- Table: Standard 8 columns

**Tablet (768-1023px)**:
- Stepped tracker: Horizontal, compressed nodes (56×56px)
- Radial meter: Inline before tracker
- What If calculator: Collapsible accordion
- Table: Hide image column, reduce to 7 columns

**Mobile (< 768px)**:
- Stepped tracker: Vertical stack
- Radial meter: Only component shown (primary focus)
- What If calculator: Bottom sheet
- Table: Card-based layout (one item per card)

### 6.2 Typography Scaling

| Element | Trade Show | Desktop | Mobile |
|---------|------------|---------|--------|
| Savings KPI | 42px | 32px | 28px |
| Tier labels | 24px | 18px | 16px |
| Body text | 20px | 16px | 14px |
| Table headers | 18px | 14px | 12px |
| Price (NET) | 20px | 18px | 16px |

---

## Phase 7: Implementation Order

### Sprint 1 (Week 1) - Core Visual Transformation
1. ✅ Create `SteppedMilestoneTracker` component
2. ✅ Create `MilestoneNode` component
3. ✅ Create `MilestoneConnector` component
4. ✅ Create `RadialGoalMeter` component
5. ✅ Implement dynamic financial messaging (DTR)
6. ✅ Replace linear progress bar in `promotion-progress.tsx`

### Sprint 2 (Week 1-2) - KPI & Calculator
7. ✅ Create `TotalSavingsKPI` component
8. ✅ Reposition Total Savings to header (sticky)
9. ✅ Create `WhatIfCalculator` component
10. ✅ Implement projection logic

### Sprint 3 (Week 2) - Table Redesign
11. ✅ Implement pricing table visual hierarchy
12. ✅ Enhance discount badge display
13. ✅ Improve Extended NET column prominence
14. ✅ Refine table density and spacing

### Sprint 4 (Week 2) - Polish & Interactions
15. ✅ Implement tier achievement animation
16. ✅ Add confetti effect library
17. ✅ Create toast notification system
18. ✅ Add hover states and tooltips
19. ✅ Responsive breakpoint testing

### Sprint 5 (Week 3) - Testing & Refinement
20. ✅ Trade show display testing (42"+ monitor)
21. ✅ User acceptance testing with reps
22. ✅ Performance optimization
23. ✅ Accessibility audit (WCAG AA)
24. ✅ Documentation and training materials

---

## Technical Specifications

### New Dependencies

```json
{
  "dependencies": {
    "react-confetti-explosion": "^2.1.2",  // Celebration animations
    "react-circular-progressbar": "^2.1.0", // Radial goal meter
    "framer-motion": "^11.0.0"              // Smooth animations
  }
}
```

### Component File Structure

```
app/customers/[id]/_components/
├── promotion-progress.tsx              (REFACTOR - orchestrator)
├── stepped-milestone-tracker.tsx       (NEW)
├── milestone-node.tsx                  (NEW)
├── milestone-connector.tsx             (NEW)
├── radial-goal-meter.tsx              (NEW)
├── total-savings-kpi.tsx              (NEW)
├── what-if-calculator.tsx             (NEW)
└── tier-celebration.tsx               (NEW)

components/ui/
├── animated-number.tsx                 (NEW - for KPI counter)
├── confetti.tsx                        (NEW - celebration wrapper)
└── tooltip.tsx                         (ENHANCE - for milestone hovers)
```

### State Management

**Add to `selection-tab.tsx`**:

```typescript
const [previousDiscount, setPreviousDiscount] = useState(0);
const [previousSavings, setPreviousSavings] = useState(0);
const [showCelebration, setShowCelebration] = useState(false);
const [achievedTier, setAchievedTier] = useState<number | null>(null);
```

---

## Success Metrics

### Quantitative KPIs

1. **Average Order Value (AOV)**: Increase by 25%+
   - Hypothesis: Financial transparency drives larger orders

2. **Tier Conversion Rate**: 60%+ of selections reach at least second tier
   - Hypothesis: Gamification motivates tier achievement

3. **What If Calculator Usage**: 40%+ of users interact with calculator
   - Hypothesis: Proactive planning increases engagement

4. **Time to Tier Decision**: Reduce by 30%
   - Hypothesis: Radial meter provides instant clarity

### Qualitative Feedback

1. Sales rep feedback: "Easier to have tier conversation"
2. Customer feedback: "Clear value proposition"
3. Trade show performance: "Catches attention from across the booth"

---

## Risk Mitigation

### Potential Issues

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Animation performance on large displays** | Medium | Use CSS transforms (GPU accelerated), limit particle count |
| **Information overload** | High | Progressive disclosure, hide calculator by default |
| **Accessibility with animations** | Medium | `prefers-reduced-motion` media query support |
| **Complex responsive breakpoints** | Low | Test early and often, use design system tokens |
| **Calculation accuracy** | High | Unit tests for all projection logic, QA validation |

---

## Rollout Plan

### Phase A: Internal Testing (Week 3)
- Deploy to staging environment
- Sales team training session
- Gather initial feedback
- Iterate on UX concerns

### Phase B: Limited Beta (Week 4)
- Select 3-5 customers for beta testing
- Monitor analytics closely
- A/B test messaging variations
- Collect customer feedback

### Phase C: Trade Show Preview (Week 5)
- Deploy to production
- Soft launch at small trade show
- Real-world validation
- Photo/video documentation

### Phase D: Full Launch (Week 6)
- Roll out to all users
- Marketing announcement
- Training documentation
- Continuous monitoring

---

## Maintenance & Iteration

### Post-Launch Activities

**Week 1-2**:
- Monitor error logs and performance
- Gather user feedback via surveys
- Watch session recordings (Hotjar/FullStory)

**Month 2-3**:
- Analyze A/B test results
- Implement quick wins from feedback
- Optimize based on usage patterns

**Quarterly**:
- Review success metrics
- Plan Phase 2 enhancements (AI recommendations, historical insights)
- Update design principles based on learnings

---

## Appendix A: Design Mockups

_To be created in Figma based on this plan_

1. Trade show display (1920×1080)
2. Desktop view (1440×900)
3. Tablet view (768×1024)
4. Mobile view (375×812)
5. Animation sequences (tier achievement)
6. Hover states and interactions

---

## Appendix B: Copy Variations for A/B Testing

### Tier Achievement Messages

**Variant A (Celebratory)**:
"🎉 Tier Unlocked! You're now saving 30%!"

**Variant B (Financial Focus)**:
"💰 You just unlocked $7,640 in savings!"

**Variant C (Progress Focus)**:
"⭐ Milestone Reached! 30% OFF activated."

### What If Calculator Headlines

**Variant A (Question)**:
"What if you added 2 more SKUs?"

**Variant B (Opportunity)**:
"Opportunity: Unlock $5,200 in additional savings"

**Variant C (Action)**:
"Add 2 SKUs to save $5,200 more"

---

**Plan Status**: ✅ Ready for Implementation
**Next Step**: Sprint 1 - Core Visual Transformation
**Estimated Timeline**: 3 weeks to full launch
