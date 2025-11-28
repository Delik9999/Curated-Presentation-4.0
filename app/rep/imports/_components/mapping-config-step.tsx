'use client';

// Step 2: Configure Field Mapping (Simplified placeholder)

import React, { useState } from 'react';
import { Button } from '@/components/ui/button-modern';
import type { VendorMapping, DetectedColumn, JSONShape } from '@/lib/imports/mapping-types';

interface MappingConfigStepProps {
  vendorCode: string;
  shape: JSONShape;
  columns: DetectedColumn[];
  jsonData: any;
  onMappingConfigured: (mapping: VendorMapping) => void;
  onBack: () => void;
}

export default function MappingConfigStep({
  vendorCode,
  shape,
  columns,
  jsonData,
  onMappingConfigured,
  onBack,
}: MappingConfigStepProps) {
  const [skuColumn, setSkuColumn] = useState('');
  const [nameColumn, setNameColumn] = useState('');
  const [collectionColumn, setCollectionColumn] = useState('');
  const [priceColumn, setPriceColumn] = useState('');

  const handleContinue = () => {
    // Create basic mapping
    const mapping: VendorMapping = {
      id: '',
      vendorCode,
      name: `${vendorCode} mapping`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shape,
      sku: {
        type: shape === 'flat' ? 'flat_key' : 'column',
        column: shape === 'array' ? skuColumn : undefined,
      },
      name: {
        type: 'column',
        column: nameColumn,
      },
      collection: {
        type: 'column',
        column: collectionColumn,
      },
      prices: [
        {
          type: 'column',
          column: priceColumn,
          tier: 'MSRP',
          currency: 'USD',
        },
      ],
      specs: [],
    };

    onMappingConfigured(mapping);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Configure Field Mapping</h2>
        <p className="text-sm text-gray-600">
          Map vendor columns to canonical fields. Detected {columns.length} columns from {shape} format.
        </p>
      </div>

      <div className="space-y-4">
        {shape === 'array' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SKU Column *</label>
            <select
              value={skuColumn}
              onChange={(e) => setSkuColumn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select column...</option>
              {columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.type})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name Column *</label>
          <select
            value={nameColumn}
            onChange={(e) => setNameColumn(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select column...</option>
            {columns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Collection Column *</label>
          <select
            value={collectionColumn}
            onChange={(e) => setCollectionColumn(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select column...</option>
            {columns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price Column *</label>
          <select
            value={priceColumn}
            onChange={(e) => setPriceColumn(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select column...</option>
            {columns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!nameColumn || !collectionColumn || !priceColumn || (shape === 'array' && !skuColumn)}
        >
          Continue to Preview
        </Button>
      </div>
    </div>
  );
}
