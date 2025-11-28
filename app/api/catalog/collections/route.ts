import { NextRequest, NextResponse } from 'next/server';
import { loadCatalog } from '@/lib/catalog/loadCatalog';

/**
 * GET /api/catalog/collections
 *
 * Returns all unique collections from the catalog, optionally filtered by vendor.
 * Each collection includes its name and product count.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendor = searchParams.get('vendor') || undefined;

    // Load catalog (optionally filtered by vendor)
    const catalog = await loadCatalog(vendor);

    // Group products by collection name
    const collectionMap = new Map<string, { name: string; productCount: number; years: Set<number> }>();

    catalog.forEach((item) => {
      // Extract collection name from product name (first part before comma)
      const collectionName = item.collectionName || item.name.split(',')[0]?.trim();

      if (!collectionName || collectionName === 'Uncategorized' || collectionName.trim() === '') {
        return;
      }

      if (!collectionMap.has(collectionName)) {
        collectionMap.set(collectionName, {
          name: collectionName,
          productCount: 0,
          years: new Set(),
        });
      }

      const collection = collectionMap.get(collectionName)!;
      collection.productCount++;
      if (item.year) {
        collection.years.add(item.year);
      }
    });

    // Convert to array and sort alphabetically
    const collections = Array.from(collectionMap.values())
      .map((col) => ({
        name: col.name,
        productCount: col.productCount,
        years: Array.from(col.years).sort((a, b) => b - a), // Most recent first
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      collections,
      total: collections.length,
      vendor: vendor || 'all',
    });
  } catch (error) {
    console.error('Error loading collections:', error);
    return NextResponse.json(
      { error: 'Failed to load collections' },
      { status: 500 }
    );
  }
}
