'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getFinishColor } from '@/lib/catalog/finishColors';
import { getFinishSwatch, getFallbackColor } from '@/lib/finishes/hubbardton-finish-swatches';

interface FinishSwatchProps {
  finishName: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'mega';
  enableZoom?: boolean; // DEPRECATED: No longer used, kept for backwards compatibility
  bare?: boolean; // When true, renders without internal button wrapper - for use inside external containers
}

export function FinishSwatch({
  finishName,
  selected = false,
  onClick,
  size = 'md',
  enableZoom = false, // DEPRECATED: Popover zoom removed in favor of anchored preview
  bare = false, // When true, renders without internal button wrapper
}: FinishSwatchProps) {
  // Try to get Hubbardton Forge swatch first, fall back to general finish color
  const swatchData = getFinishSwatch(finishName);
  const legacyColor = getFinishColor(finishName);

  // Priority: Hubbardton imageUrl > Hubbardton color > legacy color > generated fallback
  const imageUrl = swatchData?.imageUrl;
  const color = swatchData?.color || legacyColor || getFallbackColor(finishName);

  // V2: MANDATE 2 - Visual consistency indicator for non-photographic swatches
  const isPhotographic = !!imageUrl;

  // V3: ANCHORED DYNAMIC - SQUARE swatches, larger sizes for texture visibility
  const sizeClasses = {
    sm: 'w-12 h-12',         // Square - Compact
    md: 'w-16 h-16',         // Square - Default
    lg: 'w-24 h-24',         // Square - For 3-wide grid
    xl: 'w-32 h-32',         // Square - Large detail
    '2xl': 'w-48 h-48',      // Square - Large preview
    'mega': 'w-full h-full', // Square - Maximum preview (full container)
  };

  // Bare mode: render just the visual element without button wrapper
  if (bare) {
    return (
      <div
        className={cn(
          'w-full h-full relative',
          sizeClasses[size]
        )}
        style={{
          backgroundColor: imageUrl ? 'transparent' : color,
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Subtle overlay for depth */}
        {isPhotographic ? (
          <div className="absolute inset-0 ring-1 ring-inset ring-black/10" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10" />
        )}
        {!imageUrl && !color && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 font-semibold">
            {finishName.charAt(0)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'rounded-lg border-2 transition-all overflow-hidden relative',
          sizeClasses[size],
          selected
            ? 'border-blue-600 ring-2 ring-blue-200 shadow-lg'
            : 'border-gray-300 hover:border-gray-400 hover:shadow-md',
          onClick && 'cursor-pointer'
        )}
        style={{
          backgroundColor: imageUrl ? 'transparent' : color,
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        title={finishName}
        aria-label={finishName}
      >
        {/* V3: ANCHORED DYNAMIC - Texture overlay for photographic swatches, gradient for color-based */}
        {isPhotographic ? (
          <div className="absolute inset-0 ring-1 ring-inset ring-black/10" />
        ) : (
          <>
            {/* Subtle gradient and pattern for non-photographic materials */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-black/10 ring-1 ring-inset ring-black/20" />
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)'
            }} />
          </>
        )}

        {!imageUrl && !color && (
          <span className="text-xs text-gray-600 relative z-10 font-semibold">{finishName.charAt(0)}</span>
        )}
      </button>
    </div>
  );
}
