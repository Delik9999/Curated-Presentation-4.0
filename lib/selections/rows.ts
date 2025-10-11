import type { Selection } from '@/lib/selections/types';
import { calculateTotals } from '@/lib/utils/selections';

export function buildSelectionRows(selection: Selection) {
  return selection.items.map((item) => ({
    SKU: item.sku,
    Name: item.name,
    Qty: item.qty,
    'Unit List': item.unitList,
    Discount: item.programDisc ?? 0,
    'Net Unit': item.netUnit,
    'Extended Net': item.extendedNet,
    Notes: item.notes ?? '',
  }));
}

export function buildSelectionSummary(selection: Selection) {
  const totals = calculateTotals(selection.items);
  return {
    subtotal: totals.subtotal,
    discount: totals.totalDiscount,
    net: totals.netTotal,
  };
}
