'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
  logo: string;
}

interface VendorDropdownProps {
  vendors: Vendor[];
  selectedVendor: string;
  onVendorChange: (vendorId: string) => void;
  className?: string;
}

export function VendorDropdown({
  vendors,
  selectedVendor,
  onVendorChange,
  className,
}: VendorDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const selectedVendorData = vendors.find((v) => v.id === selectedVendor);

  // Only show dropdown if there are multiple vendors
  if (vendors.length <= 1) {
    return null;
  }

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuPrimitive.Trigger
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition-all',
          'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'min-h-[44px] min-w-[180px] md:min-w-[200px]',
          open && 'bg-muted/50',
          className
        )}
        aria-label="Select vendor"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Selected Vendor Logo Container */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded border border-neutral-200 dark:border-neutral-700 p-1">
          <Image
            src={selectedVendorData?.logo || ''}
            alt=""
            width={selectedVendorData?.id === 'lib-and-co' ? 24 : 60}
            height={24}
            className="object-contain"
          />
        </div>

        {/* Selected Vendor Name */}
        <span className="flex-1 text-left truncate text-foreground">
          {selectedVendorData?.name || 'Select Vendor'}
        </span>

        {/* Chevron Icon */}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            open && 'transform rotate-180'
          )}
          aria-hidden="true"
        />
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={cn(
            'z-50 min-w-[180px] md:min-w-[200px] overflow-hidden rounded-xl border border-border bg-white dark:bg-neutral-950 p-1 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
          )}
          align="start"
          sideOffset={4}
          role="menu"
          aria-label="Vendor selection menu"
        >
          {vendors.map((vendor) => {
            const isSelected = vendor.id === selectedVendor;
            return (
              <DropdownMenuPrimitive.Item
                key={vendor.id}
                className={cn(
                  'relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm outline-none cursor-pointer',
                  'transition-colors focus:bg-accent focus:text-accent-foreground',
                  'hover:bg-accent hover:text-accent-foreground',
                  'min-h-[44px]',
                  isSelected && 'bg-accent/50'
                )}
                onSelect={() => {
                  onVendorChange(vendor.id);
                  setOpen(false);
                }}
                role="menuitem"
                aria-label={`Switch to ${vendor.name}`}
                aria-current={isSelected ? 'true' : undefined}
              >
                {/* Vendor Logo Container */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded border border-neutral-200 dark:border-neutral-700 p-1">
                  <Image
                    src={vendor.logo}
                    alt=""
                    width={vendor.id === 'lib-and-co' ? 24 : 60}
                    height={24}
                    className="object-contain"
                  />
                </div>

                {/* Vendor Name */}
                <span className="flex-1 truncate">{vendor.name}</span>

                {/* Active Indicator */}
                {isSelected && (
                  <Check
                    className="h-4 w-4 text-primary flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
              </DropdownMenuPrimitive.Item>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
