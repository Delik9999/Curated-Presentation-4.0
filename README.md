# Curated Presentation 4.0 — DeepReach-Level Modernization Plan

## UI/UX Audit
### Strengths
- Clear separation between rep-focused workflows (market orders, account dashboards) and customer-facing presentations.
- Existing tab structures provide predictable navigation across Dallas, Collections, and Working Selection contexts.
- Minimalist visual language keeps screens uncluttered and maintains focus on data-heavy tables.

### Weaknesses
- Spatial rhythm is inconsistent: dense table rows, cramped sidebars, and uneven padding reduce readability.
- Hierarchy relies almost exclusively on typography; color, depth, and motion cues are underutilized.
- Component styling varies between views (buttons, cards, tabs), leading to visual fragmentation and higher cognitive load.
- Lack of kinetic feedback (hover, focus, loading) makes the experience feel static and disconnected from modern SaaS patterns.
- Summary sidebars and order history panels lack clear affordances, making cross-referencing selections cumbersome.

## Redesign Direction
Adopt a DeepReach-inspired system that combines spatial clarity, subtle gradients, and purposeful motion:
- **Spatial Layout**: Introduce consistent 12-column grid, generous gutters, and breathing room around data tables.
- **Visual Depth**: Use translucent panels, layered glassmorphism-style cards, and soft shadows to create hierarchy without clutter.
- **Typography & Color**: Pair a neutral base palette with high-contrast accent color (electric teal) to highlight primary actions.
- **Micro-Interactions**: Implement motion primitives (hover lifts, progressive disclosure, async loading shimmer) for kinetic refinement.
- **Modularity**: Build reusable shell components (page headers, split panes, data cards) that scale across rep and customer contexts.

## Page-by-Page Recommendations
### Rep Portal / Account Dashboard
- Replace list with responsive grid of account cards featuring avatar initials, market badges, and quick actions.
- Introduce Command Bar (Ctrl/Cmd + K) for jumping to customers, orders, or recently viewed presentations.
- Add status pills ("Active Presentation", "Dallas Order Draft") with subtle gradients and animated transitions.
- Implement collapsible "Pipeline" sidebar summarizing upcoming deliveries, flagged issues, and unread customer notes.

### Dallas Market Order Builder
- Rework layout into a split view: left for item catalog with sticky search/filter header; right for live order summary with progress tracker.
- Provide item grouping by brand or collection with hover-revealed quick metrics (lead time, inventory).
- Introduce "Smart Bundles" suggestions panel leveraging AI filters for related accessories.
- Enhance order history timeline with horizontal stepper, showing draft, submitted, fulfilled states and inline comments.

### Curated Presentation (Customer-Facing)
- Present hero header with ambient gradient background, client logo, and summary stats (locations, fixtures, energy savings).
- Convert tab strip into segmented control with animated underline and context-aware breadcrumbs.
- Use masonry-style cards for collections featuring imagery, spec highlights, and CTA buttons for "Request Samples".
- Introduce real-time collaboration indicators when reps are editing content during client sessions.

### Working Selection Editor
- Elevate editable table into structured data grid with floating headers, inline validation, and sticky action column.
- Add contextual side drawer for notes, attachments, and related SKUs, reducing modal interruptions.
- Enable bulk actions (apply discount, adjust quantity) via top toolbar with pill buttons and hover tooltips.
- Provide activity feed for line-item changes with undo/redo controls and time-stamped user entries.

