import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLatestDallas, getSelectionById, listSnapshots } from '@/lib/selections/store';

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(request: Request, context: { params: { id: string } }) {
  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const { id } = parsed.data;
  const url = new URL(request.url);
  const snapshotId = url.searchParams.get('snapshotId');
  const [latest, versions] = await Promise.all([
    getLatestDallas(id),
    listSnapshots(id),
  ]);

  const selectedSnapshot = snapshotId
    ? await getSelectionById(snapshotId)
    : latest;

  if (snapshotId && selectedSnapshot && selectedSnapshot.customerId !== id) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }

  if (!latest) {
    return NextResponse.json({ snapshot: null, versions: [] });
  }

  const versionList = versions
    .sort((a, b) => b.version - a.version)
    .map((snapshot) => ({
      id: snapshot.id,
      name: snapshot.name,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
    }));

  return NextResponse.json({ snapshot: selectedSnapshot ?? latest, versions: versionList });
}
