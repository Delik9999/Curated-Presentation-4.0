'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

export interface TotalSavingsKPIProps {
  savings: number;
  percentage?: number;
  wspTotal?: number;
  netTotal?: number;
  previousSavings?: number;
  animate?: boolean;
  className?: string;
}

export function TotalSavingsKPI({
  savings,
  percentage,
  wspTotal,
  netTotal,
  previousSavings,
  animate = true,
  className,
}: TotalSavingsKPIProps) {
  const [displayValue, setDisplayValue] = useState(savings);
  const trend = previousSavings !== undefined ? savings - previousSavings : 0;
  const hasTrend = trend !== 0;

  // Animated counter effect
  useEffect(() => {
    if (!animate) {
      setDisplayValue(savings);
      return;
    }

    const duration = 1000; // 1 second
    const steps = 30;
    const increment = (savings - displayValue) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(savings);
        clearInterval(timer);
      } else {
        setDisplayValue((prev) => prev + increment);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [savings, animate]);

  if (savings <= 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border-l-4 border-green-500 dark:border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 p-6 shadow-lg',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Label */}
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
            Total Margin Secured
          </div>

          {/* Amount */}
          <div className="mb-3 flex items-baseline gap-2">
            <motion.div
              key={savings}
              initial={animate ? { scale: 1.2 } : {}}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-4xl font-bold text-green-600 dark:text-green-400 tabular-nums lg:text-5xl"
            >
              {formatCurrency(Math.round(displayValue))}
            </motion.div>

            {/* Percentage badge */}
            {percentage !== undefined && percentage > 0 && (
              <div className="rounded-full bg-green-200 dark:bg-green-900/50 px-3 py-1 text-sm font-semibold text-green-700 dark:text-green-300">
                {Math.round(percentage)}% off
              </div>
            )}
          </div>

          {/* Context: WSP → NET */}
          {wspTotal !== undefined && netTotal !== undefined && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="line-through">{formatCurrency(wspTotal)}</span>
              <span className="mx-2">→</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(netTotal)}</span>
            </div>
          )}

          {/* Trend indicator */}
          <AnimatePresence>
            {hasTrend && previousSavings !== undefined && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  'mt-3 flex items-center gap-1.5 text-sm font-medium',
                  trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                )}
              >
                {trend > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>+{formatCurrency(trend)} from last change</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    <span>{formatCurrency(trend)} from last change</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Optional: Celebration icon when savings are high */}
        {savings > 10000 && (
          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-4xl"
          >
            💰
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
