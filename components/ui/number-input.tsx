'use client';

import * as React from 'react';
import { clsx } from 'clsx';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, min = 0, max = 9999, step = 1, disabled, ...props }, ref) => {
    const handleIncrement = () => {
      const newValue = value + step;
      if (newValue <= max) {
        onChange(newValue);
      }
    };

    const handleDecrement = () => {
      const newValue = value - step;
      if (newValue >= min) {
        onChange(newValue);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow empty string for user to clear and type
      if (inputValue === '') {
        onChange(min);
        return;
      }

      const numValue = Number(inputValue);

      if (!isNaN(numValue) && Number.isFinite(numValue)) {
        // Clamp between min and max
        const clampedValue = Math.min(Math.max(numValue, min), max);
        onChange(clampedValue);
      }
    };

    return (
      <div className={clsx('inline-flex items-center justify-center', className)}>
        {/* Pill/Capsule container with integrated buttons */}
        <div className="inline-flex items-center h-8 rounded-full border border-border bg-white dark:bg-neutral-950 overflow-hidden">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className={clsx(
              'h-full w-7 flex items-center justify-center transition-colors shrink-0',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'disabled:opacity-30 disabled:cursor-not-allowed',
              'border-r border-border'
            )}
          >
            <MinusIcon className="h-3.5 w-3.5" />
          </button>
          <input
            ref={ref}
            type="number"
            value={value}
            onChange={handleInputChange}
            disabled={disabled}
            min={min}
            max={max}
            className={clsx(
              'h-full w-10 bg-transparent text-center text-sm font-semibold tabular-nums leading-8',
              'focus-visible:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            )}
            {...props}
          />
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className={clsx(
              'h-full w-7 flex items-center justify-center transition-colors shrink-0',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'disabled:opacity-30 disabled:cursor-not-allowed',
              'border-l border-border'
            )}
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
