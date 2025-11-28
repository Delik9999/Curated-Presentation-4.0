import { NextRequest, NextResponse } from 'next/server';
import { getSelectionById } from '@/lib/selections/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const selectionId = searchParams.get('id');

    if (!selectionId) {
      return NextResponse.json(
        { error: 'selectionId is required' },
        { status: 400 }
      );
    }

    const selection = await getSelectionById(selectionId);

    if (!selection) {
      return NextResponse.json(
        { error: 'Selection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(selection);
  } catch (error) {
    console.error('Failed to get selection:', error);
    return NextResponse.json(
      { error: 'Failed to get selection' },
      { status: 500 }
    );
  }
}
