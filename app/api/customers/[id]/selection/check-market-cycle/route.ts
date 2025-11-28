import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkingSelection, getPromotionConfig, archiveStaleWorkingSelections } from '@/lib/selections/store';

const paramsSchema = z.object({
  id: z.string().min(1),
});

/**
 * Checks if the working selection's market cycle matches the current promotion's market cycle.
 * If not, archives the stale selection and returns info about the archived selection.
 */
export async function POST(request: Request, context: { params: { id: string } }) {
  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const { id: customerId } = parsed.data;
  const url = new URL(request.url);
  const vendor = url.searchParams.get('vendor') || undefined;

  // Get current promotion config to check market cycle
  const promotionConfig = await getPromotionConfig(customerId, vendor);

  if (!promotionConfig?.marketCycle) {
    // No market cycle defined in promotion, nothing to check
    return NextResponse.json({ needsArchive: false, archivedSelection: null });
  }

  // Get current working selection
  const workingSelection = await getWorkingSelection(customerId, vendor);

  if (!workingSelection) {
    // No working selection to check
    return NextResponse.json({ needsArchive: false, archivedSelection: null });
  }

  // Check if market cycles match
  const currentCycle = promotionConfig.marketCycle;
  const selectionCycle = workingSelection.marketCycle;

  const cyclesMatch = selectionCycle &&
    currentCycle.year === selectionCycle.year &&
    currentCycle.month === selectionCycle.month;

  if (cyclesMatch) {
    // Market cycles match, no need to archive
    return NextResponse.json({ needsArchive: false, archivedSelection: null });
  }

  // Market cycles don't match - archive the stale selection
  const { archived } = await archiveStaleWorkingSelections(customerId, currentCycle, vendor);

  const archivedSelection = archived[0] || null;

  return NextResponse.json({
    needsArchive: true,
    archivedSelection: archivedSelection ? {
      id: archivedSelection.id,
      name: archivedSelection.name,
      marketCycle: archivedSelection.marketCycle,
    } : null,
    newMarketCycle: currentCycle,
  });
}
