'use client';

import { StickyHeader } from '@/components/ui/sticky-header';
import { LogoutButton } from '@/components/auth/logout-button';
import { VendorDropdown } from '@/components/ui/vendor-dropdown';
import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/customers/loadCustomers';

interface CustomerPageLayoutProps {
  customer: Customer;
  activeTab: string;
  collectionsTab: ReactNode;
  dallasTab: ReactNode;
  selectionTab: ReactNode;
  promotionsTab: ReactNode;
  insightsTab?: ReactNode;
  alignmentTab?: ReactNode;
  showroomTab?: ReactNode;
}

export function CustomerPageLayout({
  customer,
  activeTab,
  collectionsTab,
  dallasTab,
  selectionTab,
  promotionsTab,
  insightsTab,
  alignmentTab,
  showroomTab,
}: CustomerPageLayoutProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const customerId = params.id as string;
  const selectedVendor = searchParams.get('vendor');

  // Get authorized vendors with default fallback
  const authorizedVendors = customer.authorizedVendors ?? ['lib-and-co'];
  const showVendorSelector = authorizedVendors.length > 1;

  const vendorNames: Record<string, string> = {
    'lib-and-co': 'Lib & Co',
    'savoy-house': 'Savoy House',
    'hubbardton-forge': 'Hubbardton Forge',
  };

  const vendorLogos: Record<string, string> = {
    'lib-and-co': '/lib-and-co-logo.png',
    'savoy-house': '/savoy-house-logo.png',
    'hubbardton-forge': '/hubbardton-forge-logo.png',
  };

  // Build vendor data for dropdown
  const vendors = authorizedVendors.map((vendorId) => ({
    id: vendorId,
    name: vendorNames[vendorId] || vendorId,
    logo: vendorLogos[vendorId] || '',
  }));

  // Handle vendor change
  const handleVendorChange = (vendorId: string) => {
    router.push(`/customers/${customerId}?tab=${activeTab}&vendor=${vendorId}`);
  };

  // Get current vendor or default to lib-and-co for multi-vendor customers
  const currentVendor = selectedVendor || authorizedVendors[0];

  // Auto-redirect to lib-and-co if multi-vendor customer with no vendor param
  useEffect(() => {
    if (!selectedVendor && authorizedVendors.length > 1 && authorizedVendors.includes('lib-and-co')) {
      router.replace(`/customers/${customerId}?tab=${activeTab}&vendor=lib-and-co`);
    }
  }, [selectedVendor, authorizedVendors, customerId, activeTab, router]);

  return (
    <>
      <StickyHeader threshold={60} shrinkOnScroll={false}>
        {({ isSticky }) => (
          <div className="mx-auto flex w-full max-w-6xl items-center gap-8 px-4 md:px-6">
            {/* Customer Logo or Initials */}
            <div className="flex-shrink-0">
              {customer.logoUrl ? (
                <img
                  src={customer.logoUrl}
                  alt={`${customer.name} logo`}
                  className="h-12 object-contain"
                  style={{ maxWidth: '180px', maxHeight: '48px' }}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-md bg-muted text-muted-foreground font-semibold select-none"
                  style={{ width: '48px', height: '48px', fontSize: '18px' }}
                  title={customer.name}
                >
                  {customer.name
                    .replace(/^!!?\s*/, '')
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()}
                </div>
              )}
            </div>

            {/* Primary Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-8 flex-1">
              <Link
                href={`/customers/${customerId}?tab=collections${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
                className={cn(
                  'relative py-6 text-sm font-medium transition-colors',
                  activeTab === 'collections'
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Presentation
              </Link>
              <Link
                href={`/customers/${customerId}?tab=selection${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
                className={cn(
                  'relative py-6 text-sm font-medium transition-colors',
                  activeTab === 'selection'
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Working Selection
              </Link>
              <Link
                href={`/customers/${customerId}?tab=promotions${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
                className={cn(
                  'relative py-6 text-sm font-medium transition-colors',
                  activeTab === 'promotions'
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Promotion
              </Link>
              <Link
                href={`/customers/${customerId}?tab=insights${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
                className={cn(
                  'relative py-6 text-sm font-medium transition-colors',
                  activeTab === 'insights'
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Insights
              </Link>
              <Link
                href={`/customers/${customerId}?tab=alignment${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
                className={cn(
                  'relative py-6 text-sm font-medium transition-colors',
                  activeTab === 'alignment'
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Alignment
              </Link>
              <Link
                href={`/customers/${customerId}?tab=showroom${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
                className={cn(
                  'relative py-6 text-sm font-medium transition-colors',
                  activeTab === 'showroom'
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Showroom
              </Link>
            </nav>

            {/* Secondary Actions (Vendor Dropdown + Sign Out) */}
            <div className="hidden md:flex items-center gap-6 flex-shrink-0">
              {showVendorSelector && (
                <VendorDropdown
                  vendors={vendors}
                  selectedVendor={currentVendor}
                  onVendorChange={handleVendorChange}
                />
              )}
              <button
                onClick={() => window.location.href = '/api/auth/signout'}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            </div>

            {/* Mobile: Logout Button Only */}
            <div className="md:hidden flex-shrink-0 ml-auto">
              <LogoutButton />
            </div>
          </div>
        )}
      </StickyHeader>

      {/* Mobile Tabs Navigation */}
      <div className="md:hidden mx-auto w-full max-w-6xl px-4 pt-4 pb-2">
        <div className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-secondary/60 p-1 text-slate-600 w-full">
          <Link
            href={`/customers/${customerId}?tab=collections${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all',
              activeTab === 'collections'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-slate-500 hover:text-foreground'
            )}
          >
            Collections
          </Link>
          <Link
            href={`/customers/${customerId}?tab=selection${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all',
              activeTab === 'selection'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-slate-500 hover:text-foreground'
            )}
          >
            Selection
          </Link>
          <Link
            href={`/customers/${customerId}?tab=promotions${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all',
              activeTab === 'promotions'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-slate-500 hover:text-foreground'
            )}
          >
            Promo
          </Link>
          <Link
            href={`/customers/${customerId}?tab=insights${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all',
              activeTab === 'insights'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-slate-500 hover:text-foreground'
            )}
          >
            Insights
          </Link>
          <Link
            href={`/customers/${customerId}?tab=alignment${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all',
              activeTab === 'alignment'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-slate-500 hover:text-foreground'
            )}
          >
            Align
          </Link>
          <Link
            href={`/customers/${customerId}?tab=showroom${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all',
              activeTab === 'showroom'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-slate-500 hover:text-foreground'
            )}
          >
            Showroom
          </Link>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 md:px-6 pb-16 mt-2 md:mt-6">
        {activeTab === 'collections' && <div className="-mx-4 md:-mx-6">{collectionsTab}</div>}
        {activeTab === 'selection' && <div>{selectionTab}</div>}
        {activeTab === 'promotions' && <div>{promotionsTab}</div>}
        {activeTab === 'insights' && insightsTab && <div>{insightsTab}</div>}
        {activeTab === 'alignment' && alignmentTab && <div>{alignmentTab}</div>}
        {activeTab === 'showroom' && showroomTab && <div>{showroomTab}</div>}
      </main>

      {/* Subtle Footer - Only visible when scrolling to bottom */}
      <footer className="mx-auto w-full max-w-6xl px-4 md:px-6 pt-16 pb-8">
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <a
            href="https://luminescence.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-40 hover:opacity-60 transition-opacity"
          >
            <img
              src="https://images.squarespace-cdn.com/content/v1/50292c4484ae02c19c94acc1/3a8bd948-5bf2-439d-8c35-aeb56770db05/Luminescence+Logo+Best+Font+KO+Background.png?format=1000w"
              alt="Luminescence"
              className="h-4 object-contain invert dark:invert-0"
            />
          </a>
        </div>
      </footer>
    </>
  );
}
