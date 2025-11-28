// Normalizes vendor data using mapping configuration

import { VendorMapping, NormalizedProduct, FieldMapping, PriceMapping, SpecMapping } from './mapping-types';
import { applyTransforms, normalizeStatus, slugify } from './transforms';
import { detectJSONShape, extractRows } from './shape-detector';

export interface NormalizerOptions {
  vendorCode: string;
  mapping: VendorMapping;
  effectiveFrom?: string;
  introductionsTag?: string;
}

export function normalizeVendorData(
  jsonData: any,
  options: NormalizerOptions
): NormalizedProduct[] {
  const { vendorCode, mapping, effectiveFrom, introductionsTag } = options;

  // Detect shape if not specified in mapping
  const shape = mapping.shape || detectJSONShape(jsonData);

  // Extract rows
  const rawRows = extractRows(jsonData, shape);

  // Normalize each row
  const normalized: NormalizedProduct[] = [];

  for (const { sku: flatSku, row } of rawRows) {
    try {
      const product = normalizeRow(row, {
        vendorCode,
        mapping,
        flatSku,
        effectiveFrom,
        introductionsTag,
      });

      if (product) {
        normalized.push(product);
      }
    } catch (error) {
      console.error(`Failed to normalize row:`, error, row);
      // Continue with other rows
    }
  }

  return normalized;
}

interface RowNormalizerOptions {
  vendorCode: string;
  mapping: VendorMapping;
  flatSku?: string; // If flat shape, SKU comes from object key
  effectiveFrom?: string;
  introductionsTag?: string;
}

function normalizeRow(
  row: any,
  options: RowNormalizerOptions
): NormalizedProduct | null {
  const { vendorCode, mapping, flatSku, effectiveFrom, introductionsTag } = options;

  // Extract SKU
  const sku = flatSku || extractField(row, mapping.sku);
  if (!sku) {
    console.warn('Skipping row without SKU:', row);
    return null;
  }

  // Generate product ID
  const productId = `${vendorCode}:${sku}`;

  // Extract name
  const name = extractField(row, mapping.name);
  if (!name) {
    console.warn(`Skipping row ${sku} without name:`, row);
    return null;
  }

  // Extract collection
  const collectionName = extractField(row, mapping.collection);
  const collectionCode = collectionName ? slugify(collectionName) : undefined;

  // Extract status
  let status: 'active' | 'discontinued' | 'archived' = 'active';
  if (mapping.status) {
    const rawStatus = extractField(row, mapping.status);
    if (rawStatus) {
      // Apply enum mapping if configured
      if (mapping.status.enumMap && mapping.status.enumMap[String(rawStatus)]) {
        status = mapping.status.enumMap[String(rawStatus)];
      } else {
        status = normalizeStatus(rawStatus);
      }
    }
  }

  // Extract prices
  const prices = mapping.prices.map((priceMapping) => {
    const amount = extractField(row, priceMapping);
    return {
      tier: priceMapping.tier,
      currency: priceMapping.currency,
      amount: typeof amount === 'number' ? amount : 0,
    };
  }).filter((p) => p.amount > 0);

  // Extract specs
  const specs: Record<string, any> = {};
  for (const specMapping of mapping.specs) {
    const value = extractSpecField(row, specMapping);
    if (value !== null && value !== undefined) {
      specs[specMapping.as] = value;
    }
  }

  return {
    productId,
    vendorCode,
    sku,
    name,
    collectionCode,
    collectionName,
    status,
    prices,
    specs,
  };
}

function extractField(row: any, mapping: FieldMapping): any {
  let value: any;

  if (mapping.type === 'flat_key') {
    // Not applicable for regular fields
    return mapping.defaultValue;
  } else if (mapping.type === 'column') {
    if (!mapping.column) {
      return mapping.defaultValue;
    }
    value = row[mapping.column];
  }

  // If value is null/undefined and we have a default, use it
  if ((value === null || value === undefined) && mapping.defaultValue !== undefined) {
    value = mapping.defaultValue;
  }

  // Apply transforms if configured
  if (mapping.transforms && value !== null && value !== undefined) {
    value = applyTransforms(value, mapping.transforms);
  }

  return value;
}

function extractSpecField(row: any, mapping: SpecMapping): any {
  let value = row[mapping.column];

  if (value === null || value === undefined) {
    return null;
  }

  // Apply transforms if configured
  if (mapping.transforms) {
    value = applyTransforms(value, mapping.transforms);
  }

  return value;
}

// Validation helpers
export function validateMapping(mapping: VendorMapping): string[] {
  const errors: string[] = [];

  // Validate SKU mapping
  if (!mapping.sku) {
    errors.push('SKU mapping is required');
  } else if (mapping.sku.type === 'column' && !mapping.sku.column) {
    errors.push('SKU column name is required when type is "column"');
  }

  // Validate name mapping
  if (!mapping.name || (mapping.name.type === 'column' && !mapping.name.column)) {
    errors.push('Name mapping with column is required');
  }

  // Validate collection mapping
  if (!mapping.collection || (mapping.collection.type === 'column' && !mapping.collection.column)) {
    errors.push('Collection mapping with column is required');
  }

  // Validate price mappings
  if (!mapping.prices || mapping.prices.length === 0) {
    errors.push('At least one price mapping is required');
  } else {
    mapping.prices.forEach((priceMapping, idx) => {
      if (!priceMapping.tier) {
        errors.push(`Price mapping ${idx + 1}: tier is required`);
      }
      if (!priceMapping.currency) {
        errors.push(`Price mapping ${idx + 1}: currency is required`);
      }
      if (priceMapping.type === 'column' && !priceMapping.column) {
        errors.push(`Price mapping ${idx + 1}: column is required`);
      }
    });
  }

  return errors;
}

export function testMapping(
  jsonData: any,
  mapping: VendorMapping,
  vendorCode: string,
  maxRows: number = 10
): { success: boolean; samples: NormalizedProduct[]; errors: string[] } {
  const errors = validateMapping(mapping);

  if (errors.length > 0) {
    return { success: false, samples: [], errors };
  }

  try {
    const normalized = normalizeVendorData(jsonData, { vendorCode, mapping });
    const samples = normalized.slice(0, maxRows);

    return {
      success: true,
      samples,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      samples: [],
      errors: [error instanceof Error ? error.message : 'Unknown error during normalization'],
    };
  }
}
