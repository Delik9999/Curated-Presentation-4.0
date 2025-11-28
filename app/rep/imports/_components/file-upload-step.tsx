'use client';

// Step 1: File Upload and Analysis

import React, { useState, useRef } from 'react';
import { Upload, FileJson, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button-modern';
import type { JSONShape, DetectedColumn } from '@/lib/imports/mapping-types';

interface FileUploadStepProps {
  onFileAnalyzed: (data: {
    vendorCode: string;
    jsonData: any;
    shape: JSONShape;
    columns: DetectedColumn[];
    vendorUpdate?: any; // Optional vendor update diff for dedicated loaders
  }) => void;
}

const AVAILABLE_VENDORS = [
  { code: 'lib-and-co', name: 'Lib & Co', hasLoader: true },
  { code: 'savoy-house', name: 'Savoy House', hasLoader: true },
  { code: 'hubbardton-forge', name: 'Hubbardton Forge', hasLoader: true },
  { code: 'other', name: 'Other (Custom Import)', hasLoader: false },
];

export default function FileUploadStep({ onFileAnalyzed }: FileUploadStepProps) {
  const [vendorCode, setVendorCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.json')) {
        setError('Please select a JSON file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.json')) {
        setError('Please drop a JSON file');
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !vendorCode.trim()) {
      setError('Please provide both vendor code and file');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Read file content
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Check if vendor has dedicated loader
      const selectedVendor = AVAILABLE_VENDORS.find(v => v.code === vendorCode);

      if (selectedVendor?.hasLoader) {
        // Vendor has dedicated loader - use vendor-update endpoint for smart diff
        const response = await fetch('/api/imports/vendor-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'preview',
            vendorCode,
            newData: jsonData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze vendor data');
        }

        const result = await response.json();

        // Pass to parent with vendor update info
        onFileAnalyzed({
          vendorCode: vendorCode.trim(),
          jsonData,
          shape: 'flat' as any, // Not used for dedicated loaders
          columns: [], // Not used for dedicated loaders
          vendorUpdate: result, // Include diff and summary
        });
      } else {
        // No dedicated loader - use generic analysis for mapping
        const response = await fetch('/api/imports/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze',
            jsonData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze file');
        }

        const { shape, columns } = await response.json();

        // Pass data to parent
        onFileAnalyzed({
          vendorCode: vendorCode.trim(),
          jsonData,
          shape,
          columns,
        });
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze file');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Vendor Data</h2>
        <p className="text-sm text-gray-600 mb-6">
          Upload a vendor-native JSON file. Supported formats: flat object keyed by SKU, or array of products.
        </p>
      </div>

      {/* Vendor Selection Dropdown */}
      <div>
        <label htmlFor="vendorCode" className="block text-sm font-medium text-gray-700 mb-2">
          Vendor *
        </label>
        <select
          id="vendorCode"
          value={vendorCode}
          onChange={(e) => setVendorCode(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">Select a vendor...</option>
          {AVAILABLE_VENDORS.map((vendor) => (
            <option key={vendor.code} value={vendor.code}>
              {vendor.name} {vendor.hasLoader && '(Has dedicated loader)'}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {vendorCode && AVAILABLE_VENDORS.find(v => v.code === vendorCode)?.hasLoader
            ? 'This vendor has a dedicated loader that will automatically parse finish options and create variants'
            : 'Select a vendor to import product data'}
        </p>
      </div>

      {/* File Upload Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          JSON File *
        </label>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <FileJson className="h-12 w-12 text-blue-500 mb-2" />
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-2"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-900">
                Drop JSON file here or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports flat object or array format
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleAnalyze}
          disabled={!file || !vendorCode.trim() || isAnalyzing}
          className="min-w-[120px]"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing...
            </>
          ) : (
            <>
              <FileJson className="h-4 w-4 mr-2" />
              Analyze File
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
