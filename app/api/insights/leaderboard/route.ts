import { NextRequest, NextResponse } from 'next/server';
import { calculateLeaderboard, getTerritoryLeaderboard, getHotNewIntros } from '@/lib/insights/leaderboard';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const scope = searchParams.get('scope') || 'customer'; // 'customer' or 'territory'
  const projectThreshold = parseInt(searchParams.get('projectThreshold') || '4', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    let leaderboard;

    if (scope === 'territory' || !customerId) {
      leaderboard = await getTerritoryLeaderboard(projectThreshold);
    } else {
      leaderboard = await calculateLeaderboard(customerId, projectThreshold);
    }

    // Apply limit
    const limitedLeaderboard = leaderboard.slice(0, limit);

    // Get hot new intros
    const hotNewIntros = getHotNewIntros(leaderboard);

    return NextResponse.json({
      leaderboard: limitedLeaderboard,
      hotNewIntros: hotNewIntros.slice(0, 5),
      totalItems: leaderboard.length,
      metadata: {
        scope,
        customerId,
        projectThreshold,
        calculationMethod: '3-Week Moving Average',
        filters: [
          'Project orders (>4 units per line) excluded from rank',
        ],
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
