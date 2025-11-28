import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMarketCycle, setCurrentMarketCycle } from '@/lib/selections/store';

export async function GET() {
  try {
    const currentCycle = await getCurrentMarketCycle();
    return NextResponse.json({ currentCycle });
  } catch (error) {
    console.error('Failed to get market cycle:', error);
    return NextResponse.json(
      { error: 'Failed to get market cycle' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year and month are required' },
        { status: 400 }
      );
    }

    if (month !== 'January' && month !== 'June') {
      return NextResponse.json(
        { error: 'month must be January or June' },
        { status: 400 }
      );
    }

    const updatedCycle = await setCurrentMarketCycle(year, month);
    return NextResponse.json({ currentCycle: updatedCycle });
  } catch (error) {
    console.error('Failed to set market cycle:', error);
    return NextResponse.json(
      { error: 'Failed to set market cycle' },
      { status: 500 }
    );
  }
}
