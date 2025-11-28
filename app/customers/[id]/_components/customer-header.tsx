'use client';

import { StickyHeader } from '@/components/ui/sticky-header';
import { LogoutButton } from '@/components/auth/logout-button';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CustomerHeaderProps {
  customerName: string;
}

export function CustomerHeader({ customerName }: CustomerHeaderProps) {
  return (
    <StickyHeader threshold={60} shrinkOnScroll={true}>
      {({ isSticky }) => (
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6">
          {/* Customer Name */}
          <div className="flex-shrink-0">
            {!isSticky && (
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground transition-opacity duration-200 mb-1">
                Curated Presentation
              </p>
            )}
            <h1
              className={`font-semibold text-foreground transition-all duration-300 whitespace-nowrap ${
                isSticky ? 'text-xl' : 'text-2xl'
              }`}
            >
              {customerName}
            </h1>
          </div>

          {/* Tabs Navigation */}
          <TabsList className="flex-1 max-w-md">
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="dallas">Dallas</TabsTrigger>
            <TabsTrigger value="selection">Selection</TabsTrigger>
          </TabsList>

          {/* Logout Button */}
          <div className="flex-shrink-0">
            <LogoutButton />
          </div>
        </div>
      )}
    </StickyHeader>
  );
}
