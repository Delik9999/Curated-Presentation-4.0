import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createWorkingFromSnapshot, getWorkingSelection } from '@/lib/selections/store';
import { revalidateTag } from 'next/cache';

const paramsSchema = z.object({
  id: z.string().min(1),
});

const payloadSchema = z.object({
  snapshotId: z.string().min(1),
  name: z.string().optional(),
  mode: z.enum(['auto', 'createNew', 'replace']).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: Request, context: { params: { id: string } }) {
  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id: customerId } = params.data;
  const { snapshotId, name, metadata, mode = 'auto' } = parsed.data;
  const existing = await getWorkingSelection(customerId);

  if (existing && mode === 'auto') {
    return NextResponse.json(
      {
        error: 'Working selection already exists',
        requiresDecision: true,
        currentSelection: { id: existing.id, version: existing.version, name: existing.name },
      },
      { status: 409 }
    );
  }

  const selection = await createWorkingFromSnapshot(customerId, snapshotId, name, {
    ...metadata,
    importMode: mode,
  });

  await revalidateTag(`customer-working-${customerId}`);

  return NextResponse.json({ selectionId: selection.id, version: selection.version });
}
