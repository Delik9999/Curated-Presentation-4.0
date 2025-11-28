import { NextRequest, NextResponse } from 'next/server';
import { calculateMomentum, getMomentumLeaderboard } from '@/lib/insights/momentum';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const view = searchParams.get('view') || 'groups'; // 'groups' or 'flat'
  const projectThreshold = parseInt(searchParams.get('projectThreshold') || '4', 10);
  const limit = parseInt(searchParams.get('limit') || '15', 10);

  try {
    if (view === 'flat') {
      const leaderboard = await getMomentumLeaderboard(
        customerId || undefined,
        projectThreshold,
        limit
      );

      return NextResponse.json({
        leaderboard,
        totalItems: leaderboard.length,
        metadata: {
          calculationMethod: 'Dual Moving Average (4wk Signal / 12wk Baseline)',
          filters: ['Project orders (>4 units) excluded'],
        },
      });
    }

    // Default: grouped view
    const groups = await calculateMomentum(
      customerId || undefined,
      projectThreshold
    );

    return NextResponse.json({
      groups,
      totals: {
        rentPayers: groups.rentPayers.length,
        risingStars: groups.risingStars.length,
        highValueStable: groups.highValueStable.length,
        decelerating: groups.decelerating.length,
        other: groups.other.length,
      },
      metadata: {
        calculationMethod: 'ARPD (Annualized Revenue Per Display)',
        thresholds: {
          rentPayers: 'Top 20% productivity ($/dealer)',
          risingStars: '≥ +15% revenue momentum',
          highValueStable: '≥ $5,000 ARPD with stable momentum',
          decelerating: '≤ -10% revenue momentum',
        },
        filters: ['Project orders (>4 units) excluded', 'Min 3 stocking dealers'],
      },
    });
  } catch (error) {
    console.error('Error fetching momentum:', error);
    return NextResponse.json({ error: 'Failed to fetch momentum data' }, { status: 500 });
  }
}
