// Commit logic for product imports with upsert rules

import { NormalizedProduct } from './mapping-types';
import { ImportPreview, ProductDiff, SafetyToggles } from './diff-generator';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface CommitOptions {
  vendorCode: string;
  effectiveFrom: string;
  safetyToggles: SafetyToggles;
  importedBy: string; // Username/email of person performing import
  notes?: string; // Optional notes about this import
}

export interface CommitResult {
  success: boolean;
  importId: string;
  timestamp: string;
  summary: {
    productsAdded: number;
    productsUpdated: number;
    pricesUpdated: number;
    productsDiscontinued: number;
    errors: number;
  };
  errors: Array<{ productId: string; error: string }>;
}

export interface ImportAuditRecord {
  id: string;
  vendorCode: string;
  timestamp: string;
  importedBy: string;
  effectiveFrom: string;
  notes?: string;
  safetyToggles: SafetyToggles;
  summary: CommitResult['summary'];
  changes: {
    added: string[]; // Product IDs
    updated: string[]; // Product IDs
    pricesChanged: string[]; // Product IDs
    discontinued: string[]; // Product IDs
  };
}

export async function commitImport(
  preview: ImportPreview,
  options: CommitOptions
): Promise<CommitResult> {
  const { vendorCode, effectiveFrom, safetyToggles, importedBy, notes } = options;

  const importId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const errors: Array<{ productId: string; error: string }> = [];
  let productsAdded = 0;
  let productsUpdated = 0;
  let pricesUpdated = 0;
  let productsDiscontinued = 0;

  // Load existing products
  const productsPath = path.join(process.cwd(), 'data/imports/products.json');
  let allProducts: NormalizedProduct[] = [];

  try {
    if (fs.existsSync(productsPath)) {
      const content = fs.readFileSync(productsPath, 'utf-8');
      allProducts = JSON.parse(content);
    }
  } catch (error) {
    return {
      success: false,
      importId,
      timestamp,
      summary: { productsAdded: 0, productsUpdated: 0, pricesUpdated: 0, productsDiscontinued: 0, errors: 1 },
      errors: [{ productId: 'system', error: 'Failed to load existing products: ' + error }],
    };
  }

  const productMap = new Map(allProducts.map((p) => [p.productId, p]));

  // Process adds
  for (const diff of preview.adds) {
    try {
      if (diff.incoming) {
        let product = diff.incoming;

        // Tag as introduction if toggle is enabled
        if (safetyToggles.tagNewAsIntroductions) {
          product = {
            ...product,
            specs: {
              ...product.specs,
              introduction: true,
              introductionDate: effectiveFrom,
            },
          };
        }

        productMap.set(product.productId, product);
        productsAdded++;
      }
    } catch (error) {
      errors.push({
        productId: diff.productId,
        error: `Failed to add product: ${error}`,
      });
    }
  }

  // Process updates
  for (const diff of preview.updates) {
    try {
      if (diff.incoming && diff.existing) {
        const updated = applyUpsert(diff.existing, diff.incoming, diff.changes || [], safetyToggles);
        productMap.set(updated.productId, updated);
        productsUpdated++;
      }
    } catch (error) {
      errors.push({
        productId: diff.productId,
        error: `Failed to update product: ${error}`,
      });
    }
  }

  // Process price changes
  for (const diff of preview.priceChanges) {
    try {
      if (diff.incoming && diff.existing && diff.priceChanges) {
        const updated = applyPriceChanges(diff.existing, diff.incoming, diff.priceChanges, effectiveFrom);
        productMap.set(updated.productId, updated);
        pricesUpdated++;
      }
    } catch (error) {
      errors.push({
        productId: diff.productId,
        error: `Failed to update prices: ${error}`,
      });
    }
  }

  // Process discontinuations
  if (safetyToggles.markMissingAsDiscontinued) {
    for (const diff of preview.discontinuations) {
      try {
        if (diff.existing) {
          const discontinued = {
            ...diff.existing,
            status: 'discontinued' as const,
            specs: {
              ...diff.existing.specs,
              discontinuedDate: effectiveFrom,
            },
          };
          productMap.set(discontinued.productId, discontinued);
          productsDiscontinued++;
        }
      } catch (error) {
        errors.push({
          productId: diff.productId,
          error: `Failed to discontinue product: ${error}`,
        });
      }
    }
  }

  // Write updated products back to file
  try {
    const updatedProducts = Array.from(productMap.values());
    fs.writeFileSync(productsPath, JSON.stringify(updatedProducts, null, 2), 'utf-8');
  } catch (error) {
    return {
      success: false,
      importId,
      timestamp,
      summary: { productsAdded, productsUpdated, pricesUpdated, productsDiscontinued, errors: errors.length + 1 },
      errors: [...errors, { productId: 'system', error: 'Failed to write products file: ' + error }],
    };
  }

  // Write audit record
  const auditRecord: ImportAuditRecord = {
    id: importId,
    vendorCode,
    timestamp,
    importedBy,
    effectiveFrom,
    notes,
    safetyToggles,
    summary: {
      productsAdded,
      productsUpdated,
      pricesUpdated,
      productsDiscontinued,
      errors: errors.length,
    },
    changes: {
      added: preview.adds.map((d) => d.productId),
      updated: preview.updates.map((d) => d.productId),
      pricesChanged: preview.priceChanges.map((d) => d.productId),
      discontinued: preview.discontinuations.map((d) => d.productId),
    },
  };

  await writeAuditRecord(auditRecord);

  return {
    success: errors.length === 0,
    importId,
    timestamp,
    summary: {
      productsAdded,
      productsUpdated,
      pricesUpdated,
      productsDiscontinued,
      errors: errors.length,
    },
    errors,
  };
}

