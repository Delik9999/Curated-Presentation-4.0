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
    ), // Allow empty array to clear all items
  name: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  vendor: z.string().optional(), // Add vendor to payload
});

export async function POST(request: Request, context: { params: { id: string } }) {
  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.entries(flattened.fieldErrors)
      .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
      .join('; ');
    const errorMessage = fieldErrors || flattened.formErrors.join(', ') || 'Invalid request data';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  try {
    const { vendor, ...updates } = parsed.data;
    const selection = await updateWorkingSelection(params.data.id, updates, vendor);
    await revalidateTag(`customer-working-${params.data.id}`);
    return NextResponse.json({ selectionId: selection.id, version: selection.version });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
