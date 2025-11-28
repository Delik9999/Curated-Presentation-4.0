import { formatCurrency } from '@/lib/utils/currency';
import type { PromotionCalculation } from './types';

/**
 * Dynamic Text Replacement (DTR) for partnership-focused B2B messaging
 * Per B2B Strategic Sales Design Blueprint - Focus on partnership status and financial ROI
 * Avoids gamification language in favor of professional, transparent communication
 */

export interface NextTierInfo {
  tier: { threshold: number; discountPercent: number };
  skusNeeded?: number;
  amountNeeded?: number;
  projectedSavings: number;
}

/**
 * Generate financial-focused messaging for promotion progress
 * Always leads with the financial benefit, makes the gap feel achievable
 */
export function getDynamicPromotionMessage(
  calculation: PromotionCalculation,
  nextTier: NextTierInfo | null,
  useSKUMetric: boolean
): string {
  const currentSavings = calculation.totalSavings;
  const hasDiscount = currentSavings > 0;

  // Maximum partnership status achieved - celebration!
  if (!nextTier) {
    if (hasDiscount) {
      return `Maximum partnership status achieved! You have secured ${formatCurrency(currentSavings)} in margin advantage (${calculation.bestTierDiscount}% program status)`;
    }
    return `You have achieved maximum program status!`;
  }

  // Build the gap description
  const gapDescription = useSKUMetric
    ? `${nextTier.skusNeeded} ${nextTier.skusNeeded === 1 ? 'SKU' : 'SKUs'}`
    : formatCurrency(nextTier.amountNeeded || 0);

  const tierPercent = nextTier.tier.discountPercent;
  const projectedSavings = nextTier.projectedSavings;

  // Has some discount, approaching next partnership status
  if (hasDiscount) {
    return `You have secured ${formatCurrency(currentSavings)} in margin! Add ${gapDescription} to achieve ${tierPercent}% partnership status and secure an additional ${formatCurrency(projectedSavings)} in margin advantage`;
  }

  // No discount yet, working toward first partnership threshold
  return `Add ${gapDescription} to achieve ${tierPercent}% partnership status and secure ${formatCurrency(projectedSavings)} in margin advantage on your current selection`;
}

/**
 * Generate concise call-to-action for next partnership threshold
 */
export function getNextTierCTA(nextTier: NextTierInfo | null, useSKUMetric: boolean): string {
  if (!nextTier) {
    return 'Maximize your program benefits';
  }

  const gapDescription = useSKUMetric
    ? `${nextTier.skusNeeded} more ${nextTier.skusNeeded === 1 ? 'SKU' : 'SKUs'}`
    : `${formatCurrency(nextTier.amountNeeded || 0)} more`;

  return `Add ${gapDescription} to achieve ${nextTier.tier.discountPercent}% partnership status`;
}

/**
 * Generate motivational headline
 */
export function getMotivationalHeadline(
  calculation: PromotionCalculation,
  nextTier: NextTierInfo | null
): string {
  const hasDiscount = calculation.totalSavings > 0;

  if (!nextTier) {
    return hasDiscount ? 'Maximizing your margin advantage' : 'Build your partnership status';
  }

  if (hasDiscount) {
    return `Achieve enhanced partnership status`;
  }

  return `Build your partnership status`;
}

/**
 * Calculate projected total savings at a specific tier
 * Used for "What If" calculator
 */
export function calculateProjectedSavingsAtTier(
  currentTotal: number,
  tierDiscountPercent: number
): number {
  return currentTotal * (tierDiscountPercent / 100);
}

/**
 * Generate comparison message for Partnership Planning Calculator
 */
export function getWhatIfComparisonMessage(
  currentSavings: number,
  projectedSavings: number,
  itemsToAdd: number
): string {
  const additionalSavings = projectedSavings - currentSavings;

  if (additionalSavings <= 0) {
    return 'You have achieved this partnership status';
  }

  return `Expanding by ${itemsToAdd} ${itemsToAdd === 1 ? 'SKU' : 'SKUs'} would secure ${formatCurrency(additionalSavings)} in additional margin`;
}
