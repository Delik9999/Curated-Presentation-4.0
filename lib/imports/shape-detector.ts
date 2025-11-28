// JSON shape detection and column analysis

import { JSONShape, DetectedColumn } from './mapping-types';

export function detectJSONShape(data: any): JSONShape {
  if (Array.isArray(data)) {
    return 'array';
  }

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    // Check if it's a flat object keyed by SKU
    const values = Object.values(data);
    if (values.length > 0 && typeof values[0] === 'object') {
      return 'flat';
    }
  }

  throw new Error('Invalid JSON structure. Expected array of objects or flat object keyed by SKU.');
}

export function extractRows(data: any, shape: JSONShape): Array<{ sku?: string; row: any }> {
  if (shape === 'array') {
    return (data as any[]).map((row) => ({ row }));
  } else {
    // Flat shape - keys are SKUs
    return Object.entries(data).map(([sku, row]) => ({ sku, row }));
  }
}

export function analyzeColumns(rows: any[], maxSamples = 100): DetectedColumn[] {
  if (rows.length === 0) return [];

  const sampleRows = rows.slice(0, maxSamples);
  const columnNames = new Set<string>();

  // Collect all column names
  sampleRows.forEach((row) => {
    Object.keys(row).forEach((key) => columnNames.add(key));
  });

  // Analyze each column
  return Array.from(columnNames).map((name) => {
    const values = sampleRows.map((row) => row[name]).filter((v) => v !== null && v !== undefined);
    const uniqueValues = new Set(values);

    // Detect type
    let type: DetectedColumn['type'] = 'unknown';
    if (values.length > 0) {
      const firstValue = values[0];
      if (typeof firstValue === 'number') {
        type = 'number';
      } else if (typeof firstValue === 'boolean') {
        type = 'boolean';
      } else if (typeof firstValue === 'string') {
        type = 'string';
      }
    }

    return {
      name,
      sampleValues: values.slice(0, 5),
      type,
      uniqueCount: uniqueValues.size,
      nullCount: sampleRows.length - values.length,
    };
  });
}

export function suggestSKUColumn(columns: DetectedColumn[]): string | null {
  // Look for columns that might be SKU
  const candidates = columns.filter((col) => {
    const nameLower = col.name.toLowerCase();
    return (
      nameLower === 'sku' ||
      nameLower === 'item' ||
      nameLower === 'item_number' ||
      nameLower === 'itemnumber' ||
      nameLower === 'product_code' ||
      nameLower === 'productcode' ||
      nameLower === 'code'
    );
  });

  if (candidates.length > 0) {
    // Prefer exact match
    const exact = candidates.find((c) => c.name.toLowerCase() === 'sku');
    return exact ? exact.name : candidates[0].name;
  }

  // Look for columns with high uniqueness (likely identifier)
  const highUnique = columns.filter((col) => {
    const uniqueRatio = col.uniqueCount / (col.sampleValues.length || 1);
    return uniqueRatio > 0.9 && col.type === 'string';
  });

  return highUnique.length > 0 ? highUnique[0].name : null;
}

export function suggestNameColumn(columns: DetectedColumn[]): string | null {
  const candidates = columns.filter((col) => {
    const nameLower = col.name.toLowerCase();
    return (
      nameLower.includes('name') ||
      nameLower.includes('product') ||
      nameLower.includes('description') ||
      nameLower.includes('title')
    );
  });

  if (candidates.length > 0) {
    // Prefer "Product Name" or just "Name"
    const exact = candidates.find((c) =>
      c.name.toLowerCase() === 'product name' ||
      c.name.toLowerCase() === 'name'
    );
    return exact ? exact.name : candidates[0].name;
  }

  return null;
}

export function suggestCollectionColumn(columns: DetectedColumn[]): string | null {
  const candidates = columns.filter((col) => {
    const nameLower = col.name.toLowerCase();
    return (
      nameLower.includes('collection') ||
      nameLower.includes('series') ||
      nameLower.includes('family') ||
      nameLower.includes('group')
    );
  });

  return candidates.length > 0 ? candidates[0].name : null;
}

export function suggestPriceColumn(columns: DetectedColumn[]): string | null {
  const candidates = columns.filter((col) => {
    const nameLower = col.name.toLowerCase();
    return (
      col.type === 'number' && (
        nameLower.includes('price') ||
        nameLower.includes('msrp') ||
        nameLower.includes('cost') ||
        nameLower.includes('list')
      )
    );
  });

  if (candidates.length > 0) {
    // Prefer MSRP or List Price
    const preferred = candidates.find((c) =>
      c.name.toLowerCase().includes('msrp') ||
      c.name.toLowerCase().includes('list')
    );
    return preferred ? preferred.name : candidates[0].name;
  }

  return null;
}

export function suggestStatusColumn(columns: DetectedColumn[]): string | null {
  const candidates = columns.filter((col) => {
    const nameLower = col.name.toLowerCase();
    return (
      nameLower === 'status' ||
      nameLower === 'state' ||
      nameLower === 'active' ||
      nameLower.includes('discontinued')
    );
  });

  return candidates.length > 0 ? candidates[0].name : null;
}
