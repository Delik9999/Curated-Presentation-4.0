import type { Selection } from '@/lib/selections/types';
import { calculateTotals } from '@/lib/utils/selections';

export function buildSelectionRows(selection: Selection) {
  const rows: Array<Record<string, string | number>> = [];

  selection.items.forEach((item) => {
    const hasBackup = (item.backupQty ?? 0) > 0;
    const displayQty = item.displayQty ?? item.qty;
    const backupQty = item.backupQty ?? 0;

    const displayDiscount = item.displayDiscountPercent ?? item.programDisc ?? 0;
    const backupDiscount = item.backupDiscountPercent ?? 0;

    const displayNetUnit = item.unitList * (1 - displayDiscount / 100);
    const backupNetUnit = item.unitList * (1 - backupDiscount / 100);

    if (hasBackup) {
      // Display row
      rows.push({
        SKU: item.sku,
        Name: item.name,
        Type: 'Display',
        Qty: displayQty,
        'Unit List': item.unitList,
        'Discount %': displayDiscount,
        'Net Unit': displayNetUnit,
        'Extended Net': displayNetUnit * displayQty,
        Notes: item.notes ?? '',
      });

      // Backup row
      rows.push({
        SKU: item.sku,
        Name: item.name,
        Type: 'Backup',
        Qty: backupQty,
        'Unit List': item.unitList,
        'Discount %': backupDiscount,
        'Net Unit': backupNetUnit,
        'Extended Net': backupNetUnit * backupQty,
        Notes: '',
      });
    } else {
      // Single row for display only
      rows.push({
        SKU: item.sku,
        Name: item.name,
        Type: 'Display',
        Qty: displayQty,
        'Unit List': item.unitList,
        'Discount %': displayDiscount,
        'Net Unit': item.netUnit ?? displayNetUnit,
        'Extended Net': item.extendedNet ?? displayNetUnit * displayQty,
        Notes: item.notes ?? '',
      });
    }
  });

  return rows;
}

export function buildSelectionSummary(selection: Selection) {
  const totals = calculateTotals(selection.items);

  // Calculate promotion-aware totals
  let subtotal = 0;
  let net = 0;

  selection.items.forEach((item) => {
    const displayQty = item.displayQty ?? item.qty;
    const backupQty = item.backupQty ?? 0;
    const totalQty = displayQty + backupQty;

    subtotal += item.unitList * totalQty;

    const displayDiscount = (item.displayDiscountPercent ?? item.programDisc ?? 0) / 100;
    const backupDiscount = (item.backupDiscountPercent ?? 0) / 100;

    const displayNet = item.unitList * (1 - displayDiscount) * displayQty;
    const backupNet = item.unitList * (1 - backupDiscount) * backupQty;

    net += displayNet + backupNet;
  });

  const discount = subtotal - net;

  return {
    subtotal,
    discount,
    net,
  };
}
