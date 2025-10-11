import * as React from 'react';
import { clsx } from 'clsx';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      type={type}
      className={clsx(
        'flex h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';
