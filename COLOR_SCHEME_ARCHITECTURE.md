# Color Scheme Architecture: B2B Trust and Financial Clarity

**Date**: 2025-10-18
**Status**: Foundation Document
**Scope**: Customer Selection Tab (Initial Implementation)
**Reference**: First Principles for Professional B2B Color Systems

---

## Executive Summary

This document outlines the strategic framework for designing the color system of the B2B dashboard. The primary goal is to use color strategically to reinforce **professional trust**, establish **clear visual hierarchy**, and drive attention toward **measurable financial outcomes (ROI)**.

Color is a non-verbal communication tool that must align with B2B values: stability, reliability, transparency, and growth.

---

## I. Color Psychology for Professional Trust

Color choices must align with core B2B values, acting as a non-verbal cue that the system is stable, reliable, and focused on partnership growth.

### A. Core Color Roles

| Color Role | Psychological Association | Dashboard Application |
|:---|:---|:---|
| **Primary/Brand Accent** | Trust, stability, security, professionalism | **Blue** fills the Stepped Milestone Path and Radial Goal Meter, signaling brand identity and current progress in partnership status |
| **Semantic Success** | Growth, profit, positive outcomes | **Green** reserved for confirmation messaging and highlighting Secured Margin or positive financial trends |
| **Semantic Caution** | Warning, urgency, critical attention | **Red/Orange** reserved exclusively for errors, high-risk flags, or urgent required action. Avoid overuse to prevent visual fatigue |
| **Financial Accent** | Potential gain, high-value opportunity | **Warm Tones** (Amber/Gold) used to highlight Potential Margin or projected ROI, acting as a visual attractor for decision-makers |

### B. Color Semantic Mapping

#### Blue (Primary/Trust)
- **Meaning**: Professionalism, reliability, brand identity
- **Usage**:
  - Current partnership status indicators
  - Active milestone nodes
  - Primary action buttons
  - Unit NET pricing (the trusted contract price)
  - Progress meters and trackers
- **Psychology**: Communicates that the system is trustworthy and the information is accurate
- **Trade-offs**: Can feel cold if overused; balance with warm accent colors

#### Green (Success/Growth)
- **Meaning**: Financial success, positive outcomes, achieved goals
- **Usage**:
  - Total Margin Secured KPI
  - Completed milestone nodes
  - Savings badges and indicators
  - Positive trend arrows
  - "Status Achieved" confirmations
- **Psychology**: Reinforces the value delivered and motivates continued engagement
- **Trade-offs**: Must be reserved for genuine success to maintain impact

#### Amber/Gold (Opportunity/Attention)
- **Meaning**: High-value potential, opportunity, mid-tier achievement
- **Usage**:
  - 30%+ partnership status tier indicators
  - Potential margin projections
  - "What if" calculator highlights
  - Mid-priority notifications
- **Psychology**: Draws attention to opportunities without creating false urgency
- **Trade-offs**: Can appear promotional if overused; use sparingly

#### Emerald (High Achievement)
- **Meaning**: Premium status, maximum tier, excellence
- **Usage**:
  - 50%+ partnership status indicators
  - Highest tier milestone nodes
  - Maximum achievement celebrations
- **Psychology**: Signals premium status and aspirational goals
- **Trade-offs**: Reserved for top-tier achievements only

#### Gray/Neutral (Foundation)
- **Meaning**: Professional neutrality, clarity, structure
- **Usage**:
  - Body text and labels
  - Card backgrounds
  - Borders and dividers
  - Locked/future milestone indicators
- **Psychology**: Provides visual rest and allows accent colors to stand out
- **Trade-offs**: Essential for balance; prevents visual overload

#### Red (Error/Critical)
- **Meaning**: Error, danger, critical attention required
- **Usage**:
  - Error messages
  - Destructive actions (delete, remove)
  - Critical alerts only
- **Psychology**: Immediately signals problem requiring attention
- **Trade-offs**: Must be used sparingly to maintain effectiveness

---

## II. Color System Architecture (The Scaling Approach)

To ensure consistency and maintain visual integrity across the entire interface, colors must be defined as **functional roles** mapped to a **scalable palette**.

### A. Color Scales

