'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/lib/customers/loadCustomers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { AlignmentReport } from '@/lib/alignment/types';

interface AlignmentManagerProps {
  customers: Customer[];
}

export default function AlignmentManager({ customers }: AlignmentManagerProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('lib-and-co');
  const [report, setReport] = useState<AlignmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default customer
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  // Fetch report when customer or vendor changes
  useEffect(() => {
    if (!selectedCustomerId) return;

    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/alignment/v1/${selectedCustomerId}?vendorId=${selectedVendor}`);

        if (!response.ok) {
          throw new Error('Failed to load alignment report');
        }

        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [selectedCustomerId, selectedVendor]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const progressPercentage = report?.summary.targetPieces
    ? Math.min(100, (report.summary.currentPieces / report.summary.targetPieces) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Customer and Vendor Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Alignment Report</CardTitle>
          <CardDescription>
            View market alignment and recommendations for any customer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vendor</label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lib-and-co">Lib & Co</SelectItem>
                  <SelectItem value="savoy-house">Savoy House</SelectItem>
                  <SelectItem value="hubbardton-forge">Hubbardton Forge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center text-muted-foreground">
              Loading alignment report...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="py-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Report Display */}
      {!loading && !error && report && (
        <>
          {/* Progress Section */}
          {report.summary.targetPieces && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Promo Progress</CardTitle>
                <CardDescription>
                  {selectedCustomer?.name}'s progress toward promo target
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Current Progress</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {report.summary.currentPieces}/{report.summary.targetPieces}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {report.summary.piecesNeeded && report.summary.piecesNeeded > 0
                    ? `${report.summary.piecesNeeded} more ${report.summary.piecesNeeded === 1 ? 'piece' : 'pieces'} needed to reach target`
                    : 'Target reached! 🎉'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Current Collections */}
          {report.selections.collections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Collections</CardTitle>
                <CardDescription>
                  Collections in {selectedCustomer?.name}'s selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.selections.collections.map((collection) => (
                    <div
                      key={collection.collectionName}
                      className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                    >
                      <span className="font-medium">{collection.collectionName}</span>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {collection.marketRank && (
                          <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-xs">
                            Market #{collection.marketRank}
                          </span>
                        )}
                        {collection.vendorRank && (
                          <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-xs">
                            Vendor #{collection.vendorRank}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ADD Suggestions */}
          {report.suggestions.add.length > 0 && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
              <CardHeader>
                <CardTitle className="text-lg text-green-800 dark:text-green-200">
                  Add These Collections
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Top-performing collections to recommend adding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.suggestions.add.map((suggestion) => (
                    <div
                      key={suggestion.collectionName}
                      className="p-4 rounded-md bg-white dark:bg-slate-800 border border-green-100 dark:border-green-900"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-green-900 dark:text-green-100">
                          {suggestion.collectionName}
                        </h3>
                        <div className="flex gap-2 text-xs">
                          {suggestion.marketRank && (
                            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                              Market #{suggestion.marketRank}
                            </span>
                          )}
                          {suggestion.vendorRank && (
                            <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                              Vendor #{suggestion.vendorRank}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {suggestion.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TRADE-UP Suggestions */}
          {report.suggestions.tradeUp.length > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800 dark:text-blue-200">
                  Consider These Swaps
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Upgrade weaker collections to stronger performers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.suggestions.tradeUp.map((suggestion, idx) => (
                    <div
                      key={`${suggestion.fromCollectionName}-${idx}`}
                      className="p-4 rounded-md bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-red-600 dark:text-red-400 font-medium line-through">
                          {suggestion.fromCollectionName}
                        </span>
                        <span className="text-xl text-muted-foreground">→</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {suggestion.toCollectionName}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                        <span>From rank #{suggestion.fromRank}</span>
                        <span>→</span>
                        <span>To rank #{suggestion.toRank}</span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {suggestion.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Suggestions */}
          {report.suggestions.add.length === 0 && report.suggestions.tradeUp.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No suggestions available. This customer's selection is well-aligned with market trends.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
