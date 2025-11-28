'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StickyHeaderProps {
  children: React.ReactNode | ((props: { isSticky: boolean; isHidden: boolean }) => React.ReactNode);
  className?: string;
  threshold?: number;
  shrinkOnScroll?: boolean;
  smartHide?: boolean;
}

export function useStickyHeader(threshold = 100) {
  const [isSticky, setIsSticky] = React.useState(false);
  const [isHidden, setIsHidden] = React.useState(false);
  const [lastScrollY, setLastScrollY] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Sticky state (shrink header)
      setIsSticky(currentScrollY > threshold);

      // Smart hiding (scroll direction) - only hide when scrolling down past threshold
      if (currentScrollY > lastScrollY && currentScrollY > threshold + 50) {
        setIsHidden(true); // Scrolling down
      } else if (currentScrollY < lastScrollY) {
        setIsHidden(false); // Scrolling up
      }

      setLastScrollY(currentScrollY);
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, lastScrollY]);

  return { isSticky, isHidden };
}

export function StickyHeader({
  children,
  className,
  threshold = 80,
  shrinkOnScroll = true,
  smartHide = false,
}: StickyHeaderProps) {
  const { isSticky, isHidden } = useStickyHeader(threshold);

  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        'bg-white dark:bg-gray-900',
        'border-b border-neutral-200 dark:border-neutral-800',
        'transition-all duration-300 ease-out',
        isSticky && shrinkOnScroll && 'shadow-md',
        smartHide && isHidden && '-translate-y-full',
        className
      )}
      data-sticky={isSticky}
      data-hidden={isHidden}
    >
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          isSticky && shrinkOnScroll && 'py-3',
          !isSticky && 'py-6'
        )}
      >
        {typeof children === 'function' ? children({ isSticky, isHidden }) : children}
      </div>
    </header>
  );
}
