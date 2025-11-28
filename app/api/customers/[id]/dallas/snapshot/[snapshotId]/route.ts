import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSelectionById, deleteMarketSelection } from '@/lib/selections/store';

const paramsSchema = z.object({
  id: z.string().min(1),
  snapshotId: z.string().min(1),
});

export async function GET(request: Request, context: { params: { id: string; snapshotId: string } }) {
  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { id: customerId, snapshotId } = parsed.data;

  try {
    const snapshot = await getSelectionById(snapshotId);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Verify snapshot belongs to this customer
    if (snapshot.customerId !== customerId) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    return NextResponse.json({ selection: snapshot });
  } catch (error) {
    console.error('[Dallas Snapshot API] Error fetching snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshot' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: { params: { id: string; snapshotId: string } }) {
  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { id: customerId, snapshotId } = parsed.data;

  try {
    const result = await deleteMarketSelection(snapshotId, customerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Dallas Snapshot API] Error deleting snapshot:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete snapshot';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
