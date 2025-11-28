'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { clsx } from 'clsx';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import * as Dialog from '@radix-ui/react-dialog';

export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={clsx(
      'flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl',
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

export const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-slate-500">
    <MagnifyingGlassIcon className="h-4 w-4" />
    <CommandPrimitive.Input
      ref={ref}
      className={clsx('flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400', className)}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

export const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List ref={ref} className={clsx('flex-1 overflow-y-auto p-2', className)} {...props} />
));
CommandList.displayName = CommandPrimitive.List.displayName;

export const CommandEmpty = CommandPrimitive.Empty;
export const CommandGroup = CommandPrimitive.Group;
export const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={clsx(
      'flex cursor-pointer select-none items-center gap-2 rounded-2xl px-3 py-2 text-sm text-foreground aria-selected:bg-secondary/60 aria-selected:text-foreground',
      className
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

export const CommandSeparator = CommandPrimitive.Separator;
export const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={clsx('ml-auto text-xs text-slate-400', className)} {...props} />
);

export const CommandDialog = ({ children, ...props }: Dialog.DialogProps) => {
  return (
    <Dialog.Root {...props}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-full max-w-[640px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
          <Command className="border-0 shadow-none">{children}</Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
