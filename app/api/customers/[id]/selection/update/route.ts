import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateWorkingSelection } from '@/lib/selections/store';
import { revalidateTag } from 'next/cache';

const paramsSchema = z.object({ id: z.string().min(1) });
const payloadSchema = z.object({
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        qty: z.number().int().nonnegative(),
        notes: z.string().optional(),
      })
    )
    .min(1),
  name: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
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

  try {
    const selection = await updateWorkingSelection(params.data.id, parsed.data);
    await revalidateTag(`customer-working-${params.data.id}`);
    return NextResponse.json({ selectionId: selection.id, version: selection.version });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
