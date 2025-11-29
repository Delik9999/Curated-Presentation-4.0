import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { z } from 'zod';
import { addItemToWorkingSelection } from '@/lib/selections/store';
import { findItem } from '@/lib/catalog/loadCatalog';
import { revalidateTag } from 'next/cache';

const paramsSchema = z.object({ id: z.string().min(1) });
const payloadSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive().default(1),
  notes: z.string().optional(),
  vendor: z.string().optional(), // Add vendor
  configuration: z.object({
    baseItemCode: z.string(),
    variantSku: z.string().optional(),
    options: z.record(z.string()),
    productName: z.string(),
  }).optional(),
});

export async function POST(request: Request, context: { params: { id: string } }) {
  // Disable Next.js caching to always get fresh data
  noStore();

  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.entries(flattened.fieldErrors)
      .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
      .join('; ');
    const errorMessage = fieldErrors || flattened.formErrors.join(', ') || 'Invalid request data';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  try {
    console.log('[add-item] Request received:', {
      customerId: params.data.id,
      sku: parsed.data.sku,
      qty: parsed.data.qty,
      vendor: parsed.data.vendor,
      hasConfiguration: !!parsed.data.configuration,
    });

    // For configurable products (Hubbardton Forge), look up by baseItemCode
    // since the catalog stores products by base item code, not full variant SKU
    const lookupSku = parsed.data.configuration?.baseItemCode || parsed.data.sku;
    console.log('[add-item] Looking up SKU:', lookupSku);

    // Look up product from catalog
    const catalogItem = await findItem(lookupSku);
    if (!catalogItem) {
      console.error('[add-item] Product not found in catalog:', lookupSku);
      return NextResponse.json({ error: `Product ${lookupSku} not found in catalog` }, { status: 404 });
    }
    console.log('[add-item] Found catalog item:', { sku: catalogItem.sku, name: catalogItem.name });

    // For configurable products, use the product name from configuration
    // (since the SKU might be a base SKU and name should reflect the configured variant)
    const productName = parsed.data.configuration?.productName || catalogItem.name;

    // Use the full variant SKU for storage (e.g., 241202-LED-07-07)
    // This is the SKU that was passed in (the configured variant)
    const storageSku = parsed.data.sku;

    // Add item to working selection (with vendor parameter)
    const selection = await addItemToWorkingSelection(params.data.id, {
      sku: storageSku,
      name: productName,
      qty: parsed.data.qty,
      unitList: catalogItem.list,
      programDisc: 0, // Default to no discount
      notes: parsed.data.notes,
      collection: catalogItem.collectionName,
      year: catalogItem.year,
      configuration: parsed.data.configuration, // Pass configuration if provided
    }, parsed.data.vendor);

    // Revalidate cache
    await revalidateTag(`customer-working-${params.data.id}`);

    return NextResponse.json({
      selectionId: selection.id,
      version: selection.version,
      itemCount: selection.items.length,
      addedSku: storageSku,
    });
  } catch (error) {
    console.error('Error adding item to selection:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
