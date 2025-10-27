# Curated Presentation 4.0 — DeepReach-Level Modernization Plan

## Executive Overview
Curated Presentation 4.0 reimagines the lighting sales platform with a DeepReach-inspired design language—crystalline surfaces, precision spacing, and kinetic feedback. The following plan fuses strategic guidance and implementation detail so design and engineering can modernize the experience in tandem.

## UI/UX Audit
| Dimension | Strengths | Gaps / Risks |
| --- | --- | --- |
| Information Architecture | Clear separation between rep workflows (Dallas orders, account dashboards) and customer-facing presentations. | Cross-surface navigation lacks global entry points; users depend on deep links (Dallas / View Site) without context of recent activity. |
| Layout & Spacing | Minimalist grid keeps dense datasets manageable; current tabs and tables are familiar. | Inconsistent padding, cramped sidebars, and non-sticky headers force vertical scrolling and reduce scannability.
| Visual Hierarchy | Typography-driven hierarchy is easy to parse for primary actions. | Limited use of color, elevation, and state cues; key CTAs blend in, and secondary panels feel flat.
| Component Consistency | Shared primitives (tables, buttons, pills) exist across modules. | Components diverge per page (button radius, card borders, tab styling), increasing cognitive load and QA burden.
| Feedback & Motion | Static UI avoids distraction during data entry. | No hover/focus/async feedback; loading uncertainty and editable tables feel brittle.
| Collaboration & Trust | Audit trails exist via notes and order history. | History panels hide behind tabs with little affordance; multi-user scenarios lack presence indicators.

