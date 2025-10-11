import type { Selection, SelectionItem } from '@/lib/selections/types';

export function calculateTotals(items: SelectionItem[]) {
  const subtotal = items.reduce((acc, item) => acc + item.unitList * item.qty, 0);
  const totalDiscount = items.reduce(
    (acc, item) => acc + (item.unitList * item.qty - item.netUnit * item.qty),
    0
  );
  const netTotal = items.reduce((acc, item) => acc + item.netUnit * item.qty, 0);
  return {
    subtotal,
    totalDiscount,
    netTotal,
  };
}

export function getVersionLabel(selection: Selection) {
  return `v${selection.version}`;
}
