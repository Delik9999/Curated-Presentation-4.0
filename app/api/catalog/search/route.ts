import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadCatalog } from '@/lib/catalog/loadCatalog';
import { getPromotionConfig } from '@/lib/selections/store';

const searchParamsSchema = z.object({
  query: z.string().optional(),
  collection: z.string().optional(),
  customerId: z.string().optional(),
  vendor: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parseResult = searchParamsSchema.safeParse({
    query: url.searchParams.get('query') || undefined,
    collection: url.searchParams.get('collection') || undefined,
    customerId: url.searchParams.get('customerId') || undefined,
    vendor: url.searchParams.get('vendor') || undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { query, collection, customerId, vendor } = parseResult.data;

  // Require at least one of query or collection
  if (!query && !collection) {
    return NextResponse.json({ error: 'Either query or collection parameter is required' }, { status: 400 });
  }

  // Load catalog (filtered by vendor if specified)
  const catalog = await loadCatalog(vendor);
  const promotionConfig = await getPromotionConfig(customerId);

  // Filter catalog by selected collections if promotion config exists
  let filteredCatalog = catalog;
  if (promotionConfig && promotionConfig.collections && promotionConfig.collections.length > 0) {
    filteredCatalog = catalog.filter((item) => {
      if (!item.collectionName) return false;

      const collectionSelection = promotionConfig.collections.find(
        (c) => c.collectionName === item.collectionName
      );

      if (!collectionSelection) return false;

      // If includeAllYears is true, include all items from this collection
      if (collectionSelection.includeAllYears) return true;

      // Otherwise, check if the item's year is in the selected years
      if (!item.year) return false;
      return collectionSelection.years?.includes(item.year) ?? false;
    });
  }

  // If collection is specified, filter by collection and return all products
  if (collection) {
    const products = filteredCatalog.filter(
      (item) => item.collectionName?.toLowerCase() === collection.toLowerCase()
    );
    return NextResponse.json({ products });
  }

  // Otherwise, perform text search
  const normalizedQuery = query!.toLowerCase();
  const results = filteredCatalog
    .map((item) => ({
      item,
      score: item.sku.toLowerCase().includes(normalizedQuery)
        ? 2
        : item.name.toLowerCase().includes(normalizedQuery)
        ? 1
        : 0,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, 15)
    .map((entry) => ({
      sku: entry.item.sku,
      name: entry.item.name,
      unitList: entry.item.list,
      collectionName: entry.item.collectionName,
      year: entry.item.year,
      imageUrl: entry.item.image,
      vendor: entry.item.vendor,
    }));

  return NextResponse.json({ results });
}
