import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { resolveSelection } from '@/lib/selections/resolvers';
import { findCustomer } from '@/lib/customers/loadCustomers';
import { SelectionPdfDocument } from '@/lib/selections/pdf';
import { renderToStream } from '@react-pdf/renderer';

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

  const heading = `${customer.name} • ${type === 'dallas' ? 'Dallas Market Selection' : 'Working Selection'} (${selection.name})`;
  const document = <SelectionPdfDocument selection={selection} customerName={customer.name} heading={heading} />;
  const pdfStream = (await renderToStream(document)) as Readable;

  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      pdfStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      pdfStream.once('end', () => {
        controller.close();
      });

      pdfStream.once('error', (error: unknown) => {
        controller.error(error);
      });
    },
    cancel(reason) {
      if (typeof (pdfStream as Readable & { destroy?: (error?: Error) => void }).destroy === 'function') {
        pdfStream.destroy(reason instanceof Error ? reason : undefined);
      }
    },
  });
  const filename = `${customer.name.replace(/\s+/g, '_')}_${type}_${selection.version}.pdf`;

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
