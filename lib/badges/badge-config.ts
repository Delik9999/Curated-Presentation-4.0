import { Badge, BadgeType } from '@/lib/selections/types';

// Predefined badge configurations
export const PREDEFINED_BADGES: Record<BadgeType, Omit<Badge, 'id'>> = {
  'dallas-favorite': {
    type: 'dallas-favorite',
    label: 'Dallas Market Favorite',
    color: 'bg-blue-500',
    icon: 'star',
  },
  'top-scanned': {
    type: 'top-scanned',
    label: 'Top Scanned',
    color: 'bg-purple-500',
    icon: 'trending-up',
  },
  'designers-pick': {
    type: 'designers-pick',
    label: "Designer's Pick",
    color: 'bg-pink-500',
    icon: 'sparkles',
  },
  'show-highlight': {
    type: 'show-highlight',
    label: 'Show Highlight',
    color: 'bg-amber-500',
    icon: 'zap',
  },
  'best-selling-size': {
    type: 'best-selling-size',
    label: 'Best Selling Size',
    color: 'bg-green-500',
    icon: 'trophy',
  },
  'custom': {
    type: 'custom',
    label: 'Custom Badge',
    color: 'bg-gray-500',
  },
};

// Helper to create a new badge
export function createBadge(type: BadgeType, customLabel?: string, customColor?: string): Badge {
  const config = PREDEFINED_BADGES[type];
  return {
    id: `badge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    label: customLabel || config.label,
    color: customColor || config.color,
    icon: config.icon,
  };
}

// Helper to get badge color classes
export function getBadgeColorClass(badge: Badge): string {
  return badge.color || 'bg-gray-500';
}

// Helper to get badge text color (contrast)
export function getBadgeTextColorClass(badge: Badge): string {
  return 'text-white';
}
