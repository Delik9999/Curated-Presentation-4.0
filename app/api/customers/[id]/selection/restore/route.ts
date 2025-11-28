import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSelectionById, restoreWorkingSelection } from '@/lib/selections/store';
import { revalidateTag } from 'next/cache';

const paramsSchema = z.object({ id: z.string().min(1) });
const payloadSchema = z.object({
  snapshotId: z.string().min(1),
});

/**
 * Restore a Dallas snapshot as the working selection
 * This REPLACES the current working selection with the snapshot's items
 */
export async function POST(request: Request, context: { params: { id: string } }) {
  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  const { id: customerId } = params.data;
  const { snapshotId } = parsed.data;

  try {
    // Use the new restoreWorkingSelection function which completely replaces the items
    const selection = await restoreWorkingSelection(customerId, snapshotId);

    // Revalidate cache
    await revalidateTag(`customer-working-${customerId}`);

    return NextResponse.json({
      selectionId: selection.id,
      version: selection.version,
      message: `Restored from ${selection.metadata?.restoredFromName || 'snapshot'}`,
    });
  } catch (error) {
    console.error('[Restore API] Error restoring snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to restore snapshot' },
      { status: 500 }
    );
  }
}
