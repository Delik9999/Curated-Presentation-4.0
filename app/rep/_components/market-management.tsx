'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Check, X, Users, Calendar, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

type MarketCycle = {
  year: number;
  month: 'January' | 'June';
};

type MarketSelectionItem = {
  customerId: string;
  customerName: string;
  selection: {
    id: string;
    name: string;
    items: unknown[];
    createdAt: string;
    updatedAt: string;
  };
  isActive: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

type CycleStats = {
  year: number;
  month: 'January' | 'June';
  total: number;
  active: number;
};

const VENDORS = [
  { id: 'lib-and-co', name: 'Lib & Co' },
  { id: 'savoy-house', name: 'Savoy House' },
  { id: 'hubbardton-forge', name: 'Hubbardton Forge' },
];

export default function MarketManagement() {
  const [currentCycle, setCurrentCycle] = useState<MarketCycle | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<MarketCycle | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>('lib-and-co');
  const [selections, setSelections] = useState<MarketSelectionItem[]>([]);
  const [stats, setStats] = useState<{ byCycle: CycleStats[]; totalCustomers: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Available years for selection
  const years = [2024, 2025, 2026, 2027];
  const months: ('January' | 'June')[] = ['January', 'June'];

  // Load current market cycle on mount
  useEffect(() => {
    loadCurrentCycle();
    loadStats();
  }, []);

  // Load selections when cycle or vendor changes
  useEffect(() => {
    if (selectedCycle) {
      loadSelections();
    }
  }, [selectedCycle, selectedVendor]);

  async function loadCurrentCycle() {
    try {
      const response = await fetch('/api/rep/market-cycle');
      const data = await response.json();
      setCurrentCycle(data.currentCycle);
      setSelectedCycle(data.currentCycle);
    } catch (error) {
      console.error('Failed to load current cycle:', error);
    }
  }

  async function loadStats() {
    try {
      const response = await fetch(`/api/rep/market-selections?action=stats&vendor=${selectedVendor}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadSelections() {
    if (!selectedCycle) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedCycle.year.toString(),
        month: selectedCycle.month,
        vendor: selectedVendor,
      });
      const response = await fetch(`/api/rep/market-selections?${params}`);
      const data = await response.json();
      setSelections(data.selections || []);
    } catch (error) {
      console.error('Failed to load selections:', error);
      setSelections([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateCurrentCycle(year: number, month: 'January' | 'June') {
    setUpdating(true);
    try {
      const response = await fetch('/api/rep/market-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });
      const data = await response.json();
      setCurrentCycle(data.currentCycle);
    } catch (error) {
      console.error('Failed to update current cycle:', error);
    } finally {
      setUpdating(false);
    }
  }

  async function toggleVisibility(selectionId: string, customerId: string) {
    try {
      await fetch('/api/rep/market-selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-visibility',
          selectionId,
          customerId,
        }),
      });
      // Reload to get updated state
      loadSelections();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }

  async function bulkActivate() {
    if (!selectedCycle) return;

    setUpdating(true);
    try {
      await fetch('/api/rep/market-selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-activate',
          year: selectedCycle.year,
          month: selectedCycle.month,
          vendor: selectedVendor,
        }),
      });
      loadSelections();
      loadStats();
    } catch (error) {
      console.error('Failed to bulk activate:', error);
    } finally {
      setUpdating(false);
    }
  }

  async function bulkDeactivate() {
    if (!selectedCycle) return;

    setUpdating(true);
    try {
      await fetch('/api/rep/market-selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-deactivate',
          year: selectedCycle.year,
          month: selectedCycle.month,
          vendor: selectedVendor,
        }),
      });
      loadSelections();
      loadStats();
    } catch (error) {
      console.error('Failed to bulk deactivate:', error);
    } finally {
      setUpdating(false);
    }
  }

  const activeCount = selections.filter(s => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Current Market Cycle Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Current Market Cycle
          </CardTitle>
          <CardDescription>
            Set the active market cycle. Market selections for this cycle will override default presentations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={currentCycle?.month || 'January'}
              onValueChange={(month) => {
                if (currentCycle) {
                  updateCurrentCycle(currentCycle.year, month as 'January' | 'June');
                }
              }}
              disabled={updating}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentCycle?.year.toString() || '2026'}
              onValueChange={(year) => {
                if (currentCycle) {
                  updateCurrentCycle(parseInt(year, 10), currentCycle.month);
                }
              }}
              disabled={updating}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentCycle && (
              <Badge variant="outline" className="ml-4">
                Active: {currentCycle.month} {currentCycle.year}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Market Selections Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Market Selections
          </CardTitle>
          <CardDescription>
            Manage which customers have market selections visible for a specific market cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Vendor:</span>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDORS.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Cycle:</span>
              <Select
                value={selectedCycle?.month || 'January'}
                onValueChange={(month) => {
                  setSelectedCycle(prev => prev ? { ...prev, month: month as 'January' | 'June' } : null);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedCycle?.year.toString() || '2026'}
                onValueChange={(year) => {
                  setSelectedCycle(prev => prev ? { ...prev, year: parseInt(year, 10) } : null);
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadSelections}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Summary & Bulk Actions */}
          <div className="flex items-center justify-between py-3 px-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm">
                <strong>{selections.length}</strong> customers with selections
              </span>
              <span className="text-sm text-muted-foreground">
                <strong>{activeCount}</strong> active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={bulkActivate}
                disabled={updating || selections.length === 0}
              >
                <Eye className="h-4 w-4 mr-1" />
                Activate All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={bulkDeactivate}
                disabled={updating || activeCount === 0}
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Deactivate All
              </Button>
            </div>
          </div>

          {/* Selections Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : selections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No market selections found for {selectedCycle?.month} {selectedCycle?.year}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selections.map((item) => (
                  <TableRow key={item.selection.id}>
                    <TableCell className="font-medium">{item.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.itemCount} items</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => toggleVisibility(item.selection.id, item.customerId)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/customers/${item.customerId}?tab=collections&vendor=${selectedVendor}`}
                        target="_blank"
                      >
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      {stats && stats.byCycle.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Market selection statistics across all cycles for {VENDORS.find(v => v.id === selectedVendor)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {stats.byCycle.slice(0, 6).map((cycle) => (
                <div
                  key={`${cycle.year}-${cycle.month}`}
                  className={`p-4 rounded-lg border ${
                    currentCycle?.year === cycle.year && currentCycle?.month === cycle.month
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                >
                  <div className="font-medium">
                    {cycle.month} {cycle.year}
                    {currentCycle?.year === cycle.year && currentCycle?.month === cycle.month && (
                      <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {cycle.active} / {cycle.total} active
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
