import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listSnapshots } from '@/lib/selections/store';

const querySchema = z.object({
  customerId: z.string().min(1).optional(),
});

type MarketPeriod = {
  periodKey: string; // "2026-June", "2025-January"
  year: number;
  month: 'January' | 'June';
  isActive: boolean; // Most recent period with visible snapshots
  snapshots: Array<{
    id: string;
    name: string;
    sourceEventId: string;
    sourceYear: number;
    marketMonth: 'January' | 'June';
    vendor: string;
    version: number;
    itemCount: number;
    totalNet: number;
    createdAt: string;
    updatedAt: string;
    isVisibleToCustomer: boolean;
  }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    customerId: searchParams.get('customerId'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { customerId } = parsed.data;

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }

  // Get all Dallas snapshots (all versions)
  const allSnapshots = await listSnapshots(customerId);

  // Map snapshots to enriched format
  const enrichedSnapshots = allSnapshots.map((snapshot) => {
    // Infer vendor from SKUs if not explicitly set
    let vendor = snapshot.vendor;
    if (!vendor && snapshot.items.length > 0) {
      const firstSku = snapshot.items[0]?.sku || '';
      // Lib & Co: numeric SKUs like "12180-041"
      // Hubbardton Forge: SKUs starting with numbers like "209321-SKT"
      // Savoy House: SKUs like "7-" or other patterns
      if (/^\d{5}-/.test(firstSku)) {
        vendor = 'lib-and-co';
      } else if (/^\d{6}-/.test(firstSku)) {
        vendor = 'hubbardton-forge';
      } else if (/^[0-9]+-/.test(firstSku)) {
        vendor = 'savoy-house';
      }
    }

    return {
      id: snapshot.id,
      name: snapshot.name,
      sourceEventId: snapshot.sourceEventId,
      sourceYear: snapshot.sourceYear ?? 0,
      marketMonth: snapshot.marketMonth ?? 'January',
      vendor: vendor ?? 'lib-and-co',
      version: snapshot.version,
      itemCount: snapshot.items.length,
      totalNet: snapshot.items.reduce((sum, item) => sum + item.extendedNet, 0),
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      isVisibleToCustomer: snapshot.isVisibleToCustomer ?? false,
    };
  });

  // Group by market period (year + month)
  const periodMap = new Map<string, MarketPeriod>();

  enrichedSnapshots.forEach((snapshot) => {
    const periodKey = `${snapshot.sourceYear}-${snapshot.marketMonth}`;

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        periodKey,
        year: snapshot.sourceYear,
        month: snapshot.marketMonth,
        isActive: false, // Will be set later
        snapshots: [],
      });
    }

    periodMap.get(periodKey)!.snapshots.push(snapshot);
  });

  // Convert to array and sort by year DESC, then month DESC
  const periods = Array.from(periodMap.values()).sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }
    const monthOrder: Record<string, number> = { January: 0, June: 1 };
    return (monthOrder[b.month] ?? 0) - (monthOrder[a.month] ?? 0);
  });

  // Sort snapshots within each period by version DESC
  periods.forEach((period) => {
    period.snapshots.sort((a, b) => b.version - a.version);
  });

  // Mark the most recent period with visible snapshots as "active"
  const activePeriod = periods.find((period) =>
    period.snapshots.some((snapshot) => snapshot.isVisibleToCustomer)
  );
  if (activePeriod) {
    activePeriod.isActive = true;
  }

  return NextResponse.json({ periods });
}
