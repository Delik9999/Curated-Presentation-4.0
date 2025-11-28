/**
 * Customer-facing promotion types for the Promotions page
 */

export interface ActivePromotion {
  id: string;
  name: string; // e.g. "June 2025 Market Promotions"
  vendorName: string; // e.g. "Savoy House"
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;

  // "Section A" – program summary (maps to PDF text)
  summaryTitle?: string | null; // e.g. "Breeze into Summer Market Savings"
  summaryBody?: string | null; // short paragraph
  headlineBenefit?: string | null; // e.g. "50% OFF Displays + 20% OFF Back Up & Stock Items"
  summaryBullets?: string[]; // bullet list of conditions
  termsAndConditions?: string | null; // full terms and conditions text

  // "Section B" – official tier rules (e.g. the table in the PDF)
  tierRules: {
    id: string;
    tierLevel: number; // 1,2,3...
    label?: string | null; // e.g. "1–9 New Items"
    skuRangeText: string; // e.g. "1–9 New Items"
    minSkuCount?: number | null; // lower bound for live math
    displayDiscountPercent?: number | null;
    backupDiscountPercent?: number | null;
    notes?: string | null;
  }[];

  // Live values for the **current Working Selection** (if any)
  currentSkuCount?: number | null; // unique qualifying SKUs
  currentTierLevel?: number | null; // which tier they're currently at
  estimatedSavings?: number | null; // $ at current tier

  // Per-tier projections (for calculator)
  potentialSavingsByTier?: {
    tierLevel: number;
    estSavings: number; // total savings at that tier
    additionalSavingsFromCurrent: number; // extra vs current tier
    skusToReachTier: number; // how many more SKUs required
  }[];

  pdfUrl?: string | null; // original vendor PDF if available
}
