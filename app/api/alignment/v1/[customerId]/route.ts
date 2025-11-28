import { NextRequest, NextResponse } from 'next/server';
import { MarketBaselineService } from '@/lib/alignment/market-baseline.service';
import { RecommendationService } from '@/lib/alignment/recommendation.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId') || 'lib-and-co';

    const marketService = new MarketBaselineService();
    const recommendationService = new RecommendationService(marketService);

    const report = await recommendationService.generateReport(
      params.customerId,
      vendorId
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating alignment report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate alignment report' },
      { status: 500 }
    );
  }
}
