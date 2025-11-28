import { promises as fs } from 'fs';
import path from 'path';
import type { CatalogItem } from './loadCatalog';

type SavoySpecRecord = {
  'Item SKU': string;
  'Product Name': string;
  'Theme': string;
  'MSRP': string;
  'IMAP Price': string;
  'Finish': string;
  'Item Image Assets'?: string;
  'Intro Date'?: string;
  [key: string]: unknown;
};

function parsePrice(priceStr: string): number {
  // Remove $, commas, and spaces, then parse
  const cleaned = priceStr.replace(/[\$,\s]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function extractYearFromIntroDate(introDate?: string): number | undefined {
  if (!introDate) return undefined;
  const yearMatch = introDate.match(/\d{4}/);
  return yearMatch ? Number.parseInt(yearMatch[0], 10) : undefined;
}

function generateSavoyImageUrl(sku: string): string {
  // Savoy House image URL pattern:
  // https://www.savoyhouse.com/media/catalog/product/cache/{hash}/{first-char}/-/{sku}.jpg
  const firstChar = sku.charAt(0);
  return `https://www.savoyhouse.com/media/catalog/product/cache/71c6b310cc89ac67210d11c3e3a5370a/${firstChar}/-/${sku}.jpg`;
}

export async function loadSavoyHouseCatalog(): Promise<CatalogItem[]> {
  const filePath = path.join(process.cwd(), 'data', 'savoyspecs.json');
  console.log('[Savoy] loadSavoyHouseCatalog() called');

  try {
    const file = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(file) as Record<string, SavoySpecRecord>;
    console.log(`[Savoy] Loaded data file, processing ${Object.keys(data).length} SKUs`);

    const result = Object.entries(data)
      .map(([sku, record]) => {
        const itemSku = record['Item SKU'] || sku;
        return {
          sku: itemSku,
          name: record['Product Name'] || '',
          list: parsePrice(record['IMAP Price'] || record['MSRP'] || '0'), // Use IMAP Price (dealer price) as list
          image: generateSavoyImageUrl(itemSku),
          collectionName: record['Theme']?.trim() || undefined,
          year: extractYearFromIntroDate(record['Intro Date']),
          vendor: 'savoy-house',
        };
      })
      .filter((item) => item.collectionName); // Only include products with a valid theme/collection

    console.log(`[Savoy] Returning ${result.length} products with valid collections`);
    return result;
  } catch (error) {
    console.error(`[Savoy] Failed to load Savoy House catalog: ${(error as Error).message}`);
    return []; // Return empty array instead of throwing to allow graceful degradation
  }
}
