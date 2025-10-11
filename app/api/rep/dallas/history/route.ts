import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listDallasMarketOrders } from '@/lib/selections/store';

const querySchema = z.object({
  customerId: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    customerId: searchParams.get('customerId'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { customerId } = parsed.data;

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }

  const history = await listDallasMarketOrders(customerId);

  return NextResponse.json({
    history: history.map((snapshot) => ({
      id: snapshot.id,
      name: snapshot.name,
      sourceEventId: snapshot.sourceEventId,
      sourceYear: snapshot.sourceYear,
      marketMonth: snapshot.marketMonth,
      version: snapshot.version,
      itemCount: snapshot.items.length,
      totalNet: snapshot.items.reduce((sum, item) => sum + item.extendedNet, 0),
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      isVisibleToCustomer: snapshot.isVisibleToCustomer ?? false,
    })),
  });
}
