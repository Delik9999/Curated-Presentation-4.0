/**
 * Maps the existing Promotion + PromotionCalculation to the new ActivePromotion type
 * for the customer-facing Promotions page
 */

import type { Promotion, PromotionCalculation } from './types';
import type { ActivePromotion } from '@/types/promotion';

export function mapToActivePromotion(
  promotion: Promotion,
  calculation: PromotionCalculation,
  vendorName: string
): ActivePromotion {
  // Determine which tier system is active
  const hasSkuTiers = promotion.skuTiers.length > 0;

  // Map tier rules
  const tierRules: ActivePromotion['tierRules'] = hasSkuTiers
    ? promotion.skuTiers.map((tier, index) => ({
        id: tier.id,
        tierLevel: index + 1,
        label: `${tier.threshold}+ Items`,
        skuRangeText: `${tier.threshold}+ New Items`,
        minSkuCount: tier.threshold,
        displayDiscountPercent: tier.discountPercent,
        backupDiscountPercent: promotion.inventoryIncentive.enabled
          ? promotion.inventoryIncentive.backupDiscountPercent
          : null,
        notes: null,
      }))
    : promotion.dollarTiers.map((tier, index) => ({
        id: tier.id,
        tierLevel: index + 1,
        label: `$${tier.threshold.toLocaleString()}+`,
        skuRangeText: `$${tier.threshold.toLocaleString()}+ Order Value`,
        minSkuCount: null,
        displayDiscountPercent: tier.discountPercent,
        backupDiscountPercent: promotion.inventoryIncentive.enabled
          ? promotion.inventoryIncentive.backupDiscountPercent
          : null,
        notes: null,
      }));

  // Determine current tier level
  let currentTierLevel: number | null = null;
  if (calculation.bestTierDiscount > 0) {
    const achievedTier = hasSkuTiers
      ? promotion.skuTiers.find((t) => t.discountPercent === calculation.bestTierDiscount)
      : promotion.dollarTiers.find((t) => t.discountPercent === calculation.bestTierDiscount);

    if (achievedTier) {
      currentTierLevel = hasSkuTiers
        ? promotion.skuTiers.findIndex((t) => t.id === achievedTier.id) + 1
        : promotion.dollarTiers.findIndex((t) => t.id === achievedTier.id) + 1;
    }
  }

  // Build potential savings by tier
  const potentialSavingsByTier: ActivePromotion['potentialSavingsByTier'] = tierRules.map((tierRule) => {
    // TODO: Calculate actual estimated savings based on working selection value
    // For now, use a simple approximation
    const tierDiscountPercent = tierRule.displayDiscountPercent || 0;
    const estSavings = calculation.displaySubtotal * (tierDiscountPercent / 100);

    // Calculate additional savings from current
    const currentSavings = calculation.totalSavings || 0;
    const additionalSavingsFromCurrent = Math.max(0, estSavings - currentSavings);

    // Calculate SKUs to reach tier
    const currentSkuCount = calculation.uniqueDisplaySkus || 0;
    const targetSkuCount = tierRule.minSkuCount || 0;
    const skusToReachTier = Math.max(0, targetSkuCount - currentSkuCount);

    return {
      tierLevel: tierRule.tierLevel,
      estSavings,
      additionalSavingsFromCurrent,
      skusToReachTier,
    };
  });

  // Generate auto fallbacks for customer-facing fields
  const autoHeadlineBenefit = hasSkuTiers && promotion.skuTiers.length > 0
    ? `Up to ${promotion.skuTiers[promotion.skuTiers.length - 1].discountPercent}% OFF Displays${
        promotion.inventoryIncentive.enabled
          ? ` + ${promotion.inventoryIncentive.backupDiscountPercent}% OFF Back Up & Stock Items`
          : ''
      }`
    : promotion.dollarTiers.length > 0
    ? `Up to ${promotion.dollarTiers[promotion.dollarTiers.length - 1].discountPercent}% OFF${
        promotion.inventoryIncentive.enabled
          ? ` + ${promotion.inventoryIncentive.backupDiscountPercent}% OFF Back Up & Stock Items`
          : ''
      }`
    : null;

  const autoSummaryBullets = [
    'Exclusive market program for qualifying orders',
    promotion.inventoryIncentive.enabled
      ? 'Enhanced savings on both display and backup inventory'
      : 'Tiered savings structure rewards larger commitments',
    'Contact your rep for complete program details',
  ];

  return {
    id: promotion.id,
    name: promotion.name,
    vendorName,
    description: promotion.description || null,
    startDate: promotion.startDate || null,
    endDate: promotion.endDate || null,

    // Section A - Program Summary (use custom fields or auto-generated fallbacks)
    summaryTitle: promotion.summaryTitle || `${promotion.name} - Market Savings Program`,
    summaryBody: promotion.summaryBody || null,
    headlineBenefit: promotion.headlineBenefit || autoHeadlineBenefit,
    summaryBullets: promotion.summaryBullets && promotion.summaryBullets.length > 0
      ? promotion.summaryBullets
      : autoSummaryBullets,

    // Section B - Tier Rules
    tierRules,

    // Live values
    currentSkuCount: calculation.uniqueDisplaySkus || null,
    currentTierLevel,
    estimatedSavings: calculation.totalSavings || null,

    // Per-tier projections
    potentialSavingsByTier,

    pdfUrl: promotion.pdfUrl || null,
    termsAndConditions: promotion.termsAndConditions || null,
  };
}
