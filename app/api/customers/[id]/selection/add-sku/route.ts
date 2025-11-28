import { NextResponse } from 'next/server';
import { getWorkingSelection, updateWorkingSelection } from '@/lib/selections/store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const body = await request.json();

    const { sku, name, unitList, qty = 1, vendor, collection, year, notes } = body;

    // Validate required fields
    if (!sku || !name || unitList === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: sku, name, unitList' },
        { status: 400 }
      );
    }

    // Get current working selection
    const currentSelection = await getWorkingSelection(customerId, vendor);

    // Check if SKU already exists
    const existingItem = currentSelection?.items.find((item) => item.sku === sku);
    if (existingItem) {
      return NextResponse.json(
        { error: 'This product is already in your selection. You can edit the quantity in the table below.' },
        { status: 409 }
      );
    }

    // Create new item
    const newItem = {
      sku,
      name,
      unitList,
      qty: Number(qty),
      notes: notes || '',
      collection: collection || null,
      year: year || null,
      // Default values
      displayQty: Number(qty),
      backupQty: 0,
      displayDiscountPercent: 0,
      backupDiscountPercent: 0,
    };

    // Add to selection
    const items = currentSelection ? [...currentSelection.items, newItem] : [newItem];

    // Update working selection
    await updateWorkingSelection(customerId, {
      items,
      vendor,
      metadata: {
        updatedVia: 'sku-search',
        wasModified: true,
      },
    });

    return NextResponse.json({ success: true, sku });
  } catch (error) {
    console.error('Error adding SKU to selection:', error);
    return NextResponse.json(
      { error: 'Failed to add product to selection' },
      { status: 500 }
    );
  }
}
