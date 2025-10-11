import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listSnapshots } from '@/lib/selections/store';

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

  // Get all Dallas snapshots (all versions)
  const allSnapshots = await listSnapshots(customerId);
  const history = allSnapshots.sort((a, b) => {
    // Sort by year DESC, then month DESC, then version DESC
    if (a.sourceYear !== b.sourceYear) {
      return (b.sourceYear ?? 0) - (a.sourceYear ?? 0);
    }
    const monthOrder: Record<string, number> = { January: 0, June: 1 };
    const aMonth = monthOrder[a.marketMonth ?? 'January'] ?? 0;
    const bMonth = monthOrder[b.marketMonth ?? 'June'] ?? 1;
    if (aMonth !== bMonth) {
      return bMonth - aMonth;
    }
    return b.version - a.version;
  });

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