## System-Level Design Tokens
```json
{
  "font": {
    "family": {
      "sans": "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "mono": "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    },
    "size": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "md": "1rem",
      "lg": "1.125rem",
      "xl": "1.5rem",
      "2xl": "1.875rem"
    },
    "weight": {
      "normal": 450,
      "medium": 550,
      "semibold": 630,
      "bold": 720
    },
    "lineHeight": {
      "tight": 1.2,
      "snug": 1.35,
      "normal": 1.5,
      "relaxed": 1.65
    }
  },
  "color": {
    "background": {
      "base": "#0F1117",
      "surface": "rgba(21, 24, 33, 0.75)",
      "surfaceElevated": "rgba(27, 31, 45, 0.85)",
      "highlight": "#1B2233"
    },
    "text": {
      "primary": "#F5F7FB",
      "secondary": "rgba(233, 237, 245, 0.72)",
      "muted": "rgba(233, 237, 245, 0.48)"
    },
    "accent": {
      "primary": "#3CFFE0",
      "primarySoft": "rgba(60, 255, 224, 0.16)",
      "warning": "#FFB547",
      "critical": "#FF5C8A",
      "success": "#6BFFB2"
    },
    "border": {
      "subtle": "rgba(255, 255, 255, 0.06)",
      "strong": "rgba(255, 255, 255, 0.14)"
    }
  },
  "radius": {
    "xs": "6px",
    "sm": "10px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  },
  "shadow": {
    "sm": "0 6px 18px rgba(0, 0, 0, 0.18)",
    "md": "0 18px 36px rgba(15, 17, 23, 0.32)",
    "xl": "0 48px 72px rgba(10, 12, 18, 0.45)",
    "innerGlow": "inset 0 0 0 1px rgba(255, 255, 255, 0.06)"
  },
  "spacing": {
    "2xs": "4px",
    "xs": "8px",
    "sm": "12px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px"
  }
}
```

## Implementation Plan (Phased)
1. **Design System Setup**: Audit existing components, build token library, and refactor shared layouts to use the new grid and spacing rules.
2. **Foundation Components**: Rebuild core modules (nav shell, tab system, data grid, cards) with Tailwind utility classes mapped to tokens and introduce consistent state handling.
3. **Micro-Interactions & Motion**: Layer in Framer Motion-driven animations for hover states, loading transitions, and context panels; integrate skeleton loaders and optimistic UI patterns.
4. **Responsiveness & Offline States**: Optimize layouts for 1440px, 1280px, and tablet breakpoints; introduce offline banners, save indicators, and background sync notifications.
5. **Branding & Accessibility**: Validate color contrast, implement focus-visible states, add keyboard shortcuts, and align marketing collateral with the refreshed UI.

## Component Examples (React + Tailwind)
```tsx
import { motion } from "framer-motion";

export function AccountCard({ name, status, market }) {
  return (
    <motion.article
      whileHover={{ y: -6, boxShadow: "0 18px 36px rgba(15,17,23,0.32)" }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface/80 px-6 py-5 backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">{market}</p>
          <h3 className="mt-1 text-lg font-semibold text-primary">{name}</h3>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          {status}
        </span>
      </div>
      <footer className="mt-4 flex items-center gap-3 text-xs text-muted">
        <button className="rounded-lg border border-white/10 px-3 py-1.5 text-secondary transition hover:border-primary/60 hover:text-primary">
          View Site
        </button>
        <button className="rounded-lg bg-primary/20 px-3 py-1.5 text-primary transition hover:bg-primary/30">
          Dallas
        </button>
      </footer>
    </motion.article>
  );
}
```

```tsx
import { motion } from "framer-motion";

export function MotionButton({ children, onClick, tone = "primary" }) {
  const toneClass =
    tone === "primary"
      ? "bg-primary text-dark hover:bg-primary/80"
      : "border border-white/12 text-secondary hover:border-primary/40 hover:text-primary";

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ translateY: -1 }}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${toneClass}`}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}
```

## Optional Enhancements
- **Command-K Palette**: Global search across customers, SKUs, and presentations with contextual keyboard hints.
- **AI-Powered Filters**: Recommend optimal fixture combinations based on room type, energy goals, and previous wins.
- **Live Collaboration Signals**: Presence avatars, typing indicators, and change highlights for distributed sales teams.
- **Narrative Export Mode**: Generate auto-formatted presentation PDFs with storytelling structure and hero imagery.

