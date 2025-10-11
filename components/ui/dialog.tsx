'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { Cross2Icon } from '@radix-ui/react-icons';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={clsx('fixed inset-0 z-40 bg-black/30 backdrop-blur-sm', className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={clsx(
        'fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-2xl -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
        <span className="sr-only">Close</span>
        <Cross2Icon className="h-5 w-5" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('space-y-2', className)} {...props} />
);

export const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={clsx('text-lg font-semibold', className)} {...props} />
);

export const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={clsx('text-sm text-slate-600', className)} {...props} />
);
