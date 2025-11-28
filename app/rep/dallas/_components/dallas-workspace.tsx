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
import { MagnifyingGlassIcon, PlusCircledIcon, TrashIcon, UploadIcon, DownloadIcon, EyeOpenIcon, EyeNoneIcon, CopyIcon, ListBulletIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

type SelectionItemDetail = {
  sku: string;
  name: string;
  qty: number;
  unitList: number;
  programDisc?: number;
  netUnit: number;
  extendedNet: number;
  notes?: string;
  tags?: string[];
};

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
  collection?: string;
};

type CatalogResult = {
  sku: string;
  name: string;
  list: number;
};

type MarketOrderSnapshot = {
  id: string;
  name: string;
  sourceEventId: string;
  sourceYear: number;
  marketMonth: 'January' | 'June';
  vendor: string;
  version: number;
  itemCount: number;
  totalNet: number;
  createdAt: string;
  updatedAt: string;
  isVisibleToCustomer: boolean;
};

type MarketPeriod = {
  periodKey: string;
  year: number;
  month: 'January' | 'June';
  isActive: boolean;
  snapshots: MarketOrderSnapshot[];
};

type DallasWorkspaceProps = {
  customers: Customer[];
  initialCustomerId: string;
  initialYear: number;
};

const defaultDraft: DraftItem[] = [];

