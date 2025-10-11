import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadCatalog } from '@/lib/catalog/loadCatalog';

const searchParamsSchema = z.object({
  query: z.string().min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parseResult = searchParamsSchema.safeParse({ query: url.searchParams.get('query') ?? '' });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const { query } = parseResult.data;
  const catalog = await loadCatalog();
  const normalizedQuery = query.toLowerCase();
  const results = catalog
    .map((item) => ({
      item,
      score: item.sku.toLowerCase().includes(normalizedQuery)
        ? 2
        : item.name.toLowerCase().includes(normalizedQuery)
        ? 1
        : 0,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, 15)
    .map((entry) => entry.item);

  return NextResponse.json({ results });
}
