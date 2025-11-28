import { loadCatalog } from './loadCatalog';

export type CollectionMetadata = {
  name: string;
  years: number[];
  itemCount: number;
  skus: string[];
  vendor?: string;
};

let collectionsCache: CollectionMetadata[] | null = null;

async function readCollectionsFromCatalog(vendorFilter?: string): Promise<CollectionMetadata[]> {
  const catalog = await loadCatalog(vendorFilter);

  // Group by collection name (case-insensitive)
  // Map: lowercase key -> { canonicalName, years, skus, vendor }
  const collectionMap = new Map<
    string,
    { canonicalName: string; years: Set<number>; skus: string[]; vendor?: string }
  >();

  for (const item of catalog) {
    const collectionName = item.collectionName?.trim();
    const year = item.year;

    if (!collectionName) continue;

    // Use lowercase for grouping, but preserve the first occurrence's casing
    const key = collectionName.toLowerCase();

    if (!collectionMap.has(key)) {
      collectionMap.set(key, {
        canonicalName: collectionName, // Use the first occurrence as canonical
        years: new Set(),
        skus: [],
        vendor: item.vendor,
      });
    }

    const collection = collectionMap.get(key)!;
    if (year && Number.isFinite(year)) {
      collection.years.add(year);
    }
    collection.skus.push(item.sku);
  }

  // Convert to array and sort by name
  return Array.from(collectionMap.values())
    .map(({ canonicalName, years, skus, vendor }) => ({
      name: canonicalName,
      years: Array.from(years).sort((a, b) => b - a), // newest first
      itemCount: skus.length,
      skus,
      vendor,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadCollections(vendorFilter?: string): Promise<CollectionMetadata[]> {
  // Don't use cache if filtering by vendor
  if (vendorFilter) {
    return readCollectionsFromCatalog(vendorFilter);
  }

  if (!collectionsCache) {
    collectionsCache = await readCollectionsFromCatalog();
  }
  return collectionsCache;
}

export function resetCollectionsCache() {
  collectionsCache = null;
}
