'use client';

import { motion } from 'framer-motion';
import { Check, Target, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

export type MilestoneStatus = 'completed' | 'active' | 'locked';

export interface MilestoneNodeProps {
  status: MilestoneStatus;
  tierName: string;
  threshold: number;
  thresholdLabel: string;
  discountPercent: number;
  savingsAmount?: number;
  projectedSavings?: number;
  onNodeClick?: () => void;
}

export function MilestoneNode({
  status,
  thresholdLabel,
  discountPercent,
  savingsAmount,
  projectedSavings,
  onNodeClick,
}: MilestoneNodeProps) {
  // Color scheme per Design Principles VI.A
  const getTierColor = (percent: number): string => {
    if (percent >= 50) return 'emerald'; // 50% OFF tier
    if (percent >= 30) return 'amber'; // 30% OFF tier
    return 'blue'; // Lower tier discount
  };

  const tierColor = getTierColor(discountPercent);

  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-500 dark:bg-green-600',
          border: 'border-green-600 dark:border-green-700',
          ring: 'ring-4 ring-green-200 dark:ring-green-800',
          shadow: 'shadow-lg shadow-green-500/50',
          text: 'text-white',
          icon: Check,
        };
      case 'active':
        return {
          bg: tierColor === 'emerald'
            ? 'bg-emerald-500 dark:bg-emerald-600'
            : tierColor === 'amber'
            ? 'bg-amber-500 dark:bg-amber-600'
            : 'bg-blue-500 dark:bg-blue-600',
          border: tierColor === 'emerald'
            ? 'border-emerald-600 dark:border-emerald-700'
            : tierColor === 'amber'
            ? 'border-amber-600 dark:border-amber-700'
            : 'border-blue-600 dark:border-blue-700',
          ring: tierColor === 'emerald'
            ? 'ring-4 ring-emerald-200 dark:ring-emerald-800'
            : tierColor === 'amber'
            ? 'ring-4 ring-amber-200 dark:ring-amber-800'
            : 'ring-4 ring-blue-200 dark:ring-blue-800',
          shadow: tierColor === 'emerald'
            ? 'shadow-lg shadow-emerald-500/50'
            : tierColor === 'amber'
            ? 'shadow-lg shadow-amber-500/50'
            : 'shadow-lg shadow-blue-500/50',
          text: 'text-white',
          icon: Target,
        };
      case 'locked':
        return {
          bg: 'bg-gray-300 dark:bg-gray-700',
          border: 'border-gray-400 dark:border-gray-600',
          ring: 'ring-2 ring-gray-200 dark:ring-gray-600',
          shadow: '',
          text: 'text-gray-600 dark:text-gray-400',
          icon: Lock,
        };
    }
  };

  const styles = getStatusStyles();
  const Icon = styles.icon;

  const isInteractive = status === 'active' || status === 'locked';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Node */}
      <motion.button
        onClick={onNodeClick}
        disabled={!isInteractive}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={isInteractive ? { scale: 1.05 } : {}}
        whileTap={isInteractive ? { scale: 0.95 } : {}}
        className={cn(
          'relative flex h-18 w-18 items-center justify-center rounded-2xl border-2 transition-all duration-300',
          styles.bg,
          styles.border,
          styles.ring,
          styles.shadow,
          isInteractive && 'cursor-pointer',
          status === 'active' && 'animate-pulse'
        )}
      >
        <Icon className={cn('h-8 w-8', styles.text)} strokeWidth={2.5} />

        {/* Active indicator dot */}
        {status === 'active' && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-white"></span>
          </span>
        )}
      </motion.button>

      {/* Tier Label */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            'text-sm font-bold transition-colors',
            status === 'completed' && 'text-green-600 dark:text-green-400',
            status === 'active' && tierColor === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
            status === 'active' && tierColor === 'amber' && 'text-amber-600 dark:text-amber-400',
            status === 'active' && tierColor === 'blue' && 'text-blue-600 dark:text-blue-400',
            status === 'locked' && 'text-gray-500 dark:text-gray-500'
          )}
        >
          {discountPercent}% OFF
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">{thresholdLabel}</div>
      </div>

      {/* Savings Display */}
      {status === 'completed' && savingsAmount !== undefined && savingsAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-center"
        >
          <div className="text-xs font-semibold text-green-700 dark:text-green-300">
            {formatCurrency(savingsAmount)}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">SECURED</div>
        </motion.div>
      )}

      {/* Projected Savings */}
      {status === 'active' && projectedSavings !== undefined && projectedSavings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-lg px-3 py-1.5 text-center',
            tierColor === 'emerald' && 'bg-emerald-100 dark:bg-emerald-900/30',
            tierColor === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
            tierColor === 'blue' && 'bg-blue-100 dark:bg-blue-900/30'
          )}
        >
          <div
            className={cn(
              'text-xs font-semibold',
              tierColor === 'emerald' && 'text-emerald-700 dark:text-emerald-400',
              tierColor === 'amber' && 'text-amber-700 dark:text-amber-400',
              tierColor === 'blue' && 'text-blue-700 dark:text-blue-400'
            )}
          >
            +{formatCurrency(projectedSavings)}
          </div>
          <div
            className={cn(
              'text-xs',
              tierColor === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
              tierColor === 'amber' && 'text-amber-600 dark:text-amber-400',
              tierColor === 'blue' && 'text-blue-600 dark:text-blue-400'
            )}
          >
            potential margin
          </div>
        </motion.div>
      )}

      {/* Locked Indicator */}
      {status === 'locked' && projectedSavings !== undefined && projectedSavings > 0 && (
        <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 px-3 py-1.5 text-center">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            +{formatCurrency(projectedSavings)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">potential margin</div>
        </div>
      )}
    </div>
  );
}
