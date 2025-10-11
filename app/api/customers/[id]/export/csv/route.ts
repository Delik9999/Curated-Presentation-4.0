import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { resolveSelection } from '@/lib/selections/resolvers';
import { buildSelectionRows, buildSelectionSummary } from '@/lib/selections/rows';
import { findCustomer } from '@/lib/customers/loadCustomers';
import { formatCurrency } from '@/lib/utils/currency';

const paramsSchema = z.object({ id: z.string().min(1) });
const querySchema = z.object({
  type: z.enum(['dallas', 'working']),
  selectionId: z.string().optional(),
});

export async function GET(request: Request, context: { params: { id: string } }) {
  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const url = new URL(request.url);
  const query = querySchema.safeParse({
    type: url.searchParams.get('type'),
    selectionId: url.searchParams.get('selectionId') ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { id } = params.data;
  const { type, selectionId } = query.data;
  const [customer, selection] = await Promise.all([
    findCustomer(id),
    resolveSelection(id, type, selectionId ?? undefined),
  ]);

  if (!selection || !customer) {
    return NextResponse.json({ error: 'Selection not found' }, { status: 404 });
  }

  const rows = buildSelectionRows(selection);
  const summary = buildSelectionSummary(selection);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      [],
      ['Totals'],
      ['Subtotal', formatCurrency(summary.subtotal)],
      ['Program Discounts', `-${formatCurrency(summary.discount)}`],
      ['Net Total', formatCurrency(summary.net)],
    ],
    { origin: `A${rows.length + 3}` }
  );

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const filename = `${customer.name.replace(/\s+/g, '_')}_${type}_${selection.version}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
