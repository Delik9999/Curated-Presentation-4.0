'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoAudioToggleProps {
  /**
   * Whether the video is currently muted
   */
  isMuted: boolean;

  /**
   * Callback when the mute state should change
   */
  onToggle: () => void;

  /**
   * Whether the accordion/video container is currently open/visible
   */
  isVisible: boolean;

  /**
   * Whether the container is being hovered (for apparent state)
   */
  isContainerHovered?: boolean;

  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * "Discreet but Apparent" Audio Control Component
 *
 * Implements the four-pillar design:
 * 1. Core Experience: Default muted, user-initiated audio
 * 2. UI & Interaction: Micro-interactions with fade states
 * 3. Technical: Controlled component for YouTube IFrame API integration
 * 4. Accessibility: Full WCAG compliance with ARIA and keyboard support
 *
 * Micro-interaction behavior:
 * - On accordion open: Fades in at 100% opacity with "SOUND" label
 * - After 3 seconds: Label fades out, icon fades to 30% opacity (discreet)
 * - On container hover: Icon fades to 100% opacity (apparent)
 * - On container leave: Icon fades back to 30% opacity (discreet)
 */
export function VideoAudioToggle({
  isMuted,
  onToggle,
  isVisible,
  isContainerHovered = false,
  className,
}: VideoAudioToggleProps) {
  const [showLabel, setShowLabel] = useState(false);
  const [isDiscreet, setIsDiscreet] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle initial reveal animation when accordion opens
  useEffect(() => {
    if (isVisible) {
      // Show button and label at full opacity
      setShowLabel(true);
      setIsDiscreet(false);

      // After 3 seconds, fade label out and make icon discreet
      timeoutRef.current = setTimeout(() => {
        setShowLabel(false);
        setIsDiscreet(true);
      }, 3000);
    } else {
      // Reset state when accordion closes
      setShowLabel(false);
      setIsDiscreet(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible]);

  // Handle container hover: when hovered, become apparent (100%)
  // When not hovered, return to discreet state (30%) - but only after 3 second timer
  const shouldBeApparent = isContainerHovered || !isDiscreet;

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Mute"
      aria-pressed={isMuted}
      className={cn(
        // Base positioning: bottom-right corner
        'absolute bottom-4 right-4 z-10',
        // Layout: flex for icon + label
        'flex items-center gap-2',
        // Base styling
        'rounded-full bg-black/60 backdrop-blur-sm',
        'px-3 py-2',
        // Transitions for opacity changes
        'transition-all duration-300 ease-in-out',
        // Hover state
        'hover:bg-black/75',
        // Focus state (keyboard navigation)
        'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent',
        className
      )}
      style={{
        // Dynamic opacity: discreet (30%) or apparent (100%)
        // When container is hovered or within first 3 seconds: 100%
        // After 3 seconds when not hovered: 30%
        opacity: shouldBeApparent ? 1 : 0.3,
      }}
    >
      {/* Icon: speaker-off (muted) or speaker-on (unmuted) */}
      {isMuted ? (
        <VolumeX
          className="w-5 h-5 text-white"
          strokeWidth={2}
          aria-hidden="true"
        />
      ) : (
        <Volume2
          className="w-5 h-5 text-white"
          strokeWidth={2}
          aria-hidden="true"
        />
      )}

      {/* Label: "SOUND" - fades out after 3 seconds */}
      <span
        className={cn(
          'text-xs font-semibold text-white uppercase tracking-wider',
          'transition-opacity duration-300',
          showLabel ? 'opacity-100' : 'opacity-0 w-0'
        )}
        style={{
          // Smooth width transition when hiding label
          width: showLabel ? 'auto' : '0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
        aria-hidden="true"
      >
        Sound
      </span>
    </button>
  );
}
