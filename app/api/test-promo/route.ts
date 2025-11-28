import { NextRequest, NextResponse } from 'next/server';
import { getPromotionConfig } from '@/lib/selections/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get('vendor') ?? undefined;

  const promotionConfig = await getPromotionConfig(undefined, vendor);

  return NextResponse.json({
    vendor,
    promotionConfig,
    hasCollections: !!promotionConfig?.collections,
    collectionsCount: promotionConfig?.collections?.length || 0,
    collections: promotionConfig?.collections?.map(c => c.collectionName) || []
  });
}
