// Preview/diff generation for product imports

import { NormalizedProduct, NormalizedPrice } from './mapping-types';
import fs from 'fs';
import path from 'path';

export interface ProductDiff {
  productId: string;
  type: 'add' | 'update' | 'price_change' | 'discontinue';
  incoming?: NormalizedProduct;
  existing?: NormalizedProduct;
  changes?: FieldChange[];
  priceChanges?: PriceChange[];
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface PriceChange {
  tier: string;
  currency: string;
  oldAmount?: number;
  newAmount: number;
  changePercent?: number;
}

export interface ImportPreview {
  vendorCode: string;
  effectiveFrom: string;
  totalIncoming: number;
  totalExisting: number;
  adds: ProductDiff[];
  updates: ProductDiff[];
  priceChanges: ProductDiff[];
  discontinuations: ProductDiff[];
  summary: {
    newProducts: number;
    updatedProducts: number;
    priceOnlyChanges: number;
    toDiscontinue: number;
    unchanged: number;
  };
}

export interface DiffOptions {
  vendorCode: string;
  effectiveFrom?: string;
  markMissingAsDiscontinued?: boolean;
  ignoreFields?: string[]; // Fields to ignore when detecting changes
}

export function generateImportPreview(
  incomingProducts: NormalizedProduct[],
  options: DiffOptions
): ImportPreview {
  const { vendorCode, effectiveFrom = new Date().toISOString(), markMissingAsDiscontinued = false } = options;

  // Load existing products
  const existingProducts = loadExistingProducts(vendorCode);
  const existingMap = new Map(existingProducts.map((p) => [p.productId, p]));
  const incomingMap = new Map(incomingProducts.map((p) => [p.productId, p]));

  const adds: ProductDiff[] = [];
  const updates: ProductDiff[] = [];
  const priceChanges: ProductDiff[] = [];
  const discontinuations: ProductDiff[] = [];

  // Process incoming products
  for (const incoming of incomingProducts) {
    const existing = existingMap.get(incoming.productId);

    if (!existing) {
      // New product
      adds.push({
        productId: incoming.productId,
        type: 'add',
        incoming,
      });
    } else {
      // Existing product - check for changes
      const diff = compareProducts(incoming, existing, options);

      if (diff.changes && diff.changes.length > 0) {
        // Has field changes
        updates.push(diff);
      } else if (diff.priceChanges && diff.priceChanges.length > 0) {
        // Price changes only
        priceChanges.push(diff);
      }
      // If no changes at all, product is unchanged (not tracked)
    }
  }

  // Check for discontinuations (products in existing but not in incoming)
  if (markMissingAsDiscontinued) {
    for (const existing of existingProducts) {
      if (!incomingMap.has(existing.productId) && existing.status !== 'discontinued') {
        discontinuations.push({
          productId: existing.productId,
          type: 'discontinue',
          existing,
        });
      }
    }
  }

  // Calculate unchanged count
  const changedProductIds = new Set([
    ...adds.map((d) => d.productId),
    ...updates.map((d) => d.productId),
    ...priceChanges.map((d) => d.productId),
    ...discontinuations.map((d) => d.productId),
  ]);
  const unchanged = incomingProducts.length - (adds.length + updates.length + priceChanges.length);

  return {
    vendorCode,
    effectiveFrom,
    totalIncoming: incomingProducts.length,
    totalExisting: existingProducts.length,
    adds,
    updates,
    priceChanges,
    discontinuations,
    summary: {
      newProducts: adds.length,
      updatedProducts: updates.length,
      priceOnlyChanges: priceChanges.length,
      toDiscontinue: discontinuations.length,
      unchanged,
    },
  };
}

function compareProducts(
  incoming: NormalizedProduct,
  existing: NormalizedProduct,
  options: DiffOptions
): ProductDiff {
  const changes: FieldChange[] = [];
  const priceChanges: PriceChange[] = [];

  const ignoreFields = new Set(options.ignoreFields || []);

  // Compare core fields
  const coreFields: Array<keyof NormalizedProduct> = ['sku', 'name', 'collectionCode', 'collectionName', 'status'];

  for (const field of coreFields) {
    if (ignoreFields.has(field)) continue;

    const oldValue = existing[field];
    const newValue = incoming[field];

    if (oldValue !== newValue) {
      changes.push({ field, oldValue, newValue });
    }
  }

  // Compare specs (deep comparison)
  if (!ignoreFields.has('specs')) {
    const specChanges = compareSpecs(existing.specs, incoming.specs);
    changes.push(...specChanges);
  }

  // Compare prices
  if (!ignoreFields.has('prices')) {
    const existingPricesMap = new Map(
      existing.prices.map((p) => [`${p.tier}:${p.currency}`, p])
    );

    for (const incomingPrice of incoming.prices) {
      const key = `${incomingPrice.tier}:${incomingPrice.currency}`;
      const existingPrice = existingPricesMap.get(key);

      if (!existingPrice) {
        // New price tier
        priceChanges.push({
          tier: incomingPrice.tier,
          currency: incomingPrice.currency,
          newAmount: incomingPrice.amount,
        });
      } else if (existingPrice.amount !== incomingPrice.amount) {
        // Price change
        const changePercent = ((incomingPrice.amount - existingPrice.amount) / existingPrice.amount) * 100;
        priceChanges.push({
          tier: incomingPrice.tier,
          currency: incomingPrice.currency,
          oldAmount: existingPrice.amount,
          newAmount: incomingPrice.amount,
          changePercent: Math.round(changePercent * 100) / 100,
        });
      }
    }
  }

  return {
    productId: incoming.productId,
    type: changes.length > 0 ? 'update' : 'price_change',
    incoming,
    existing,
    changes: changes.length > 0 ? changes : undefined,
    priceChanges: priceChanges.length > 0 ? priceChanges : undefined,
  };
}

function compareSpecs(existingSpecs: Record<string, any>, incomingSpecs: Record<string, any>): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(existingSpecs), ...Object.keys(incomingSpecs)]);

  for (const key of allKeys) {
    const oldValue = existingSpecs[key];
    const newValue = incomingSpecs[key];

    // Deep equality check for complex values
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: `specs.${key}`,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
}

