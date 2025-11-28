'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import Link from 'next/link';
import { Customer } from '@/lib/customers/loadCustomers';
import { Selection } from '@/lib/selections/types';
import { Promotion } from '@/lib/promotions/types';
import { calculatePromotion } from '@/lib/promotions/calculator';
import { mapToActivePromotion } from '@/lib/promotions/mapToActivePromotion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PromotionProgramSummary } from '@/components/promotions/PromotionProgramSummary';
import { PromotionTierRulesTable } from '@/components/promotions/PromotionTierRulesTable';
import { PromotionCurrentStatusCard } from '@/components/promotions/PromotionCurrentStatusCard';
import { PromotionTierBenefitsTable } from '@/components/promotions/PromotionTierBenefitsTable';
import { PromotionPlanningCalculator } from '@/components/promotions/PromotionPlanningCalculator';
import { PromotionTermsAndConditions } from '@/components/promotions/PromotionTermsAndConditions';

type WorkingResponse = {
  selection: Selection | null;
};

type PromotionsTabProps = {
  customer: Customer;
  workingData: WorkingResponse;
  selectedVendor?: string;
};

const vendorNames: Record<string, string> = {
  'lib-and-co': 'Lib & Co',
  'savoy-house': 'Savoy House',
  'hubbardton-forge': 'Hubbardton Forge',
};

