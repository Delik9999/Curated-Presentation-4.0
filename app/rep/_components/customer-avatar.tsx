'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/customers/loadCustomers';

export interface CustomerAvatarProps {
  customer: Customer;
  size?: number; // Size in pixels (default: 32)
  className?: string;
}

/**
 * Displays a customer's logo or falls back to initials in a rounded square
 */
export function CustomerAvatar({ customer, size = 32, className }: CustomerAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const hasLogo = Boolean(customer.logoUrl && !imageError);

  // Generate initials from customer name
  const getInitials = () => {
    const words = customer.name
      .replace(/^!!?\s*/, '') // Remove test marker prefixes like "!!" or "!"
      .trim()
      .split(/\s+/);

    if (words.length === 1) {
      // Single word: take first 2 letters
      return words[0].substring(0, 2).toUpperCase();
    }

    // Multiple words: take first letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const initials = getInitials();

  if (hasLogo) {
    return (
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-md bg-muted',
          className
        )}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img
          src={customer.logoUrl}
          alt={`${customer.name} logo`}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain p-1"
          style={{ maxWidth: size, maxHeight: size }}
        />
      </div>
    );
  }

  // Fallback: Display initials
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-muted text-muted-foreground font-semibold select-none',
        className
      )}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        fontSize: Math.floor(size * 0.4), // Font size is 40% of container size
      }}
      title={customer.name}
    >
      {initials}
    </div>
  );
}
