'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ConnectorStatus = 'completed' | 'active' | 'future';

export interface MilestoneConnectorProps {
  status: ConnectorStatus;
  progress?: number; // 0-100 for active connectors
}

export function MilestoneConnector({ status, progress = 0 }: MilestoneConnectorProps) {
  const getConnectorStyles = () => {
    switch (status) {
      case 'completed':
        return {
          base: 'bg-green-500 dark:bg-green-600',
          height: 'h-1',
          style: 'solid',
        };
      case 'active':
        return {
          base: 'bg-gray-200 dark:bg-gray-700',
          height: 'h-1',
          style: 'gradient',
        };
      case 'future':
        return {
          base: 'bg-gray-300 dark:bg-gray-600',
          height: 'h-0.5',
          style: 'dotted',
        };
    }
  };

  const styles = getConnectorStyles();

  return (
    <div className="relative flex flex-1 items-center px-2">
      {/* Base line */}
      <div
        className={cn(
          'w-full rounded-full transition-all duration-500',
          styles.height,
          status === 'future' ? 'border-t-2 border-dashed border-gray-300 dark:border-gray-600' : styles.base
        )}
      />

      {/* Active progress fill */}
      {status === 'active' && progress > 0 && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute left-2 h-1 rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-indigo-500 shadow-md"
        />
      )}
    </div>
  );
}
