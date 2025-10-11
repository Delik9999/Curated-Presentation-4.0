import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findItem } from '@/lib/catalog/loadCatalog';
import { saveDallasSnapshot } from '@/lib/selections/store';
import { revalidateTag } from 'next/cache';

const itemSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().nonnegative(),
  programDisc: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const payloadSchema = z.object({
  customerId: z.string().min(1),
  sourceYear: z.number().int(),
  sourceEventId: z.string().min(1),
  name: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { customerId, items, ...rest } = parsed.data;
  const enrichedItems = [] as {
    sku: string;
    name: string;
    unitList: number;
    qty: number;
    programDisc?: number;
    notes?: string;
    tags?: string[];
    netUnit: number;
    extendedNet: number;
  }[];

  for (const item of items) {
    const match = await findItem(item.sku);
    if (!match) {
      return NextResponse.json({ error: `Unknown SKU ${item.sku}` }, { status: 400 });
    }

    enrichedItems.push({
      sku: match.sku,
      name: match.name,
      unitList: match.list,
      qty: item.qty,
      programDisc: item.programDisc,
      notes: item.notes,
      tags: item.tags,
      netUnit: 0,
      extendedNet: 0,
    });
  }

  const snapshot = await saveDallasSnapshot({
    customerId,
    items: enrichedItems,
    ...rest,
    name: rest.name ?? `${rest.sourceEventId} Snapshot`,
  });

  await revalidateTag(`customer-dallas-${customerId}`);

  return NextResponse.json({ snapshotId: snapshot.id, version: snapshot.version });
}
