import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { SelectionChange } from '@/lib/tracking/types';

const CHANGES_FILE = path.join(process.cwd(), 'data/tracking/selection-changes.json');

async function readChanges(): Promise<SelectionChange[]> {
  try {
    const data = await fs.readFile(CHANGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeChanges(changes: SelectionChange[]): Promise<void> {
  await fs.writeFile(CHANGES_FILE, JSON.stringify(changes, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, selectionId, changeType, userId, userName, userRole, changes } = body;

    if (!customerId || !selectionId || !changeType) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, selectionId, changeType' },
        { status: 400 }
      );
    }

    const allChanges = await readChanges();

    const newChange: SelectionChange = {
      id: crypto.randomUUID(),
      customerId,
      selectionId,
      changeType,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userRole,
      changes: changes || {},
    };

    allChanges.push(newChange);
    await writeChanges(allChanges);

    return NextResponse.json({ change: newChange });
  } catch (error) {
    console.error('Error logging selection change:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const selectionId = searchParams.get('selectionId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const allChanges = await readChanges();
    let filteredChanges = allChanges;

    if (customerId) {
      filteredChanges = filteredChanges.filter((c) => c.customerId === customerId);
    }

    if (selectionId) {
      filteredChanges = filteredChanges.filter((c) => c.selectionId === selectionId);
    }

    // Sort by timestamp descending (most recent first)
    filteredChanges.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit results
    filteredChanges = filteredChanges.slice(0, limit);

    return NextResponse.json({ changes: filteredChanges });
  } catch (error) {
    console.error('Error fetching selection changes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