function loadExistingProducts(vendorCode: string): NormalizedProduct[] {
  const productsPath = path.join(process.cwd(), 'data/imports/products.json');

  try {
    if (!fs.existsSync(productsPath)) {
      return [];
    }

    const content = fs.readFileSync(productsPath, 'utf-8');
    const allProducts: NormalizedProduct[] = JSON.parse(content);

    // Filter by vendor
    return allProducts.filter((p) => p.vendorCode === vendorCode);
  } catch (error) {
    console.error('Failed to load existing products:', error);
    return [];
  }
}

// Apply safety toggles to preview
export interface SafetyToggles {
  pricesOnly?: boolean; // Only update prices, ignore other fields
  specsOnly?: boolean; // Only update specs, ignore other fields
  dontChangeCollections?: boolean; // Don't update collection assignments
  markMissingAsDiscontinued?: boolean; // Mark products not in import as discontinued
  tagNewAsIntroductions?: boolean; // Tag new products with introductions badge
}

export function applyFilters(
  preview: ImportPreview,
  toggles: SafetyToggles
): ImportPreview {
  const { pricesOnly, specsOnly, dontChangeCollections } = toggles;

  // If pricesOnly, remove all non-price changes from updates
  if (pricesOnly) {
    preview.updates = preview.updates.map((diff) => {
      if (diff.changes) {
        // Remove all changes except price
        const filteredChanges = diff.changes.filter((c) => c.field.startsWith('price'));
        return {
          ...diff,
          changes: filteredChanges.length > 0 ? filteredChanges : undefined,
          type: filteredChanges.length > 0 ? 'update' : 'price_change',
        };
      }
      return diff;
    });

    // Move updates with no changes to price_changes
    const stillHaveChanges: ProductDiff[] = [];
    const moveToPriceChanges: ProductDiff[] = [];

    for (const diff of preview.updates) {
      if (diff.changes && diff.changes.length > 0) {
        stillHaveChanges.push(diff);
      } else if (diff.priceChanges && diff.priceChanges.length > 0) {
        moveToPriceChanges.push({ ...diff, type: 'price_change' });
      }
    }

    preview.updates = stillHaveChanges;
    preview.priceChanges = [...preview.priceChanges, ...moveToPriceChanges];
  }

  // If specsOnly, remove all non-spec changes from updates
  if (specsOnly) {
    preview.updates = preview.updates.map((diff) => {
      if (diff.changes) {
        const filteredChanges = diff.changes.filter((c) => c.field.startsWith('specs.'));
        return {
          ...diff,
          changes: filteredChanges.length > 0 ? filteredChanges : undefined,
          type: filteredChanges.length > 0 ? 'update' : 'price_change',
        };
      }
      return diff;
    });

    // Remove price changes
    preview.priceChanges = [];
  }

  // If dontChangeCollections, remove collection changes
  if (dontChangeCollections) {
    preview.updates = preview.updates.map((diff) => {
      if (diff.changes) {
        const filteredChanges = diff.changes.filter(
          (c) => c.field !== 'collectionCode' && c.field !== 'collectionName'
        );
        return {
          ...diff,
          changes: filteredChanges.length > 0 ? filteredChanges : undefined,
        };
      }
      return diff;
    });
  }

  // Recalculate summary
  preview.summary = {
    newProducts: preview.adds.length,
    updatedProducts: preview.updates.filter((d) => d.changes && d.changes.length > 0).length,
    priceOnlyChanges: preview.priceChanges.length,
    toDiscontinue: preview.discontinuations.length,
    unchanged: preview.totalIncoming - (preview.adds.length + preview.updates.length + preview.priceChanges.length),
  };

  return preview;
}
