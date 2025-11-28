'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { clsx } from 'clsx';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={clsx('fixed inset-0 z-40 bg-black/20 backdrop-blur-sm', className)}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'left' | 'right';
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = 'right', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={clsx(
        // Base styles with improved mobile support
        'fixed z-50 flex h-full w-full flex-col gap-4 md:gap-6 bg-card shadow-2xl overflow-y-auto',
        // Mobile: Smaller padding, tablet+: Normal padding
        'p-4 sm:p-5 md:p-6',
        // ANCHORED DYNAMIC MODAL: Much wider to accommodate 60/40 split layout
        // Mobile: Full width, Tablet: 90vw, Desktop: Wide enough for Controls + Preview
        'sm:max-w-[90vw] md:max-w-[920px] lg:max-w-[1100px] xl:max-w-[1200px]',
        // Animations with better mobile performance
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:duration-300 data-[state=closed]:duration-200',
        // Side positioning
        side === 'right' && 'right-0 top-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        side === 'left' && 'left-0 top-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
        className
      )}
      // Accessibility: Proper ARIA attributes
      aria-describedby={undefined}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('space-y-2', className)} {...props} />
);

export const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={clsx('text-lg font-semibold', className)} {...props} />
);

export const SheetDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={clsx('text-sm text-slate-600', className)} {...props} />
);
