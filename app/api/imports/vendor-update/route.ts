import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { loadCatalog, resetCatalogCache } from '@/lib/catalog/loadCatalog';

// Vendor configuration mapping
const VENDOR_CONFIG = {
  'lib-and-co': {
    fileName: 'LibSpecs.json',
    loaderName: 'Lib & Co',
  },
  'savoy-house': {
    fileName: 'savoyspecs.json',
    loaderName: 'Savoy House',
  },
  'hubbardton-forge': {
    fileName: 'hubbardtonspecs.json',
    loaderName: 'Hubbardton Forge',
  },
} as const;

type VendorCode = keyof typeof VENDOR_CONFIG;

interface UpdateDiff {
  newProducts: Array<{ sku: string; name: string; price: number }>;
  priceChanges: Array<{ sku: string; name: string; oldPrice: number; newPrice: number }>;
  newFinishes: Array<{ baseSku: string; name: string; newFinish: string }>;
  specChanges: Array<{ sku: string; name: string; changes: Record<string, { old: any; new: any }> }>;
  unchanged: number;
}

/**
 * POST /api/imports/vendor-update
 *
 * Actions:
 * - preview: Load new data and compare with existing to generate diff
 * - commit: Overwrite the existing vendor file with new data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorCode, newData } = body;

    if (!vendorCode || !(vendorCode in VENDOR_CONFIG)) {
      return NextResponse.json(
        { error: 'Invalid vendor code' },
        { status: 400 }
      );
    }

    const vendor = VENDOR_CONFIG[vendorCode as VendorCode];
    const filePath = path.join(process.cwd(), 'data', vendor.fileName);

    if (action === 'preview') {
      // Load current catalog for this vendor
      const currentCatalog = await loadCatalog(vendorCode);

      // Parse new data and convert to same format as loader would
      const newItems = await parseVendorData(vendorCode as VendorCode, newData);

      // Generate diff
      const diff = generateDiff(currentCatalog, newItems);

      return NextResponse.json({
        success: true,
        diff,
        summary: {
          newProducts: diff.newProducts.length,
          priceChanges: diff.priceChanges.length,
          newFinishes: diff.newFinishes.length,
          specChanges: diff.specChanges.length,
          unchanged: diff.unchanged,
        }
      });
    }

    if (action === 'commit') {
      // Backup existing file
      const backupPath = path.join(
        process.cwd(),
        'data',
        'backups',
        `${vendor.fileName}.${Date.now()}.backup`
      );

      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Create backup
      try {
        const existingData = await fs.readFile(filePath, 'utf-8');
        await fs.writeFile(backupPath, existingData, 'utf-8');
      } catch (error) {
        console.warn('Could not create backup (file may not exist yet):', error);
      }

      // Write new data
      await fs.writeFile(
        filePath,
        JSON.stringify(newData, null, 2),
        'utf-8'
      );

      // Reset catalog cache to force reload
      resetCatalogCache();

      return NextResponse.json({
        success: true,
        message: `${vendor.loaderName} data updated successfully`,
        backupPath,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "preview" or "commit".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Vendor update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

/**
 * Parse vendor data using the same logic as the dedicated loaders
 */
async function parseVendorData(vendorCode: VendorCode, rawData: any) {
  // This is a simplified version - in reality, we'd import and use the actual loaders
  // For now, we'll use a basic parser that matches the loader structure

  const items: Array<{ sku: string; name: string; list: number; collectionName?: string; finish?: string; baseItemCode?: string; specs?: Record<string, any> }> = [];

  if (vendorCode === 'hubbardton-forge') {
    // Parse Hubbardton Forge format
    for (const [sku, record] of Object.entries(rawData)) {
      const data = record as any;
      const baseSku = data['Item SKU'] || sku;
      const baseName = data['Product Name'] || '';
      const list = parsePrice(data['WSP'] || '0');
      const collectionName = data['Theme']?.trim();
      const finishStr = data['Finish']?.trim();

      if (!collectionName) continue;

      if (finishStr && finishStr.length > 0) {
        const finishes = finishStr.split(',').map((f: string) => f.trim()).filter(Boolean);
        for (const finish of finishes) {
          items.push({
            sku: `${baseSku}-${finish.replace(/\s+/g, '-')}`,
            name: `${baseName} - ${finish}`,
            list,
            collectionName,
            finish,
            baseItemCode: baseSku,
            specs: extractSpecs(data),
          });
        }
      } else {
        items.push({
          sku: baseSku,
          name: baseName,
          list,
          collectionName,
          specs: extractSpecs(data),
        });
      }
    }
  } else if (vendorCode === 'savoy-house') {
    // Parse Savoy House format (simplified)
    for (const [sku, record] of Object.entries(rawData)) {
      const data = record as any;
      items.push({
        sku: data['Item Number'] || sku,
        name: data['Product Name'] || '',
        list: parsePrice(data['List Price'] || '0'),
        collectionName: data['Theme']?.trim(),
        specs: extractSpecs(data),
      });
    }
  } else if (vendorCode === 'lib-and-co') {
    // Parse Lib & Co format
    for (const [sku, record] of Object.entries(rawData)) {
      const data = record as any;
      items.push({
        sku: data['Item Number'] || sku,
        name: data['Product Description'] || '',
        list: parsePrice(data[' CAD WSP '] || '0'),
        collectionName: data['Collection name']?.trim(),
        specs: extractSpecs(data),
      });
    }
  }

  return items;
}

function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[\$,\s]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function extractSpecs(record: any): Record<string, any> {
  const specs: Record<string, any> = {};
  const specFields = ['Width', 'Height', 'Depth', 'Diameter', 'Weight', 'Lumens', 'Wattage', 'Voltage', 'Lamp Type'];

  for (const field of specFields) {
    if (record[field]) {
      specs[field] = record[field];
    }
  }

  return specs;
}

/**
 * Generate diff between current and new catalog
 */
function generateDiff(
  current: Array<{ sku: string; name: string; list: number; finish?: string; baseItemCode?: string }>,
  incoming: Array<{ sku: string; name: string; list: number; finish?: string; baseItemCode?: string; specs?: Record<string, any> }>
): UpdateDiff {
  const currentMap = new Map(current.map(item => [item.sku, item]));
  const incomingMap = new Map(incoming.map(item => [item.sku, item]));

  const diff: UpdateDiff = {
    newProducts: [],
    priceChanges: [],
    newFinishes: [],
    specChanges: [],
    unchanged: 0,
  };

  // Find new products and price changes
  for (const newItem of incoming) {
    const existing = currentMap.get(newItem.sku);

    if (!existing) {
      // New product
      diff.newProducts.push({
        sku: newItem.sku,
        name: newItem.name,
        price: newItem.list,
      });

      // Check if this is a new finish for an existing base product
      if (newItem.baseItemCode && newItem.finish) {
        const hasOtherFinishes = current.some(
          item => item.baseItemCode === newItem.baseItemCode && item.sku !== newItem.sku
        );
        if (hasOtherFinishes) {
          diff.newFinishes.push({
            baseSku: newItem.baseItemCode,
            name: newItem.name.split(' - ')[0], // Remove finish suffix
            newFinish: newItem.finish,
          });
        }
      }
    } else {
      // Existing product - check for changes
      if (Math.abs(existing.list - newItem.list) > 0.01) {
        diff.priceChanges.push({
          sku: newItem.sku,
          name: newItem.name,
          oldPrice: existing.list,
          newPrice: newItem.list,
        });
      } else {
        diff.unchanged++;
      }

      // TODO: Check for spec changes
    }
  }

  return diff;
}
