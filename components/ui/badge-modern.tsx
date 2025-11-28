import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary-600 text-white',
        secondary:
          'border-transparent bg-neutral-100 text-neutral-900',
        outline: 'text-neutral-900 border-neutral-200',
        success:
          'border-transparent bg-green-100 text-green-700',
        warning:
          'border-transparent bg-amber-100 text-amber-700',
        error:
          'border-transparent bg-red-100 text-red-700',
        info:
          'border-transparent bg-blue-100 text-blue-700',
        primary:
          'border-transparent bg-primary-100 text-primary-700',
        accent:
          'border-transparent bg-accent-100 text-accent-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
