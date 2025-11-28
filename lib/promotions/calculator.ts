/**
 * Promotion Calculation Engine
 *
 * Handles all discount calculations for the promotion system:
 * - SKU count tiers
 * - Dollar amount tiers
 * - Inventory incentive for backup quantities
 * - Portable incentive for table/floor lamps
 */

import {
  Promotion,
  PromotionTier,
  PromotionCalculation,
  SelectionLineItemWithPromotion,
  PortableIncentive,
} from './types';

/**
 * Check if a SKU matches any portable prefix
 */
export function isPortableSku(sku: string, portableIncentive?: PortableIncentive): boolean {
  if (!portableIncentive?.enabled || !portableIncentive.skuPrefixes?.length) {
    return false;
  }
  const upperSku = sku.toUpperCase();
  return portableIncentive.skuPrefixes.some((prefix) =>
    upperSku.startsWith(prefix.toUpperCase())
  );
}

/**
 * Find the highest tier achieved based on a threshold value
 */
function findAchievedTier(
  value: number,
  tiers: PromotionTier[]
): PromotionTier | undefined {
  if (!tiers || tiers.length === 0) return undefined;

  // Sort tiers by threshold descending
  const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);

  // Find the highest tier where threshold is met
  return sortedTiers.find((tier) => value >= tier.threshold);
}

/**
 * Find the next tier that could be achieved
 */
function findNextTier(
  value: number,
  tiers: PromotionTier[]
): PromotionTier | undefined {
  if (!tiers || tiers.length === 0) return undefined;

  // Sort tiers by threshold ascending
  const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);

  // Find the first tier where threshold is not yet met
  return sortedTiers.find((tier) => value < tier.threshold);
}

/**
 * Calculate promotion discounts for a selection
 */
export function calculatePromotion(
  promotion: Promotion,
  lineItems: Array<{
    sku: string;
    name: string;
    collection: string;
    year: number;
    displayQty: number;
    backupQty: number;
    unitList: number;
    notes?: string;
  }>
): PromotionCalculation {
  // Separate portable items from regular items
  const portableItems = lineItems.filter((item) =>
    isPortableSku(item.sku, promotion.portableIncentive)
  );
  const regularItems = lineItems.filter(
    (item) => !isPortableSku(item.sku, promotion.portableIncentive)
  );

  // Count unique display SKUs (excluding portables)
  const uniqueDisplaySkus = regularItems.filter((item) => item.displayQty > 0).length;

  // Calculate display subtotal (before any discounts, excluding portables)
  const displaySubtotal = regularItems.reduce((sum, item) => {
    return sum + item.displayQty * item.unitList;
  }, 0);

  // Calculate backup subtotal (before any discounts, excluding portables)
  const backupSubtotal = regularItems.reduce((sum, item) => {
    return sum + item.backupQty * item.unitList;
  }, 0);

  // Calculate total display quantity (excluding portables)
  const totalDisplayQty = regularItems.reduce((sum, item) => {
    return sum + item.displayQty;
  }, 0);

  // Calculate portable subtotal (all quantities, portables don't split display/backup)
  const portableSubtotal = portableItems.reduce((sum, item) => {
    return sum + (item.displayQty + item.backupQty) * item.unitList;
  }, 0);
  const portableItemCount = portableItems.length;

  // Find achieved tiers
  const skuTierAchieved = findAchievedTier(uniqueDisplaySkus, promotion.skuTiers);
  const dollarTierAchieved = findAchievedTier(displaySubtotal, promotion.dollarTiers);

  const skuTierDiscount = skuTierAchieved?.discountPercent || 0;
  const dollarTierDiscount = dollarTierAchieved?.discountPercent || 0;

  // Best tier is the one with higher discount
  const bestTierDiscount = Math.max(skuTierDiscount, dollarTierDiscount);
  const bestTierType: 'sku' | 'dollar' | 'none' =
    bestTierDiscount === 0
      ? 'none'
      : skuTierDiscount > dollarTierDiscount
      ? 'sku'
      : 'dollar';

  // Check inventory incentive qualification
  const inventoryIncentiveQualified =
    promotion.inventoryIncentive.enabled &&
    ((promotion.inventoryIncentive.displayQtyThreshold !== undefined &&
      totalDisplayQty >= promotion.inventoryIncentive.displayQtyThreshold) ||
      (promotion.inventoryIncentive.dollarThreshold !== undefined &&
        displaySubtotal >= promotion.inventoryIncentive.dollarThreshold));

  const inventoryIncentiveDiscount = inventoryIncentiveQualified
    ? promotion.inventoryIncentive.backupDiscountPercent
    : 0;

  // Calculate portable discount
  const portableDiscount = promotion.portableIncentive?.enabled
    ? promotion.portableIncentive.discountPercent
    : 0;

  // Calculate totals
  const displayTotal = displaySubtotal * (1 - bestTierDiscount / 100);
  const backupTotal = backupSubtotal * (1 - inventoryIncentiveDiscount / 100);
  const portableTotal = portableSubtotal * (1 - portableDiscount / 100);
  const grandTotal = displayTotal + backupTotal + portableTotal;

  const displaySavings = displaySubtotal - displayTotal;
  const backupSavings = backupSubtotal - backupTotal;
  const portableSavings = portableSubtotal - portableTotal;
  const totalSavings = displaySavings + backupSavings + portableSavings;

  // Find next tiers
  const nextSkuTier = findNextTier(uniqueDisplaySkus, promotion.skuTiers);
  const nextDollarTier = findNextTier(displaySubtotal, promotion.dollarTiers);

  return {
    promotionId: promotion.id,
    promotionName: promotion.name,

    // SKU tier results
    uniqueDisplaySkus,
    skuTierAchieved,
    skuTierDiscount,

    // Dollar tier results
    displaySubtotal,
    dollarTierAchieved,
    dollarTierDiscount,

    // Best tier
    bestTierDiscount,
    bestTierType,

    // Inventory incentive
    inventoryIncentiveQualified,
    inventoryIncentiveDiscount,

    // Portable incentive
    portableItemCount,
    portableSubtotal,
    portableDiscount,
    portableTotal,

    // Totals
    displayTotal,
    backupTotal,
    portableSavings,
    totalSavings,
    grandTotal,

    // Next tier suggestions
    nextSkuTier: nextSkuTier
      ? {
          tier: nextSkuTier,
          skusNeeded: nextSkuTier.threshold - uniqueDisplaySkus,
        }
      : undefined,
    nextDollarTier: nextDollarTier
      ? {
          tier: nextDollarTier,
          amountNeeded: nextDollarTier.threshold - displaySubtotal,
        }
      : undefined,
  };
}

