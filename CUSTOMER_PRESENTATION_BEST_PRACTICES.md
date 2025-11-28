# UX/UI Architecture: Immersive Sticky-Context Layout

## Executive Summary

This document analyzes the immersive user experience that integrates rich-media hero sections with an asymmetrical, sticky-context product grid. The design transitions from a full-bleed "immersive" state to an asymmetrical "functional" state, where a "sticky macro shot" provides persistent context for the product grid.

### Key Challenges

1. **Layout Complexity**: Managing the interaction between a full-bleed hero element and a subsequent, non-centered sticky child element.
2. **Interaction "Squeeze"**: The competing screen real estate demands of a sticky left-side image and a persistent right-side functional sidebar, which can compromise the central content area.

### Recommendations

This analysis advocates for a robust, hybrid implementation:
- **CSS Grid** for fundamental page architecture
- **CSS `position: sticky`** for persistent-state behavior
- **JavaScript (GSAP ScrollTrigger)** for complex scroll-driven transitions
- **"Content-First" Responsive Strategy** that prioritizes the functional product grid over aesthetic elements at smaller desktop viewports

---

## Table of Contents

1. [The Asymmetrical Sticky Context](#part-1-the-asymmetrical-sticky-context)
2. [The Immersive Header](#part-2-the-immersive-header)
3. [Animation Architecture](#part-3-animation-architecture)
4. [Functional UI: Collapsible Sidebar](#part-4-functional-ui-collapsible-sidebar)
5. [Unified Layout: Managing Dual Sidebars](#part-5-unified-layout-managing-dual-sidebars)
6. [Implementation Blueprint](#part-6-implementation-blueprint)

---

## Methodology

This analysis synthesizes:
- Asymmetrical layout theory
- CSS implementation (CSS Grid, Flexbox, `position: sticky`)
- Advanced animation architecture
- E-commerce user experience patterns
- Responsive design best practices

---

## Part 1: The Asymmetrical Sticky Context

### 1.1 Defining the "Sticky-Context" Pattern

The proposed layout is an advanced evolution of the standard split-screen design:

1. **Initiates**: Single-column, full-bleed immersive experience
2. **Transitions**: On scroll into a two-column, asymmetrical layout
3. **Product Grid**: "Slightly offset to the right", creating a dedicated vertical "lane" on the left
4. **Sticky Macro Shot**: Functions as a **Contextual Anchor**, perpetually reinforcing the "feeling of the texture"

**Purpose**: Bridges the user's emotional and cognitive modes, solving the cognitive dissonance between an emotional, brand-rich hero and a functional product grid.

### 1.2 Technical Architecture: CSS Grid and `position: sticky`

Implementation relies on CSS Grid for layout and `position: sticky` for persistence.

#### CSS Grid Architecture

```css
.page-wrapper {
  display: grid;
  grid-template-columns:
    [gutter-L] 1fr
    [col-1-start] minmax(300px, 25vw)
    [col-2-start] 3fr
    1fr;
}
```

**This establishes:**
- Left column for sticky image
- Main content column on the right
- Outer gutters for alignment

#### `position: sticky` Mechanics

```css
.macro-shot-column {
  position: sticky;
  top: 80px; /* Offset by header height */
  grid-column: col-1-start;
}
```

**Critical Implementation Detail**: An element is only "sticky" within the scrolling bounds of its direct parent container.

**Correct Architecture**:
```html
<div class="sticky-container"> <!-- Shared parent wrapper -->
  <div class="macro-shot-column">
    <!-- Sticky macro shot -->
  </div>
  <div class="product-grid">
    <!-- Scrolling product content -->
  </div>
</div>
```

### 1.3 The "Full-Bleed" Problem

**Challenge**: Ensuring `position: sticky` elements interact correctly with preceding full-bleed hero elements.

**Solution**: "Padding Calculations" method using a single, page-wide CSS Grid.

```css
body {
  display: grid;
  grid-template-columns:
    [full-start] minmax(1rem, 1fr)
    [content-start] minmax(0, 1200px)
    [content-end] minmax(1rem, 1fr)
    [full-end];
}

.hero-banner {
  grid-column: full-start / full-end; /* Spans all columns - full bleed */
}

.macro-shot-column {
  grid-column: content-start;
  position: sticky;
  top: 80px;
}

.product-grid {
  grid-column: content-start / content-end;
}
```

**Benefits**:
- Prevents layout shifts
- Avoids z-index conflicts
- Bakes asymmetrical layout into page structure

### 1.4 The "Contextual Anchor" as a UX Pattern

**Insight**: In luxury e-commerce, the purchase decision is emotional, but the selection process is cognitive. Standard flows abandon emotional context during the cognitive task of shopping.

**This layout refuses this context-switch.**

The sticky macro shot:
- Functions as a persistent emotional primer
- Repurposes the "sticky" pattern (typically used for navigation or "Add to Cart" buttons) for a purely aesthetic and emotional purpose
- Maintains the "feeling of the texture" while users browse products

---

## Part 2: The Immersive Header

### 2.1 Handling the Video Hero

For a video hero, the full-bleed video container simply scrolls up and out of the viewport.

**The "transition" is cinematic**:
- One content block succeeds the next
- Managed by animation architecture (see Part 3)
- Creates a seamless fade

```html
<div class="hero-banner">
  <video autoplay muted loop playsinline>
    <source src="collection-video.mp4" type="video/mp4">
  </video>
</div>
```

### 2.2 Deconstructing the "Ken Burns" Hero

For collections without video, a "Ken Burns style" hero creates visual interest with a looping CSS animation.

```css
@keyframes kenBurnsLoop {
  0% {
    transform: scale(1) translate(0, 0);
  }
  100% {
    transform: scale(1.1) translate(-2%, -2%);
  }
}

.hero-ken-burns {
  animation: kenBurnsLoop 15s ease-in-out infinite alternate;
  transform-origin: center center;
}
```

**Result**: Creates a subtle "pan in, pan out" loop effect that adds life to static imagery.

### 2.3 The "Image Reservoir" Concept

**Key Question**: How does the hero image "move off to the left" to become the sticky macro shot?

**Answer**: It doesn't. Use two separate elements.

**Element 1**: Full-bleed hero banner (wide shot)
**Element 2**: Sticky macro shot (close-up, textural image)

**The "Transition" is a Cinematic "Sleight of Hand"**:
- As user scrolls, Element 1 (hero) scrolls out of view
- Element 2 (macro shot, already in place but `opacity: 0`) animates into view
- This "cross-fade" feels like a transformation but is a reliable replacement

#### CMS "Image Reservoir" Pattern

```typescript
interface CollectionMedia {
  media_hero: string;        // Video file OR full-bleed Ken Burns image
  media_macro_1: string;     // Primary sticky macro shot
  media_macro_2?: string;    // Optional second macro shot
}
```

**Benefits**:
- More robust than transforming a single element
- Allows optimization of each image for its specific purpose
- Enables different aspect ratios/crops for hero vs. macro

---

## Part 3: Animation Architecture

Two distinct jobs must be performed:

1. **The Persistent State**: Making the macro shot remain on the left (layout-state problem)
2. **The Transition Event**: The "magic" cross-fade (animation linked to scrollbar)

### 3.1 Solution A: Native CSS Scroll-Driven Animations

**Description**: New, performant API for linking animations to scroll position.

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.macro-shot-column {
  animation: fadeIn linear;
  animation-timeline: scroll(root);
  animation-range: 0vh 20vh;
}
```

**Pros**:
- ✅ Excellent, "jank-free" performance (runs off main thread)
- ✅ Native browser support

**Cons**:
- ⚠️ Very new API
- ⚠️ Complex orchestration of multiple animations can be difficult

### 3.2 Solution B: JavaScript (GSAP ScrollTrigger)

**Description**: Industry-standard JavaScript library for complex, cross-browser-compatible animations.

```javascript
gsap.timeline({
  scrollTrigger: {
    trigger: ".hero-banner",
    start: "bottom bottom",
    end: "bottom top",
    scrub: 0.5, // Directly links animation to scrollbar
  }
})
.to(".hero-banner", { opacity: 0 })
.to(".macro-shot-column", { opacity: 1 }, "<"); // "<" means start at same time
```

**Key Features**:
- `scrub: true`: Directly links animation progress to scrollbar
- **Orchestration**: GSAP's primary strength - precise multi-element animations
- **Pinning**: Can also handle "stickiness" using `pin: true`

**Pros**:
- ✅ Robust, cross-browser compatible
- ✅ Flexible for any animation complexity
- ✅ Battle-tested in production

**Cons**:
- ⚠️ Runs on main thread (theoretically less performant than CSS-only)

### 3.3 ✅ Recommended: Hybrid Approach

**Best of both worlds**:

1. **Use CSS `position: sticky`** for the persistent state of the macro shot
2. **Use GSAP ScrollTrigger** for the transition event (cross-fade)

#### Implementation Logic

```css
/* CSS handles the persistent state */
.macro-shot-column {
  position: sticky;
  top: 80px;
  opacity: 0; /* Initially invisible */
}
```

```javascript
// GSAP handles the transition
gsap.timeline({
  scrollTrigger: {
    trigger: ".hero-banner",
    start: "bottom bottom",
    end: "bottom top",
    scrub: 0.5,
  }
})
.to(".hero-banner", { opacity: 0 })
.to(".macro-shot-column", { opacity: 1 }, "<");
```

**Workflow**:
1. Macro shot is styled with `position: sticky; opacity: 0`
2. GSAP ScrollTrigger monitors scroll position
3. Scroll-driven animation cross-fades hero → macro shot
4. Once complete, native CSS `position: sticky` takes over
5. Macro shot remains visible and sticky

### Table 3.1: Animation Technology Comparison

| Feature | Native CSS Scroll-Driven | GSAP ScrollTrigger | Recommended |
|---------|-------------------------|-------------------|-------------|
| **Performance** | Excellent (Off-Main-Thread) | Very Good (JS-based) | Hybrid: GSAP for transition, CSS for persistence |
| **Browser Support** | Good, but very new | Excellent (Battle-Tested) | GSAP's broad support is safer |
| **Orchestration** | Complex | Excellent (Single Timeline) | GSAP: Use for complex cross-fade |
| **Pinning** | N/A (Use `position: sticky`) | Built-in (`pin: true`) | CSS: Use native `position: sticky` for final state |

---

## Part 4: Functional UI: Collapsible Sidebar

### 4.1 Pattern Identification: "Collapsible Tool"

The "Working Selection" button is a persistent, collapsible sidebar:
- **Collapsed State**: Icon-only, saves real estate
- **Expanded State**: Full panel with selection details
- **Function**: "Persistent cart" or "selection manager"

### 4.2 The "Push vs. Overlay" Problem

**Critical Question**: What happens on click?

#### ❌ "Push" Behavior
- Panel slides out and pushes main content left
- Causes jarring "reflow"
- Poor user experience

#### ✅ "Overlay" Behavior
- Panel slides over main content
- Temporarily obscures right-most content
- **This is the only viable option**

### Implementation

```css
/* Trigger Button */
.working-selection-trigger {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 998;
}

/* Overlay Panel */
.working-selection-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 400px;
  background: white;
  box-shadow: -4px 0 12px rgba(0,0,0,0.15);
  transform: translateX(100%); /* Hidden off-screen */
  transition: transform 0.3s ease;
  z-index: 999;
}

.working-selection-panel.open {
  transform: translateX(0); /* Slide in */
}

/* Scrim (backdrop) */
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 998;
}

.scrim.active {
  opacity: 1;
  pointer-events: auto;
}
```

```javascript
// Toggle panel
const trigger = document.querySelector('.working-selection-trigger');
const panel = document.querySelector('.working-selection-panel');
const scrim = document.querySelector('.scrim');

trigger.addEventListener('click', () => {
  panel.classList.toggle('open');
  scrim.classList.toggle('active');
});

scrim.addEventListener('click', () => {
  panel.classList.remove('open');
  scrim.classList.remove('active');
});
```

---

## Part 5: Unified Layout: Managing Dual Sidebars

### 5.1 Defining the Three-Lane Architecture

**Lane 1 (Left)**: Sticky Macro Shot (Aesthetic Context)
**Lane 2 (Center)**: Scrolling Product Grid (Functional Content)
**Lane 3 (Right)**: Sticky "Working Selection" Button (Functional Tool)

**Challenge**: This creates a "dual sidebar" or "narrow content area" problem where the primary content (Lane 2) is "squeezed."

### 5.2 The "Squeeze" Problem

**Issue**: Layout becomes cramped on smaller desktop viewports (e.g., 13-inch laptop).

**Fundamental Shortcoming of Viewport-Based Media Queries**:
- A media query (`@media (max-width: 1024px)`) knows the viewport width
- But NOT the actual available space for the product grid (already reduced by Lane 1)
- Layout will break long before the viewport-based media query fires

**Accessibility "Trap"**:

1. **Zoom**: As user zooms, sticky left and fixed right elements converge, completely obscuring central content
2. **Keyboard Navigation**: Focusable elements may be hidden underneath sticky panels
3. **Cognitive Load**: Multiple sticky elements create high-distraction environment

### 5.3 ✅ Solution: "Content-First" Responsive Breakpoint

**Strategy**: The central product grid (Lane 2) is the primary function and must be protected. The sticky macro shot (Lane 1) is an aesthetic luxury.

#### Responsive Breakpoints

```css
/* Wide Desktop (> 1440px): Full three-lane layout */
@media (min-width: 1441px) {
  .page-wrapper {
    grid-template-columns:
      [gutter-L] 1fr
      [col-1-start] 25vw
      [col-2-start] 3fr
      1fr;
  }

  .macro-shot-column {
    display: block;
  }
}

/* Standard/Small Desktop (≤ 1440px): Remove sticky macro */
@media (max-width: 1440px) {
  .page-wrapper {
    grid-template-columns:
      [gutter-L] 1fr
      [col-2-start] 3fr
      1fr;
  }

  .macro-shot-column {
    display: none; /* Proactively remove aesthetic element */
  }

  .product-grid {
    grid-column: col-2-start; /* Expands to take available space */
  }
}
```

**Priority Order**:
1. **Preserve**: Product grid (primary function)
2. **Preserve**: Working Selection button (functional tool)
3. **Sacrifice**: Sticky macro shot (aesthetic luxury)

**This strategy** - preemptively giving up the aesthetic element to preserve the functional one - is the hallmark of a robust, user-centric UI architecture.

---

## Part 6: Implementation Blueprint

### 6.1 Final Architectural Recommendations

1. **Layout**: Use CSS Grid for page-level architecture to semantically manage asymmetrical columns and full-bleed hero elements

2. **Stickiness**: Use CSS `position: sticky` for persistent behavior of left macro shot

3. **Transition**: Use GSAP ScrollTrigger for complex animation transitioning from full-bleed hero to split-screen layout

4. **Right Sidebar**: Implement "Working Selection" button as `position: fixed` element. Must trigger an overlay panel (drawer) and must NOT "push" main page content

5. **Responsiveness**: Proactively disable sticky left macro shot (Lane 1) at mid-desktop breakpoint (~1440px) to protect functional integrity of product grid

6. **Accessibility**:
   - Use `scroll-padding-top` to account for sticky header
   - All sticky and fixed elements must be keyboard-accessible
   - Test extensively at 200%-400% zoom levels to prevent content obstruction

7. **CMS**: Architect around "Image Reservoir" concept:
   - One hero (video/image)
   - Two to three "contextual macro" images

### 6.2 Final Implementation Blueprint

#### Table 6.1: Final CSS/JS Architecture

| Element | CSS/JS Implementation | Key Properties | Rationale |
|---------|----------------------|----------------|-----------|
| **Page Wrapper** | CSS Grid | `display: grid;`<br>`grid-template-columns: [gutter-L] 1fr [col-1-start] 25vw [col-2-start] 3fr 1fr;` | Defines asymmetrical "lanes" and gutters for entire page |
| **Hero Banner** | CSS | `grid-column: 1 / -1;` | Spans all grid columns for full-bleed effect |
| **Hero Transition** | GSAP ScrollTrigger | `gsap.timeline({ scrollTrigger: { trigger: ".hero-banner", scrub: 0.5 } })` | Manages complex, scroll-driven cross-fade between hero and content |
| **Left Macro Column** | CSS | `grid-column: col-1-start;`<br>`position: sticky;`<br>`top: 80px;` | Core "sticky context" implementation, offset by header |
| **Right Product Grid** | CSS | `grid-column: col-2-start;` | Main scrolling content area |
| **"Working Selection" Button** | CSS | `position: fixed;`<br>`right: 20px;`<br>`top: 50%;`<br>`z-index: 998;` | Persistent, fixed "tool" that lives outside main layout grid |
| **"Working Selection" Panel** | CSS + JS | `position: fixed;`<br>`right: 0;`<br>`top: 0;`<br>`height: 100vh;`<br>`transform: translateX(100%);` | Overlay/drawer triggered by JS, sliding over content |

---

## Complete Implementation Example

### HTML Structure

```html
<body>
  <!-- Full-bleed Hero -->
  <div class="hero-banner">
    <video autoplay muted loop playsinline class="hero-video">
      <source src="collection-hero.mp4" type="video/mp4">
    </video>
  </div>

  <!-- Sticky Context + Product Grid -->
  <div class="page-wrapper">
    <!-- Left: Sticky Macro Shot -->
    <aside class="macro-shot-column">
      <img src="texture-macro.jpg" alt="Collection detail" />
    </aside>

    <!-- Center: Scrolling Product Grid -->
    <main class="product-grid">
      <div class="product-card">...</div>
      <div class="product-card">...</div>
      <div class="product-card">...</div>
      <!-- More products... -->
    </main>
  </div>

  <!-- Right: Working Selection (Fixed) -->
  <button class="working-selection-trigger">
    <svg>...</svg>
    <span class="badge">3</span>
  </button>

  <!-- Working Selection Panel (Overlay) -->
  <aside class="working-selection-panel">
    <h2>Working Selection</h2>
    <!-- Selection content... -->
  </aside>

  <!-- Scrim -->
  <div class="scrim"></div>
</body>
```

### CSS Implementation

```css
/* Page-level Grid Architecture */
body {
  display: grid;
  grid-template-columns:
    [full-start] minmax(1rem, 1fr)
    [content-start] minmax(0, 1200px)
    [content-end] minmax(1rem, 1fr)
    [full-end];
}

/* Full-bleed Hero */
.hero-banner {
  grid-column: full-start / full-end;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.hero-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Asymmetrical Content Grid */
.page-wrapper {
  grid-column: content-start / content-end;
  display: grid;
  grid-template-columns:
    [col-1-start] minmax(300px, 25vw)
    [col-2-start] 1fr;
  gap: 2rem;
}

/* Sticky Macro Shot */
.macro-shot-column {
  grid-column: col-1-start;
  position: sticky;
  top: 80px;
  height: fit-content;
  opacity: 0; /* Initially hidden - GSAP will animate */
}

.macro-shot-column img {
  width: 100%;
  height: auto;
  border-radius: 8px;
}

/* Scrolling Product Grid */
.product-grid {
  grid-column: col-2-start;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* Responsive: Content-First Breakpoint */
@media (max-width: 1440px) {
  .page-wrapper {
    grid-template-columns: 1fr;
  }

  .macro-shot-column {
    display: none;
  }

  .product-grid {
    grid-column: 1;
  }
}
```

### JavaScript Implementation

```javascript
// GSAP ScrollTrigger for Hero → Macro transition
gsap.registerPlugin(ScrollTrigger);

gsap.timeline({
  scrollTrigger: {
    trigger: ".hero-banner",
    start: "bottom bottom",
    end: "bottom top",
    scrub: 0.5,
  }
})
.to(".hero-banner", { opacity: 0 })
.to(".macro-shot-column", { opacity: 1 }, "<");

// Working Selection Panel Toggle
const trigger = document.querySelector('.working-selection-trigger');
const panel = document.querySelector('.working-selection-panel');
const scrim = document.querySelector('.scrim');

function openPanel() {
  panel.classList.add('open');
  scrim.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closePanel() {
  panel.classList.remove('open');
  scrim.classList.remove('active');
  document.body.style.overflow = '';
}

trigger.addEventListener('click', openPanel);
scrim.addEventListener('click', closePanel);

// Keyboard accessibility
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && panel.classList.contains('open')) {
    closePanel();
  }
});
```

---

## Testing & Validation Checklist

### Layout Testing

- [ ] Hero banner extends full-bleed (no horizontal scroll)
- [ ] Macro shot becomes sticky at correct scroll position
- [ ] Product grid maintains readable width at all breakpoints
- [ ] Layout gracefully degrades to single column < 1440px

### Animation Testing

- [ ] Hero → Macro transition scrubs smoothly with scroll
- [ ] No jank or frame drops during transition
- [ ] Transition works across all major browsers (Chrome, Firefox, Safari, Edge)

### Sidebar Testing

- [ ] Working Selection panel slides over content (does not push)
- [ ] Scrim appears and blocks background interaction
- [ ] Panel closes on scrim click and Escape key
- [ ] Panel is keyboard-accessible (Tab navigation)

### Accessibility Testing

- [ ] Page works at 200%, 300%, 400% zoom
- [ ] Sticky elements do not obscure content when zoomed
- [ ] All interactive elements have visible focus indicators
- [ ] Screen reader announces panel state changes
- [ ] `scroll-padding-top` accounts for sticky header

### Performance Testing

- [ ] Page loads < 3 seconds on 4G
- [ ] Scroll performance maintains 60fps
- [ ] Video lazy-loads only when needed
- [ ] Images optimized (WebP/AVIF format)

---

## Version History

- **v2.0** (2025-01-07): Complete rewrite focusing on immersive sticky-context architecture

---

## References

This document is grounded in:
- **Asymmetrical layout theory** and modern grid-based design
- **CSS Grid and Flexbox** specifications and best practices
- **Position: sticky** implementation patterns
- **GSAP ScrollTrigger** documentation and animation architecture
- **E-commerce UX patterns** for luxury/premium brands
- **Responsive design** and content-first strategies
- **Accessibility standards** (WCAG 2.1 Level AA)
