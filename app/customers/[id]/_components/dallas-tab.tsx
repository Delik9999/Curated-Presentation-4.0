'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer } from '@/lib/customers/loadCustomers';
import { Selection } from '@/lib/selections/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import { useToast } from '@/components/ui/use-toast';
import { ChevronDownIcon, DownloadIcon, ShuffleIcon } from '@radix-ui/react-icons';

export type DallasApiResponse = {
  snapshot: Selection | null;
  versions: { id: string; name: string; version: number; createdAt: string }[];
};

type DallasTabProps = {
  customer: Customer;
  data: DallasApiResponse;
};

function buildExportUrl(customerId: string, type: 'csv' | 'xlsx' | 'pdf', selectionType: 'dallas', selectionId?: string) {
  const search = new URLSearchParams({ type: selectionType });
  if (selectionId) {
    search.set('selectionId', selectionId);
  }
  return `/api/customers/${customerId}/export/${type}?${search.toString()}`;
}

export default function DallasTab({ customer, data }: DallasTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | undefined>(data.snapshot?.id);
  const [showImportDecision, setShowImportDecision] = useState(false);
  const [replaceConfirmation, setReplaceConfirmation] = useState('');

  const snapshotQuery = useQuery<DallasApiResponse>(
    ['customer-dallas', customer.id, selectedSnapshotId],
    async () => {
      const url = `/api/customers/${customer.id}/dallas/latest${selectedSnapshotId ? `?snapshotId=${selectedSnapshotId}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Unable to load Dallas snapshot');
      }
      return response.json();
    },
    {
      initialData: data,
      refetchOnWindowFocus: false,
    }
  );

  const snapshot = snapshotQuery.data?.snapshot ?? null;
  const versions = snapshotQuery.data?.versions ?? [];

  const importMutation = useMutation<
    { selectionId: string; version: number },
    Error,
    'auto' | 'createNew' | 'replace'
  >(
    async (mode) => {
      if (!snapshot) throw new Error('No Dallas snapshot to import');
      const response = await fetch(`/api/customers/${customer.id}/selection/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: snapshot.id, mode }),
      });
      if (response.status === 409) {
        setShowImportDecision(true);
        throw new Error('Working selection already exists');
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unable to import selection' }));
        throw new Error(error.error ?? 'Unable to import selection');
      }
      return response.json() as Promise<{ selectionId: string; version: number }>;
    },
    {
      onSuccess: () => {
        toast({ title: 'Selection created', description: 'Working selection updated with Dallas content.' });
        queryClient.invalidateQueries(['customer-working', customer.id]);
        setShowImportDecision(false);
        setReplaceConfirmation('');
      },
      onError: (error) => {
        if (error.message.includes('already exists')) return;
        toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
      },
    }
  );

  const mergeMutation = useMutation<
    { selectionId: string; version: number },
    Error,
    'addOnlyNew' | 'sumQuantities' | 'preferDallas'
  >(
    async (strategy) => {
      if (!snapshot) throw new Error('No Dallas snapshot to merge');
      const response = await fetch(`/api/customers/${customer.id}/selection/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: snapshot.id, strategy }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unable to merge selection' }));
        throw new Error(error.error ?? 'Unable to merge selection');
      }
      return response.json() as Promise<{ selectionId: string; version: number }>;
    },
    {
      onSuccess: () => {
        toast({ title: 'Selection merged', description: 'Working selection version updated.' });
        queryClient.invalidateQueries(['customer-working', customer.id]);
      },
      onError: (error) => {
        toast({ title: 'Merge failed', description: error.message, variant: 'destructive' });
      },
    }
  );

  const totals = useMemo(() => {
    if (!snapshot) return { subtotal: 0, discount: 0, net: 0 };
    const subtotal = snapshot.items.reduce((acc, item) => acc + item.unitList * item.qty, 0);
    const net = snapshot.items.reduce((acc, item) => acc + item.netUnit * item.qty, 0);
    return { subtotal, net, discount: subtotal - net };
  }, [snapshot]);

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dallas Market Selection</CardTitle>
          <CardDescription>No Dallas selection captured yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const exportMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <DownloadIcon className="mr-2 h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => window.open(buildExportUrl(customer.id, 'csv', 'dallas', snapshot.id), '_blank')}>
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(buildExportUrl(customer.id, 'xlsx', 'dallas', snapshot.id), '_blank')}>
          Download XLSX
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(buildExportUrl(customer.id, 'pdf', 'dallas', snapshot.id), '_blank')}>
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Dallas Market Selection</CardTitle>
          <CardDescription>
            Read-only snapshot from Dallas. Import or merge into your working selection to continue fine-tuning.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Version</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  v{snapshot.version} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {versions.map((version) => (
                  <DropdownMenuItem
                    key={version.id}
                    onSelect={() => {
                      setSelectedSnapshotId(version.id);
                    }}
                  >
                    v{version.version} · {new Date(version.createdAt).toLocaleDateString()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {exportMenu}
          <Button size="sm" onClick={() => importMutation.mutate('auto')} disabled={importMutation.isLoading}>
            Import to Selection
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <ShuffleIcon className="mr-2 h-4 w-4" /> Merge into Selection
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => mergeMutation.mutate('addOnlyNew')}>
                Add Only New
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => mergeMutation.mutate('sumQuantities')}>
                Sum Quantities
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => mergeMutation.mutate('preferDallas')}>
                Prefer Dallas Values
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Source Event</p>
            <p className="text-lg font-semibold text-foreground">{snapshot.sourceEventId ?? 'Dallas Market'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Published</p>
            <p className="text-lg font-semibold text-foreground">{new Date(snapshot.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Net</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(totals.net)}</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit List</TableHead>
              <TableHead>Disc</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Extended</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.items.map((item) => (
              <TableRow key={item.sku}>
                <TableCell className="font-semibold">{item.sku}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.qty}</TableCell>
                <TableCell>{formatCurrency(item.unitList)}</TableCell>
                <TableCell>{item.programDisc ? `${Math.round(item.programDisc * 100)}%` : '—'}</TableCell>
                <TableCell>{formatCurrency(item.netUnit)}</TableCell>
                <TableCell>{formatCurrency(item.extendedNet)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {item.notes ? <span className="text-sm text-slate-600">{item.notes}</span> : <span className="text-xs text-slate-400">No notes</span>}
                    {item.tags?.map((tag) => (
                      <Badge key={`${item.sku}-${tag}`} variant="muted" className="w-max">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-2 rounded-2xl bg-secondary/60 p-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>Subtotal {formatCurrency(totals.subtotal)}</span>
          <span>Program Discounts -{formatCurrency(totals.discount)}</span>
          <span className="font-semibold text-foreground">Net {formatCurrency(totals.net)}</span>
        </div>
        {showImportDecision && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">An in-progress selection already exists.</h3>
            <p className="mt-2 text-sm text-slate-600">
              Create a new working version to preserve the current iteration, or replace it entirely. Replacement requires confirmation.
            </p>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <Button variant="outline" onClick={() => importMutation.mutate('createNew')} disabled={importMutation.isLoading}>
                Create New Working Selection
              </Button>
              <div className="flex flex-1 items-center gap-2">
                <input
                  className="h-11 flex-1 rounded-2xl border border-border px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Type REPLACE to confirm"
                  value={replaceConfirmation}
                  onChange={(event) => setReplaceConfirmation(event.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={replaceConfirmation !== 'REPLACE' || importMutation.isLoading}
                  onClick={() => importMutation.mutate('replace')}
                >
                  Replace
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