/**
 * Apply promotion discounts to individual line items
 */
export function applyPromotionToLineItems(
  lineItems: Array<{
    sku: string;
    name: string;
    collection: string;
    year: number;
    displayQty: number;
    backupQty: number;
    unitList: number;
    notes?: string;
  }>,
  calculation: PromotionCalculation,
  promotion?: Promotion
): SelectionLineItemWithPromotion[] {
  return lineItems.map((item) => {
    // Check if this is a portable item
    const isPortable = promotion
      ? isPortableSku(item.sku, promotion.portableIncentive)
      : false;

    if (isPortable) {
      // Portable items get flat discount on all quantities (no display/backup split)
      const totalQty = item.displayQty + item.backupQty;
      const subtotal = totalQty * item.unitList;
      const discount = subtotal * (calculation.portableDiscount / 100);
      const total = subtotal - discount;

      return {
        sku: item.sku,
        name: item.name,
        collection: item.collection,
        year: item.year,

        // For portables, treat all qty as "display" since there's no split
        displayQty: totalQty,
        backupQty: 0,
        unitList: item.unitList,

        isPortable: true,

        displayDiscountPercent: calculation.portableDiscount,
        backupDiscountPercent: 0,
        portableDiscountPercent: calculation.portableDiscount,

        displaySubtotal: subtotal,
        displayDiscount: discount,
        displayTotal: total,

        backupSubtotal: 0,
        backupDiscount: 0,
        backupTotal: 0,

        lineTotal: total,

        notes: item.notes,
      };
    }

    // Regular items: display/backup split with tier discounts
    const displaySubtotal = item.displayQty * item.unitList;
    const displayDiscount = displaySubtotal * (calculation.bestTierDiscount / 100);
    const displayTotal = displaySubtotal - displayDiscount;

    const backupSubtotal = item.backupQty * item.unitList;
    const backupDiscount = backupSubtotal * (calculation.inventoryIncentiveDiscount / 100);
    const backupTotal = backupSubtotal - backupDiscount;

    const lineTotal = displayTotal + backupTotal;

    return {
      sku: item.sku,
      name: item.name,
      collection: item.collection,
      year: item.year,

      displayQty: item.displayQty,
      backupQty: item.backupQty,
      unitList: item.unitList,

      isPortable: false,

      displayDiscountPercent: calculation.bestTierDiscount,
      backupDiscountPercent: calculation.inventoryIncentiveDiscount,

      displaySubtotal,
      displayDiscount,
      displayTotal,

      backupSubtotal,
      backupDiscount,
      backupTotal,

      lineTotal,

      notes: item.notes,
    };
  });
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(percent: number): string {
  return `${percent}%`;
}
