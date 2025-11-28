import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkingSelection } from '@/lib/selections/store';
import { loadCatalog } from '@/lib/catalog/loadCatalog';

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(request: Request, context: { params: { id: string } }) {
  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  // Extract vendor from query params
  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get('vendor') || undefined;

  const selection = await getWorkingSelection(params.data.id, vendor);

  // Enrich selection items with current catalog prices
  if (selection && selection.items.length > 0) {
    const catalog = await loadCatalog(vendor);
    const catalogMap = new Map(catalog.map(item => [item.sku, item]));

    selection.items = selection.items.map(item => {
      const catalogItem = catalogMap.get(item.sku);
      if (catalogItem) {
        return {
          ...item,
          unitList: catalogItem.list, // Always use current catalog price
          imageUrl: catalogItem.image, // Use image from catalog
        };
      }
      return item;
    });
  }

  return NextResponse.json({ selection });
}