export default function DallasWorkspace({ customers, initialCustomerId, initialYear }: DallasWorkspaceProps) {
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState<'lib-and-co' | 'savoy-house' | 'hubbardton-forge'>('lib-and-co');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [year, setYear] = useState(initialYear);
  const [marketMonth, setMarketMonth] = useState<typeof MarketMonths[number]>('January');
  const [items, setItems] = useState<DraftItem[]>(defaultDraft);
  const [isAddSkuOpen, setIsAddSkuOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  // PDF import state
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfParseResult, setPdfParseResult] = useState<{
    ok: Array<{ sku: string; name: string; qty: number; unitList: number; collection?: string }>;
    unknown: Array<{ sku: string; qty: number }>;
    duplicate: Array<{ sku: string }>;
    totalLines: number;
  } | null>(null);
  const [isPdfParsing, setIsPdfParsing] = useState(false);
  const [viewingSelection, setViewingSelection] = useState<{
    id: string;
    name: string;
    items: SelectionItemDetail[];
    totalNet: number;
  } | null>(null);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useQuery<{ results: CatalogResult[] }>({
    queryKey: ['catalog-search', searchQuery, selectedCustomer, selectedVendor],
    queryFn: async () => {
      const url = new URL('/api/catalog/search', window.location.origin);
      url.searchParams.set('query', searchQuery);
      if (selectedCustomer) {
        url.searchParams.set('customerId', selectedCustomer);
      }
      if (selectedVendor) {
        url.searchParams.set('vendor', selectedVendor);
      }
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchQuery.length > 1,
  });

  const historyQuery = useQuery<{ periods: MarketPeriod[] }>({
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
          vendor: selectedVendor,
          items: items.map((item) => ({
            sku: item.sku,
            qty: item.qty,
            programDisc: item.programDisc,
            notes: item.notes,
            tags: item.tags,
            collection: item.collection,
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

  const deleteMutation = useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: async (selectionId) => {
      if (!selectedCustomer) {
        throw new Error('No customer selected');
      }
      const response = await fetch(
        `/api/customers/${selectedCustomer}/dallas/snapshot/${selectionId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete' }));
        throw new Error(error.error ?? 'Failed to delete market selection');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Market selection deleted',
        description: 'The market selection has been permanently removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['dallas-history', selectedCustomer] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    },
  });

  const handleDeleteSelection = (selectionId: string, selectionName: string) => {
    if (window.confirm(`Are you sure you want to delete "${selectionName}"? This cannot be undone.`)) {
      deleteMutation.mutate(selectionId);
    }
  };

  const selectedCustomerRecord = customers.find((customer) => customer.id === selectedCustomer);

  // Function to view selection details
  const viewSelection = async (snapshotId: string, snapshotName: string) => {
    try {
      const response = await fetch(`/api/rep/dallas/selection?id=${snapshotId}`);
      if (!response.ok) {
        throw new Error('Failed to load selection');
      }
      const selection = await response.json();
      setViewingSelection({
        id: snapshotId,
        name: snapshotName,
        items: selection.items || [],
        totalNet: selection.items?.reduce((acc: number, item: SelectionItemDetail) => acc + (item.extendedNet || 0), 0) || 0,
      });
    } catch (error) {
      toast({ title: 'Unable to load selection', description: 'Please try again', variant: 'destructive' });
    }
  };

  // Function to duplicate selection as draft
  const duplicateAsDraft = async (snapshotId: string) => {
    try {
      // Get the selection details using the new endpoint
      const response = await fetch(`/api/rep/dallas/selection?id=${snapshotId}`);
      if (!response.ok) throw new Error('Failed to load selection');
      const selection = await response.json();

      // Load items into draft
      const draftItems: DraftItem[] = selection.items.map((item: SelectionItemDetail) => ({
        sku: item.sku,
        name: item.name,
        qty: item.qty,
        unitList: item.unitList,
        programDisc: item.programDisc || 0,
        notes: item.notes || '',
        tags: item.tags || [],
        collection: item.name.split(',')[0]?.trim() || 'Uncategorized',
      }));

      setItems(draftItems);
      toast({ title: 'Selection loaded into draft', description: `${draftItems.length} items ready to edit` });
    } catch (error) {
      toast({ title: 'Unable to load selection', description: 'Please try again', variant: 'destructive' });
    }
  };

  const addItem = (catalogItem: CatalogResult) => {
    setItems((current) => {
      if (current.some((item) => item.sku === catalogItem.sku)) {
        toast({
          title: 'SKU already added',
          description: `${catalogItem.sku} is already in the draft.`,
        });
        return current;
      }
      // Extract collection name from product name (first part before comma)
      const collection = catalogItem.name.split(',')[0]?.trim() || 'Uncategorized';

      return [
        ...current,
        {
          sku: catalogItem.sku,
          name: catalogItem.name,
          qty: 1,
          unitList: catalogItem.list,
          programDisc: 0,
          tags: [],
          collection,
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

  // PDF Import handlers
  const handlePdfFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setPdfParseResult(null);
    }
  };

  const handlePdfParse = async () => {
    if (!pdfFile) return;

    setIsPdfParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      const response = await fetch('/api/rep/dallas/import-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse PDF');
      }

      const result = await response.json();
      setPdfParseResult(result);
    } catch (error) {
      toast({
        title: 'PDF parsing failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsPdfParsing(false);
    }
  };

  const handlePdfImportConfirm = () => {
    if (!pdfParseResult) return;

    // Set vendor from PDF if detected
    if (pdfParseResult.vendor) {
      const vendorLower = pdfParseResult.vendor.toLowerCase();
      if (vendorLower.includes('savoy')) {
        setSelectedVendor('savoy-house');
      } else if (vendorLower.includes('hubbardton')) {
        setSelectedVendor('hubbardton-forge');
      } else if (vendorLower.includes('lib')) {
        setSelectedVendor('lib-and-co');
      }
    }

    // Set submit date from PDF if detected
    if (pdfParseResult.submitDate) {
      // Parse the date and set year/month if possible
      const dateStr = pdfParseResult.submitDate;
      const monthMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
      const yearMatch = dateStr.match(/\d{4}/);

      if (monthMatch) {
        const month = monthMatch[1];
        if (month.toLowerCase() === 'january') {
          setMarketMonth('January');
        } else if (month.toLowerCase() === 'june') {
          setMarketMonth('June');
        }
      }

      if (yearMatch) {
        const parsedYear = parseInt(yearMatch[0], 10);
        if (parsedYear >= 2020 && parsedYear <= 2030) {
          setYear(parsedYear);
        }
      }
    }

    // Add all valid items to the draft
    pdfParseResult.ok.forEach((item) => {
      const existingIndex = items.findIndex((i) => i.sku === item.sku);
      if (existingIndex >= 0) {
        // Update quantity if already exists
        const updated = [...items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + item.qty,
        };
        setItems(updated);
      } else {
        // Add new item
        setItems((prev) => [
          ...prev,
          {
            sku: item.sku,
            name: item.name,
            unitList: item.unitList,
            qty: item.qty,
            tags: [],
            collection: item.collection,
          },
        ]);
      }
    });

    toast({
      title: 'PDF items imported',
      description: `Added ${pdfParseResult.ok.length} items to draft.${pdfParseResult.unknown.length > 0 ? ` ${pdfParseResult.unknown.length} unknown SKUs skipped.` : ''}`,
    });

    // Reset state
    setIsPdfImportOpen(false);
    setPdfFile(null);
    setPdfParseResult(null);
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
            // Extract collection name from product name (first part before comma)
            const collection = catalog.name.split(',')[0]?.trim() || 'Uncategorized';

            return [
              ...current,
              {
                sku: catalog.sku,
                name: catalog.name,
                unitList: catalog.list,
                qty: qty > 0 ? qty : 1,
                programDisc: 0,
                tags: [],
                collection,
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

  return (
    <div className="space-y-8">
      {/* Order Controls Row */}
      <div className="flex flex-wrap items-end gap-4 pb-6 border-b border-border">
        <div className="flex-1 min-w-[280px] space-y-2">
          <Label htmlFor="customer-select" className="text-sm font-medium text-muted-foreground">
            Customer
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="customer-select"
                variant="outline"
                className={`h-11 w-full justify-between text-left font-normal rounded-xl hover:bg-muted ${
                  selectedCustomerRecord
                    ? 'border-border'
                    : 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30'
                }`}
                aria-label="Select customer"
              >
                <span className={`truncate ${selectedCustomerRecord ? 'font-medium' : 'text-muted-foreground'}`}>
                  {selectedCustomerRecord ? selectedCustomerRecord.name : 'Select a customer...'}
                </span>
                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-xl" align="start">
              <Command>
                <CommandInput placeholder="Find customer" className="h-11" />
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

        <div className="flex gap-3 ml-auto">
          <Dialog open={isAddSkuOpen} onOpenChange={setIsAddSkuOpen}>
            {items.length === 0 ? (
              <>
                <Button
                  size="lg"
                  className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-medium rounded-xl"
                  onClick={() => {
                    setIsAddSkuOpen(true);
                  }}
                >
                  <PlusCircledIcon className="mr-2 h-5 w-5" /> Create New Market Selection
                </Button>

                {/* PDF Import when no items - primary action */}
                <Dialog open={isPdfImportOpen} onOpenChange={(open) => {
                  setIsPdfImportOpen(open);
                  if (!open) {
                    setPdfFile(null);
                    setPdfParseResult(null);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="outline" className="h-11 rounded-xl font-medium">
                      <UploadIcon className="mr-2 h-5 w-5" /> Import from PDF
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import from PDF</DialogTitle>
                      <DialogDescription>Upload a PDF with SKUs and quantities to create a new market order.</DialogDescription>
                    </DialogHeader>

                    {!pdfParseResult ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={handlePdfFileChange}
                            className="rounded-xl"
                          />
                          <Button
                            onClick={handlePdfParse}
                            disabled={!pdfFile || isPdfParsing}
                            className="rounded-xl"
                          >
                            {isPdfParsing ? 'Parsing…' : 'Parse PDF'}
                          </Button>
                        </div>
                        {pdfFile && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {pdfFile.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary */}
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600 dark:text-green-400">
                            ✓ {pdfParseResult.ok.length} valid
                          </span>
                          {pdfParseResult.unknown.length > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              ⚠ {pdfParseResult.unknown.length} unknown
                            </span>
                          )}
                          {pdfParseResult.duplicate.length > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              ✕ {pdfParseResult.duplicate.length} duplicates
                            </span>
                          )}
                        </div>

                        {/* Valid items preview */}
                        {pdfParseResult.ok.length > 0 && (
                          <div className="max-h-60 overflow-y-auto border rounded-xl">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead className="text-right">Qty</TableHead>
                                  <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pdfParseResult.ok.map((item) => (
                                  <TableRow key={item.sku}>
                                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                    <TableCell className="text-xs truncate max-w-[200px]">{item.name}</TableCell>
                                    <TableCell className="text-right">{item.qty}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unitList)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Unknown SKUs */}
                        {pdfParseResult.unknown.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">Unknown SKUs (will be skipped):</p>
                            <p className="text-muted-foreground text-xs">
                              {pdfParseResult.unknown.map((u) => u.sku).join(', ')}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setPdfFile(null);
                              setPdfParseResult(null);
                            }}
                            className="rounded-xl"
                          >
                            Re-upload
                          </Button>
                          <Button
                            onClick={handlePdfImportConfirm}
                            disabled={pdfParseResult.ok.length === 0}
                            className="rounded-xl"
                          >
                            Import {pdfParseResult.ok.length} items
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <DialogTrigger asChild>
                  <Button size="default" className="h-11 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700">
                    <PlusCircledIcon className="mr-2 h-4 w-4" /> Add SKU
                  </Button>
                </DialogTrigger>
                <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                  <DialogTrigger asChild>
                    <Button size="default" variant="outline" className="h-11 rounded-xl font-medium">
                      <UploadIcon className="mr-2 h-4 w-4" /> Bulk add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Bulk add SKUs</DialogTitle>
                      <DialogDescription>Paste SKU[, qty] per line. Unknown SKUs will be flagged.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={bulkInput}
                      onChange={(event) => setBulkInput(event.target.value)}
                      placeholder={`10101-01, 2\n10102-01`}
                      rows={8}
                      className="rounded-xl"
                    />
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsBulkOpen(false)} className="rounded-xl">
                        Cancel
                      </Button>
                      <Button onClick={handleBulkAdd} disabled={bulkValidateMutation.isPending} className="rounded-xl">
                        {bulkValidateMutation.isPending ? 'Processing…' : 'Add items'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* PDF Import Dialog */}
                <Dialog open={isPdfImportOpen} onOpenChange={(open) => {
                  setIsPdfImportOpen(open);
                  if (!open) {
                    setPdfFile(null);
                    setPdfParseResult(null);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="default" variant="outline" className="h-11 rounded-xl font-medium">
                      <UploadIcon className="mr-2 h-4 w-4" /> Import PDF
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import from PDF</DialogTitle>
                      <DialogDescription>Upload a PDF with SKUs and quantities to import into this market order.</DialogDescription>
                    </DialogHeader>

                    {!pdfParseResult ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={handlePdfFileChange}
                            className="rounded-xl"
                          />
                          <Button
                            onClick={handlePdfParse}
                            disabled={!pdfFile || isPdfParsing}
                            className="rounded-xl"
                          >
                            {isPdfParsing ? 'Parsing…' : 'Parse PDF'}
                          </Button>
                        </div>
                        {pdfFile && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {pdfFile.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary */}
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600 dark:text-green-400">
                            ✓ {pdfParseResult.ok.length} valid
                          </span>
                          {pdfParseResult.unknown.length > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              ⚠ {pdfParseResult.unknown.length} unknown
                            </span>
                          )}
                          {pdfParseResult.duplicate.length > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              ✕ {pdfParseResult.duplicate.length} duplicates
                            </span>
                          )}
                        </div>

                        {/* Valid items preview */}
                        {pdfParseResult.ok.length > 0 && (
                          <div className="max-h-60 overflow-y-auto border rounded-xl">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead className="text-right">Qty</TableHead>
                                  <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pdfParseResult.ok.map((item) => (
                                  <TableRow key={item.sku}>
                                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                    <TableCell className="text-xs truncate max-w-[200px]">{item.name}</TableCell>
                                    <TableCell className="text-right">{item.qty}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unitList)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Unknown SKUs */}
                        {pdfParseResult.unknown.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">Unknown SKUs (will be skipped):</p>
                            <p className="text-muted-foreground text-xs">
                              {pdfParseResult.unknown.map((u) => u.sku).join(', ')}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setPdfFile(null);
                              setPdfParseResult(null);
                            }}
                            className="rounded-xl"
                          >
                            Re-upload
                          </Button>
                          <Button
                            onClick={handlePdfImportConfirm}
                            disabled={pdfParseResult.ok.length === 0}
                            className="rounded-xl"
                          >
                            Import {pdfParseResult.ok.length} items
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
            <DialogContent className="rounded-2xl">
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
                  className="rounded-xl"
                />
                <div className="max-h-[320px] space-y-1 overflow-y-auto rounded-xl border border-border p-2">
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
                      className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition-colors duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    >
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.sku}</span>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.name}</span>
                      <span className="text-xs text-neutral-500">WSP {formatCurrency(item.list)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Active State - Two Column Layout */}
      {items.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4">
          {/* Left Column - Draft Items */}
          <div className="space-y-6">
            <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Draft Items
                    </CardTitle>
                    <CardDescription className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      Adjust quantities and notes below. Discounts apply automatically.
                    </CardDescription>
                  </div>
                  <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {items.length === 0 ? null : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-t">
                      <TableHead className="w-48">SKU & Product</TableHead>
                      <TableHead className="w-24 text-center">Qty</TableHead>
                      <TableHead className="w-28 text-right">Unit WSP</TableHead>
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

            {/* Market Order History - Grouped by Period */}
            {selectedCustomer && historyQuery.data && historyQuery.data.periods.length > 0 && (
              <div className="space-y-6">
                {historyQuery.data.periods.map((period) => (
                  <Card key={period.periodKey} className="rounded-2xl border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <CardHeader className="px-6 pt-6 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <CardTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                              {period.month} {period.year} Market
                            </CardTitle>
                            <CardDescription className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                              {period.snapshots.length} {period.snapshots.length === 1 ? 'snapshot' : 'snapshots'} across all vendors
                            </CardDescription>
                          </div>
                          {period.isActive && (
                            <Badge className="bg-green-500 text-white hover:bg-green-600">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-t">
                              <TableHead className="w-28">Vendor</TableHead>
                              <TableHead className="w-32">Date Saved</TableHead>
                              <TableHead className="w-20 text-center">Items</TableHead>
                              <TableHead className="w-32 text-right">Total Net</TableHead>
                              <TableHead className="w-24 text-center">Version</TableHead>
                              <TableHead className="w-28 text-center">Visibility</TableHead>
                              <TableHead className="w-32 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {period.snapshots.map((snapshot) => (
                              <TableRow key={snapshot.id} className="hover:bg-muted/50">
                                <TableCell className="py-3">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      snapshot.vendor === 'lib-and-co'
                                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                        : snapshot.vendor === 'hubbardton-forge'
                                        ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                    }`}
                                  >
                                    {snapshot.vendor === 'lib-and-co' ? 'Lib & Co' : snapshot.vendor === 'hubbardton-forge' ? 'Hubbardton Forge' : 'Savoy House'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 text-sm">{new Date(snapshot.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="py-3 text-center text-sm">{snapshot.itemCount}</TableCell>
                                <TableCell className="py-3 text-right text-sm font-medium">{formatCurrency(snapshot.totalNet)}</TableCell>
                                <TableCell className="py-3 text-center">
                                  <Badge variant="muted" className="text-xs">
                                    v{snapshot.version}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleVisibilityMutation.mutate(snapshot.id)}
                                    disabled={toggleVisibilityMutation.isPending}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                      snapshot.isVisibleToCustomer
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-muted text-muted-foreground hover:bg-muted'
                                    }`}
                                    aria-label={snapshot.isVisibleToCustomer ? 'Hide from customer' : 'Show to customer'}
                                  >
                                    {snapshot.isVisibleToCustomer ? (
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
                                          onSelect={() => viewSelection(snapshot.id, snapshot.name)}
                                        >
                                          <ListBulletIcon className="mr-2 h-4 w-4" />
                                          View Items
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onSelect={() => duplicateAsDraft(snapshot.id)}
                                        >
                                          <CopyIcon className="mr-2 h-4 w-4" />
                                          Load into Draft
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
                                            toast({ title: 'Feature coming soon', description: 'Export to PDF' });
                                          }}
                                        >
                                          <DownloadIcon className="mr-2 h-4 w-4" />
                                          Export PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onSelect={() => handleDeleteSelection(snapshot.id, snapshot.name)}
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          <TrashIcon className="mr-2 h-4 w-4" />
                                          Delete
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
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Summary Panel */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 shadow-sm">
                <CardContent className="p-6">
                  {/* Tier Progress Banner */}
                  {!isQualified && (
                    <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 shrink-0">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            You&apos;re {formatCurrency(qualificationGap)} away from Tier 1 eligibility
                          </p>
                          <button
                            type="button"
                            className="text-xs text-amber-700 dark:text-amber-400 underline hover:text-amber-900 dark:hover:text-amber-200 mt-1"
                            onClick={() => toast({ title: 'Program details', description: 'Tier 1: $5,000+ minimum order value' })}
                          >
                            View program details
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Summary Header */}
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Summary</h2>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {marketMonth} {year}
                      </p>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Subtotal</span>
                        <span className="text-base font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                          {formatCurrency(totalsDisplay.subtotal)}
                        </span>
                      </div>
                      {totalsDisplay.discount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Program Discounts</span>
                          <span className="text-base font-medium text-amber-600 dark:text-amber-500 tabular-nums">
                            -{formatCurrency(totalsDisplay.discount)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-4">
                        <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Net Total</span>
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {formatCurrency(totalsDisplay.netTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Qualified Status */}
                    {isQualified && (
                      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-green-900 dark:text-green-100">Qualifies for Tier 1</p>
                            <button
                              type="button"
                              className="text-xs text-green-700 dark:text-green-400 underline hover:text-green-900 dark:hover:text-green-200 mt-1"
                              onClick={() => toast({ title: 'Program details', description: 'Tier 1: $5,000+ minimum order value' })}
                            >
                              View program details
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info Banner */}
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 px-4 py-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                        Your customers will see saved snapshots only.
                      </p>
                    </div>

                    {/* Primary Action */}
                    <Button
                      className="h-11 w-full text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all duration-200"
                      disabled={disabled}
                      onClick={() => saveMutation.mutate(undefined)}
                    >
                      {saveMutation.isPending ? 'Saving…' : 'Save Market Selection'}
                    </Button>

                    {/* Secondary Actions */}
                    <div className="space-y-3">
                      {selectedCustomerRecord && (
                        <Button asChild variant="outline" className="w-full rounded-xl font-medium" size="default">
                          <Link href={`/customers/${selectedCustomerRecord.slug ?? selectedCustomerRecord.id}?tab=dallas`}>
                            View Customer Orders
                          </Link>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full rounded-xl font-medium" size="default">
                            <DownloadIcon className="mr-2 h-4 w-4" /> Export Menu
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-48 rounded-xl">
                          <DropdownMenuItem disabled={items.length === 0}>Download PDF</DropdownMenuItem>
                          <DropdownMenuItem disabled={items.length === 0}>Download XLSX</DropdownMenuItem>
                          <DropdownMenuItem disabled={items.length === 0}>Download CSV</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile Summary Sheet */}
          <Sheet>
            <SheetTrigger className="fixed bottom-6 right-6 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-indigo-600 px-6 text-base font-semibold text-white shadow-lg lg:hidden">
              <span>Review Selection</span>
              <Badge variant="default" className="bg-white/20 text-white">
                {items.length}
              </Badge>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto rounded-l-2xl">
              <SheetHeader>
                <SheetTitle>Review Market Selection</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Summary Header */}
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Summary</h2>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {marketMonth} {year}
                  </p>
                </div>

                {/* Financial Summary */}
                <div className="space-y-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Subtotal</span>
                    <span className="text-base font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {formatCurrency(totalsDisplay.subtotal)}
                    </span>
                  </div>
                  {totalsDisplay.discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Program Discounts</span>
                      <span className="text-base font-medium text-amber-600 dark:text-amber-500 tabular-nums">
                        -{formatCurrency(totalsDisplay.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-4">
                    <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Net Total</span>
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {formatCurrency(totalsDisplay.netTotal)}
                    </span>
                  </div>
                </div>

                {/* Primary Action */}
                <Button
                  className="h-11 w-full text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all duration-200"
                  disabled={disabled}
                  onClick={() => saveMutation.mutate(undefined)}
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save Market Selection'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* History Section (below empty state when no items) - Grouped by Period */}
      {items.length === 0 && selectedCustomer && historyQuery.data && historyQuery.data.periods.length > 0 && (
        <div className="space-y-6">
          {historyQuery.data.periods.map((period) => (
            <Card key={period.periodKey} className="rounded-2xl border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        {period.month} {period.year} Market
                      </CardTitle>
                      <CardDescription className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {period.snapshots.length} {period.snapshots.length === 1 ? 'snapshot' : 'snapshots'} across all vendors
                      </CardDescription>
                    </div>
                    {period.isActive && (
                      <Badge className="bg-green-500 text-white hover:bg-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-t">
                        <TableHead className="w-28">Vendor</TableHead>
                        <TableHead className="w-32">Date Saved</TableHead>
                        <TableHead className="w-20 text-center">Items</TableHead>
                        <TableHead className="w-32 text-right">Total Net</TableHead>
                        <TableHead className="w-24 text-center">Version</TableHead>
                        <TableHead className="w-28 text-center">Visibility</TableHead>
                        <TableHead className="w-32 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {period.snapshots.map((snapshot) => (
                        <TableRow key={snapshot.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors duration-200">
                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                snapshot.vendor === 'lib-and-co'
                                  ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : snapshot.vendor === 'hubbardton-forge'
                                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              }`}
                            >
                              {snapshot.vendor === 'lib-and-co' ? 'Lib & Co' : snapshot.vendor === 'hubbardton-forge' ? 'Hubbardton Forge' : 'Savoy House'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-neutral-700 dark:text-neutral-300">
                            {new Date(snapshot.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm tabular-nums">{snapshot.itemCount}</TableCell>
                          <TableCell className="py-3 text-right text-sm font-medium tabular-nums">
                            {formatCurrency(snapshot.totalNet)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Badge variant="secondary" className="text-xs font-medium">
                              v{snapshot.version}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleVisibilityMutation.mutate(snapshot.id)}
                              disabled={toggleVisibilityMutation.isPending}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                                snapshot.isVisibleToCustomer
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                              }`}
                              aria-label={snapshot.isVisibleToCustomer ? 'Hide from customer' : 'Show to customer'}
                            >
                              {snapshot.isVisibleToCustomer ? (
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
                                  <Button variant="ghost" size="sm" className="h-7 px-2 rounded-lg">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem
                                    onSelect={() => viewSelection(snapshot.id, snapshot.name)}
                                  >
                                    <ListBulletIcon className="mr-2 h-4 w-4" />
                                    View Items
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => duplicateAsDraft(snapshot.id)}
                                  >
                                    <CopyIcon className="mr-2 h-4 w-4" />
                                    Load into Draft
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
                                      toast({ title: 'Feature coming soon', description: 'Export to PDF' });
                                    }}
                                  >
                                    <DownloadIcon className="mr-2 h-4 w-4" />
                                    Export PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => handleDeleteSelection(snapshot.id, snapshot.name)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <TrashIcon className="mr-2 h-4 w-4" />
                                    Delete
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
          ))}
        </div>
      )}

      {/* View Selection Dialog */}
      <Dialog open={!!viewingSelection} onOpenChange={(open) => !open && setViewingSelection(null)}>
        <DialogContent className="max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{viewingSelection?.name}</DialogTitle>
            <DialogDescription>
              {viewingSelection?.items.length} items • Total: {formatCurrency(viewingSelection?.totalNet || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU & Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit WSP</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Extended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingSelection?.items.map((item) => (
                  <TableRow key={item.sku}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{item.sku}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{item.name}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitList)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.netUnit)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.extendedNet)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setViewingSelection(null)} className="rounded-xl">
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewingSelection) {
                  duplicateAsDraft(viewingSelection.id);
                  setViewingSelection(null);
                }
              }}
              className="rounded-xl"
            >
              <CopyIcon className="mr-2 h-4 w-4" />
              Load into Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
