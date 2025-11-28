'use client';

// Step 3: Preview Diff (Simplified placeholder)

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button-modern';
import { AlertCircle } from 'lucide-react';
import type { VendorMapping } from '@/lib/imports/mapping-types';
import type { ImportPreview } from '@/lib/imports/diff-generator';

interface PreviewDiffStepProps {
  vendorCode: string;
  jsonData: any;
  mapping?: VendorMapping; // Optional for vendors with dedicated loaders
  vendorUpdate?: any; // For vendors with dedicated loaders
  onPreviewGenerated: (preview: ImportPreview) => void;
  onCommitRequested: () => void;
  onBack: () => void;
}

// Convert vendor update diff to ImportPreview format
function convertVendorUpdateToPreview(vendorUpdate: any): ImportPreview {
  const { summary, diff } = vendorUpdate;

  return {
    summary: {
      newProducts: summary.newProducts,
      updatedProducts: summary.newFinishes + summary.specChanges, // Combine these
      priceOnlyChanges: summary.priceChanges,
      unchanged: summary.unchanged,
    },
    totalIncoming: summary.newProducts + summary.priceChanges + summary.unchanged,
    totalExisting: summary.priceChanges + summary.unchanged,
    diff: diff, // Include raw diff for details
  } as ImportPreview;
}

export default function PreviewDiffStep({
  vendorCode,
  jsonData,
  mapping,
  vendorUpdate,
  onPreviewGenerated,
  onCommitRequested,
  onBack,
}: PreviewDiffStepProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have vendorUpdate data (dedicated loader), use it directly
    if (vendorUpdate) {
      setPreview(convertVendorUpdateToPreview(vendorUpdate));
      setIsLoading(false);
    } else {
      // Otherwise generate preview using mapping
      generatePreview();
    }
  }, []);

  const generatePreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/imports/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          jsonData,
          mapping,
          vendorCode,
          effectiveFrom: new Date().toISOString(),
          safetyToggles: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate preview');
      }

      const { preview: generatedPreview } = await response.json();
      setPreview(generatedPreview);
      onPreviewGenerated(generatedPreview);
    } catch (err) {
      console.error('Preview error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Generating preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={generatePreview}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Preview Changes</h2>
        <p className="text-sm text-gray-600">
          Review the changes that will be applied to your product catalog.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-green-700">{preview.summary.newProducts}</p>
          <p className="text-sm text-green-600">New Products</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-blue-700">{preview.summary.updatedProducts}</p>
          <p className="text-sm text-blue-600">Updated Products</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-yellow-700">{preview.summary.priceOnlyChanges}</p>
          <p className="text-sm text-yellow-600">Price Changes</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-700">{preview.summary.unchanged}</p>
          <p className="text-sm text-gray-600">Unchanged</p>
        </div>
      </div>

      {/* Details */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Import Details</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-600">Total Incoming:</dt>
            <dd className="font-medium text-gray-900">{preview.totalIncoming}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Total Existing:</dt>
            <dd className="font-medium text-gray-900">{preview.totalExisting}</dd>
          </div>
        </dl>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onCommitRequested}>
          Commit Import
        </Button>
      </div>
    </div>
  );
}