The system uses Tailwind CSS's 9-shade scale (50-950) for every core color, allowing for subtle variations in background, border, and text colors.

**Standard Scale Pattern**:
- `50`: Lightest tint (backgrounds, subtle highlights)
- `100-200`: Light tones (hover states, secondary backgrounds)
- `300-400`: Medium-light (dark mode primary colors, icons)
- `500-600`: Core brand colors (light mode primary colors, buttons)
- `700-800`: Dark tones (text, emphasis, dark mode backgrounds)
- `900-950`: Darkest shades (high contrast text, deep backgrounds)

### B. Functional Role Assignment

Colors are assigned based on **purpose**, not arbitrary choices. This ensures consistency and semantic meaning.

#### Light Mode Functional Roles

```css
/* Primary/Brand (Blue) */
--color-primary-bg: blue-50          /* Subtle backgrounds */
--color-primary-border: blue-200     /* Standard borders */
--color-primary-text: blue-600       /* Primary text/icons */
--color-primary-emphasis: blue-700   /* Emphasized text */

/* Success (Green) */
--color-success-bg: green-50         /* Success message backgrounds */
--color-success-border: green-200    /* Success borders */
--color-success-text: green-600      /* Success text/icons */
--color-success-emphasis: green-700  /* Strong success indicators */

/* Financial Accent (Amber) */
--color-financial-bg: amber-50       /* Opportunity highlights */
--color-financial-border: amber-200  /* Attention borders */
--color-financial-text: amber-600    /* Opportunity text */

/* Premium (Emerald) */
--color-premium-bg: emerald-50       /* Premium tier backgrounds */
--color-premium-border: emerald-200  /* Premium borders */
--color-premium-text: emerald-600    /* Premium indicators */

/* Neutral */
--color-neutral-bg-1: white          /* Primary background */
--color-neutral-bg-2: gray-50        /* Secondary background */
--color-neutral-bg-3: gray-100       /* Tertiary background */
--color-neutral-text-1: gray-900     /* Primary text */
--color-neutral-text-2: gray-600     /* Secondary text */
--color-neutral-text-3: gray-500     /* Tertiary text */
--color-neutral-border: gray-200     /* Standard borders */
```

#### Dark Mode Functional Roles

```css
/* Primary/Brand (Blue) - Desaturated */
--color-primary-bg: blue-950/30      /* Subtle backgrounds */
--color-primary-border: blue-700     /* Standard borders */
--color-primary-text: blue-400       /* Primary text/icons */
--color-primary-emphasis: blue-300   /* Emphasized text */

/* Success (Green) - Desaturated */
--color-success-bg: green-950/30     /* Success backgrounds */
--color-success-border: green-700    /* Success borders */
--color-success-text: green-400      /* Success text/icons */
--color-success-emphasis: green-300  /* Strong success */

/* Financial Accent (Amber) - Desaturated */
--color-financial-bg: amber-950/30   /* Opportunity highlights */
--color-financial-border: amber-700  /* Attention borders */
--color-financial-text: amber-400    /* Opportunity text */

/* Premium (Emerald) - Desaturated */
--color-premium-bg: emerald-950/30   /* Premium backgrounds */
--color-premium-border: emerald-700  /* Premium borders */
--color-premium-text: emerald-400    /* Premium indicators */

/* Neutral - Elevation System */
--color-neutral-bg-1: gray-950       /* Base background (#121212) */
--color-neutral-bg-2: gray-900       /* Elevated cards (1dp) */
--color-neutral-bg-3: gray-800       /* Important widgets (4dp) */
--color-neutral-text-1: gray-100     /* Primary text */
--color-neutral-text-2: gray-400     /* Secondary text */
--color-neutral-text-3: gray-500     /* Tertiary text */
--color-neutral-border: gray-700     /* Standard borders */
```

### C. Visual Hierarchy: The 60-30-10 Rule

This classic design principle ensures visual balance and guides user attention effectively.

**Application to Customer Selection Tab**:

| Percentage | Color Type | Usage |
|:---|:---|:---|
| **60%** | Neutral/Foundation | White/gray backgrounds, standard text, card surfaces, neutral borders |
| **30%** | Primary/Brand | Blue accents on milestone tracker, progress meters, Unit NET pricing, section headers |
| **10%** | Accent/Action | Green for Total Margin Secured KPI, amber for opportunities, emerald for high tiers, CTAs |

