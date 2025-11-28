import { NextResponse } from 'next/server';
import {
  loadPromotions,
  createPromotion,
  getActivePromotion,
} from '@/lib/promotions/store';
import { CreatePromotionInput } from '@/lib/promotions/types';

/**
 * GET /api/rep/promotions
 * List all promotions or get active promotion
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      const promotion = await getActivePromotion();
      return NextResponse.json({ promotion });
    }

    const promotions = await loadPromotions();
    return NextResponse.json({ promotions });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rep/promotions
 * Create a new promotion
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Promotion name is required' }, { status: 400 });
    }

    const input: CreatePromotionInput = {
      name: body.name,
      vendor: body.vendor || 'lib-and-co',
      description: body.description,
      active: body.active ?? false,
      startDate: body.startDate,
      endDate: body.endDate,
      skuTiers: body.skuTiers || [],
      dollarTiers: body.dollarTiers || [],
      inventoryIncentive: body.inventoryIncentive || {
        enabled: false,
        backupDiscountPercent: 0,
      },
      // Customer-facing display fields
      summaryTitle: body.summaryTitle,
      summaryBody: body.summaryBody,
      headlineBenefit: body.headlineBenefit,
      summaryBullets: body.summaryBullets,
      pdfUrl: body.pdfUrl,
      termsAndConditions: body.termsAndConditions,
    };

    const promotion = await createPromotion(input);

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: 'Failed to create promotion' },
      { status: 500 }
    );
  }
}
