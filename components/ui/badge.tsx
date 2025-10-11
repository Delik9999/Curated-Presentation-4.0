import * as React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'muted';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        variant === 'default' && 'bg-secondary text-secondary-foreground',
        variant === 'outline' && 'border border-border text-slate-600',
        variant === 'muted' && 'bg-muted text-slate-600',
        className
      )}
      {...props}
    />
  );
}
