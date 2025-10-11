import { promises as fs } from 'fs';
import path from 'path';

export type CatalogItem = {
  sku: string;
  name: string;
  list: number;
  image?: string | null;
};

let catalogCache: CatalogItem[] | null = null;

async function readCatalogFile(): Promise<CatalogItem[]> {
  const filePath = path.join(process.cwd(), 'data', 'libspec.json');
  const file = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(file) as CatalogItem[];
  return data.map((item) => ({ ...item, image: item.image ?? undefined }));
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