function applyUpsert(
  existing: NormalizedProduct,
  incoming: NormalizedProduct,
  changes: Array<{ field: string; oldValue: any; newValue: any }>,
  toggles: SafetyToggles
): NormalizedProduct {
  // Start with existing product
  let updated = { ...existing };

  // Apply changes based on safety toggles
  for (const change of changes) {
    const { field, newValue } = change;

    // Skip collection changes if toggle is enabled
    if (toggles.dontChangeCollections && (field === 'collectionCode' || field === 'collectionName')) {
      continue;
    }

    // Skip non-spec changes if specsOnly is enabled
    if (toggles.specsOnly && !field.startsWith('specs.')) {
      continue;
    }

    // Skip non-price changes if pricesOnly is enabled
    if (toggles.pricesOnly && !field.startsWith('price')) {
      continue;
    }

    // Apply the change
    if (field.startsWith('specs.')) {
      const specKey = field.replace('specs.', '');
      updated = {
        ...updated,
        specs: {
          ...updated.specs,
          [specKey]: newValue,
        },
      };
    } else if (field === 'name') {
      updated.name = newValue;
    } else if (field === 'collectionCode') {
      updated.collectionCode = newValue;
    } else if (field === 'collectionName') {
      updated.collectionName = newValue;
    } else if (field === 'status') {
      updated.status = newValue;
    }
  }

  return updated;
}

function applyPriceChanges(
  existing: NormalizedProduct,
  incoming: NormalizedProduct,
  priceChanges: Array<{ tier: string; currency: string; oldAmount?: number; newAmount: number }>,
  effectiveFrom: string
): NormalizedProduct {
  // Create a map of existing prices
  const priceMap = new Map(
    existing.prices.map((p) => [`${p.tier}:${p.currency}`, p])
  );

  // Apply price changes
  for (const change of priceChanges) {
    const key = `${change.tier}:${change.currency}`;
    priceMap.set(key, {
      tier: change.tier,
      currency: change.currency,
      amount: change.newAmount,
    });
  }

  // Update product with new prices
  return {
    ...existing,
    prices: Array.from(priceMap.values()),
    specs: {
      ...existing.specs,
      lastPriceUpdate: effectiveFrom,
    },
  };
}

async function writeAuditRecord(record: ImportAuditRecord): Promise<void> {
  const auditDir = path.join(process.cwd(), 'data/imports/audit');
  const auditPath = path.join(auditDir, `${record.id}.json`);

  try {
    // Ensure audit directory exists
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    // Write audit record
    fs.writeFileSync(auditPath, JSON.stringify(record, null, 2), 'utf-8');

    // Also append to audit log
    const logPath = path.join(auditDir, 'import-log.jsonl');
    const logEntry = JSON.stringify({
      id: record.id,
      vendorCode: record.vendorCode,
      timestamp: record.timestamp,
      importedBy: record.importedBy,
      summary: record.summary,
    }) + '\n';

    fs.appendFileSync(logPath, logEntry, 'utf-8');
  } catch (error) {
    console.error('Failed to write audit record:', error);
    // Don't fail the import if audit fails
  }
}

// Utility to load audit records
export function loadAuditRecords(vendorCode?: string, limit = 100): ImportAuditRecord[] {
  const auditDir = path.join(process.cwd(), 'data/imports/audit');

  try {
    if (!fs.existsSync(auditDir)) {
      return [];
    }

    const files = fs.readdirSync(auditDir)
      .filter((f) => f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)) // Most recent first
      .slice(0, limit);

    const records: ImportAuditRecord[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(auditDir, file), 'utf-8');
      const record: ImportAuditRecord = JSON.parse(content);

      if (!vendorCode || record.vendorCode === vendorCode) {
        records.push(record);
      }
    }

    return records;
  } catch (error) {
    console.error('Failed to load audit records:', error);
    return [];
  }
}
