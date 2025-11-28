'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import type { Promotion, PromotionCalculation } from '@/lib/promotions/types';
import type { Selection } from '@/lib/selections/types';
import { calculatePromotion } from '@/lib/promotions/calculator';
import { SteppedMilestoneTracker, type Tier } from './stepped-milestone-tracker';
import { RadialGoalMeter } from './radial-goal-meter';
import { getDynamicPromotionMessage, getMotivationalHeadline, type NextTierInfo } from '@/lib/promotions/financial-messaging';
import { TierAchievementCelebration } from './tier-achievement-celebration';

type PromotionProgressProps = {
  selection: Selection;
  promotion: Promotion;
};

export function PromotionProgress({ selection, promotion }: PromotionProgressProps) {
  const calculation = useMemo<PromotionCalculation>(() => {
    const lineItems = selection.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      collection: item.collection ?? '',
      year: item.year ?? new Date().getFullYear(),
      displayQty: item.displayQty ?? item.qty,
      backupQty: item.backupQty ?? 0,
      unitList: item.unitList,
      notes: item.notes,
    }));
    return calculatePromotion(promotion, lineItems);
  }, [selection, promotion]);

  const currentDiscount = calculation.bestTierDiscount;

  // Track tier achievements for celebration
  const [previousDiscount, setPreviousDiscount] = useState(currentDiscount);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    tierPercent: number;
    savingsAmount: number;
  } | null>(null);

  useEffect(() => {
    // Check if we've achieved a new tier
    if (currentDiscount > previousDiscount && currentDiscount > 0) {
      setCelebrationData({
        tierPercent: currentDiscount,
        savingsAmount: calculation.totalSavings,
      });
      setShowCelebration(true);
    }
  }, [currentDiscount, previousDiscount, calculation.totalSavings]);

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    setPreviousDiscount(currentDiscount);
  };

  // Determine which metric to show (SKU or Dollar)
  const hasSkuTiers = promotion.skuTiers.length > 0;
  const hasDollarTiers = promotion.dollarTiers.length > 0;

  // Build tiers for SteppedMilestoneTracker
  const { tiers, currentValue, formatValue, nextTierInfo } = useMemo(() => {
    if (hasSkuTiers) {
      const sortedTiers = [...promotion.skuTiers].sort((a, b) => a.threshold - b.threshold);
      const tiers: Tier[] = sortedTiers.map((t) => ({
        id: t.id,
        threshold: t.threshold,
        discountPercent: t.discountPercent,
      }));

      const currentValue = calculation.uniqueDisplaySkus;
      const formatValue = (val: number) => `${Math.round(val)} SKU${val !== 1 ? 's' : ''}`;

      const nextTier = calculation.nextSkuTier;
      const nextTierInfo: NextTierInfo | null = nextTier
        ? {
            tier: nextTier.tier,
            skusNeeded: nextTier.skusNeeded,
            projectedSavings: nextTier.projectedSavings || 0,
          }
        : null;

      return { tiers, currentValue, formatValue, nextTierInfo };
    } else if (hasDollarTiers) {
      const sortedTiers = [...promotion.dollarTiers].sort((a, b) => a.threshold - b.threshold);
      const tiers: Tier[] = sortedTiers.map((t) => ({
        id: t.id,
        threshold: t.threshold,
        discountPercent: t.discountPercent,
      }));

      const currentValue = calculation.displayTotal;
      const formatValue = (val: number) => formatCurrency(val);

      const nextTier = calculation.nextDollarTier;
      const nextTierInfo: NextTierInfo | null = nextTier
        ? {
            tier: nextTier.tier,
            amountNeeded: nextTier.amountNeeded,
            projectedSavings: nextTier.projectedSavings || 0,
          }
        : null;

      return { tiers, currentValue, formatValue, nextTierInfo };
    }

    return { tiers: [], currentValue: 0, formatValue: (v: number) => String(v), nextTierInfo: null };
  }, [hasSkuTiers, hasDollarTiers, promotion, calculation]);

  if (tiers.length === 0) {
    return null;
  }

  // Calculate savings per tier for the milestone tracker
  const calculateTierSavings = (tier: Tier) => {
    const tierIndex = tiers.findIndex((t) => t.id === tier.id);
    if (tierIndex < 0) return 0;

    // Estimate savings based on current selection value
    const avgItemValue = calculation.displayTotal / Math.max(calculation.uniqueDisplaySkus, 1);
    const projectedTotal = tier.threshold * avgItemValue;
    return projectedTotal * (tier.discountPercent / 100);
  };

  const dynamicMessage = getDynamicPromotionMessage(calculation, nextTierInfo, hasSkuTiers);
  const headline = getMotivationalHeadline(calculation, nextTierInfo);

  return (
    <Card className="rounded-2xl border-2 border-blue-200 dark:border-gray-700 shadow-lg overflow-hidden bg-white dark:bg-gray-900">
      <CardHeader className="pb-6 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 border-b border-blue-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{promotion.name}</h3>
              <Badge className="bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                <span className="mr-1.5">●</span> Active
              </Badge>
            </div>

            {/* Current Discount Display */}
            {currentDiscount > 0 ? (
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{currentDiscount}%</span>
                <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">OFF</span>
              </div>
            ) : (
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{headline}</p>
            )}
          </div>

          {/* Radial Goal Meter - Shows progress to next tier only */}
          {nextTierInfo && (
            <div className="hidden md:block">
              <RadialGoalMeter
                current={currentValue}
                target={nextTierInfo.tier.threshold}
                tierName={`${nextTierInfo.tier.discountPercent}% OFF`}
                tierPercent={nextTierInfo.tier.discountPercent}
                projectedSavings={nextTierInfo.projectedSavings}
                formatValue={formatValue}
              />
            </div>
          )}
        </div>

        {/* Dynamic Financial Messaging */}
        <div className="mt-6 bg-blue-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-5 py-4 border-2 border-blue-200 dark:border-gray-700">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{dynamicMessage}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 bg-gray-50 dark:bg-gray-900 pt-6">
        {/* Stepped Milestone Tracker */}
        <div className="px-2">
          <SteppedMilestoneTracker
            tiers={tiers}
            currentValue={currentValue}
            formatThreshold={formatValue}
            calculateSavings={currentDiscount > 0 ? calculateTierSavings : undefined}
            calculateProjectedSavings={calculateTierSavings}
          />
        </div>

        {/* Mobile: Show Radial Goal Meter below tracker */}
        {nextTierInfo && (
          <div className="flex justify-center md:hidden">
            <RadialGoalMeter
              current={currentValue}
              target={nextTierInfo.tier.threshold}
              tierName={`${nextTierInfo.tier.discountPercent}% OFF`}
              tierPercent={nextTierInfo.tier.discountPercent}
              projectedSavings={nextTierInfo.projectedSavings}
              formatValue={formatValue}
            />
          </div>
        )}

        {/* Inventory Incentive */}
        {promotion.inventoryIncentive.enabled && (
          <div className="rounded-xl border-2 border-sky-200 dark:border-gray-700 bg-sky-50 dark:bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Backup Inventory Bonus
                  </p>
                  {calculation.inventoryIncentiveQualified && (
                    <Badge className="bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      <span className="mr-1">✓</span> Qualified
                    </Badge>
                  )}
                </div>
                <p className="text-lg font-bold text-sky-600 dark:text-sky-400 mt-1">
                  {promotion.inventoryIncentive.backupDiscountPercent}% off backup items
                </p>
                {!calculation.inventoryIncentiveQualified && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5">
                    {promotion.inventoryIncentive.displayQtyThreshold &&
                      `Reach ${promotion.inventoryIncentive.displayQtyThreshold} display qty`}
                    {promotion.inventoryIncentive.displayQtyThreshold && promotion.inventoryIncentive.dollarThreshold && ' or '}
                    {promotion.inventoryIncentive.dollarThreshold &&
                      `${formatCurrency(promotion.inventoryIncentive.dollarThreshold)}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Tier Achievement Celebration */}
      {showCelebration && celebrationData && (
        <TierAchievementCelebration
          tierPercent={celebrationData.tierPercent}
          savingsAmount={celebrationData.savingsAmount}
          onComplete={handleCelebrationComplete}
        />
      )}
    </Card>
  );
}