**Practical Implementation**:
- **Dominant (60%)**: The page background, card backgrounds, body text, and structural elements use neutral grays/white
- **Secondary (30%)**: Blue is used for partnership status indicators, active nodes, and trusted pricing
- **Accent (10%)**: Green highlights financial success, amber shows opportunities, emerald marks premium achievements

**Why It Works**:
- Creates visual rest (60%) so accent colors (10%) have maximum impact
- Prevents color fatigue from overuse of high-saturation tones
- Ensures the most important information (Total Margin Secured) stands out

---

## III. Accessibility and Contrast (WCAG Standards)

Color must enhance clarity without creating barriers for users with visual impairments.

### A. WCAG 2.1 Level AA Requirements

The **minimum** standard for professional B2B applications.

#### 1. Text Contrast Ratios

| Text Type | Size Requirement | Minimum Contrast Ratio | Tailwind Example |
|:---|:---|:---|:---|
| **Normal Text** | < 18px (or < 14px bold) | **4.5:1** | `text-gray-900` on `bg-white` = 21:1 ✅ |
| **Large Text** | ≥ 18px (or ≥ 14px bold) | **3:1** | `text-gray-600` on `bg-white` = 7:1 ✅ |
| **UI Components** | Interactive elements | **3:1** | Button borders, icon outlines |

**Testing Tools**:
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Chrome DevTools: Lighthouse accessibility audit
- Figma: A11y - Color Contrast Checker plugin

#### 2. Non-Text Contrast

**Requirement**: User interface components and graphical elements must maintain a **3:1 contrast ratio** against adjacent colors.

**Application**:
- Milestone node borders against background
- Progress meter circles against card background
- Chart lines and data visualization elements
- Button outlines and focus indicators

**Example**:
```tsx
// ✅ GOOD: Border has 3:1+ contrast against background
<div className="bg-white border-2 border-gray-300">
  {/* gray-300 (#D1D5DB) vs white (#FFFFFF) = 3.3:1 */}
</div>

// ❌ BAD: Insufficient contrast
<div className="bg-white border-2 border-gray-100">
  {/* gray-100 (#F3F4F6) vs white (#FFFFFF) = 1.2:1 - FAILS */}
</div>
```

#### 3. Color Independence Principle

**Rule**: Information must **never** rely solely on color to convey meaning.

**Bad Practice ❌**:
```tsx
// Status only indicated by color
<div className="text-green-600">Active</div>
<div className="text-red-600">Error</div>
```

**Good Practice ✅**:
```tsx
// Status indicated by color + icon + text
<div className="flex items-center gap-2 text-green-600">
  <CheckCircle className="h-4 w-4" />
  <span>Active</span>
</div>
<div className="flex items-center gap-2 text-red-600">
  <AlertCircle className="h-4 w-4" />
  <span>Error</span>
</div>
```

**Application in Selection Tab**:
- ✅ Milestone nodes use icon + color (check, target, lock)
- ✅ Badges use text + background color ("30% Partnership Status")
- ✅ Success messages use checkmark icon + green color
- ✅ Discount percentages use "% OFF" text + colored badge

### B. Dark Mode Desaturation Principle

**Problem**: Highly saturated colors vibrate against dark backgrounds, causing:
- Eye strain and visual fatigue
- Failed contrast checks (overly bright against dark surfaces)
- Unprofessional appearance

**Solution**: Desaturate and lighten accent colors in dark mode.

#### Desaturation Strategy

