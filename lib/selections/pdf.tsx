import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Selection } from '@/lib/selections/types';
import { formatCurrency } from '@/lib/utils/currency';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    padding: 32,
    fontSize: 11,
    color: '#1f2937',
  },
  header: {
    marginBottom: 24,
    borderBottom: '2 solid #e5e7eb',
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    backgroundColor: '#f3f4f6',
    padding: 6,
    fontWeight: 600,
    borderRight: '1 solid #e5e7eb',
    borderBottom: '1 solid #e5e7eb',
  },
  tableCol: {
    padding: 6,
    borderRight: '1 solid #e5e7eb',
    borderBottom: '1 solid #e5e7eb',
  },
  footer: {
    marginTop: 24,
    borderTop: '1 solid #e5e7eb',
    paddingTop: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  footerNote: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});

const columns = [
  { key: 'sku', label: 'SKU', width: '15%' },
  { key: 'name', label: 'Name', width: '24%' },
  { key: 'type', label: 'Type', width: '10%' },
  { key: 'qty', label: 'Qty', width: '8%' },
  { key: 'unitList', label: 'Unit List', width: '11%' },
  { key: 'programDisc', label: 'Disc %', width: '8%' },
  { key: 'netUnit', label: 'Net Unit', width: '11%' },
  { key: 'extendedNet', label: 'Extended', width: '13%' },
];

export function SelectionPdfDocument({
  selection,
  customerName,
  heading,
}: {
  selection: Selection;
  customerName: string;
  heading: string;
}) {
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

  // Build rows with display/backup split
  const rows: Array<{ sku: string; name: string; type: string; qty: number; unitList: number; discountPercent: number; netUnit: number; extendedNet: number }> = [];

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
        sku: item.sku,
        name: item.name,
        type: 'Display',
        qty: displayQty,
        unitList: item.unitList,
        discountPercent: displayDiscount,
        netUnit: displayNetUnit,
        extendedNet: displayNetUnit * displayQty,
      });

      // Backup row
      rows.push({
        sku: item.sku,
        name: item.name,
        type: 'Backup',
        qty: backupQty,
        unitList: item.unitList,
        discountPercent: backupDiscount,
        netUnit: backupNetUnit,
        extendedNet: backupNetUnit * backupQty,
      });
    } else {
      // Single row for display only
      rows.push({
        sku: item.sku,
        name: item.name,
        type: 'Display',
        qty: displayQty,
        unitList: item.unitList,
        discountPercent: displayDiscount,
        netUnit: item.netUnit ?? displayNetUnit,
        extendedNet: item.extendedNet ?? displayNetUnit * displayQty,
      });
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.title}>{heading}</Text>
          <Text style={styles.subtitle}>{customerName}</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {columns.map((column) => (
              <View key={column.key} style={{ ...styles.tableColHeader, width: column.width }}>
                <Text>{column.label}</Text>
              </View>
            ))}
          </View>
          {rows.map((row, index) => (
            <View key={`${row.sku}-${row.type}-${index}`} style={styles.tableRow}>
              <View style={{ ...styles.tableCol, width: columns[0]!.width }}>
                <Text>{row.sku}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[1]!.width }}>
                <Text>{row.name}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[2]!.width }}>
                <Text>{row.type}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[3]!.width }}>
                <Text>{row.qty}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[4]!.width }}>
                <Text>{formatCurrency(row.unitList)}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[5]!.width }}>
                <Text>{row.discountPercent > 0 ? `${row.discountPercent}%` : '—'}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[6]!.width }}>
                <Text>{formatCurrency(row.netUnit)}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[7]!.width }}>
                <Text>{formatCurrency(row.extendedNet)}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Program Discounts</Text>
            <Text>-{formatCurrency(discount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={{ fontWeight: 600 }}>Net Total</Text>
            <Text style={{ fontWeight: 600 }}>{formatCurrency(net)}</Text>
          </View>
          <Text style={styles.footerNote}>Curated Presentation • Prepared for {customerName}</Text>
        </View>
      </Page>
    </Document>
  );
}
