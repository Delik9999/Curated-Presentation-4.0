'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge as BadgeType } from '@/lib/selections/types';
import { cn } from '@/lib/utils';

interface BadgeDisplayProps {
  badge: BadgeType;
  onRemove?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeDisplay({ badge, onRemove, className, size = 'md' }: BadgeDisplayProps) {
  // Ghost pill style: transparent background with white border (80% opacity for softer look)
  return (
    <span
      className={cn(
        // Base ghost pill styles
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        'bg-transparent border border-white/80 text-white',
        // Size variants (sm uses 13px font size for proper hierarchy)
        size === 'sm' && 'px-3 py-1 text-[0.8125rem]',
        size === 'md' && 'px-4 py-1.5 text-sm',
        size === 'lg' && 'px-5 py-2 text-base',
        className
      )}
    >
      <span>{badge.label}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove badge"
        >
          <X className={cn(
            size === 'sm' && 'h-2.5 w-2.5',
            size === 'md' && 'h-3 w-3',
            size === 'lg' && 'h-3.5 w-3.5'
          )} />
        </button>
      )}
    </span>
  );
}
