'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Customer } from '@/lib/customers/loadCustomers';
import { Selection } from '@/lib/selections/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils/currency';
import { DownloadIcon, ChevronDownIcon, ArrowLeftIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Promotion, PromotionCalculation } from '@/lib/promotions/types';
import { calculatePromotion, isPortableSku } from '@/lib/promotions/calculator';
import { PromotionStatusStrip } from './promotion-status-strip';
import { SkuSearchAdd } from './sku-search-add';

import type { DallasApiResponse } from './dallas-tab';

function buildExportUrl(customerId: string, type: 'csv' | 'xlsx' | 'pdf', selectionType: 'dallas' | 'working', selectionId?: string) {
  const search = new URLSearchParams({ type: selectionType });
  if (selectionId) {
    search.set('selectionId', selectionId);
  }
  return `/api/customers/${customerId}/export/${type}?${search.toString()}`;
}

type WorkingResponse = {
  selection: Selection | null;
};

type SelectionTabProps = {
  customer: Customer;
  dallasData: DallasApiResponse;
  workingData: WorkingResponse;
  selectedVendor?: string;
};

type DraftWorkingItem = {
  sku: string;
  qty: number;
  notes?: string;
};

export default function SelectionTab({ customer, dallasData, workingData, selectedVendor }: SelectionTabProps) {
  const { toast } = useToast();
  const [draftItems, setDraftItems] = useState<DraftWorkingItem[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ sku: string; name: string } | null>(null);

  // View mode state: 'live-cart' (working selection) or 'historical-review' (Dallas snapshot)
  const [viewMode, setViewMode] = useState<'live-cart' | 'historical-review'>('live-cart');
  const [selectedHistoricalId, setSelectedHistoricalId] = useState<string | null>(null);

  const workingQuery = useQuery<WorkingResponse>({
    queryKey: ['customer-working', customer.id, selectedVendor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendor) params.set('vendor', selectedVendor);
      const url = `/api/customers/${customer.id}/selection/working${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Unable to load selection');
      }
      return response.json();
    },
    initialData: workingData,
    refetchOnWindowFocus: false,
  });

  // Query for historical Dallas snapshot when in historical-review mode
  const historicalQuery = useQuery<{ selection: Selection | null }>({
    queryKey: ['customer-dallas-snapshot', customer.id, selectedHistoricalId],
    queryFn: async () => {
      if (!selectedHistoricalId) return { selection: null };
      const response = await fetch(`/api/customers/${customer.id}/dallas/snapshot/${selectedHistoricalId}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Unable to load historical snapshot');
      }
      return response.json();
    },
    enabled: viewMode === 'historical-review' && !!selectedHistoricalId,
    refetchOnWindowFocus: false,
  });

  // Query for active promotion
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

  // Determine which selection to display based on view mode
  let selection = viewMode === 'live-cart'
    ? workingQuery.data?.selection ?? null
    : historicalQuery.data?.selection ?? null;

  // Filter selection by vendor if selected vendor doesn't match
  // Default to 'lib-and-co' for selections without a vendor field (legacy data)
  const filteredSelection = selection && selectedVendor && (selection.vendor || 'lib-and-co') !== selectedVendor ? null : selection;

  // Reset to live-cart mode when vendor changes and there's no working selection for that vendor
  useEffect(() => {
    if (viewMode === 'historical-review' && !filteredSelection) {
      setViewMode('live-cart');
      setSelectedHistoricalId(null);
    }
  }, [viewMode, filteredSelection]);

  // Check for market cycle changes and auto-archive stale working selections
  useEffect(() => {
    const checkMarketCycle = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedVendor) params.set('vendor', selectedVendor);
        const url = `/api/customers/${customer.id}/selection/check-market-cycle${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await fetch(url, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          if (data.needsArchive && data.archivedSelection) {
            const oldCycle = data.archivedSelection.marketCycle;
            const newCycle = data.newMarketCycle;
            const oldCycleLabel = oldCycle ? `${oldCycle.month} ${oldCycle.year}` : 'previous';
            const newCycleLabel = `${newCycle.month} ${newCycle.year}`;

            toast({
              title: 'Selection Archived',
              description: `Your ${oldCycleLabel} selection has been saved. You're now working on ${newCycleLabel}.`,
            });

            // Refetch the working selection to get the new state
            workingQuery.refetch();
          }
        }
      } catch (error) {
        console.error('Market cycle check failed:', error);
      }
    };

    // Only check on initial load and vendor change
    if (viewMode === 'live-cart') {
      checkMarketCycle();
    }
  }, [customer.id, selectedVendor, viewMode, toast, workingQuery]);

  // Auto-populate from latest Dallas snapshot if no working selection exists
  // Only do this in live-cart mode and if there's a Dallas snapshot available
  useEffect(() => {
    if (viewMode === 'live-cart' && !filteredSelection && dallasData.snapshot) {
      // Auto-restore the latest Dallas snapshot as the working selection
      const autoRestore = async () => {
        try {
          const response = await fetch(`/api/customers/${customer.id}/selection/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snapshotId: dallasData.snapshot!.id }),
          });
          if (response.ok) {
            workingQuery.refetch();
          }
        } catch (error) {
          console.error('Auto-restore failed:', error);
        }
      };
      autoRestore();
    }
  }, [viewMode, filteredSelection, dallasData.snapshot, customer.id, workingQuery]);

  useEffect(() => {
    if (filteredSelection) {
      setDraftItems(filteredSelection.items.map((item) => ({ sku: item.sku, qty: item.qty, notes: item.notes })));
      // Expand notes that have content
      const notesWithContent = new Set(
        filteredSelection.items.filter((item) => item.notes && item.notes.trim()).map((item) => item.sku)
      );
      setExpandedNotes(notesWithContent);
    } else {
      setDraftItems([]);
      setExpandedNotes(new Set());
    }
  }, [filteredSelection]);

  const toggleNotes = (sku: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  };

  const isItemModified = (sku: string): boolean => {
    if (!filteredSelection) return false;
    const originalItem = filteredSelection.items.find((item) => item.sku === sku);
    const draftItem = draftItems.find((item) => item.sku === sku);
    if (!originalItem || !draftItem) return false;

    return (
      originalItem.qty !== draftItem.qty ||
      (originalItem.notes ?? '') !== (draftItem.notes ?? '')
    );
  };

  const hasUnsavedChanges = useMemo(() => {
    return draftItems.some((draft) => isItemModified(draft.sku));
  }, [draftItems, filteredSelection]);

  const promotion = promotionQuery.data?.promotion ?? null;

  // Calculate promotion impact on selection
  const promotionCalculation = useMemo<PromotionCalculation | null>(() => {
    if (!promotion || !filteredSelection) return null;

    const lineItems = filteredSelection.items.map((item) => {
      const draft = draftItems.find((d) => d.sku === item.sku);
      return {
        sku: item.sku,
        name: item.name,
        collection: item.collection ?? '',
        year: item.year ?? new Date().getFullYear(),
        displayQty: item.displayQty ?? draft?.qty ?? item.qty,
        backupQty: item.backupQty ?? 0,
        unitList: item.unitList,
        notes: item.notes,
      };
    });

    return calculatePromotion(promotion, lineItems);
  }, [promotion, filteredSelection, draftItems]);

  const totals = useMemo(() => {
    if (!filteredSelection) return {
      subtotal: 0,
      tierDiscountSavings: 0,
      totalAfterTier: 0,
      backupBonusSavings: 0,
      portableSavings: 0,
      net: 0
    };

    let subtotal = 0;
    let tierDiscountSavings = 0;
    let backupBonusSavings = 0;
    let portableSavings = 0;
    let totalAfterTier = 0;
    let net = 0;

    // Get tier discount from promotion calculation, or use first available tier
    const tierDiscountPercent = promotionCalculation?.bestTierDiscount
      || (promotion?.skuTiers?.[0]?.discountPercent)
      || (promotion?.dollarTiers?.[0]?.discountPercent)
      || 0;
    const backupBonusPercentFromPromo = promotion?.inventoryIncentive?.backupDiscountPercent ?? (tierDiscountPercent > 0 ? 15 : 0);
    const portableDiscountPercent = promotion?.portableIncentive?.enabled
      ? promotion.portableIncentive.discountPercent
      : 0;

    filteredSelection.items.forEach((item) => {
      const draft = draftItems.find((d) => d.sku === item.sku);
      const totalQty = draft?.qty ?? item.qty;

      // Check if this item is a portable
      const itemIsPortable = isPortableSku(item.sku, promotion?.portableIncentive);

      // Subtotal: Full dealer cost for all quantities
      const totalSubtotal = item.unitList * totalQty;
      subtotal += totalSubtotal;

      if (itemIsPortable) {
        // Portable items: flat discount on all quantities
        const portableDiscount = portableDiscountPercent / 100;
        const savings = totalSubtotal * portableDiscount;
        portableSavings += savings;
        const itemNet = totalSubtotal - savings;
        net += itemNet;
      } else {
        // Regular items: display/backup split
        // Display QTY = 1, Backup QTY = Total - 1
        const displayQty = Math.min(totalQty, 1);
        const backupQty = Math.max(totalQty - 1, 0);

        const tierDiscount = tierDiscountPercent / 100;
        const backupBonusDiscount = backupBonusPercentFromPromo / 100;

        // Display units: tier discount (30% off dealer cost)
        const displaySubtotal = item.unitList * displayQty;
        const displaySavings = displaySubtotal * tierDiscount;
        tierDiscountSavings += displaySavings;

        // Backup units: Backup discount only (15% off WSP - NOT stacked)
        const backupSubtotal = item.unitList * backupQty;
        const backupSavings = backupSubtotal * backupBonusDiscount;
        backupBonusSavings += backupSavings;

        // Net for this item
        const displayNet = displaySubtotal - displaySavings;
        const backupNet = backupSubtotal - backupSavings;
        const itemNet = displayNet + backupNet;
        net += itemNet;
      }
    });

    // Total after tier discount (before backup bonus)
    totalAfterTier = subtotal - tierDiscountSavings;

    return {
      subtotal,
      tierDiscountSavings,
      totalAfterTier,
      backupBonusSavings,
      portableSavings,
      net
    };
  }, [filteredSelection, draftItems, promotionCalculation, promotion]);

  const updateMutation = useMutation<{ selectionId: string; version: number }, Error, void>({
    mutationFn: async () => {
      if (!filteredSelection) throw new Error('No selection to update');
      const response = await fetch(`/api/customers/${customer.id}/selection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: draftItems,
          vendor: selectedVendor, // Pass vendor to ensure we update the correct vendor's selection
          metadata: {
            updatedVia: 'customer-ui',
            wasModified: true, // Mark as modified when user makes changes
          },
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unable to update selection' }));
        throw new Error(error.error ?? 'Unable to update selection');
      }
      return response.json() as Promise<{ selectionId: string; version: number }>;
    },
    onSuccess: () => {
      toast({ title: 'Selection updated', description: 'Working selection saved.' });
      workingQuery.refetch();
    },
    onError: (error) => {
      toast({ title: 'Unable to update selection', description: error.message, variant: 'destructive' });
    },
  });

  // Restore mutation - Replace working selection with historical snapshot
  const restoreMutation = useMutation<{ selectionId: string; version: number; message: string }, Error, void>({
    mutationFn: async () => {
      if (!selectedHistoricalId) throw new Error('No snapshot selected');
      const response = await fetch(`/api/customers/${customer.id}/selection/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: selectedHistoricalId }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unable to restore snapshot' }));
        throw new Error(error.error ?? 'Unable to restore snapshot');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Snapshot restored', description: data.message });
      workingQuery.refetch();
      setViewMode('live-cart');
      setSelectedHistoricalId(null);
    },
    onError: (error) => {
      toast({ title: 'Unable to restore snapshot', description: error.message, variant: 'destructive' });
    },
  });

  // Merge mutation - Merge historical snapshot with working selection
  const mergeMutation = useMutation<{ selectionId: string; version: number }, Error, void>({
    mutationFn: async () => {
      if (!selectedHistoricalId) throw new Error('No snapshot selected');
      const response = await fetch(`/api/customers/${customer.id}/selection/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: selectedHistoricalId, strategy: 'sumQuantities' }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unable to merge snapshot' }));
        throw new Error(error.error ?? 'Unable to merge snapshot');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Snapshot merged', description: 'Historical snapshot merged with working selection.' });
      workingQuery.refetch();
      setViewMode('live-cart');
      setSelectedHistoricalId(null);
    },
    onError: (error) => {
      toast({ title: 'Unable to merge snapshot', description: error.message, variant: 'destructive' });
    },
  });

  // Delete item mutation - permanently remove an item from selection
  const deleteItemMutation = useMutation<{ selectionId: string; version: number }, Error, string>({
    mutationFn: async (skuToDelete: string) => {
      if (!filteredSelection) throw new Error('No selection to update');

      // Remove the item from draft items
      const updatedItems = draftItems.filter((item) => item.sku !== skuToDelete);

      const response = await fetch(`/api/customers/${customer.id}/selection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: updatedItems,
          vendor: selectedVendor,
          metadata: {
            updatedVia: 'customer-ui',
            wasModified: true,
          },
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unable to delete item' }));
        throw new Error(error.error ?? 'Unable to delete item');
      }
      return response.json() as Promise<{ selectionId: string; version: number }>;
    },
    onSuccess: () => {
      toast({ title: 'Item deleted', description: 'Item permanently removed from selection.' });
      setDeleteConfirmItem(null);
      workingQuery.refetch();
    },
    onError: (error) => {
      toast({ title: 'Unable to delete item', description: error.message, variant: 'destructive' });
      setDeleteConfirmItem(null);
    },
  });

  // Determine selection title based on origin and modification status
  // IMPORTANT: This must be BEFORE any early returns to follow Rules of Hooks
  const selectionTitle = useMemo(() => {
    if (!filteredSelection?.metadata) return 'Working Selection';

    const { restoredFrom, wasModified } = filteredSelection.metadata as {
      restoredFrom?: string;
      wasModified?: boolean;
    };

    // If restored from Dallas market selection AND not yet modified
    if (restoredFrom && !wasModified) {
      return 'Market Selection';
    }

    // Otherwise, it's a working selection
    return 'Working Selection';
  }, [filteredSelection?.metadata]);

  const provenance = filteredSelection?.sourceEventId
    ? `Based on Dallas ${filteredSelection.sourceEventId}`
    : dallasData.snapshot
    ? `Inspired by ${dallasData.snapshot.name}`
    : null;

  // Show empty state with search bar instead of returning early
  const isEmpty = !filteredSelection || filteredSelection.items.length === 0;

  return (
    <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 shadow-sm">
      <CardHeader className="pb-0">
        {/* ROW 1: Simplified Header */}
        <div className="flex items-center justify-between pb-4">
          {/* Left: Page Title + Subtle Status */}
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-bold text-foreground">
              {selectionTitle}
            </CardTitle>
            {provenance && viewMode === 'live-cart' && (
              <span className="text-xs text-muted-foreground">
                {provenance}
              </span>
            )}
            {viewMode === 'historical-review' && (
              <Badge className="w-fit bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-600 text-amber-700 dark:text-amber-400 font-medium text-xs">
                Historical Review
              </Badge>
            )}
          </div>

          {/* Right: Data Source Selector (simplified) */}
          {dallasData.versions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  {viewMode === 'live-cart' ? 'Live' : 'Historical'}
                  <ChevronDownIcon className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem
                  onSelect={() => {
                    setViewMode('live-cart');
                    setSelectedHistoricalId(null);
                  }}
                  className="cursor-pointer"
                >
                  <span className="font-medium">Working Selection (Live)</span>
                </DropdownMenuItem>
                <div className="my-1 h-px bg-border" />
                {dallasData.versions.map((version) => {
                  const versionWithCycle = version as typeof version & { marketCycle?: { month: string; year: number } };
                  const marketCycleLabel = versionWithCycle.marketCycle
                    ? `${versionWithCycle.marketCycle.month} ${versionWithCycle.marketCycle.year}`
                    : null;

                  return (
                    <DropdownMenuItem
                      key={version.id}
                      onSelect={() => {
                        setViewMode('historical-review');
                        setSelectedHistoricalId(version.id);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {version.name}
                          {marketCycleLabel && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({marketCycleLabel})
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ROW 2: Action Bar - "What can I do?" (Only in Historical Review Mode) */}
        {viewMode === 'historical-review' && (
          <div className="flex items-center justify-between border-t border-border pt-4 pb-4">
            {/* Left: Back/Cancel Action */}
            <button
              onClick={() => {
                setViewMode('live-cart');
                setSelectedHistoricalId(null);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to Working Selection
            </button>

            {/* Right: Primary Actions */}
            <div className="flex items-center gap-3">
              {/* Secondary: Merge */}
              <Button
                variant="ghost"
                size="default"
                onClick={() => mergeMutation.mutate(undefined)}
                disabled={mergeMutation.isPending || !selectedHistoricalId}
                className="font-medium border border-border hover:bg-muted"
              >
                {mergeMutation.isPending ? 'Merging…' : 'Merge with Working Selection'}
              </Button>

              {/* Primary: Restore */}
              <Button
                size="default"
                onClick={() => restoreMutation.mutate(undefined)}
                disabled={restoreMutation.isPending || !selectedHistoricalId}
                className="font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm"
              >
                {restoreMutation.isPending ? 'Restoring…' : 'Restore as Working Selection'}
              </Button>
            </div>
          </div>
        )}

        {/* Live Cart Mode Action Buttons */}
        {viewMode === 'live-cart' && (
          <div className="flex items-center justify-end gap-3 pt-4 pb-4">
            {/* Secondary: Export - text link style */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="default" className="font-medium text-muted-foreground hover:text-foreground">
                  <DownloadIcon className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onSelect={() => window.open(buildExportUrl(customer.id, 'pdf', 'working', filteredSelection?.id), '_blank')}
                  className="cursor-pointer"
                >
                  <span className="font-medium">Export PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => window.open(buildExportUrl(customer.id, 'xlsx', 'working', filteredSelection?.id), '_blank')}
                  className="cursor-pointer"
                >
                  <span className="font-medium">Export XLSX</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => window.open(buildExportUrl(customer.id, 'csv', 'working', filteredSelection?.id), '_blank')}
                  className="cursor-pointer"
                >
                  <span className="font-medium">Export CSV</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Primary: Apply Changes - solid fill, high contrast */}
            <Button
              onClick={() => updateMutation.mutate(undefined)}
              disabled={updateMutation.isPending || !hasUnsavedChanges}
              size="default"
              className="font-semibold bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white shadow-md disabled:bg-muted disabled:text-muted-foreground"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {/* SKU Search and Add - Only in Live Cart Mode */}
        {viewMode === 'live-cart' && (
          <SkuSearchAdd
            customerId={customer.id}
            vendor={selectedVendor}
            onProductAdded={() => workingQuery.refetch()}
          />
        )}

        {/* Promotion Status Strip - Show in Live Cart Mode with Active Promotion */}
        {viewMode === 'live-cart' && promotion && promotionCalculation && filteredSelection && (
          <PromotionStatusStrip
            promotion={promotion}
            calculation={promotionCalculation}
            selection={filteredSelection}
          />
        )}

        {/* Unsaved Changes Banner - Only in Live Cart Mode */}
        {viewMode === 'live-cart' && hasUnsavedChanges && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
            <p className="text-sm font-medium text-amber-900">
              You have unsaved changes. Click &quot;Apply Changes&quot; to save your modifications.
            </p>
          </div>
        )}

        {/* Historical Review Mode Info Banner */}
        {viewMode === 'historical-review' && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex h-2 w-2 shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <p className="text-sm font-medium text-blue-900">
              Viewing read-only snapshot. Use Restore or Merge to update your working selection.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted [&>th]:py-3">
                <TableHead className="font-semibold text-foreground w-16"></TableHead>
                <TableHead className="font-semibold text-foreground text-left">Product</TableHead>
                <TableHead className="font-semibold text-foreground w-28 text-center">Qty</TableHead>
                <TableHead className="text-sm text-muted-foreground text-right w-28">WSP</TableHead>
                <TableHead className="font-semibold text-green-600 dark:text-green-500 text-right w-28">Disc.</TableHead>
                <TableHead className="font-bold text-blue-700 dark:text-blue-400 text-right w-28">Unit NET</TableHead>
                <TableHead className="font-bold text-foreground text-right w-32">Ext. NET</TableHead>
                <TableHead className="font-semibold text-foreground w-10"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <p className="text-sm font-medium">No items in selection yet</p>
                    <p className="text-xs">Use the search above to add products, or import from a Dallas snapshot</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSelection!.items.map((item) => {
              const draft = draftItems.find((draftItem) => draftItem.sku === item.sku) ?? {
                sku: item.sku,
                qty: item.qty,
                notes: item.notes,
              };

              // Check if this item is a portable product
              const itemIsPortable = isPortableSku(item.sku, promotion?.portableIncentive);

              // Use promotion calculation's tier discount, fallback to promotion's first tier if available
              // If no tier is achieved yet, still show the promotional discount rate for display items
              const displayDiscount = promotionCalculation?.bestTierDiscount
                || (promotion?.skuTiers?.[0]?.discountPercent)
                || (promotion?.dollarTiers?.[0]?.discountPercent)
                || item.displayDiscountPercent
                || 0;

              // Portable discount
              const portableDiscountPercent = promotion?.portableIncentive?.enabled
                ? promotion.portableIncentive.discountPercent
                : 0;

              // Calculate display and backup quantities
              const primaryQty = itemIsPortable ? draft.qty : 1; // Portables use full qty, others use 1
              const backupQtyCalc = itemIsPortable ? 0 : Math.max(draft.qty - 1, 0);

              // Pricing calculations
              const tierDiscountRate = displayDiscount / 100;
              const portableDiscountRate = portableDiscountPercent / 100;
              // Backup bonus: use promotion's inventory incentive if available, otherwise default to 15% if tier discount exists
              const backupBonusPercent = promotion?.inventoryIncentive?.backupDiscountPercent ?? item.backupDiscountPercent ?? (displayDiscount > 0 ? 15 : 0);
              const backupBonusRate = backupBonusPercent / 100;

              // For portables: flat discount on all quantities
              // For regular items: tier discount on display, backup discount on backup
              let primaryNetUnit: number;
              let primaryExtended: number;

              if (itemIsPortable) {
                // Portable: flat discount on all quantities
                primaryNetUnit = item.unitList * (1 - portableDiscountRate);
                primaryExtended = primaryNetUnit * draft.qty;
              } else {
                // Regular: tier discount on display unit
                primaryNetUnit = item.unitList * (1 - tierDiscountRate);
                primaryExtended = primaryNetUnit * 1; // Always 1 display unit
              }

              // Backup row: Backup discount only (15% off WSP/dealer cost - NOT stacked)
              // Display gets bigger discount (30%) as sample/display piece
              // Backup gets smaller discount (15%) as inventory incentive
              const backupNetUnit = item.unitList * (1 - backupBonusRate);
              const backupExtendedCalc = backupNetUnit * backupQtyCalc;

              // Determine if we need to show backup row (never for portables)
              const showBackupRow = !itemIsPortable && backupQtyCalc > 0;

              // Zero quantity hold status
              const isOnHold = draft.qty === 0;

              return (
                <>
                  {/* Primary Row - Display Unit */}
                  <TableRow key={`${item.sku}-primary`} className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors [&>td]:py-3 ${showBackupRow ? 'border-b-0' : 'border-b border-neutral-200 dark:border-neutral-700'} ${isOnHold ? 'opacity-50' : ''}`}>
                    <TableCell className="w-16 align-middle" rowSpan={showBackupRow ? 2 : 1}>
                      <img
                        src={item.imageUrl || `https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
                        alt={item.name}
                        className="w-11 h-11 object-cover rounded-md border border-neutral-200 dark:border-neutral-700"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </TableCell>
                    <TableCell className="align-middle" rowSpan={showBackupRow ? 2 : 1}>
                      <div className="space-y-0.5 text-left">
                        {/* SKU - muted, top of stack */}
                        <div className="flex items-center gap-1.5">
                          {isItemModified(item.sku) && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Modified" />
                          )}
                          <span className="font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                        </div>
                        {/* Product Name - main identifier */}
                        <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 block leading-tight">{item.name}</span>
                        {/* Configuration - smallest, lightest */}
                        {item.configuration && Object.keys(item.configuration.options).length > 0 && (
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                            {Object.values(item.configuration.options).join(' / ')}
                          </span>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.map((tag) => (
                              <Badge key={`${item.sku}-${tag}`} variant="muted" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-28 text-center align-middle">
                      <div className="flex flex-col items-center gap-1">
                        {/* Portable items: full qty control, no split */}
                        {itemIsPortable ? (
                          <>
                            <NumberInput
                              value={draft.qty}
                              onChange={(qty) => {
                                setDraftItems((current) =>
                                  current.map((entry) =>
                                    entry.sku === item.sku ? { ...entry, qty } : entry
                                  )
                                );
                              }}
                              min={0}
                              max={999}
                            />
                            <span className="text-[10px] text-purple-600 dark:text-purple-400">
                              Portable
                            </span>
                          </>
                        ) : draft.qty <= 1 ? (
                          // QTY 0-1: Full control in primary row
                          <NumberInput
                            value={draft.qty}
                            onChange={(qty) => {
                              setDraftItems((current) =>
                                current.map((entry) =>
                                  entry.sku === item.sku ? { ...entry, qty } : entry
                                )
                              );
                            }}
                            min={0}
                            max={999}
                          />
                        ) : (
                          // QTY > 1: Show disabled NumberInput (control moves to backup row)
                          <>
                            <NumberInput
                              value={1}
                              onChange={() => {}}
                              min={1}
                              max={1}
                              disabled
                            />
                            <span className="text-[10px] text-muted-foreground">
                              Display Unit
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="text-sm text-neutral-500 dark:text-neutral-500 tabular-nums">
                        {item.unitList > 0 ? formatCurrency(item.unitList) : '–'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      {itemIsPortable ? (
                        // Portable items show portable discount in purple
                        portableDiscountPercent > 0 ? (
                          <div className="text-sm font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                            {portableDiscountPercent}%
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400">–</span>
                        )
                      ) : displayDiscount > 0 ? (
                        <div className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">
                          {displayDiscount}%
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">–</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {primaryNetUnit > 0 ? formatCurrency(primaryNetUnit) : '–'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {primaryExtended > 0 ? formatCurrency(primaryExtended) : '–'}
                      </div>
                    </TableCell>
                    <TableCell className="w-12 text-center align-middle" rowSpan={showBackupRow ? 2 : 1}>
                      {isOnHold ? (
                        // Zero quantity: Show delete button
                        <button
                          onClick={() => setDeleteConfirmItem({ sku: item.sku, name: item.name })}
                          className="p-1.5 rounded-md transition-colors text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                          title="Delete item"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : expandedNotes.has(item.sku) ? (
                        <div className="relative">
                          <Textarea
                            value={draft.notes ?? ''}
                            onChange={(event) =>
                              setDraftItems((current) =>
                                current.map((entry) =>
                                  entry.sku === item.sku ? { ...entry, notes: event.target.value } : entry
                                )
                              )
                            }
                            onBlur={() => {
                              // Only collapse if empty
                              if (!draft.notes || !draft.notes.trim()) {
                                toggleNotes(item.sku);
                              }
                            }}
                            placeholder="Add note..."
                            className="min-h-[50px] w-48 absolute right-0 top-0 z-10 resize-none focus:ring-2 focus:ring-blue-500 shadow-lg"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleNotes(item.sku)}
                          className={`p-1.5 rounded-md transition-colors ${
                            draft.notes && draft.notes.trim()
                              ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                          title={draft.notes && draft.notes.trim() ? 'Edit note' : 'Add note'}
                        >
                          <Pencil1Icon className="h-4 w-4" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Secondary Row - Backup Units (only if qty > 1) */}
                  {showBackupRow && (
                    <TableRow key={`${item.sku}-backup`} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors [&>td]:py-2 border-b border-neutral-200 dark:border-neutral-700 bg-green-50/30 dark:bg-green-950/20">
                      <TableCell className="w-28 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          {/* Active QTY control for backup units */}
                          <NumberInput
                            value={backupQtyCalc}
                            onChange={(newBackupQty) => {
                              // Total qty = 1 (display) + backup qty
                              const newTotalQty = 1 + newBackupQty;
                              setDraftItems((current) =>
                                current.map((entry) =>
                                  entry.sku === item.sku ? { ...entry, qty: newTotalQty } : entry
                                )
                              );
                            }}
                            min={0}
                            max={998}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            Backup
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="text-sm text-neutral-500 dark:text-neutral-500 tabular-nums">
                          {item.unitList > 0 ? formatCurrency(item.unitList) : '–'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">
                          {backupBonusPercent}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                          {backupNetUnit > 0 ? formatCurrency(backupNetUnit) : '–'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                          {backupExtendedCalc > 0 ? formatCurrency(backupExtendedCalc) : '–'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })
            )}
          </TableBody>
        </Table>
        </div>

        {/* Totals Section - SIMPLIFIED (Discounts reflected in line items) */}
        <div className="border-t-2 border-neutral-200 dark:border-neutral-700 pt-6 mt-6">
          <div className="space-y-3 pr-12">
            {/* Subtotal (WSP) */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-500 dark:text-neutral-500">Subtotal (WSP)</span>
              <span className="font-medium text-neutral-500 dark:text-neutral-500 tabular-nums transition-all duration-300 text-right w-32">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>

            {/* Total Discount - Green (combined tier + backup + portable) */}
            {(totals.tierDiscountSavings > 0 || totals.backupBonusSavings > 0 || totals.portableSavings > 0) && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-green-600 dark:text-green-500">Total Discount</span>
                <span className="font-bold text-green-600 dark:text-green-500 tabular-nums transition-all duration-300 text-right w-32">
                  -{formatCurrency(totals.tierDiscountSavings + totals.backupBonusSavings + totals.portableSavings)}
                </span>
              </div>
            )}

            {/* Divider before Net Total */}
            <div className="border-t-2 border-neutral-300 dark:border-neutral-600"></div>

            {/* Net Total - DOMINANT VISUAL WEIGHT */}
            <div className="flex items-center justify-between pt-4 pb-2">
              <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Net Total</span>
              <div className="text-right w-32">
                <span className="text-5xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums transition-all duration-300 block">
                  {formatCurrency(totals.net)}
                </span>
                {(totals.tierDiscountSavings > 0 || totals.backupBonusSavings > 0 || totals.portableSavings > 0) && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-500 mt-1 block">
                    You saved {formatCurrency(totals.tierDiscountSavings + totals.backupBonusSavings + totals.portableSavings)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmItem} onOpenChange={(open: boolean) => !open && setDeleteConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <span className="font-semibold">{deleteConfirmItem?.name}</span> from your Working Selection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmItem) {
                  deleteItemMutation.mutate(deleteConfirmItem.sku);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteItemMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
