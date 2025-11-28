'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

export interface RadialGoalMeterProps {
  current: number;
  target: number;
  tierName: string;
  tierPercent: number;
  projectedSavings?: number;
  formatValue: (value: number) => string;
}

export function RadialGoalMeter({
  current,
  target,
  tierPercent,
  projectedSavings,
  formatValue,
}: RadialGoalMeterProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const gap = Math.max(target - current, 0);
  const gapLabel = formatValue(gap);

  // Determine color based on progress
  const getProgressColor = () => {
    if (percentage >= 90) return 'text-emerald-500 dark:text-emerald-400';
    if (percentage >= 67) return 'text-blue-500 dark:text-blue-400';
    if (percentage >= 34) return 'text-amber-500 dark:text-amber-400';
    return 'text-gray-400 dark:text-gray-500';
  };

  const getStrokeColor = () => {
    if (percentage >= 90) return '#10B981'; // emerald-500
    if (percentage >= 67) return '#3B82F6'; // blue-500
    if (percentage >= 34) return '#F59E0B'; // amber-500
    return '#9CA3AF'; // gray-400
  };

  // SVG circle parameters
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular Progress */}
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={cn(percentage >= 90 && 'drop-shadow-lg')}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {formatValue(current)} / {formatValue(target)}
            </div>
            <div className={cn('text-3xl font-bold transition-colors', getProgressColor())}>
              {Math.round(percentage)}%
            </div>
          </div>
        </div>

        {/* Pulsing animation at high progress */}
        {percentage >= 90 && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-emerald-500"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {/* Gap Info */}
      <div className="text-center">
        {gap > 0 ? (
          <>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {gapLabel} to next status
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">achieve {tierPercent}% partnership status</div>
            {projectedSavings !== undefined && projectedSavings > 0 && (
              <div className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                Secure {formatCurrency(projectedSavings)}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
            <span>✓</span>
            <span>Status Achieved!</span>
          </div>
        )}
      </div>
    </div>
  );
}
