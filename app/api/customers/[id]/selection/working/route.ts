import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkingSelection } from '@/lib/selections/store';

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(_request: Request, context: { params: { id: string } }) {
  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const selection = await getWorkingSelection(params.data.id);
  return NextResponse.json({ selection });
}
