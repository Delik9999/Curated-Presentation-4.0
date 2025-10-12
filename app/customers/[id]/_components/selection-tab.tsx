'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Customer } from '@/lib/customers/loadCustomers';
import { Selection } from '@/lib/selections/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils/currency';
import { DownloadIcon } from '@radix-ui/react-icons';

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
};

type DraftWorkingItem = {
  sku: string;
  qty: number;
  notes?: string;
};

export default function SelectionTab({ customer, dallasData, workingData }: SelectionTabProps) {
  const { toast } = useToast();
  const [draftItems, setDraftItems] = useState<DraftWorkingItem[]>([]);

  const workingQuery = useQuery<WorkingResponse>({
    queryKey: ['customer-working', customer.id],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customer.id}/selection/working`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Unable to load selection');
      }
      return response.json();
    },
    initialData: workingData,
    refetchOnWindowFocus: false,
  });

  const selection = workingQuery.data?.selection ?? null;

  useEffect(() => {
    if (selection) {
      setDraftItems(selection.items.map((item) => ({ sku: item.sku, qty: item.qty, notes: item.notes })));
    } else {
      setDraftItems([]);
    }
  }, [selection]);

  const totals = useMemo(() => {
    if (!selection) return { subtotal: 0, discount: 0, net: 0 };
    const subtotal = selection.items.reduce((acc, item) => acc + item.unitList * (draftItems.find((draft) => draft.sku === item.sku)?.qty ?? item.qty), 0);
    const net = selection.items.reduce((acc, item) => {
      const qty = draftItems.find((draft) => draft.sku === item.sku)?.qty ?? item.qty;
      return acc + item.netUnit * qty;
    }, 0);
    return { subtotal, net, discount: subtotal - net };
  }, [selection, draftItems]);

  const updateMutation = useMutation<{ selectionId: string; version: number }, Error, void>({
    mutationFn: async () => {
      if (!selection) throw new Error('No selection to update');
      const response = await fetch(`/api/customers/${customer.id}/selection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: draftItems,
          metadata: { updatedVia: 'customer-ui' },
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

  if (!selection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Working Selection</CardTitle>
          <CardDescription>No working selection has been created yet. Import a Dallas snapshot to begin.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const provenance = selection.sourceEventId
    ? `Based on Dallas ${selection.sourceEventId}`
    : dallasData.snapshot
    ? `Inspired by ${dallasData.snapshot.name}`
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Working Selection</CardTitle>
          <CardDescription>
            Adjust quantities and notes tailored for {customer.name}. Exports reflect these working values.
          </CardDescription>
          {provenance && <p className="mt-2 text-sm text-muted-foreground">{provenance}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <DownloadIcon className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => window.open(buildExportUrl(customer.id, 'csv', 'working', selection.id), '_blank')}>
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open(buildExportUrl(customer.id, 'xlsx', 'working', selection.id), '_blank')}>
                Download XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open(buildExportUrl(customer.id, 'pdf', 'working', selection.id), '_blank')}>
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => updateMutation.mutate(undefined)} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save Updates'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit WSP</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Extended</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selection.items.map((item) => {
              const draft = draftItems.find((draftItem) => draftItem.sku === item.sku) ?? {
                sku: item.sku,
                qty: item.qty,
                notes: item.notes,
              };
              const netUnit = item.netUnit;
              const extended = netUnit * draft.qty;
              return (
                <TableRow key={item.sku}>
                  <TableCell className="font-semibold">{item.sku}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span>{item.name}</span>
                      {item.tags?.map((tag) => (
                        <Badge key={`${item.sku}-${tag}`} variant="muted" className="w-max">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={draft.qty}
                      onChange={(event) => {
                        const qty = Number(event.target.value);
                        setDraftItems((current) =>
                          current.map((entry) =>
                            entry.sku === item.sku ? { ...entry, qty: Number.isFinite(qty) ? qty : entry.qty } : entry
                          )
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatCurrency(item.unitList)}</TableCell>
                  <TableCell>{formatCurrency(netUnit)}</TableCell>
                  <TableCell>{formatCurrency(extended)}</TableCell>
                  <TableCell>
                    <Textarea
                      value={draft.notes ?? ''}
                      onChange={(event) =>
                        setDraftItems((current) =>
                          current.map((entry) =>
                            entry.sku === item.sku ? { ...entry, notes: event.target.value } : entry
                          )
                        )
                      }
                      placeholder="Notes for installers or finish preferences"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-2 rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>Subtotal {formatCurrency(totals.subtotal)}</span>
          <span>Program Discounts -{formatCurrency(totals.discount)}</span>
          <span className="font-semibold text-foreground">Net {formatCurrency(totals.net)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
