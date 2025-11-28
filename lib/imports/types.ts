/* eslint-disable @typescript-eslint/no-explicit-any */
// Import types for JSON-based product uploads

export type ImportStatus = 'staging' | 'committed' | 'failed';
export type ProductStatus = 'active' | 'discontinued' | 'archived';
export type ChangeType = 'add' | 'update' | 'price' | 'discontinue' | 'spec';

// Upload JSON schema
export interface ImportJSON {
  vendor_code: string;
  effective_from?: string; // ISO date
  currency?: string;
  introductions_tag?: string;
  collections: ImportCollection[];
}

export interface ImportCollection {
  collection_code: string;
  collection_name: string;
  products: ImportProduct[];
}

export interface ImportProduct {
  sku: string;
  name: string;
  status?: ProductStatus;
  price?: number;
  price_tier?: string;
  prices?: ProductPrice[];
  specs?: Record<string, any>;
}

export interface ProductPrice {
  tier: string;
  currency: string;
  amount: number;
}

// Import record
export interface Import {
  id: string;
  vendorCode: string;
  filename: string;
  effectiveFrom?: string;
  introductionsTag?: string;
  status: ImportStatus;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  committedAt?: string;
  errorMessage?: string;
  // Upload options
  options: ImportOptions;
  // Original JSON data
  data: ImportJSON;
}

export interface ImportOptions {
  pricesOnly: boolean;
  specsOnly: boolean;
  doNotChangeCollections: boolean;
  markMissingAsDiscontinued: boolean;
  tagNewAsIntroductions: boolean;
}

// Product record
export interface Product {
  productId: string; // vendor:sku
  vendorCode: string;
  collectionCode?: string;
  sku: string;
  name: string;
  status: ProductStatus;
  introductionsTag?: string;
  createdAt: string;
  updatedAt: string;
}

// Product price record
export interface ProductPriceRecord {
  id: string;
  productId: string;
  currency: string;
  tier: string;
  amount: number;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceImportId: string;
}

// Product spec record
export interface ProductSpecRecord {
  id: string;
  productId: string;
  key: string;
  value: string;
  sourceImportId: string;
  updatedAt: string;
}

// Import delta (audit trail)
export interface ImportDelta {
  id: string;
  importId: string;
  productId: string;
  changeType: ChangeType;
  fieldsChanged: Record<string, any>;
  createdAt: string;
}

// Preview/Diff response
export interface ImportPreview {
  importId: string;
  summary: {
    totalProducts: number;
    newProducts: number;
    updatedProducts: number;
    priceChanges: number;
    discontinuations: number;
    specChanges: number;
  };
  adds: ProductAdd[];
  updates: ProductUpdate[];
  priceChanges: PriceChange[];
  discontinuations: ProductDiscontinuation[];
}

export interface ProductAdd {
  productId: string;
  sku: string;
  name: string;
  collectionCode?: string;
  collectionName?: string;
  status: ProductStatus;
  price?: number;
  specs?: Record<string, any>;
  introductionsTag?: string;
}

export interface ProductUpdate {
  productId: string;
  sku: string;
  currentName: string;
  newName?: string;
  currentStatus: ProductStatus;
  newStatus?: ProductStatus;
  currentCollection?: string;
  newCollection?: string;
  changedSpecs?: SpecChange[];
}

export interface SpecChange {
  key: string;
  oldValue?: string;
  newValue: string;
}

export interface PriceChange {
  productId: string;
  sku: string;
  name: string;
  tier: string;
  currency: string;
  currentPrice?: number;
  newPrice: number;
  effectiveFrom: string;
  percentChange?: number;
}

export interface ProductDiscontinuation {
  productId: string;
  sku: string;
  name: string;
  currentStatus: ProductStatus;
  reason: string;
}

// Commit response
export interface ImportCommitResult {
  importId: string;
  success: boolean;
  summary: {
    productsAdded: number;
    productsUpdated: number;
    pricesChanged: number;
    specsChanged: number;
    productsDiscontinued: number;
  };
  errors?: string[];
}
