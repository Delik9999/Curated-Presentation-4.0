'use client';

import { useMemo } from 'react';
import { MilestoneNode, type MilestoneStatus } from './milestone-node';
import { MilestoneConnector, type ConnectorStatus } from './milestone-connector';

export interface Tier {
  id: string;
  threshold: number;
  discountPercent: number;
}

export interface SteppedMilestoneTrackerProps {
  tiers: Tier[];
  currentValue: number;
  formatThreshold: (value: number) => string;
  calculateSavings?: (tier: Tier) => number;
  calculateProjectedSavings?: (tier: Tier) => number;
  onTierClick?: (tier: Tier) => void;
}

interface MilestoneData {
  tier: Tier;
  status: MilestoneStatus;
  thresholdLabel: string;
  savingsAmount?: number;
  projectedSavings?: number;
}

export function SteppedMilestoneTracker({
  tiers,
  currentValue,
  formatThreshold,
  calculateSavings,
  calculateProjectedSavings,
  onTierClick,
}: SteppedMilestoneTrackerProps) {
  // Sort tiers by threshold
  const sortedTiers = useMemo(() => {
    return [...tiers].sort((a, b) => a.threshold - b.threshold);
  }, [tiers]);

  // Determine status for each milestone
  const milestones = useMemo((): MilestoneData[] => {
    let activeFound = false;

    return sortedTiers.map((tier) => {
      const isPassed = currentValue >= tier.threshold;
      let status: MilestoneStatus;

      if (isPassed) {
        status = 'completed';
      } else if (!activeFound) {
        status = 'active';
        activeFound = true;
      } else {
        status = 'locked';
      }

      return {
        tier,
        status,
        thresholdLabel: formatThreshold(tier.threshold),
        savingsAmount: isPassed && calculateSavings ? calculateSavings(tier) : undefined,
        projectedSavings:
          status !== 'completed' && calculateProjectedSavings ? calculateProjectedSavings(tier) : undefined,
      };
    });
  }, [sortedTiers, currentValue, formatThreshold, calculateSavings, calculateProjectedSavings]);

  // Calculate connector statuses and progress
  const connectors = useMemo(() => {
    return milestones.slice(0, -1).map((milestone, index) => {
      const nextMilestone = milestones[index + 1];

      if (milestone.status === 'completed' && nextMilestone.status === 'completed') {
        return { status: 'completed' as ConnectorStatus, progress: 100 };
      }

      if (milestone.status === 'completed' && nextMilestone.status === 'active') {
        // Calculate progress between milestones
        const prevThreshold = milestone.tier.threshold;
        const nextThreshold = nextMilestone.tier.threshold;
        const range = nextThreshold - prevThreshold;
        const progressValue = currentValue - prevThreshold;
        const progress = (progressValue / range) * 100;

        return { status: 'active' as ConnectorStatus, progress: Math.max(0, Math.min(100, progress)) };
      }

      return { status: 'future' as ConnectorStatus, progress: 0 };
    });
  }, [milestones, currentValue]);

  return (
    <div className="w-full">
      {/* Desktop/Tablet: Horizontal Layout */}
      <div className="hidden md:flex items-start justify-between">
        {milestones.map((milestone, index) => (
          <div key={milestone.tier.id} className="flex items-start flex-1 first:flex-initial last:flex-initial">
            <MilestoneNode
              status={milestone.status}
              tierName={`${milestone.tier.discountPercent}% OFF`}
              threshold={milestone.tier.threshold}
              thresholdLabel={milestone.thresholdLabel}
              discountPercent={milestone.tier.discountPercent}
              savingsAmount={milestone.savingsAmount}
              projectedSavings={milestone.projectedSavings}
              onNodeClick={() => onTierClick?.(milestone.tier)}
            />
            {index < milestones.length - 1 && (
              <MilestoneConnector status={connectors[index].status} progress={connectors[index].progress} />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Vertical Layout */}
      <div className="flex flex-col gap-4 md:hidden">
        {milestones.map((milestone, index) => (
          <div key={milestone.tier.id} className="flex flex-col items-center gap-2">
            <MilestoneNode
              status={milestone.status}
              tierName={`${milestone.tier.discountPercent}% OFF`}
              threshold={milestone.tier.threshold}
              thresholdLabel={milestone.thresholdLabel}
              discountPercent={milestone.tier.discountPercent}
              savingsAmount={milestone.savingsAmount}
              projectedSavings={milestone.projectedSavings}
              onNodeClick={() => onTierClick?.(milestone.tier)}
            />
            {index < milestones.length - 1 && (
              <div className="h-12 w-1">
                <div className={`h-full w-full rounded-full ${
                  connectors[index].status === 'completed'
                    ? 'bg-green-500'
                    : connectors[index].status === 'active'
                    ? 'bg-gradient-to-b from-green-500 to-indigo-500'
                    : 'border-l-2 border-dashed border-gray-300'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
