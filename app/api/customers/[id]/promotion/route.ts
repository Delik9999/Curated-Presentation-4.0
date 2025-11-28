import { NextResponse } from 'next/server';
import { getActivePromotion } from '@/lib/promotions/store';

/**
 * GET /api/customers/[id]/promotion
 * Get the active promotion for a customer
 * Optional query param: vendor - filter by vendor ID
 */
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vendor = searchParams.get('vendor');

    const promotion = await getActivePromotion(vendor ?? undefined);

    // Return null if no active promotion
    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error fetching active promotion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotion' },
      { status: 500 }
    );
  }
}
