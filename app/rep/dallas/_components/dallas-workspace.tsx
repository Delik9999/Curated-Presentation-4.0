'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils/currency';
import { MagnifyingGlassIcon, PlusCircledIcon, TrashIcon, UploadIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

const DallasYears = Array.from({ length: 5 }).map((_, idx) => new Date().getFullYear() + idx);

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

type DallasWorkspaceProps = {
  customers: Customer[];
  initialCustomerId: string;
  initialYear: number;
};

const defaultDraft: DraftItem[] = [];

export default function DallasWorkspace({ customers, initialCustomerId, initialYear }: DallasWorkspaceProps) {
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomerId);
  const [year, setYear] = useState(initialYear);
  const [eventId, setEventId] = useState(() => `Dallas-${initialYear}`);
  const [items, setItems] = useState<DraftItem[]>(defaultDraft);
  const [isAddSkuOpen, setIsAddSkuOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [noteEditingSku, setNoteEditingSku] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setEventId((current) => (current.startsWith('Dallas-') ? `Dallas-${year}` : current));
  }, [year]);

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

  const saveMutation = useMutation<{ snapshotId: string; version: number }, Error, void>({
    mutationFn: async () => {
      if (!selectedCustomer) {
        throw new Error('Select a customer before publishing');
      }
      if (items.length === 0) {
        throw new Error('Add items to the snapshot');
      }
      const response = await fetch('/api/rep/dallas/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          sourceYear: year,
          sourceEventId: eventId,
          name: `${eventId} Snapshot`,
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
        const error = await response.json().catch(() => ({ error: 'Unable to save snapshot' }));
        throw new Error(error.error ?? 'Unable to save snapshot');
      }
      return response.json() as Promise<{ snapshotId: string; version: number }>;
    },
    onSuccess: (data) => {
      toast({
        title: 'Snapshot published',
        description: `Dallas snapshot saved (v${data.version}).`,
      });
      setItems([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Unable to publish snapshot',
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

  const summaryContent = (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Summary</h3>
        <p className="text-sm text-slate-500">
          Snapshot will publish immediately to the customer Dallas presentation.
        </p>
      </div>
      <div className="space-y-3 rounded-2xl bg-secondary/60 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium text-foreground">{formatCurrency(totalsDisplay.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Program Discounts</span>
          <span className="font-medium text-rose-500">-{formatCurrency(totalsDisplay.discount)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Net Total</span>
          <span>{formatCurrency(totalsDisplay.netTotal)}</span>
        </div>
      </div>
      <div className="space-y-2 text-xs text-slate-500">
        <p>Qualification: Add ${Math.max(0, 5000 - totalsDisplay.netTotal).toFixed(0)} to reach Tier 1.</p>
        <p>Version will increment automatically when publishing a new snapshot.</p>
      </div>
      <Button className="w-full" size="lg" disabled={disabled} onClick={() => saveMutation.mutate(undefined)}>
        {saveMutation.isPending ? 'Publishing…' : 'Save Dallas Snapshot'}
      </Button>
      {selectedCustomerRecord && (
        <Button asChild variant="outline" className="w-full" size="sm">
          <Link href={`/customers/${selectedCustomerRecord.slug ?? selectedCustomerRecord.id}?tab=dallas`}>
            View customer presentation
          </Link>
        </Button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Dallas Authoring</p>
              <h1 className="text-3xl font-semibold text-foreground">Build a Dallas Snapshot</h1>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={isAddSkuOpen} onOpenChange={setIsAddSkuOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusCircledIcon className="mr-2 h-4 w-4" /> Add SKU
                  </Button>
                </DialogTrigger>
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
                    />
                    <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-2xl border border-border p-2">
                      {searchQuery.length <= 1 && (
                        <p className="px-3 py-6 text-center text-sm text-slate-500">
                          Type at least two characters to search the catalog.
                        </p>
                      )}
                      {searchResults.isFetching && (
                        <p className="px-3 py-6 text-center text-sm text-slate-500">Searching…</p>
                      )}
                      {searchResults.data?.results?.length === 0 && !searchResults.isFetching && searchQuery.length > 1 && (
                        <p className="px-3 py-6 text-center text-sm text-slate-500">No matches yet.</p>
                      )}
                      {searchResults.data?.results?.map((item) => (
                        <button
                          key={item.sku}
                          type="button"
                          onClick={() => {
                            addItem(item);
                            setIsAddSkuOpen(false);
                          }}
                          className="flex w-full flex-col items-start rounded-2xl px-3 py-2 text-left transition hover:bg-secondary/60"
                        >
                          <span className="text-sm font-semibold text-foreground">{item.sku}</span>
                          <span className="text-sm text-slate-500">{item.name}</span>
                          <span className="text-xs text-slate-400">List {formatCurrency(item.list)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
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
                    placeholder={`AR-GLW-201, 2\nLN-SIL-118`}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleBulkAdd} disabled={bulkValidateMutation.isPending}>
                      {bulkValidateMutation.isPending ? 'Processing…' : 'Add items'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-slate-500">Customer</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-left font-medium">
                    <span>{selectedCustomerRecord ? selectedCustomerRecord.name : 'Select customer'}</span>
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
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
                              <p className="text-xs text-slate-500">{customer.city ?? '—'}, {customer.region ?? ''}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-slate-500">Year</Label>
                <select
                  className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                >
                  {DallasYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-slate-500">Event ID</Label>
                <Input value={eventId} onChange={(event) => setEventId(event.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Draft items</CardTitle>
            <CardDescription>
              Adjust quantities and notes below. Discounts pull from current Dallas programs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-slate-500">
                Start a draft by adding SKUs from the catalog or bulk importer.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit List</TableHead>
                    <TableHead>Disc</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Extended</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const netUnit = item.unitList * (1 - (item.programDisc ?? 0));
                    const extended = netUnit * item.qty;
                    return (
                      <TableRow key={item.sku}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{item.sku}</p>
                            <p className="text-sm text-slate-500">{item.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.tags.map((tag) => (
                              <Badge key={`${item.sku}-${tag}`} variant="muted">
                                {tag}
                              </Badge>
                            ))}
                            <Popover
                              open={noteEditingSku === item.sku}
                              onOpenChange={(open) => setNoteEditingSku(open ? item.sku : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="px-2 text-xs">
                                  Notes
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start">
                                <Label htmlFor={`notes-${item.sku}`} className="text-xs text-slate-500">
                                  Notes for {item.sku}
                                </Label>
                                <Textarea
                                  id={`notes-${item.sku}`}
                                  className="mt-2"
                                  placeholder="Install notes, finish callouts, etc."
                                  value={item.notes ?? ''}
                                  onChange={(event) => updateNotes(item.sku, event.target.value)}
                                />
                                <div className="mt-3 text-right">
                                  <Button size="sm" onClick={() => setNoteEditingSku(null)}>
                                    Close
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={item.qty}
                            onChange={(event) => updateQty(item.sku, Number(event.target.value))}
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(item.unitList)}</TableCell>
                        <TableCell>
                          {item.programDisc ? `${Math.round(item.programDisc * 100)}%` : <span className="text-slate-400">—</span>}
                        </TableCell>
                        <TableCell>{formatCurrency(netUnit)}</TableCell>
                        <TableCell>{formatCurrency(extended)}</TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.sku)}
                            className="rounded-full p-1 text-slate-400 transition hover:bg-secondary/70 hover:text-rose-500"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="hidden lg:block">
        <Card className="sticky top-20">
          <CardContent>{summaryContent}</CardContent>
        </Card>
      </div>
      <Sheet>
        <SheetTrigger className="fixed bottom-6 right-6 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft lg:hidden">
          Review snapshot
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Review Dallas Snapshot</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{summaryContent}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
