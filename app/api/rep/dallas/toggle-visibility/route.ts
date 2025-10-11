import { NextResponse } from 'next/server';
import { z } from 'zod';
import { toggleDallasVisibility } from '@/lib/selections/store';

const payloadSchema = z.object({
  selectionId: z.string().min(1),
  customerId: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { selectionId, customerId } = parsed.data;

  try {
    const updated = await toggleDallasVisibility(selectionId, customerId);
    return NextResponse.json({
      success: true,
      isVisibleToCustomer: updated.isVisibleToCustomer
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
