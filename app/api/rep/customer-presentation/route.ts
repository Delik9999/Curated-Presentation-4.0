import { NextRequest, NextResponse } from 'next/server';
import { getCustomerPresentationData } from '@/lib/presentation/getCustomerPresentationData';

/**
 * GET /api/rep/customer-presentation
 *
 * Fetches customer presentation data for rep preview
 * Query params:
 *   - customerId: Customer ID
 *   - vendor: Optional vendor filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const vendor = searchParams.get('vendor') || undefined;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Fetching customer presentation data:', { customerId, vendor });

    const presentationData = await getCustomerPresentationData(customerId, vendor);

    return NextResponse.json(presentationData);
  } catch (error) {
    console.error('[API] Error fetching customer presentation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer presentation data' },
      { status: 500 }
    );
  }
}
