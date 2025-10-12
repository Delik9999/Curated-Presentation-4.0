import { promises as fs } from 'fs';
import path from 'path';

export type CatalogItem = {
  sku: string;
  name: string;
  list: number;
  image?: string | null;
};

type LibSpecRecord = {
  'Item Number': string;
  'Product Description': string;
  ' CAD WSP ': string;
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
  const file = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(file) as Record<string, LibSpecRecord>;

  return Object.entries(data).map(([sku, record]) => ({
    sku: record['Item Number'] || sku,
    name: record['Product Description'] || '',
    list: parsePrice(record[' CAD WSP '] || '$0'),
    image: null,
  }));
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  if (!catalogCache) {
    catalogCache = await readCatalogFile();
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