## Redesign Direction
1. **Spatial Clarity** — Adopt a 12-column grid with 32px gutters; align content blocks to optical baseline and enforce consistent vertical rhythm (8px base spacing).
2. **Layered Depth** — Use frosted glass panels, soft gradients (#10121A → #151B26), and luminous edges to signal priority. High-value actions receive vibrant electric teal glows, while secondary surfaces sit in desaturated graphite.
3. **Kinetic Responsiveness** — Introduce micro-interactions: hover lift +6px on cards, easing-driven tab underlines (120ms), optimistic toasts for data saves, shimmer loaders for async pulls.
4. **Modular Shell Architecture** — Standardize page frame with a persistent top command rail, context-aware right drawer, and composable data grid modules.
5. **Humanized Insights** — Surface AI-recommended bundles, savings deltas, and annotated changes inline to reinforce advisory value during sales conversations.

## Page-by-Page Recommendations
### Rep Portal / Account Dashboard
- **Command Rail:** Sticky global header with segmented controls (Accounts, Market Orders, Presentations) and quick filters for territory, status, and recent edits.
- **Account Canvas:** Replace list with responsive 3-column card grid featuring logo/initials, territory badges, Dallas activity indicator, and inline metrics (open orders, collections shared).
- **Activity Timeline:** Right drawer shows chronological feed (shared presentations, note mentions, order milestones) with user avatars and timestamps.
- **Productivity Boosters:** Command-K palette, saved views, and keyboard-first navigation; offline-ready banners when market data is stale.

### Dallas Market Order Builder
- **Split View Layout:** Left panel for catalog (sticky search, filter chips, inventory signals). Right panel for live order summary with progress ring (Draft → Reviewed → Submitted) and inline validation.
- **Composable Line Items:** Convert rows into expandable tiles revealing specifications, lead time, and accessory suggestions. Bulk edit drawer supports quantity, discount, and delivery window adjustments.
- **Smart Recommendations:** AI bundle carousel at the bottom of catalog; includes “Add All” button with preview animations and profitability badges.
- **History & Approvals:** Timeline rail with stage gates, inline comments, and status chips. Hover reveals deeper metadata (submitted by, target install date).

### Curated Presentation (Customer-Facing)
- **Immersive Hero:** Gradient-washed hero (client logo, location tags, energy impact stats) anchored by contextual breadcrumbs and a “Join Live Session” CTA.
- **Collection Gallery:** Masonry cards with fixture imagery, luminous overlays, micro charts for energy savings, and frictionless CTAs (Request Samples, Download Spec Sheet).
- **Narrative Flow:** Segmented navigation (Overview, Collections, Dallas, Working Selection) with animated underline and progress dots. Each section loads with fade-slide transitions for storytelling.
- **Collaboration Signals:** Presence avatars with pulsing rings, real-time note annotations, and subtle typing indicators when reps adjust content mid-meeting.

### Working Selection Editor
- **Elevated Data Grid:** Implement sticky headers, frozen action column, and inline validation states. Use zebra striping with subtle translucency to reinforce row grouping.
- **Contextual Drawer:** Right-side inspector consolidates notes, attachments, comparable SKUs, and audit history without modal interruptions.
- **Bulk Ops Toolbar:** Floating toolbar with pill buttons for Apply Discount, Adjust Quantity, Tag Room. Support keyboard shortcuts and undo stack surfaced in activity feed.
- **Quality of Life:** Autosave indicators, optimistic updates with fallback notifications, and deep links to related Dallas orders.

## System-Level Design Tokens (Tailwind-ready)
```js
export const tokens = {
  font: {
    family: {
      sans: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
    },
    size: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.5rem',
      '2xl': '1.875rem',
      '3xl': '2.25rem',
    },
    weight: {
      normal: 450,
      medium: 550,
      semibold: 630,
      bold: 720,
    },
    lineHeight: {
      tight: 1.2,
      snug: 1.35,
      normal: 1.5,
      relaxed: 1.65,
    },
    letterSpacing: {
      tight: '-0.01em',
      wide: '0.04em',
    },
  },
  color: {
    background: {
      base: '#0B0E14',
      raised: 'rgba(18, 22, 30, 0.82)',
      overlay: 'rgba(30, 36, 48, 0.68)',
      highlight: '#141A26',
    },
    text: {
      primary: '#F5F7FB',
      secondary: 'rgba(233, 237, 245, 0.72)',
      muted: 'rgba(233, 237, 245, 0.48)',
      inverse: '#10131B',
    },
    accent: {
      primary: '#38FFE2',
      primarySoft: 'rgba(56, 255, 226, 0.16)',
      info: '#3F8CFF',
      warning: '#FFB547',
      critical: '#FF5C8A',
      success: '#6BFFB2',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      strong: 'rgba(255, 255, 255, 0.14)',
      focus: '#38FFE2',
    },
  },
  radius: {
    xs: '6px',
    sm: '10px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    pill: '999px',
  },
  shadow: {
    sm: '0 6px 18px rgba(0, 0, 0, 0.18)',
    md: '0 18px 36px rgba(10, 12, 18, 0.32)',
    xl: '0 48px 72px rgba(6, 8, 14, 0.5)',
    glow: '0 0 0 1px rgba(56, 255, 226, 0.35)',
  },
  spacing: {
    '2xs': '4px',
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  transition: {
    fast: '120ms ease-out',
    base: '180ms cubic-bezier(0.22, 1, 0.36, 1)',
    slow: '280ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
};
```

### Tailwind Config Mapping
```js
// tailwind.config.js snippet
module.exports = {
  theme: {
    extend: {
      colors: tokens.color,
      fontFamily: tokens.font.family,
      borderRadius: tokens.radius,
      boxShadow: tokens.shadow,
      spacing: tokens.spacing,
      transitionTimingFunction: {
        kinetic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
};
```

## Implementation Plan (Phased)
1. **Design System Foundation (Weeks 1–3)** — Audit existing components, codify tokens, migrate Tailwind config, and create Storybook playground for shell primitives (navigation, cards, tables).
2. **Core Experience Rebuild (Weeks 4–7)** — Refactor Rep Portal and Dallas Order Builder using new layout grid, card system, and data grid. Implement command rail, drawers, and progressive disclosure patterns.
3. **Micro-Interactions & Performance (Weeks 8–9)** — Layer Framer Motion primitives, add shimmer loaders, optimistic toasts, and stateful transitions. Benchmark interaction latency (<120ms target) and implement virtualization for large tables.
4. **Responsive & Offline Scenarios (Weeks 10–11)** — Define breakpoints (1440 / 1280 / 1024 / 768), adjust density per view, and add offline banners, background sync indicators, and conflict resolution flows.
5. **Branding, Accessibility, and Compliance (Weeks 12–13)** — Run WCAG 2.1 AA sweeps, implement focus-visible styling, enable keyboard shortcuts discovery, and align export artifacts (PDF, email templates) with refreshed brand.

## Component Examples (React + Tailwind)
```tsx
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';

type AccountCardProps = {
  name: string;
  market: string;
  status: 'Active Presentation' | 'Dallas Draft' | 'Idle';
  metrics: { orders: number; collections: number };
};

export function AccountCard({ name, market, status, metrics }: AccountCardProps) {
  return (
    <motion.article
      layout
      whileHover={{ y: -6, boxShadow: '0 18px 36px rgba(10,12,18,0.32)' }}
      className="group relative flex h-full flex-col justify-between rounded-3xl border border-border-subtle bg-background-raised/90 p-6 backdrop-blur-xl transition-shadow duration-200"
    >
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{market}</p>
          <h3 className="mt-2 text-lg font-semibold text-text-primary">{name}</h3>
        </div>
        <span className="rounded-full bg-accent-primarySoft px-3 py-1 text-xs font-medium text-accent-primary">
          {status}
        </span>
      </header>
      <dl className="mt-6 flex gap-6 text-sm text-text-secondary">
        <div>
          <dt className="font-medium text-text-muted">Open Orders</dt>
          <dd className="text-base text-text-primary">{metrics.orders}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Collections Shared</dt>
          <dd className="text-base text-text-primary">{metrics.collections}</dd>
        </div>
      </dl>
      <footer className="mt-6 flex items-center gap-3">
        <button className="inline-flex items-center gap-2 rounded-xl border border-border-strong px-4 py-2 text-sm text-text-secondary transition duration-200 hover:border-accent-primary hover:text-text-primary">
          View Site <ArrowUpRight className="h-4 w-4" />
        </button>
        <button className="inline-flex items-center gap-2 rounded-xl bg-accent-primary/20 px-4 py-2 text-sm font-medium text-accent-primary transition duration-200 hover:bg-accent-primary/30">
          Dallas <Sparkles className="h-4 w-4" />
        </button>
      </footer>
    </motion.article>
  );
}
```

```tsx
import { motion } from 'framer-motion';

type MotionButtonProps = {
  children: React.ReactNode;
  tone?: 'primary' | 'neutral';
  onClick?: () => void;
};

export function MotionButton({ children, tone = 'primary', onClick }: MotionButtonProps) {
  const toneClass =
    tone === 'primary'
      ? 'bg-accent-primary text-background-base hover:bg-accent-primary/80'
      : 'border border-border-strong text-text-secondary hover:border-accent-primary hover:text-text-primary';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      whileHover={{ translateY: -1 }}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${toneClass}`}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}
```

## Optional Enhancements
- **Command-K Palette:** Global search across customers, SKUs, line items, and notes; supports fuzzy matching, saved queries, and permission-aware shortcuts.
- **AI-Powered Filters & Copilot:** Suggest complementary fixtures, flag low-margin combinations, and auto-generate presentation narratives based on persona.
- **Live Collaboration Signals:** Presence avatars, change highlights, voice handoff prompts, and timeline replay for asynchronous review.
- **Adaptive Narrative Exports:** Branded PDF/Keynote exports with auto-generated cover pages, before/after metrics, and embedded QR codes for AR previews.
- **Diagnostics Console:** Admin-only view exposing data freshness, order sync status, and integration health to reduce support escalations.
