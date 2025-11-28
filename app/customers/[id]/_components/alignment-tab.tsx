'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import type { AlignmentReport } from '@/lib/alignment/types';

interface AlignmentTabProps {
  customerId: string;
  selectedVendor?: string;
  authorizedVendors?: string[];
}

const vendorNames: Record<string, string> = {
  'lib-and-co': 'Lib & Co',
  'savoy-house': 'Savoy House',
  'hubbardton-forge': 'Hubbardton Forge',
};

export default function AlignmentTab({ customerId, selectedVendor, authorizedVendors = ['lib-and-co'] }: AlignmentTabProps) {
  const [reports, setReports] = useState<Record<string, AlignmentReport>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterVendor, setFilterVendor] = useState<string>(selectedVendor || 'all');

  // Determine which vendors to show
  const vendorsToShow = authorizedVendors.length > 0 ? authorizedVendors : ['lib-and-co'];
  const showVendorFilter = vendorsToShow.length > 1;
  const vendorsKey = vendorsToShow.join(',');

  // Sync filter with page's selected vendor when it changes
  useEffect(() => {
    if (selectedVendor) {
      setFilterVendor(selectedVendor);
    }
  }, [selectedVendor]);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      setError(null);
      try {
        // Fetch reports for all authorized vendors
        const fetchPromises = vendorsToShow.map(async (vendorId) => {
          const response = await fetch(`/api/alignment/v1/${customerId}?vendorId=${vendorId}`);
          if (!response.ok) {
            throw new Error(`Failed to load alignment report for ${vendorId}`);
          }
          const data = await response.json();
          return { vendorId, data };
        });

        const results = await Promise.all(fetchPromises);
        const reportsMap: Record<string, AlignmentReport> = {};
        results.forEach(({ vendorId, data }) => {
          reportsMap[vendorId] = data;
        });
        setReports(reportsMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, vendorsKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading alignment report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (Object.keys(reports).length === 0) {
    return null;
  }

  // Get filtered reports based on vendor selection
  const filteredVendors = filterVendor === 'all'
    ? vendorsToShow
    : vendorsToShow.filter(v => v === filterVendor);

  // Calculate combined progress for all vendors or single vendor
  const totalCurrentPieces = filteredVendors.reduce((sum, v) => sum + (reports[v]?.summary.currentPieces || 0), 0);
  const totalTargetPieces = filteredVendors.reduce((sum, v) => sum + (reports[v]?.summary.targetPieces || 0), 0);
  const progressPercentage = totalTargetPieces
    ? Math.min(100, (totalCurrentPieces / totalTargetPieces) * 100)
    : 0;

  // Helper to render a single vendor's report content
  const renderVendorReport = (vendorId: string, report: AlignmentReport, showVendorHeader: boolean) => (
    <div key={vendorId} className="space-y-6">
      {/* Vendor Header when showing all vendors */}
      {showVendorHeader && (
        <div className="border-b border-border pb-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {vendorNames[vendorId] || vendorId}
          </h2>
        </div>
      )}

      {/* Your Collections Section */}
      {report.selections.collections.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Your Collections</h2>
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
                      Market Rank #{collection.marketRank}
                    </span>
                  )}
                  {collection.vendorRank && (
                    <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-xs">
                      {vendorNames[vendorId] || 'Vendor'} Rank #{collection.vendorRank}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD Suggestions */}
      {report.suggestions.add.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-6">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
            Add These Collections
          </h2>
          <p className="text-sm text-green-700 dark:text-green-300 mb-4">
            Top-performing collections to consider adding to your selection:
          </p>
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
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {suggestion.marketRank && (
                      <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                        Market Rank #{suggestion.marketRank}
                      </span>
                    )}
                    {suggestion.vendorRank && (
                      <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                        {vendorNames[vendorId] || 'Vendor'} Rank #{suggestion.vendorRank}
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
        </div>
      )}

      {/* TRADE-UP Suggestions */}
      {report.suggestions.tradeUp.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-6">
          <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
            Consider These Swaps
          </h2>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
            Upgrade weaker collections to stronger performers:
          </p>
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
        </div>
      )}

      {/* No Suggestions for this vendor */}
      {report.selections.collections.length === 0 &&
       report.suggestions.add.length === 0 &&
       report.suggestions.tradeUp.length === 0 && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-muted-foreground">
            No alignment data available for {vendorNames[vendorId] || vendorId}.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Vendor Filter Dropdown */}
      {showVendorFilter && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-muted-foreground">Filter by Vendor:</label>
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Vendors</option>
            {vendorsToShow.map((vendorId) => (
              <option key={vendorId} value={vendorId}>
                {vendorNames[vendorId] || vendorId}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Progress Section - Combined when showing all vendors */}
      {totalTargetPieces > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-semibold">
              {filterVendor === 'all' ? 'Combined Promo Progress' : 'Promo Progress'}
            </h2>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalCurrentPieces}/{totalTargetPieces}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">
            {totalTargetPieces - totalCurrentPieces > 0
              ? `${totalTargetPieces - totalCurrentPieces} more ${totalTargetPieces - totalCurrentPieces === 1 ? 'piece' : 'pieces'} needed to reach target`
              : 'Target reached!'}
          </p>
        </div>
      )}

      {/* Render vendor reports */}
      {filteredVendors.map((vendorId) => {
        const report = reports[vendorId];
        if (!report) return null;
        return renderVendorReport(vendorId, report, filterVendor === 'all' && filteredVendors.length > 1);
      })}

      {/* No data at all */}
      {filteredVendors.every(v => !reports[v] || (
        reports[v].selections.collections.length === 0 &&
        reports[v].suggestions.add.length === 0 &&
        reports[v].suggestions.tradeUp.length === 0
      )) && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-muted-foreground">
            No alignment data available. Your selection is well-aligned with market trends.
          </p>
        </div>
      )}
    </div>
  );
}
