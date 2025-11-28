import { NextRequest, NextResponse } from 'next/server';
import { loadCatalog } from '@/lib/catalog/loadCatalog';

// GET - Search SKUs for autocomplete
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    const catalog = await loadCatalog();

    // Filter and map to simple format for autocomplete
    const results = catalog
      .filter(item =>
        item.sku.toLowerCase().includes(query) ||
        item.collectionName?.toLowerCase().includes(query)
      )
      .slice(0, 20) // Limit results
      .map(item => ({
        sku: item.sku,
        collectionName: item.collectionName || 'Unknown',
        name: item.name,
      }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching SKUs:', error);
    return NextResponse.json({ error: 'Failed to search SKUs' }, { status: 500 });
  }
}
