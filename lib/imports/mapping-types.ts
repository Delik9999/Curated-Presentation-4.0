// Vendor mapping types for flexible JSON ingestion

export type JSONShape = 'flat' | 'array';
export type TransformType = 'trim' | 'uppercase' | 'lowercase' | 'number' | 'strip_units' | 'remove_commas' | 'regex';

// Field mapping configuration
export interface FieldMapping {
  type: 'flat_key' | 'column';
  column?: string; // If type='column', which column name
  defaultValue?: any;
  required?: boolean;
  transforms?: Transform[];
}

export interface PriceMapping extends FieldMapping {
  tier: string; // MSRP, Dealer, etc.
  currency: string;
}

export interface StatusMapping extends FieldMapping {
  enumMap?: Record<string, 'active' | 'discontinued' | 'archived'>;
}

export interface SpecMapping {
  column: string;
  as: string; // Canonical key name
  transforms?: Transform[];
}

export interface Transform {
  type: TransformType;
  pattern?: string; // For regex
  replacement?: string; // For regex
  enumMap?: Record<string, string>; // For enum mapping
}

// Complete vendor mapping configuration
export interface VendorMapping {
  id: string;
  vendorCode: string;
  displayName: string; // User-friendly name like "Lib&Co June 2025"
  version: number;
  createdAt: string;
  updatedAt: string;

  // Shape detection
  shape?: JSONShape; // If not provided, auto-detect

  // Core field mappings
  sku: FieldMapping;
  name: FieldMapping;
  collection: FieldMapping;
  status?: StatusMapping;

  // Price mappings (can have multiple tiers)
  prices: PriceMapping[];

  // Spec mappings (freeform)
  specs: SpecMapping[];
}

// Normalized product row (after mapping applied)
export interface NormalizedProduct {
  productId: string; // vendor:sku
  vendorCode: string;
  sku: string;
  name: string;
  collectionCode?: string;
  collectionName?: string;
  status: 'active' | 'discontinued' | 'archived';
  prices: NormalizedPrice[];
  specs: Record<string, any>;
}

export interface NormalizedPrice {
  tier: string;
  currency: string;
  amount: number;
}

// Auto-detected column info
export interface DetectedColumn {
  name: string;
  sampleValues: any[];
  type: 'string' | 'number' | 'boolean' | 'unknown';
  uniqueCount: number;
  nullCount: number;
}

// Mapping suggestions (AI/heuristic)
export interface MappingSuggestion {
  vendorColumn: string;
  canonicalField: 'sku' | 'name' | 'collection' | 'price' | 'status' | 'spec';
  confidence: number; // 0-1
  reason: string;
  suggestedTransforms?: Transform[];
}
