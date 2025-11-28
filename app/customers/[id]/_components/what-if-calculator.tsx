'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { Promotion, PromotionCalculation } from '@/lib/promotions/types';
import { calculateProjectedSavingsAtTier, getWhatIfComparisonMessage } from '@/lib/promotions/financial-messaging';

export interface WhatIfCalculatorProps {
  promotion: Promotion;
  currentCalculation: PromotionCalculation;
  className?: string;
}

export function WhatIfCalculator({ promotion, currentCalculation, className }: WhatIfCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine available tiers
  const hasSkuTiers = promotion.skuTiers.length > 0;
  const tiers = hasSkuTiers
    ? [...promotion.skuTiers].sort((a, b) => a.threshold - b.threshold)
    : [...promotion.dollarTiers].sort((a, b) => a.threshold - b.threshold);

  // Filter to show only higher tiers than current
  const currentBestDiscount = currentCalculation.bestTierDiscount;
  const higherTiers = tiers.filter((t) => t.discountPercent > currentBestDiscount);

  if (higherTiers.length === 0) {
    // Already at max tier
    return null;
  }

  const currentTotal = currentCalculation.displayTotal;
  const currentValue = hasSkuTiers ? currentCalculation.uniqueDisplaySkus : currentCalculation.displayTotal;

  return (
    <Card className={cn('rounded-xl border-2 border-blue-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900', className)}>
      <CardHeader className="pb-4 bg-blue-50 dark:bg-gray-800 border-b border-blue-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Partnership Planning Calculator
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Explore enhanced partnership status benefits
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-4 pt-0">
              {higherTiers.map((tier, index) => {
                const projectedSavings = calculateProjectedSavingsAtTier(currentTotal, tier.discountPercent);
                const additionalSavings = projectedSavings - currentCalculation.totalSavings;
                const gap = hasSkuTiers
                  ? tier.threshold - currentValue
                  : tier.threshold - currentValue;

                const gapLabel = hasSkuTiers
                  ? `${Math.ceil(gap)} ${Math.ceil(gap) === 1 ? 'SKU' : 'SKUs'}`
                  : formatCurrency(gap);

                // Tier color
                const getTierColor = () => {
                  if (tier.discountPercent >= 50) return 'emerald';
                  if (tier.discountPercent >= 30) return 'amber';
                  return 'blue';
                };

                const tierColor = getTierColor();

                return (
                  <motion.div
                    key={tier.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'rounded-lg border-2 p-4 transition-all hover:shadow-md',
                      tierColor === 'emerald' &&
                        'border-emerald-200 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30',
                      tierColor === 'amber' &&
                        'border-amber-200 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30',
                      tierColor === 'blue' &&
                        'border-blue-200 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Tier Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'rounded-full px-3 py-1 text-sm font-bold',
                              tierColor === 'emerald' &&
                                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
                              tierColor === 'amber' &&
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
                              tierColor === 'blue' &&
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                            )}
                          >
                            {tier.discountPercent}% OFF
                          </div>
                          <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        </div>

                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          <span className="font-medium">Expand by {gapLabel}</span> to achieve this partnership status
                        </div>

                        {/* Projected Savings */}
                        <div className="flex items-baseline gap-2">
                          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                              +{formatCurrency(additionalSavings)}
                            </div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400">
                              additional margin ({formatCurrency(projectedSavings)} total secured)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Percentage Badge */}
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={cn(
                            'text-4xl font-bold tabular-nums',
                            tierColor === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                            tierColor === 'amber' && 'text-amber-600 dark:text-amber-400',
                            tierColor === 'blue' && 'text-blue-600 dark:text-blue-400'
                          )}
                        >
                          {tier.discountPercent}%
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">discount</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