export default function PromotionsTab({ customer, workingData, selectedVendor }: PromotionsTabProps) {
  // Query for working selection
  const workingQuery = useQuery<WorkingResponse>({
    queryKey: ['customer-working', customer.id, selectedVendor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendor) params.set('vendor', selectedVendor);
      const url = `/api/customers/${customer.id}/selection/working${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load selection');
      return response.json();
    },
    initialData: workingData,
    refetchOnWindowFocus: false,
  });

  // Query for promotion config
  const promotionQuery = useQuery<{ promotion: Promotion | null }>({
    queryKey: ['customer-promotion', customer.id, selectedVendor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendor) params.set('vendor', selectedVendor);
      const url = `/api/customers/${customer.id}/promotion${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) return { promotion: null };
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  const selection = workingQuery.data?.selection ?? null;
  const promotion = promotionQuery.data?.promotion ?? null;

  // Filter selection by vendor
  const filteredSelection = selection && selectedVendor && (selection.vendor || 'lib-and-co') !== selectedVendor ? null : selection;

  // Calculate promotion values
  const promotionCalculation = useMemo(() => {
    if (!promotion) return null;

    // If no selection, calculate with empty line items to show $0 progress
    const lineItems = filteredSelection
      ? filteredSelection.items.map((item) => ({
          sku: item.sku,
          name: item.name,
          collection: item.collection ?? '',
          year: item.year ?? new Date().getFullYear(),
          displayQty: item.displayQty ?? item.qty,
          backupQty: item.backupQty ?? 0,
          unitList: item.unitList,
          notes: item.notes,
        }))
      : [];

    return calculatePromotion(promotion, lineItems);
  }, [promotion, filteredSelection]);

  // Map to ActivePromotion type for new component structure
  const activePromotion = useMemo(() => {
    if (!promotion || !promotionCalculation) return null;

    const vendorName = vendorNames[selectedVendor || 'lib-and-co'] || selectedVendor || 'Vendor';
    return mapToActivePromotion(promotion, promotionCalculation, vendorName);
  }, [promotion, promotionCalculation, selectedVendor]);

  // Get vendor name for display
  const vendorDisplayName = vendorNames[selectedVendor || 'lib-and-co'] || selectedVendor || 'Vendor';

  // Check if there's an uploaded promotion file
  const hasUploadedPromotion = promotion?.uploadedPromotionUrl;

  // Handle no promotion state
  if (!promotion) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              Market Promotions
            </h1>
            <p className="text-muted-foreground mt-1">
              {vendorDisplayName} • No active promotion
            </p>
          </div>
          <Link href={`/customers/${customer.id}?tab=selection${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}>
            <Button variant="outline">Back to Working Selection</Button>
          </Link>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-700 dark:text-neutral-300">
              There is no active promotion for this vendor right now. When a promotion is active,
              you'll see its rules here and your live progress based on the Working Selection.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show uploaded promotion if available
  if (hasUploadedPromotion) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {promotion.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {vendorDisplayName} • Market Promotions
            </p>
          </div>
          <a
            href={promotion.uploadedPromotionUrl}
            download={`${promotion.name.replace(/\s+/g, '_')}_Promotion.${promotion.uploadedPromotionType === 'pdf' ? 'pdf' : 'jpg'}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="default" className="gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Promotion
            </Button>
          </a>
        </div>

        {/* Uploaded Promotion Display */}
        <style jsx>{`
          iframe {
            background: white !important;
          }
        `}</style>
        <div className="rounded-xl overflow-hidden shadow-lg bg-white">
          {promotion.uploadedPromotionType === 'pdf' ? (
            <iframe
              src={`${promotion.uploadedPromotionUrl}#view=FitH`}
              className="w-full h-[1200px] border-0"
              title="Promotion PDF"
            />
          ) : (
            <img
              src={promotion.uploadedPromotionUrl}
              alt="Promotion"
              className="w-full h-auto"
            />
          )}
        </div>
      </div>
    );
  }

  // If no active promotion calculation, show message
  if (!activePromotion) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {promotion.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {vendorDisplayName} • Market Promotions
            </p>
          </div>
          <Link href={`/customers/${customer.id}?tab=selection${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}>
            <Button variant="outline">Back to Working Selection</Button>
          </Link>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-700 dark:text-neutral-300">
              Promotion is active but needs to be configured. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render full promotions page
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {activePromotion.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activePromotion.vendorName} • Market Promotions
          </p>
        </div>
        <Link href={`/customers/${customer.id}?tab=selection${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}>
          <Button variant="outline">Back to Working Selection</Button>
        </Link>
      </div>

      {/* 1. Program Summary Card */}
      <PromotionProgramSummary
        name={activePromotion.name}
        summaryTitle={activePromotion.summaryTitle}
        summaryBody={activePromotion.summaryBody}
        headlineBenefit={activePromotion.headlineBenefit}
        summaryBullets={activePromotion.summaryBullets}
        startDate={activePromotion.startDate}
        endDate={activePromotion.endDate}
        pdfUrl={activePromotion.pdfUrl}
      />

      {/* 2. Official Tier Rules Table */}
      <PromotionTierRulesTable
        tierRules={activePromotion.tierRules}
        startDate={activePromotion.startDate}
        endDate={activePromotion.endDate}
      />

      {/* 3. Current Selection Status Card */}
      <PromotionCurrentStatusCard
        currentSkuCount={activePromotion.currentSkuCount}
        currentTierLevel={activePromotion.currentTierLevel}
        tierRules={activePromotion.tierRules}
        estimatedSavings={activePromotion.estimatedSavings}
        potentialSavingsByTier={activePromotion.potentialSavingsByTier}
        customerId={customer.id}
        selectedVendor={selectedVendor}
      />

      {/* 4. Tier Benefits Breakdown Table */}
      <PromotionTierBenefitsTable
        tierRules={activePromotion.tierRules}
        currentTierLevel={activePromotion.currentTierLevel}
        potentialSavingsByTier={activePromotion.potentialSavingsByTier}
      />

      {/* 5. Partnership Planning Calculator */}
      <PromotionPlanningCalculator
        potentialSavingsByTier={activePromotion.potentialSavingsByTier}
        currentTierLevel={activePromotion.currentTierLevel}
        tierRules={activePromotion.tierRules}
      />

      {/* 6. Terms & Conditions */}
      <PromotionTermsAndConditions
        termsAndConditions={activePromotion.termsAndConditions}
      />
    </div>
  );
}
