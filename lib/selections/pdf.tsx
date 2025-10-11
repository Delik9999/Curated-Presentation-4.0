import React from 'react';
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Selection } from '@/lib/selections/types';
import { calculateTotals } from '@/lib/utils/selections';
import { formatCurrency } from '@/lib/utils/currency';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrKOB5GkXabzyY14E.ttf' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCM3FwrKOB5GkXWszw.ttf', fontWeight: 600 },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
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
    display: 'table',
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
  { key: 'sku', label: 'SKU', width: '18%' },
  { key: 'name', label: 'Name', width: '28%' },
  { key: 'qty', label: 'Qty', width: '8%' },
  { key: 'unitList', label: 'Unit List', width: '12%' },
  { key: 'programDisc', label: 'Disc', width: '8%' },
  { key: 'netUnit', label: 'Net Unit', width: '12%' },
  { key: 'extendedNet', label: 'Extended', width: '14%' },
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
  const totals = calculateTotals(selection.items);
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
          {selection.items.map((item) => (
            <View key={`${item.sku}-${item.notes ?? ''}`} style={styles.tableRow}>
              <View style={{ ...styles.tableCol, width: columns[0]!.width }}>
                <Text>{item.sku}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[1]!.width }}>
                <Text>{item.name}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[2]!.width }}>
                <Text>{item.qty}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[3]!.width }}>
                <Text>{formatCurrency(item.unitList)}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[4]!.width }}>
                <Text>{item.programDisc ? `${Math.round(item.programDisc * 100)}%` : '—'}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[5]!.width }}>
                <Text>{formatCurrency(item.netUnit)}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: columns[6]!.width }}>
                <Text>{formatCurrency(item.extendedNet)}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(totals.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Program Discounts</Text>
            <Text>-{formatCurrency(totals.totalDiscount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={{ fontWeight: 600 }}>Net Total</Text>
            <Text style={{ fontWeight: 600 }}>{formatCurrency(totals.netTotal)}</Text>
          </View>
          <Text style={styles.footerNote}>Curated Presentation • Prepared for {customerName}</Text>
        </View>
      </Page>
    </Document>
  );
}
