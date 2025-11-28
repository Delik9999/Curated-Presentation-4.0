import { NextRequest, NextResponse } from 'next/server';
import {
  getPresentations,
  getActivePresentation,
  createPresentation,
  updatePresentation,
  setActivePresentation,
  deletePresentation,
} from '@/lib/selections/store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') ?? undefined;
    const vendor = searchParams.get('vendor') ?? undefined;
    const action = searchParams.get('action');

    if (action === 'active') {
      const presentation = await getActivePresentation(customerId, vendor);
      return NextResponse.json({ presentation });
    }

    const presentations = await getPresentations(customerId, vendor);
    return NextResponse.json({ presentations });
  } catch (error) {
    console.error('Error loading presentations:', error);
    return NextResponse.json({ error: 'Failed to load presentations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, customerId, vendor, name, presentationId, updates } = body;

    console.log('[presentations API] Request:', { action, customerId: customerId ?? 'undefined', vendor, presentationId });

    switch (action) {
      case 'create':
        const newPresentation = await createPresentation(customerId, vendor, name);
        return NextResponse.json({ presentation: newPresentation });

      case 'update':
        const updatedPresentation = await updatePresentation(customerId, vendor, presentationId, updates);
        return NextResponse.json({ presentation: updatedPresentation });

      case 'setActive':
        await setActivePresentation(customerId, vendor, presentationId);
        return NextResponse.json({ success: true });

      case 'delete':
        await deletePresentation(customerId, vendor, presentationId);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing presentation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to manage presentation';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
