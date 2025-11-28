'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import type { Promotion, PromotionCalculation } from '@/lib/promotions/types';
import type { Selection } from '@/lib/selections/types';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';

interface PromotionStatusStripProps {
  promotion: Promotion;
  calculation: PromotionCalculation;
  selection: Selection;
}

export function PromotionStatusStrip({ promotion, calculation, selection }: PromotionStatusStripProps) {
  // Start expanded to showcase tier structure prominently
  const [isExpanded, setIsExpanded] = useState(true);

  // Determine if we're using SKU or Dollar tiers
  const hasSkuTiers = promotion.skuTiers.length > 0;
  const hasDollarTiers = promotion.dollarTiers.length > 0;

  // Calculate progress metrics
  const { currentValue, nextTier, progress, targetValue, metricLabel } = useMemo(() => {
    if (hasSkuTiers) {
      const current = calculation.uniqueDisplaySkus;
      const next = calculation.nextSkuTier;
      const target = next ? next.tier.threshold : current;
      const progress = next ? (current / target) * 100 : 100;

      return {
        currentValue: current,
        nextTier: next,
        progress: Math.min(progress, 100),
        targetValue: target,
        metricLabel: 'SKU',
      };
    } else if (hasDollarTiers) {
      const current = calculation.displayTotal;
      const next = calculation.nextDollarTier;
      const target = next ? next.tier.threshold : current;
      const progress = next ? (current / target) * 100 : 100;

      return {
        currentValue: current,
        nextTier: next,
        progress: Math.min(progress, 100),
        targetValue: target,
        metricLabel: 'Dollar',
      };
    }

    return {
      currentValue: 0,
      nextTier: undefined,
      progress: 0,
      targetValue: 0,
      metricLabel: 'SKU',
    };
  }, [hasSkuTiers, hasDollarTiers, calculation]);

  // Format display values
  const formattedCurrent = metricLabel === 'Dollar' ? formatCurrency(currentValue) : `${currentValue} SKUs`;
  const formattedTarget = metricLabel === 'Dollar' ? formatCurrency(targetValue) : `${targetValue} SKUs`;

  // Calculate potential additional savings
  const potentialSavings = useMemo(() => {
    if (!nextTier) return 0;

    if (hasSkuTiers && nextTier.skusNeeded !== undefined) {
      // Estimate average item value
      const avgItemValue = calculation.displaySubtotal / Math.max(calculation.uniqueDisplaySkus, 1);
      // Estimate additional items needed
      const additionalValue = avgItemValue * nextTier.skusNeeded;
      // Calculate additional savings (difference in discount rates)
      const currentDiscountRate = calculation.bestTierDiscount / 100;
      const nextDiscountRate = nextTier.tier.discountPercent / 100;
      const additionalDiscountRate = nextDiscountRate - currentDiscountRate;

      // Savings on new items + increased savings on existing items
      return (additionalValue * nextDiscountRate) + (calculation.displaySubtotal * additionalDiscountRate);
    } else if (hasDollarTiers && nextTier.amountNeeded !== undefined) {
      const nextDiscountRate = nextTier.tier.discountPercent / 100;
      const currentDiscountRate = calculation.bestTierDiscount / 100;
      const additionalDiscountRate = nextDiscountRate - currentDiscountRate;

      // Savings on additional amount + increased savings on existing selection
      return (nextTier.amountNeeded * nextDiscountRate) + (calculation.displaySubtotal * additionalDiscountRate);
    }

    return 0;
  }, [nextTier, hasSkuTiers, hasDollarTiers, calculation]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 overflow-hidden shadow-sm"
    >
      {/* Main Strip - Always Visible */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Current Tier Badge - ENHANCED SIZE */}
          <div className="flex items-center gap-4 shrink-0">
            {calculation.bestTierDiscount > 0 ? (
              <>
                <Badge className="bg-green-500 text-white border-0 text-xl font-bold px-5 py-2.5 shadow-lg">
                  <svg className="w-6 h-6 mr-2.5 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {calculation.bestTierDiscount}% OFF
                </Badge>
                <div className="text-base text-gray-700 dark:text-gray-300 font-semibold">
                  <span className="text-green-600 dark:text-green-400 font-bold">Tier Unlocked!</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Discount Progress</span>
                <span className="text-sm text-muted-foreground font-medium">Add items to unlock tier savings</span>
              </div>
            )}
          </div>

          {/* Center: Progress Bar & Metrics - ENHANCED */}
          <div className="flex-1 max-w-2xl">
            {nextTier ? (
              <div className="space-y-2.5">
                {/* Progress Label */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-900 dark:text-gray-100 text-base">
                    {formattedCurrent}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    → {formattedTarget} for <span className="font-bold text-blue-600 dark:text-blue-400">{nextTier.tier.discountPercent}% OFF</span>
                  </span>
                </div>

                {/* Progress Bar - LARGER */}
                <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm"
                  />

                  {/* Progress percentage overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white drop-shadow-md">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>

                {/* Next Tier CTA - MORE MOTIVATING */}
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {hasSkuTiers && nextTier.skusNeeded !== undefined && (
                    <span>
                      Just <span className="font-bold text-blue-600 dark:text-blue-400">
                        {nextTier.skusNeeded} more {nextTier.skusNeeded === 1 ? 'SKU' : 'SKUs'}
                      </span>
                      {' '}to unlock {nextTier.tier.discountPercent}% savings!
                    </span>
                  )}
                  {hasDollarTiers && nextTier.amountNeeded !== undefined && (
                    <span>
                      Just <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(nextTier.amountNeeded)} more
                      </span>
                      {' '}to unlock {nextTier.tier.discountPercent}% savings!
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  Maximum Tier Achieved!
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                  You're getting the best possible discount
                </p>
              </div>
            )}
          </div>

          {/* Right: Savings Summary - MAXIMUM PROMINENCE */}
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wide">Total Savings</div>
            <div className="text-4xl font-extrabold text-green-600 dark:text-green-400 tabular-nums">
              {formatCurrency(calculation.totalSavings)}
            </div>
            {nextTier && potentialSavings > 0 && (
              <div className="text-sm font-bold mt-1.5">
                <span className="text-green-600 dark:text-green-400">+{formatCurrency(potentialSavings)}</span>
                <span className="text-muted-foreground ml-1">at next tier</span>
              </div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-950/50"
          >
            <div className="px-6 py-4 space-y-4">
              {/* Tier Breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Available Tiers
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(hasSkuTiers ? promotion.skuTiers : promotion.dollarTiers).map((tier) => {
                    const isAchieved = hasSkuTiers
                      ? calculation.uniqueDisplaySkus >= tier.threshold
                      : calculation.displaySubtotal >= tier.threshold;
                    const isCurrent = calculation.bestTierDiscount === tier.discountPercent && isAchieved;

                    return (
                      <div
                        key={tier.id}
                        className={`p-3 rounded-lg border-2 ${
                          isCurrent
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                            : isAchieved
                            ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {hasSkuTiers ? `${tier.threshold} SKUs` : formatCurrency(tier.threshold)}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-green-500 text-white border-0 text-xs">
                              Current
                            </Badge>
                          )}
                          {!isCurrent && isAchieved && (
                            <Badge variant="outline" className="text-xs">
                              Eligible
                            </Badge>
                          )}
                        </div>
                        <div className={`text-lg font-bold ${
                          isCurrent ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {tier.discountPercent}% OFF
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inventory Incentive */}
              {promotion.inventoryIncentive.enabled && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Backup Inventory Bonus
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {promotion.inventoryIncentive.backupDiscountPercent}% off backup quantities
                      </p>
                    </div>
                    {calculation.inventoryIncentiveQualified ? (
                      <Badge className="bg-green-500 text-white border-0 inline-flex items-center gap-1.5 px-3 py-1">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Qualified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not Yet Qualified
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
