import { NextRequest, NextResponse } from 'next/server';
import { getPromotionConfig, savePromotionConfig } from '@/lib/selections/store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') ?? undefined;
    const vendor = searchParams.get('vendor') ?? undefined;

    const promotion = await getPromotionConfig(customerId, vendor);

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error loading promotion config:', error);
    return NextResponse.json({ error: 'Failed to load promotion config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, collections, presentationItems, vendor } = body;

    console.log('[POST /api/rep/collections] Received request:');
    console.log('  vendor:', vendor);
    console.log('  customerId:', customerId);

    // Support both old (collections) and new (presentationItems) formats
    const itemsToSave = presentationItems || collections;

    if (presentationItems) {
      console.log('  presentationItems:', JSON.stringify(presentationItems, null, 2));
    } else {
      console.log('  collections (legacy):', JSON.stringify(collections, null, 2));
    }

    if (!itemsToSave || !Array.isArray(itemsToSave)) {
      return NextResponse.json({ error: 'Collections or presentationItems array is required' }, { status: 400 });
    }

    const promotion = await savePromotionConfig(customerId, itemsToSave, vendor, !!presentationItems);

    console.log('[POST /api/rep/collections] Saved promotion:');
    console.log('  id:', promotion.id);
    console.log('  vendor:', promotion.vendor);
    if (promotion.presentationItems) {
      console.log('  presentationItems:', JSON.stringify(promotion.presentationItems, null, 2));
    } else {
      console.log('  collections:', JSON.stringify(promotion.collections, null, 2));
    }

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error saving promotion config:', error);
    return NextResponse.json({ error: 'Failed to save promotion config' }, { status: 500 });
  }
}