| Light Mode | Dark Mode | Adjustment |
|:---|:---|:---|
| `blue-600` (#2563EB) | `blue-400` (#60A5FA) | Lightened 2 steps, desaturated |
| `green-600` (#16A34A) | `green-400` (#4ADE80) | Lightened 2 steps, desaturated |
| `amber-600` (#D97706) | `amber-400` (#FBBF24) | Lightened 2 steps, desaturated |
| `emerald-600` (#059669) | `emerald-400` (#34D399) | Lightened 2 steps, desaturated |

**Why 400-shade in Dark Mode?**:
- 600-shades are too saturated against dark backgrounds (fail contrast, cause eye strain)
- 300-shades are too light (fail contrast in the opposite direction)
- 400-shades hit the "Goldilocks zone" - sufficient contrast without vibration

**Implementation Pattern**:
```tsx
// Dual-mode color with proper desaturation
<div className="text-blue-600 dark:text-blue-400">
  Achieve 30% partnership status
</div>

// Background with proper desaturation
<div className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-700">
  Margin secured: $2,450
</div>
```

---

## IV. Component-Specific Color Guidelines

### A. Total Margin Secured KPI (Highest Priority)

**Role**: The single most important metric on the page - must have maximum visual impact

**Color Strategy**:
- **Background**: Green gradient (light) / Gray-800 elevated (dark)
- **Border**: Green-500 left accent (light) / Green-400 (dark)
- **Amount**: Green-600 (light) / Green-400 (dark), 42px+ font
- **Label**: Green-700 (light) / Green-300 (dark), uppercase

**Rationale**: Green semantically represents financial success. The large size + high contrast + border accent ensures it dominates the visual hierarchy.

### B. Partnership Status Indicator (Current Tier)

**Role**: Shows current achieved discount level

**Color Strategy**:
- **Badge Background**:
  - 30%+ tier: Amber-100 (light) / Amber-900/50 (dark)
  - 50%+ tier: Emerald-100 (light) / Emerald-900/50 (dark)
  - Lower tiers: Blue-100 (light) / Blue-900/50 (dark)
- **Badge Text**: Matching 600 (light) / 400 (dark) shade
- **Typography**: Bold, 24px+, uppercase "% Partnership Status"

**Rationale**: Tier color differentiation helps users instantly recognize their achievement level.

### C. Milestone Tracker (Progress Visualization)

**Role**: Visual journey map showing progress toward partnership tiers

**Color Strategy**:

| State | Node Color | Ring Color | Icon | Background |
|:---|:---|:---|:---|:---|
| **Completed** | Green-500/600 | Green-200/800 | Check | Green-100/900 |
| **Active (30%+)** | Amber-500/600 | Amber-200/800 | Target | Amber-100/900 |
| **Active (50%+)** | Emerald-500/600 | Emerald-200/800 | Target | Emerald-100/900 |
| **Active (other)** | Blue-500/600 | Blue-200/800 | Target | Blue-100/900 |
| **Locked** | Gray-300/700 | Gray-200/600 | Lock | Gray-100/800 |

**Rationale**:
- Completed uses green (success)
- Active uses tier-appropriate color (blue/amber/emerald)
- Locked uses neutral gray (not yet achievable)

### D. Radial Goal Meter

**Role**: Real-time progress visualization toward next partnership threshold

**Color Strategy**:
- **Progress Arc**:
  - 0-33%: Gray-400/500
  - 34-66%: Amber-500/400
  - 67-89%: Blue-500/400
  - 90-100%: Emerald-500/400
- **Background Circle**: Gray-200 (light) / Gray-700 (dark)
- **Percentage Text**: Matches progress arc color
- **Label Text**: Gray-600 (light) / Gray-400 (dark)

**Rationale**: Color intensifies as user approaches goal, creating motivational momentum.

### E. Partnership Planning Calculator (What If)

**Role**: Scenario planning tool for exploring higher partnership tiers

**Color Strategy**:
- **Card Border**: Blue-200 (light) / Gray-700 (dark)
- **Card Background**: White (light) / Gray-900 (dark)
- **Header Background**: Blue-50 (light) / Gray-800 (dark)
- **Tier Cards**:
  - 50%+ tier: Emerald border/background
  - 30%+ tier: Amber border/background
  - Lower tiers: Blue border/background
- **Margin Projection**: Green-600/400 (financial opportunity)

**Rationale**: Maintains tier color consistency while using green to highlight financial opportunity.

### F. Pricing Table

**Role**: Transparent display of unit pricing and extended totals

**Color Strategy**:

| Element | Light Mode | Dark Mode | Rationale |
|:---|:---|:---|:---|
| **Unit NET (Primary)** | Blue-600, bold, 18px | Blue-400, bold, 18px | Trust color for contract price |
| **Unit WSP (Secondary)** | Gray-500, strikethrough, 14px | Gray-500, strikethrough, 14px | Demoted value anchor |
| **Extended NET** | Gray-900, extra bold, 20px | Gray-100, extra bold, 20px | High contrast for total |
| **Discount Badge** | Green-600 bg, white text | Green-400 bg, gray-900 text | Success indicator |

**Rationale**: Unit NET uses trust color (blue) to reinforce it as the reliable contract price. Extended NET uses high contrast for clarity. Discount uses green (success/savings).

### G. Achievement Celebration

**Role**: Full-screen celebration when partnership status is achieved

**Color Strategy**:
- **Overlay**: Black/40 (semi-transparent, modal backdrop)
- **Card Background**:
  - 50%+ tier: Emerald-50 to Green-100 (light) / Gray-800 (dark)
  - 30%+ tier: Amber-50 to Yellow-100 (light) / Gray-800 (dark)
  - Lower tiers: Blue-50 to Sky-100 (light) / Gray-800 (dark)
- **Trophy Icon**: Tier color 500-shade
- **Confetti**: Tier-appropriate color palette
- **Margin Amount**: Green-600/400 (financial success)

**Rationale**: Tier-specific colors create memorable achievement moments while green emphasizes financial value.

---

## V. Implementation Checklist

### Phase 1: Foundation ✅ (Completed)
- [x] Create COLOR_SCHEME_ARCHITECTURE.md
- [x] Implement dual-mode design system (DUAL_MODE_DESIGN_SYSTEM.md)
- [x] Replace purple/orange scheme with blue/green accents
- [x] Apply desaturation principle to dark mode

### Phase 2: Functional Role System (Current Focus)
- [ ] Audit all color usage in Customer Selection tab components
- [ ] Verify 60-30-10 visual hierarchy ratio
- [ ] Ensure all text meets 4.5:1 contrast minimum
- [ ] Ensure all UI components meet 3:1 contrast minimum
- [ ] Confirm no information relies solely on color

### Phase 3: Component-Specific Refinement
- [ ] Review Total Margin Secured KPI prominence
- [ ] Verify milestone tracker tier color differentiation
- [ ] Test radial meter color progression
- [ ] Validate pricing table color hierarchy
- [ ] Review achievement celebration tier colors

### Phase 4: Accessibility Testing
- [ ] Run WAVE browser extension audit
- [ ] Run Chrome DevTools Lighthouse accessibility scan
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Manual contrast testing with WebAIM tool
- [ ] User testing with color vision deficiency simulation

---

## VI. Color Usage Decision Tree

Use this decision tree when choosing colors for new components or features:

```
START: What is the purpose of this element?

├─ Does it represent TRUST or PRIMARY ACTION?
│  └─ Use BLUE (primary brand color)
│     └─ Examples: Current status, Unit NET pricing, primary buttons
│
├─ Does it represent FINANCIAL SUCCESS or POSITIVE OUTCOME?
│  └─ Use GREEN (semantic success)
│     └─ Examples: Total Margin Secured, achieved milestones, savings
│
├─ Does it represent OPPORTUNITY or MID-TIER ACHIEVEMENT?
│  └─ Use AMBER (financial accent)
│     └─ Examples: 30% tier indicators, potential margin, attention items
│
├─ Does it represent PREMIUM STATUS or HIGH ACHIEVEMENT?
│  └─ Use EMERALD (premium indicator)
│     └─ Examples: 50%+ tier, maximum status, excellence
│
├─ Does it represent ERROR or CRITICAL ACTION?
│  └─ Use RED (semantic danger)
│     └─ Examples: Error messages, destructive actions, critical alerts
│
└─ Is it NEUTRAL STRUCTURE or INACTIVE?
   └─ Use GRAY (neutral foundation)
      └─ Examples: Backgrounds, borders, locked states, body text
```

---

## VII. Anti-Patterns (What NOT to Do)

### ❌ DON'T: Overuse Accent Colors

**Bad Practice**:
```tsx
// Every element is a bright color - creates visual chaos
<div className="bg-blue-500">
  <h1 className="text-green-500">Title</h1>
  <p className="text-amber-500">Body text in amber</p>
  <button className="bg-emerald-500">Click</button>
</div>
```

**Good Practice**:
```tsx
// 60% neutral, 30% primary, 10% accent
<div className="bg-white"> {/* 60% neutral foundation */}
  <h1 className="text-gray-900">Title</h1> {/* 60% neutral text */}
  <p className="text-gray-600">Body text</p> {/* 60% neutral text */}
  <div className="text-blue-600">Status: Active</div> {/* 30% primary */}
  <button className="bg-green-600 text-white">Save $2,450</button> {/* 10% accent CTA */}
</div>
```

### ❌ DON'T: Use Saturated Colors in Dark Mode

**Bad Practice**:
```tsx
// Same saturation in both modes - will fail contrast in dark
<div className="text-blue-600 dark:text-blue-600">
  Partnership status
</div>
```

**Good Practice**:
```tsx
// Desaturated in dark mode
<div className="text-blue-600 dark:text-blue-400">
  Partnership status
</div>
```

### ❌ DON'T: Rely Solely on Color

**Bad Practice**:
```tsx
// Status only indicated by text color
<span className="text-green-600">Achieved</span>
<span className="text-amber-600">In Progress</span>
<span className="text-gray-600">Locked</span>
```

**Good Practice**:
```tsx
// Status indicated by icon + color + text
<div className="flex items-center gap-2">
  <CheckCircle className="h-4 w-4 text-green-600" />
  <span className="text-green-600">Achieved</span>
</div>
<div className="flex items-center gap-2">
  <Target className="h-4 w-4 text-amber-600" />
  <span className="text-amber-600">In Progress</span>
</div>
<div className="flex items-center gap-2">
  <Lock className="h-4 w-4 text-gray-600" />
  <span className="text-gray-600">Locked</span>
</div>
```

### ❌ DON'T: Use Pure Black or Pure White

**Bad Practice**:
```tsx
// Extreme contrast causes eye strain
<div className="bg-black text-white">
  Content
</div>
```

**Good Practice**:
```tsx
// Softer, more comfortable contrast
<div className="bg-gray-950 text-gray-100 dark:bg-gray-950 dark:text-gray-100">
  Content
</div>
```

---

## VIII. Testing and Validation

### A. Automated Testing Tools

1. **Chrome DevTools - Lighthouse**
   - Run: DevTools > Lighthouse > Accessibility
   - Checks: Contrast ratios, ARIA labels, keyboard navigation
   - Target: Score ≥ 90

2. **WAVE Browser Extension**
   - Install: https://wave.webaim.org/extension/
   - Checks: Color contrast, structural elements, ARIA
   - Target: 0 errors, minimal alerts

3. **WebAIM Contrast Checker**
   - URL: https://webaim.org/resources/contrastchecker/
   - Manual testing of specific color combinations
   - Target: All text ≥ 4.5:1, UI elements ≥ 3:1

### B. Manual Testing Procedures

1. **Color Vision Deficiency Simulation**
   - Chrome DevTools > Rendering > Emulate vision deficiencies
   - Test: Protanopia, Deuteranopia, Tritanopia, Achromatopsia
   - Verify: Information is still comprehensible without color

2. **Screen Reader Testing**
   - macOS: VoiceOver (Cmd+F5)
   - Windows: NVDA (free download)
   - Verify: All interactive elements are announced correctly

3. **Keyboard Navigation**
   - Navigate entire interface using only Tab/Shift+Tab
   - Verify: All interactive elements are reachable and have visible focus states

---

## IX. References & Resources

- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Material Design Color System**: https://m3.material.io/styles/color/overview
- **Tailwind CSS Colors**: https://tailwindcss.com/docs/customizing-colors
- **"The Psychology of Color in Marketing and Branding"**: Research on color associations
- **"Designing for Color Blindness"**: A11y best practices

---

**Document Control**:
- Version: 1.0
- Last Updated: 2025-10-18
- Owner: Design Team
- Review Cycle: Quarterly
- Related Documents:
  - `DUAL_MODE_DESIGN_SYSTEM.md`
  - `B2B_STRATEGIC_SALES_DESIGN_BLUEPRINT.md`
  - `DESIGN_PRINCIPLES.md`
