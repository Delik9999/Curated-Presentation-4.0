import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, label, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-neutral-700">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-lg border-2 border-neutral-200 bg-white px-4 py-2 text-sm',
            'transition-all duration-200',
            'placeholder:text-neutral-400',
            'focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100',
            'focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-100',
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              'text-xs',
              error ? 'text-red-600' : 'text-neutral-500'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
