/**
 * Promotion System Types
 *
 * Supports four incentive types:
 * 1. SKU Count Tiers - Discount based on number of unique SKUs selected for display
 * 2. Dollar Amount Tiers - Discount based on total dollar value of display items
 * 3. Inventory Incentive - Additional discount on backup quantities when thresholds are met
 * 4. Portable Incentive - Flat discount on portable products (table/floor lamps) identified by SKU prefix
 */

export interface PromotionTier {
  id: string;
  threshold: number; // SKU count or dollar amount
  discountPercent: number; // e.g., 30, 40, 50
}

export interface InventoryIncentive {
  enabled: boolean;
  // Qualification thresholds (either can trigger the incentive)
  displayQtyThreshold?: number; // Min total display qty to qualify
  dollarThreshold?: number; // OR min $ amount to qualify
  // Discount applied to backup inventory
  backupDiscountPercent: number; // Discount % for backup quantities
}

export interface PortableIncentive {
  enabled: boolean;
  discountPercent: number; // Flat discount for portable products (e.g., 15%)
  skuPrefixes: string[]; // SKU prefixes that identify portables (e.g., ["11-CD", "24", "27"])
}

export interface Promotion {
  id: string;
  name: string;
  vendor: string; // Vendor this promotion applies to (e.g., 'lib-and-co', 'savoy-house')
  description?: string;
  active: boolean;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string

  // Tier types
  skuTiers: PromotionTier[]; // Based on # of unique display SKUs
  dollarTiers: PromotionTier[]; // Based on total $ amount of display items

  // Inventory incentive (discount on backup)
  inventoryIncentive: InventoryIncentive;

  // Portable incentive (flat discount on table/floor lamps)
  portableIncentive?: PortableIncentive;

  // Customer-facing display fields
  summaryTitle?: string; // Title for program summary card (defaults to name if not set)
  summaryBody?: string; // Rich text description for program summary
  headlineBenefit?: string; // Main headline benefit (e.g., "Up to 50% OFF Displays")
  summaryBullets?: string[]; // Array of bullet points for program summary
  pdfUrl?: string; // URL to vendor's official PDF document
  termsAndConditions?: string; // Full terms and conditions text

  // Quick upload option - when set, displays uploaded file instead of structured promotion
  uploadedPromotionUrl?: string; // URL to uploaded PDF or image (JPEG, PNG, PDF)
  uploadedPromotionType?: 'pdf' | 'image'; // Type of uploaded file

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculated promotion results for a selection
 */
export interface PromotionCalculation {
  promotionId: string;
  promotionName: string;

  // SKU tier results
  uniqueDisplaySkus: number;
  skuTierAchieved?: PromotionTier;
  skuTierDiscount: number; // Percent

  // Dollar tier results
  displaySubtotal: number;
  dollarTierAchieved?: PromotionTier;
  dollarTierDiscount: number; // Percent

  // Best tier (higher discount wins)
  bestTierDiscount: number; // Percent applied to display items
  bestTierType: 'sku' | 'dollar' | 'none';

  // Inventory incentive results
  inventoryIncentiveQualified: boolean;
  inventoryIncentiveDiscount: number; // Percent applied to backup items

  // Portable incentive results
  portableItemCount: number; // Number of portable items in selection
  portableSubtotal: number; // Subtotal of portable items before discount
  portableDiscount: number; // Percent applied to portable items
  portableTotal: number; // Total after portable discount

  // Totals
  displayTotal: number; // After discount (excludes portables)
  backupTotal: number; // After inventory incentive discount
  portableSavings: number; // Dollar amount saved on portables
  totalSavings: number;
  grandTotal: number;

  // Next tier suggestions
  nextSkuTier?: {
    tier: PromotionTier;
    skusNeeded: number;
  };
  nextDollarTier?: {
    tier: PromotionTier;
    amountNeeded: number;
  };
}

/**
 * Line item with display/backup split and applied discounts
 */
export interface SelectionLineItemWithPromotion {
  sku: string;
  name: string;
  collection: string;
  year: number;

  // Split quantities
  displayQty: number; // Quantity for display (gets tier discount)
  backupQty: number; // Additional backup inventory

  unitList: number; // Price per unit

  // Item type flags
  isPortable?: boolean; // True if this item is a portable (table/floor lamp)

  // Applied discounts from promotion
  displayDiscountPercent: number; // % discount on display qty
  backupDiscountPercent: number; // % discount on backup qty
  portableDiscountPercent?: number; // % discount for portable items (replaces display/backup)

  // Calculated line totals
  displaySubtotal: number; // displayQty * unitList
  displayDiscount: number; // Dollar amount saved on display
  displayTotal: number; // After discount

  backupSubtotal: number; // backupQty * unitList
  backupDiscount: number; // Dollar amount saved on backup
  backupTotal: number; // After discount

  lineTotal: number; // displayTotal + backupTotal

  notes?: string;
}

/**
 * Schema for creating/updating a promotion
 */
export interface CreatePromotionInput {
  name: string;
  vendor: string;
  description?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  skuTiers: Omit<PromotionTier, 'id'>[];
  dollarTiers: Omit<PromotionTier, 'id'>[];
  inventoryIncentive: InventoryIncentive;
  portableIncentive?: PortableIncentive;
  // Customer-facing display fields
  summaryTitle?: string;
  summaryBody?: string;
  headlineBenefit?: string;
  summaryBullets?: string[];
  pdfUrl?: string;
  termsAndConditions?: string;
  uploadedPromotionUrl?: string;
  uploadedPromotionType?: 'pdf' | 'image';
}

export interface UpdatePromotionInput extends Partial<CreatePromotionInput> {
  id: string;
}
