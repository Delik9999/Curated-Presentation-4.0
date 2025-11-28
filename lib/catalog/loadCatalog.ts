import { promises as fs } from 'fs';
import path from 'path';
import { loadSavoyHouseCatalog } from './loadSavoy';
import { loadHubbardtonForgeCatalog } from './loadHubbardton';

export type ConfiguratorOption = {
  optionName: string; // e.g., "Finish", "Accent Finish"
  optionType: 'finish' | 'accent-finish' | 'glass' | 'canopy' | 'other';
  values: string[]; // e.g., ["Black", "Bronze", "Dark Smoke", ...]
  required: boolean; // Is this option required?
};

export type SkuVariant = {
  sku: string; // Full SKU code
  optionCombination: Record<string, string>; // e.g., { "Finish": "Bronze", "Accent Finish": "White" }
  price?: number; // Price override if different from base
  imageUrl?: string; // Image URL for this specific variant
};

export type CatalogItem = {
  sku: string;
  name: string;
  list: number;
  image?: string | null;
  collectionName?: string;
  year?: number;
  vendor?: string; // Vendor identifier (e.g., "lib-and-co", "savoy-house")

  // Existing single-option variant fields
  finish?: string; // Selected finish option
  baseItemCode?: string; // Base SKU for grouping variants

  // NEW: Multi-option configurator fields
  isConfigurable?: boolean; // Flag for configurable products
  configuratorOptions?: ConfiguratorOption[]; // Available option sets
  skuVariants?: SkuVariant[]; // All possible SKU combinations
  shadeInfo?: string; // Shade/glass description
  defaultVariantSku?: string; // SKU of the variant whose image is displayed (for configurator default)
};

type LibSpecRecord = {
  'Item Number': string;
  'Product Description': string;
  ' CAD WSP ': string;
  'Collection name': string;
  'Year': string;
  [key: string]: unknown;
};

let catalogCache: CatalogItem[] | null = null;

function parsePrice(priceStr: string): number {
  // Remove $, commas, and spaces, then parse
  const cleaned = priceStr.replace(/[\$,\s]/g, '');
  return Number.parseFloat(cleaned);
}

async function readCatalogFile(): Promise<CatalogItem[]> {
  const filePath = path.join(process.cwd(), 'data', 'LibSpecs.json');

  try {
    const file = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(file) as Record<string, {
      'Item Number': string;
      'Year': string;
      'Collection name': string;
      'Product Description': string;
      ' CAD WSP ': string;
      'CAD MAP': string;
      [key: string]: unknown;
    }>;

    // Convert object format to array and map to CatalogItem
    return Object.values(data).map((item) => ({
      sku: item['Item Number'],
      name: item['Product Description'],
      list: parsePrice(item[' CAD WSP '] || '0'), // Use dealer cost (WSP), not retail (MAP)
      image: null, // Will be populated from image service
      vendor: 'lib-and-co',
      collectionName: item['Collection name'] || item['Product Description'].split(',')[0]?.trim() || undefined,
      year: parseInt(item['Year'], 10) || undefined,
    }));
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Failed to parse LibSpecs.json: ${error.message}`);
      console.error('This usually means the JSON file has a syntax error.');
      console.error('Try validating the file with a JSON validator.');
    }
    throw new Error(`Failed to load catalog: ${(error as Error).message}`);
  }
}

export async function loadCatalog(vendorFilter?: string): Promise<CatalogItem[]> {
  if (!catalogCache) {
    // Load catalogs from all vendors
    const [libAndCo, savoyHouse, hubbardtonForge] = await Promise.all([
      readCatalogFile(),
      loadSavoyHouseCatalog(),
      loadHubbardtonForgeCatalog(),
    ]);

    // Merge all catalogs
    catalogCache = [...libAndCo, ...savoyHouse, ...hubbardtonForge];
  }

  // Filter by vendor if specified
  if (vendorFilter) {
    return catalogCache.filter((item) => item.vendor === vendorFilter);
  }

  return catalogCache;
}

export async function findItem(sku: string): Promise<CatalogItem | null> {
  const catalog = await loadCatalog();
  const match = catalog.find((item) => item.sku.toLowerCase() === sku.toLowerCase());
  return match ?? null;
}

export function resetCatalogCache() {
  catalogCache = null;
}
