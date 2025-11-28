import { NextRequest, NextResponse } from 'next/server';
import {
  getMarketSelectionsByCycle,
  bulkActivateMarketSelections,
  bulkDeactivateMarketSelections,
  getMarketSelectionStats,
  toggleDallasVisibility,
} from '@/lib/selections/store';
import { loadCustomers } from '@/lib/customers/loadCustomers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const vendor = searchParams.get('vendor') || undefined;
    const yearStr = searchParams.get('year');
    const month = searchParams.get('month') as 'January' | 'June' | null;

    // Get statistics across all cycles
    if (action === 'stats') {
      const stats = await getMarketSelectionStats(vendor);
      return NextResponse.json(stats);
    }

    // Get selections for a specific cycle
    if (yearStr && month) {
      const year = parseInt(yearStr, 10);
      if (isNaN(year) || (month !== 'January' && month !== 'June')) {
        return NextResponse.json(
          { error: 'Invalid year or month' },
          { status: 400 }
        );
      }

      const selections = await getMarketSelectionsByCycle({ year, month }, vendor);

      // Enrich with customer names
      const customers = await loadCustomers();
      const customerMap = new Map(customers.map(c => [c.id, c]));

      const enrichedSelections = selections.map(item => ({
        ...item,
        customerName: customerMap.get(item.customerId)?.name || item.customerId,
        itemCount: item.selection.items.length,
        createdAt: item.selection.createdAt,
        updatedAt: item.selection.updatedAt,
      }));

      return NextResponse.json({
        cycle: { year, month },
        vendor,
        selections: enrichedSelections,
        total: enrichedSelections.length,
        activeCount: enrichedSelections.filter(s => s.isActive).length,
      });
    }

    return NextResponse.json(
      { error: 'year and month query params are required, or action=stats' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to get market selections:', error);
    return NextResponse.json(
      { error: 'Failed to get market selections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, year, month, vendor, selectionId, customerId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    // Bulk activate all selections for a cycle
    if (action === 'bulk-activate') {
      if (!year || !month) {
        return NextResponse.json(
          { error: 'year and month are required for bulk-activate' },
          { status: 400 }
        );
      }

      const result = await bulkActivateMarketSelections({ year, month }, vendor);
      return NextResponse.json({
        success: true,
        message: `Activated ${result.activated} of ${result.total} market selections`,
        ...result,
      });
    }

    // Bulk deactivate all selections for a cycle
    if (action === 'bulk-deactivate') {
      if (!year || !month) {
        return NextResponse.json(
          { error: 'year and month are required for bulk-deactivate' },
          { status: 400 }
        );
      }

      const result = await bulkDeactivateMarketSelections({ year, month }, vendor);
      return NextResponse.json({
        success: true,
        message: `Deactivated ${result.deactivated} of ${result.total} market selections`,
        ...result,
      });
    }

    // Toggle individual selection visibility
    if (action === 'toggle-visibility') {
      if (!selectionId || !customerId) {
        return NextResponse.json(
          { error: 'selectionId and customerId are required for toggle-visibility' },
          { status: 400 }
        );
      }

      const updated = await toggleDallasVisibility(selectionId, customerId);
      return NextResponse.json({
        success: true,
        selection: updated,
        isActive: updated.isVisibleToCustomer,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process market selections action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
