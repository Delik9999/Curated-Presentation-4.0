'use client';

// Step 4: Commit Result Display

import React from 'react';
import { Button } from '@/components/ui/button-modern';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { CommitResult } from '@/lib/imports/commit-importer';

interface CommitResultStepProps {
  result: CommitResult;
  onReset: () => void;
}

export default function CommitResultStep({ result, onReset }: CommitResultStepProps) {
  const { success, summary, errors } = result;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="text-center">
        {success ? (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Import Successful</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your product data has been successfully imported.
            </p>
          </>
        ) : (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Import Completed with Errors</h2>
            <p className="mt-2 text-sm text-gray-600">
              Some products could not be imported. See details below.
            </p>
          </>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{summary.productsAdded}</p>
          <p className="text-sm text-green-600">Added</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{summary.productsUpdated}</p>
          <p className="text-sm text-blue-600">Updated</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{summary.pricesUpdated}</p>
          <p className="text-sm text-yellow-600">Price Changes</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{summary.errors}</p>
          <p className="text-sm text-red-600">Errors</p>
        </div>
      </div>

      {/* Error Details */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <h3 className="text-sm font-medium text-red-800">Errors</h3>
          </div>
          <div className="mt-2 max-h-48 overflow-y-auto">
            <ul className="text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>
                  <span className="font-medium">{error.productId}:</span> {error.error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Import ID */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Import ID</h3>
        <p className="text-sm text-gray-600 font-mono">{result.importId}</p>
        <p className="text-xs text-gray-500 mt-1">
          Timestamp: {new Date(result.timestamp).toLocaleString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        <Button onClick={onReset}>
          Start New Import
        </Button>
      </div>
    </div>
  );
}
