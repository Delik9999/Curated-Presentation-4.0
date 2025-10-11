import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadCatalog } from '@/lib/catalog/loadCatalog';

const payloadSchema = z.object({
  lines: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const catalog = await loadCatalog();
  const catalogMap = new Map(catalog.map((item) => [item.sku.toLowerCase(), item]));
  const seen = new Set<string>();

  const ok: { sku: string; qty: number }[] = [];
  const duplicate: { sku: string }[] = [];
  const unknown: { sku: string }[] = [];

  const lines = parsed.data.lines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const [rawSku, rawQty] = line.split(',').map((value) => value.trim());
    const sku = rawSku.toLowerCase();

    if (seen.has(sku)) {
      duplicate.push({ sku: rawSku });
      return;
    }

    const match = catalogMap.get(sku);
    if (!match) {
      unknown.push({ sku: rawSku });
      return;
    }

    seen.add(sku);
    const qty = rawQty ? Number.parseInt(rawQty, 10) || 0 : 0;
    ok.push({ sku: match.sku, qty });
  });

  return NextResponse.json({ ok, duplicate, unknown });
}
