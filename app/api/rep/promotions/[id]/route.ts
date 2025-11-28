import { NextResponse } from 'next/server';
import {
  getPromotion,
  updatePromotion,
  deletePromotion,
} from '@/lib/promotions/store';
import { UpdatePromotionInput } from '@/lib/promotions/types';

/**
 * GET /api/rep/promotions/[id]
 * Get a specific promotion by ID
 */
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const promotion = await getPromotion(context.params.id);

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error fetching promotion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotion' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rep/promotions/[id]
 * Update a promotion
 */
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const input: UpdatePromotionInput = {
      id: context.params.id,
      ...body,
    };

    const promotion = await updatePromotion(input);

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error updating promotion:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to update promotion' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rep/promotions/[id]
 * Delete a promotion
 */
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const success = await deletePromotion(context.params.id);

    if (!success) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json(
      { error: 'Failed to delete promotion' },
      { status: 500 }
    );
  }
}
