'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer } from '@/lib/customers/loadCustomers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils/currency';
import { MagnifyingGlassIcon, PlusCircledIcon, TrashIcon, UploadIcon, DownloadIcon, EyeOpenIcon, EyeNoneIcon, CopyIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

const MarketYears = Array.from({ length: 5 }).map((_, idx) => new Date().getFullYear() + idx);
const MarketMonths = ['January', 'June'] as const;

type DraftItem = {
  sku: string;
  name: string;
  unitList: number;
  qty: number;
  programDisc?: number;
  notes?: string;
  tags: string[];
};

type CatalogResult = {
  sku: string;
  name: string;
  list: number;
};

type MarketOrderHistory = {
  id: string;
  name: string;
  sourceEventId: string;
  sourceYear: number;
  marketMonth: 'January' | 'June';
  version: number;
  itemCount: number;
  totalNet: number;
  createdAt: string;
  updatedAt: string;
  isVisibleToCustomer: boolean;
};

type DallasWorkspaceProps = {
  customers: Customer[];
  initialCustomerId: string;
  initialYear: number;
};

const defaultDraft: DraftItem[] = [];

export default function DallasWorkspace({ customers, initialCustomerId, initialYear }: DallasWorkspaceProps) {
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomerId);
  const [year, setYear] = useState(initialYear);
  const [marketMonth, setMarketMonth] = useState<typeof MarketMonths[number]>('January');
  const [items, setItems] = useState<DraftItem[]>(defaultDraft);
  const [isAddSkuOpen, setIsAddSkuOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useQuery<{ results: CatalogResult[] }>({
    queryKey: ['catalog-search', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/catalog/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchQuery.length > 1,
  });

  const historyQuery = useQuery<{ history: MarketOrderHistory[] }>({
    queryKey: ['dallas-history', selectedCustomer],
    queryFn: async () => {
      const response = await fetch(`/api/rep/dallas/history?customerId=${encodeURIComponent(selectedCustomer)}`);
      if (!response.ok) throw new Error('Failed to load history');
      return response.json();
    },
    enabled: !!selectedCustomer,
  });

  const bulkValidateMutation = useMutation<
    {
      ok: { sku: string; qty: number }[];
      duplicate: { sku: string }[];
      unknown: { sku: string }[];
    },
    Error,
    { lines: string }
  >({
    mutationFn: async (payload) => {
      const response = await fetch('/api/rep/dallas/validate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Bulk validation failed');
      }
      return response.json() as Promise<{
        ok: { sku: string; qty: number }[];
        duplicate: { sku: string }[];
        unknown: { sku: string }[];
      }>;
    },
  });

  const toggleVisibilityMutation = useMutation<
    { success: boolean; isVisibleToCustomer: boolean },
    Error,
    string
  >({
    mutationFn: async (selectionId) => {
      const response = await fetch('/api/rep/dallas/toggle-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectionId, customerId: selectedCustomer }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to toggle visibility' }));
        throw new Error(error.error ?? 'Failed to toggle visibility');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dallas-history', selectedCustomer] });
      toast({ title: 'Visibility updated', description: 'Customer view updated successfully.' });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    },
  });

  const saveMutation = useMutation<{ snapshotId: string; version: number }, Error, void>({
    mutationFn: async () => {
      if (!selectedCustomer) {
        throw new Error('Select a customer before submitting');
      }
      if (items.length === 0) {
        throw new Error('Add items to the market order');
      }
      const response = await fetch('/api/rep/dallas/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          sourceYear: year,
          marketMonth: marketMonth,
          sourceEventId: `${marketMonth}-${year}`,
          name: `${marketMonth} ${year} Market Order`,
          items: items.map((item) => ({
            sku: item.sku,
            qty: item.qty,
            programDisc: item.programDisc,
            notes: item.notes,
            tags: item.tags,
          })),
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unable to save market order' }));
        throw new Error(error.error ?? 'Unable to save market order');
      }
      return response.json() as Promise<{ snapshotId: string; version: number }>;
    },
    onSuccess: (data) => {
      toast({
        title: 'Market order saved',
        description: `${marketMonth} ${year} market order v${data.version} saved successfully.`,
      });
      setItems([]);
      queryClient.invalidateQueries({ queryKey: ['dallas-history', selectedCustomer] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Unable to save market order',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const selectedCustomerRecord = customers.find((customer) => customer.id === selectedCustomer);

  const addItem = (catalogItem: CatalogResult) => {
    setItems((current) => {
      if (current.some((item) => item.sku === catalogItem.sku)) {
        toast({
          title: 'SKU already added',
          description: `${catalogItem.sku} is already in the draft.`,
        });
        return current;
      }
      return [
        ...current,
        {
          sku: catalogItem.sku,
          name: catalogItem.name,
          qty: 1,
          unitList: catalogItem.list,
          programDisc: 0,
          tags: [],
        },
      ];
    });
  };

  const updateQty = (sku: string, qty: number) => {
    setItems((current) =>
      current.map((item) =>
        item.sku === sku
          ? {
              ...item,
              qty: Number.isFinite(qty) && qty >= 0 ? qty : item.qty,
            }
          : item
      )
    );
  };

  const updateNotes = (sku: string, notes: string) => {
    setItems((current) => current.map((item) => (item.sku === sku ? { ...item, notes } : item)));
  };

  const removeItem = (sku: string) => {
    setItems((current) => current.filter((item) => item.sku !== sku));
  };

  const handleBulkAdd = async () => {
    if (!bulkInput.trim()) {
      toast({ title: 'Paste SKUs to continue', description: 'Use SKU[, qty] per line.' });
      return;
    }
    try {
      const result = await bulkValidateMutation.mutateAsync({ lines: bulkInput });
      if (result.unknown.length > 0) {
        toast({
          title: 'Some SKUs were not recognized',
          description: `Unknown: ${result.unknown.map((item) => item.sku).join(', ')}`,
          variant: 'destructive',
        });
      }
      if (result.duplicate.length > 0) {
        toast({
          title: 'Duplicates skipped',
          description: result.duplicate.map((item) => item.sku).join(', '),
        });
      }
      if (result.ok.length > 0) {
        const matches = await Promise.all(
          result.ok.map(async ({ sku, qty }) => {
            const response = await fetch(`/api/catalog/search?query=${encodeURIComponent(sku)}`);
            if (!response.ok) return null;
            const data = (await response.json()) as { results: CatalogResult[] };
            const catalog = data.results.find((item) => item.sku.toLowerCase() === sku.toLowerCase());
            return catalog ? { catalog, qty } : null;
          })
        );
        matches.filter((m): m is { catalog: CatalogResult; qty: number } => Boolean(m)).forEach(({ catalog, qty }) => {
          setItems((current) => {
            if (current.some((item) => item.sku === catalog.sku)) {
              return current;
            }
            return [
              ...current,
              {
                sku: catalog.sku,
                name: catalog.name,
                unitList: catalog.list,
                qty: qty > 0 ? qty : 1,
                programDisc: 0,
                tags: [],
              },
            ];
          });
        });
        toast({
          title: 'Bulk SKUs added',
          description: `${result.ok.length} items added to the draft.`,
        });
        setBulkInput('');
        setIsBulkOpen(false);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Unable to process bulk input',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const totalsDisplay = useMemo(() => {
    const netTotal = items.reduce(
      (acc, item) => acc + item.unitList * (1 - (item.programDisc ?? 0)) * item.qty,
      0
    );
    const subtotal = items.reduce((acc, item) => acc + item.unitList * item.qty, 0);
    const discount = subtotal - netTotal;
    return {
      netTotal,
      subtotal,
      discount,
    };
  }, [items]);

  const disabled = !selectedCustomer || items.length === 0 || saveMutation.isPending;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (!disabled) {
          saveMutation.mutate(undefined);
        }
      }
      // 'a' key to open Add SKU dialog (when not in input)
      if (event.key === 'a' && !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        setIsAddSkuOpen(true);
      }
      // 'b' key to open Bulk add dialog (when not in input)
      if (event.key === 'b' && !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        setIsBulkOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, saveMutation]);

  const qualificationThreshold = 5000;
  const qualificationGap = Math.max(0, qualificationThreshold - totalsDisplay.netTotal);
  const isQualified = totalsDisplay.netTotal >= qualificationThreshold;

  const summaryContent = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {marketMonth} {year}
        </p>
      </div>

      {/* Financial summary */}
      <div className="space-y-4 rounded-xl bg-muted p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-base font-medium text-foreground">{formatCurrency(totalsDisplay.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Program Discounts</span>
          <span className="text-base font-medium text-red-600">-{formatCurrency(totalsDisplay.discount)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-base font-semibold">Net Total</span>
          <span className="text-2xl font-bold text-foreground">{formatCurrency(totalsDisplay.netTotal)}</span>
        </div>
      </div>

      {/* Qualification status */}
      <div className="rounded-xl border border-border bg-card p-4">
        {isQualified ? (
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-700">Qualifies for Tier 1</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => toast({ title: 'Program details', description: 'Tier 1: $5,000+ minimum order value' })}
                >
                  View program details
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700">Add {formatCurrency(qualificationGap)} to reach Tier 1</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => toast({ title: 'Program details', description: 'Tier 1: $5,000+ minimum order value' })}
                >
                  View program details
                </button>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="rounded-lg bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-900">Snapshots are read-only for customers.</p>
      </div>

      {/* Primary action */}
      <Button
        className="h-11 w-full text-base font-semibold"
        disabled={disabled}
        onClick={() => saveMutation.mutate(undefined)}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Market Order'}
      </Button>

      {/* Secondary actions */}
      <div className="space-y-2">
        {selectedCustomerRecord && (
          <Button asChild variant="outline" className="w-full" size="sm">
            <Link href={`/customers/${selectedCustomerRecord.slug ?? selectedCustomerRecord.id}?tab=dallas`}>
              View customer orders
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full" size="sm">
              <DownloadIcon className="mr-2 h-4 w-4" /> Export menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem disabled={items.length === 0}>Download CSV</DropdownMenuItem>
            <DropdownMenuItem disabled={items.length === 0}>Download XLSX</DropdownMenuItem>
            <DropdownMenuItem disabled={items.length === 0}>Download PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Dallas Market Order</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Build and save a Dallas snapshot for this customer. Customers see snapshots as read-only.
              </p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" aria-label="Keyboard shortcuts">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Keyboard Shortcuts</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Add SKU</span>
                      <kbd className="rounded bg-muted px-2 py-1 font-mono">A</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bulk add</span>
                      <kbd className="rounded bg-muted px-2 py-1 font-mono">B</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Save market order</span>
                      <kbd className="rounded bg-muted px-2 py-1 font-mono">⌘S</kbd>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Card>

        {/* Market Context Card - Compact single-row controls */}
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="customer-select" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Customer
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="customer-select"
                    variant="outline"
                    className="h-10 w-full justify-between text-left font-normal"
                    aria-label="Select customer"
                  >
                    <span className="truncate">{selectedCustomerRecord ? selectedCustomerRecord.name : 'Select customer'}</span>
                    <MagnifyingGlassIcon className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Find customer" />
                    <CommandList>
                      <CommandEmpty>No results</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            onSelect={() => {
                              setSelectedCustomer(customer.id);
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.city ?? '—'}, {customer.region ?? ''}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-32 space-y-2">
              <Label htmlFor="month-select" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Month
              </Label>
              <select
                id="month-select"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={marketMonth}
                onChange={(event) => setMarketMonth(event.target.value as typeof MarketMonths[number])}
                aria-label="Market month"
              >
                {MarketMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-28 space-y-2">
              <Label htmlFor="year-select" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Year
              </Label>
              <select
                id="year-select"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                aria-label="Market year"
              >
                {MarketYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Dialog open={isAddSkuOpen} onOpenChange={setIsAddSkuOpen}>
                {items.length === 0 ? (
                  <Button
                    size="default"
                    className="h-10"
                    onClick={() => {
                      // Simply show the Add SKU dialog to start building
                      setIsAddSkuOpen(true);
                    }}
                  >
                    <PlusCircledIcon className="mr-2 h-4 w-4" /> Create New Market Selection
                  </Button>
                ) : (
                  <DialogTrigger asChild>
                    <Button size="default" className="h-10">
                      <PlusCircledIcon className="mr-2 h-4 w-4" /> Add SKU
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add catalog items</DialogTitle>
                    <DialogDescription>Search the shared catalog and add items to this draft.</DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 space-y-4">
                    <Label htmlFor="search">Search catalog</Label>
                    <Input
                      id="search"
                      placeholder="Search by SKU or name"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      autoFocus
                    />
                    <div className="max-h-[320px] space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                      {searchQuery.length <= 1 && (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Type at least two characters to search the catalog.
                        </p>
                      )}
                      {searchResults.isFetching && (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</p>
                      )}
                      {searchResults.data?.results?.length === 0 && !searchResults.isFetching && searchQuery.length > 1 && (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches yet.</p>
                      )}
                      {searchResults.data?.results?.map((item) => (
                        <button
                          key={item.sku}
                          type="button"
                          onClick={() => {
                            addItem(item);
                            setIsAddSkuOpen(false);
                          }}
                          className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition hover:bg-secondary/60"
                        >
                          <span className="text-sm font-semibold text-foreground">{item.sku}</span>
                          <span className="text-sm text-muted-foreground">{item.name}</span>
                          <span className="text-xs text-muted-foreground">List {formatCurrency(item.list)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {items.length > 0 && (
                <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                  <DialogTrigger asChild>
                    <Button size="default" variant="outline" className="h-10">
                      <UploadIcon className="mr-2 h-4 w-4" /> Bulk add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk add SKUs</DialogTitle>
                      <DialogDescription>Paste SKU[, qty] per line. Unknown SKUs will be flagged.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={bulkInput}
                      onChange={(event) => setBulkInput(event.target.value)}
                      placeholder={`10101-01, 2\n10102-01`}
                      rows={8}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkAdd} disabled={bulkValidateMutation.isPending}>
                        {bulkValidateMutation.isPending ? 'Processing…' : 'Add items'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </Card>

        {/* Draft Items Table */}
        <Card className="p-0">
          <CardHeader className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Draft Items</CardTitle>
                <CardDescription className="text-xs">
                  Adjust quantities and notes below. Discounts pull from current Dallas programs.
                </CardDescription>
              </div>
              {items.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground m-6">
                <p className="text-sm">Start by adding SKUs from the catalog or paste a list.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-t">
                      <TableHead className="w-48">SKU & Product</TableHead>
                      <TableHead className="w-24 text-center">Qty</TableHead>
                      <TableHead className="w-28 text-right">Unit List</TableHead>
                      <TableHead className="w-20 text-right">Disc</TableHead>
                      <TableHead className="w-28 text-right">Net</TableHead>
                      <TableHead className="w-32 text-right">Extended</TableHead>
                      <TableHead className="w-20 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const netUnit = item.unitList * (1 - (item.programDisc ?? 0));
                      const extended = netUnit * item.qty;
                      return (
                        <TableRow key={item.sku} className="group hover:bg-muted/50">
                          <TableCell className="py-3">
                            <div>
                              <p className="font-semibold text-foreground text-sm">{item.sku}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.name}>
                                {item.name}
                              </p>
                              {(item.notes || item.tags.length > 0) && (
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  {item.tags.slice(0, 2).map((tag) => (
                                    <Badge key={`${item.sku}-${tag}`} variant="muted" className="text-xs px-1.5 py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {item.notes && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      Note
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateQty(item.sku, Math.max(0, item.qty - 1))}
                                className="h-7 w-7 rounded border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <Input
                                type="number"
                                min={0}
                                value={item.qty}
                                onChange={(event) => updateQty(item.sku, Number(event.target.value))}
                                className="h-7 w-14 text-center text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                aria-label="Quantity"
                              />
                              <button
                                type="button"
                                onClick={() => updateQty(item.sku, item.qty + 1)}
                                className="h-7 w-7 rounded border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm">{formatCurrency(item.unitList)}</TableCell>
                          <TableCell className="py-3 text-right text-sm">
                            {item.programDisc ? (
                              <span className="text-orange-600 font-medium">{Math.round(item.programDisc * 100)}%</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm font-medium">{formatCurrency(netUnit)}</TableCell>
                          <TableCell className="py-3 text-right text-sm font-semibold">{formatCurrency(extended)}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Sheet>
                                <SheetTrigger asChild>
                                  <button
                                    type="button"
                                    className="h-7 w-7 rounded hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                                    aria-label="Edit notes"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-96">
                                  <SheetHeader>
                                    <SheetTitle>Edit Details</SheetTitle>
                                  </SheetHeader>
                                  <div className="mt-6 space-y-4">
                                    <div>
                                      <p className="text-sm font-semibold">{item.sku}</p>
                                      <p className="text-xs text-muted-foreground">{item.name}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`notes-${item.sku}`} className="text-sm font-medium">
                                        Notes
                                      </Label>
                                      <Textarea
                                        id={`notes-${item.sku}`}
                                        placeholder="Install notes, finish callouts, etc."
                                        value={item.notes ?? ''}
                                        onChange={(event) => updateNotes(item.sku, event.target.value)}
                                        rows={5}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Tags</Label>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.tags.map((tag) => (
                                          <Badge key={`${item.sku}-${tag}`} variant="muted">
                                            {tag}
                                          </Badge>
                                        ))}
                                        {item.tags.length === 0 && (
                                          <p className="text-xs text-muted-foreground">No tags</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </SheetContent>
                              </Sheet>
                              <button
                                type="button"
                                onClick={() => removeItem(item.sku)}
                                className="h-7 w-7 rounded hover:bg-rose-50 transition-colors flex items-center justify-center text-muted-foreground hover:text-rose-600"
                                aria-label="Remove item"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {/* Table footer with mini totals */}
                <div className="border-t border-border bg-muted/50 px-6 py-3">
                  <div className="flex items-center justify-end gap-8 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(totalsDisplay.subtotal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Discounts:</span>
                      <span className="font-medium text-orange-600">-{formatCurrency(totalsDisplay.discount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Net:</span>
                      <span className="font-semibold text-lg">{formatCurrency(totalsDisplay.netTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {selectedCustomer && historyQuery.data && historyQuery.data.history.length > 0 && (
          <Card className="p-0">
            <CardHeader className="px-6 pt-6 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Market Order History</CardTitle>
                  <CardDescription className="text-xs">
                    All saved market orders for {selectedCustomerRecord?.name ?? 'this customer'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-border bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        historyFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('visible')}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        historyFilter === 'visible' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Visible
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('hidden')}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        historyFilter === 'hidden' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Hidden
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-t">
                      <TableHead className="w-40">Market</TableHead>
                      <TableHead className="w-32">Date Saved</TableHead>
                      <TableHead className="w-20 text-center">Items</TableHead>
                      <TableHead className="w-32 text-right">Total Net</TableHead>
                      <TableHead className="w-24 text-center">Version</TableHead>
                      <TableHead className="w-28 text-center">Visibility</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyQuery.data.history
                      .filter((order) => {
                        if (historyFilter === 'visible') return order.isVisibleToCustomer;
                        if (historyFilter === 'hidden') return !order.isVisibleToCustomer;
                        return true;
                      })
                      .map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell className="py-3">
                            <div>
                              <p className="font-semibold text-foreground text-sm">
                                {order.marketMonth} {order.sourceYear}
                              </p>
                              <p className="text-xs text-muted-foreground">{order.sourceEventId}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="py-3 text-center text-sm">{order.itemCount}</TableCell>
                          <TableCell className="py-3 text-right text-sm font-medium">{formatCurrency(order.totalNet)}</TableCell>
                          <TableCell className="py-3 text-center">
                            <Badge variant="muted" className="text-xs">
                              v{order.version}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleVisibilityMutation.mutate(order.id)}
                              disabled={toggleVisibilityMutation.isPending}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                order.isVisibleToCustomer
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-muted text-muted-foreground hover:bg-muted'
                              }`}
                              aria-label={order.isVisibleToCustomer ? 'Hide from customer' : 'Show to customer'}
                            >
                              {order.isVisibleToCustomer ? (
                                <>
                                  <EyeOpenIcon className="h-3 w-3" />
                                  Visible
                                </>
                              ) : (
                                <>
                                  <EyeNoneIcon className="h-3 w-3" />
                                  Hidden
                                </>
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center justify-end gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 px-2">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      toast({ title: 'Feature coming soon', description: 'Duplicate as draft' });
                                    }}
                                  >
                                    <CopyIcon className="mr-2 h-4 w-4" />
                                    Duplicate as draft
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      toast({ title: 'Feature coming soon', description: 'Export to CSV' });
                                    }}
                                  >
                                    <DownloadIcon className="mr-2 h-4 w-4" />
                                    Export CSV
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      toast({ title: 'Feature coming soon', description: 'Export to XLSX' });
                                    }}
                                  >
                                    <DownloadIcon className="mr-2 h-4 w-4" />
                                    Export XLSX
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      toast({ title: 'Feature coming soon', description: 'Export to PDF' });
                                    }}
                                  >
                                    <DownloadIcon className="mr-2 h-4 w-4" />
                                    Export PDF
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-20">
          <Card>{summaryContent}</Card>
        </div>
      </div>
      <Sheet>
        <SheetTrigger className="fixed bottom-6 right-6 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg lg:hidden">
          <span>Review Order</span>
          <Badge variant="default" className="bg-white/20 text-white">
            {items.length}
          </Badge>
        </SheetTrigger>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Review Market Order</SheetTitle>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto">{summaryContent}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
