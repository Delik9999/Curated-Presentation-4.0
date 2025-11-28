'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfettiExplosion from 'react-confetti-explosion';
import { Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

export interface TierAchievementCelebrationProps {
  tierPercent: number;
  savingsAmount: number;
  onComplete?: () => void;
}

export function TierAchievementCelebration({
  tierPercent,
  savingsAmount,
  onComplete,
}: TierAchievementCelebrationProps) {
  const [isExploding, setIsExploding] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExploding(false);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Tier color
  const getTierColor = () => {
    if (tierPercent >= 50) return 'emerald';
    if (tierPercent >= 30) return 'amber';
    return 'blue';
  };

  const tierColor = getTierColor();

  return (
    <AnimatePresence>
      {isExploding && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          {/* Confetti */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <ConfettiExplosion
              force={0.8}
              duration={3000}
              particleCount={150}
              width={1600}
              colors={
                tierColor === 'emerald'
                  ? ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']
                  : tierColor === 'amber'
                  ? ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A']
                  : ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE']
              }
            />
          </div>

          {/* Achievement Card */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className={cn(
              'relative rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4',
              tierColor === 'emerald' &&
                'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-800 dark:to-gray-800',
              tierColor === 'amber' &&
                'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-gray-800 dark:to-gray-800',
              tierColor === 'blue' &&
                'bg-gradient-to-br from-blue-50 to-sky-100 dark:from-gray-800 dark:to-gray-800'
            )}
          >
            {/* Trophy Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-full shadow-lg',
                  tierColor === 'emerald' && 'bg-emerald-500',
                  tierColor === 'amber' && 'bg-amber-500',
                  tierColor === 'blue' && 'bg-blue-500'
                )}
              >
                <Trophy className="h-10 w-10 text-white" strokeWidth={2.5} />
              </div>
            </motion.div>

            {/* Achievement Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center space-y-4"
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className={cn(
                  'h-6 w-6',
                  tierColor === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                  tierColor === 'amber' && 'text-amber-600 dark:text-amber-400',
                  tierColor === 'blue' && 'text-blue-600 dark:text-blue-400'
                )} />
                <h2
                  className={cn(
                    'text-3xl font-bold',
                    tierColor === 'emerald' && 'text-emerald-700 dark:text-emerald-400',
                    tierColor === 'amber' && 'text-amber-700 dark:text-amber-400',
                    tierColor === 'blue' && 'text-blue-700 dark:text-blue-400'
                  )}
                >
                  Partnership Status Achieved!
                </h2>
                <Sparkles className={cn(
                  'h-6 w-6',
                  tierColor === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                  tierColor === 'amber' && 'text-amber-600 dark:text-amber-400',
                  tierColor === 'blue' && 'text-blue-600 dark:text-blue-400'
                )} />
              </div>

              <div className="space-y-2">
                <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
                  You've achieved
                </p>
                <div
                  className={cn(
                    'text-6xl font-bold tabular-nums',
                    tierColor === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                    tierColor === 'amber' && 'text-amber-600 dark:text-amber-400',
                    tierColor === 'blue' && 'text-blue-600 dark:text-blue-400'
                  )}
                >
                  {tierPercent}% Partnership Status
                </div>
              </div>

              <div
                className={cn(
                  'rounded-xl p-4',
                  tierColor === 'emerald' && 'bg-emerald-100 dark:bg-emerald-900/30',
                  tierColor === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
                  tierColor === 'blue' && 'bg-blue-100 dark:bg-blue-900/30'
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Margin secured
                  </p>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                  {formatCurrency(savingsAmount)}
                </div>
              </div>

              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Continue expanding to achieve enhanced partnership benefits
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
