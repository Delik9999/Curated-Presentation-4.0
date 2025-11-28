/**
 * Convert Lib&Co Item Sales By Location Excel report to CSV
 * Handles the grouped/nested structure of the Excel export
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Input/output paths
const inputFile = process.argv[2] || path.join(
  process.env.HOME,
  'Downloads',
  'item-sales-by-location-report-November_25th,_2025-04_51pm.xlsx'
);
const outputFile = path.join(__dirname, '..', 'data', 'libco-sales-history.csv');

console.log('Reading:', inputFile);

const workbook = XLSX.readFile(inputFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// CSV output rows
const csvRows = [];
csvRows.push([
  'SKU',
  'ItemDescription',
  'CumulativeUnitsCanada',
  'Province',
  'CustomerNo',
  'CustomerName',
  'SalesRep',
  'Currency',
  'PostingDate',
  'OrderQuantity',
  'AmountExclVAT',
  'AmountInclVAT'
]);

// State tracking
let currentSku = '';
let currentItemDescription = '';
let currentCumulativeUnits = 0;
let currentCountry = '';
let currentProvince = '';

// Process each row
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;

  const firstCell = String(row[0] || '').trim();
  const secondCell = String(row[1] || '').trim();

  // Skip empty rows
  if (!firstCell && !secondCell) continue;

  // Detect SKU header row (e.g., "10101-01", "Catania, 1 Light LED Pendant...")
  // SKU pattern: digits-digits
  if (/^\d{4,5}-\d{2,3}$/.test(firstCell)) {
    currentSku = firstCell;
    currentItemDescription = secondCell;
    // Look for cumulative units in the same row (column index 5)
    if (row[5] && typeof row[5] === 'number') {
      currentCumulativeUnits = row[5];
    } else {
      currentCumulativeUnits = 0;
    }
    continue;
  }

  // Detect country row
  if (firstCell.startsWith('Country:')) {
    currentCountry = firstCell.replace('Country:', '').trim();
    continue;
  }

  // Detect province/state row
  if (firstCell.startsWith('Province/State:')) {
    currentProvince = firstCell.replace('Province/State:', '').trim();
    continue;
  }

  // Skip header rows (Customer No., etc.)
  if (firstCell === 'Customer No.' || firstCell === 'Item No.') {
    continue;
  }

  // Skip total/summary rows
  if (secondCell.includes('Total') || firstCell.includes('Total')) {
    continue;
  }

  // Detect actual data row (Customer No. starts with C followed by digits)
  if (/^C\d{4,5}$/.test(firstCell) && currentSku) {
    const customerNo = firstCell;
    const customerName = String(row[1] || '');
    const salesRep = String(row[2] || '');
    const currency = String(row[3] || '');
    const postingDate = row[4];
    const orderQuantity = row[5] || 0;
    const amountExclVAT = row[6] || 0;
    const amountInclVAT = row[7] || 0;

    // Convert date to YYYY-MM-DD format
    let formattedDate = '';
    if (postingDate) {
      if (typeof postingDate === 'number') {
        // Excel serial date
        const date = XLSX.SSF.parse_date_code(postingDate);
        formattedDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else if (typeof postingDate === 'string') {
        // Parse MM-DD-YYYY format
        const parts = postingDate.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
        } else {
          formattedDate = postingDate;
        }
      }
    }

    csvRows.push([
      currentSku,
      `"${currentItemDescription.replace(/"/g, '""')}"`,
      currentCumulativeUnits,
      currentProvince,
      customerNo,
      customerName,
      salesRep,
      currency,
      formattedDate,
      orderQuantity,
      amountExclVAT,
      amountInclVAT
    ]);
  }
}

// Write CSV
const csvContent = csvRows.map(row => row.join(',')).join('\n');
fs.writeFileSync(outputFile, csvContent);

console.log(`\nConverted ${csvRows.length - 1} sales records`);
console.log('Output written to:', outputFile);

// Show date range
const dates = csvRows.slice(1).map(r => r[8]).filter(Boolean).sort();
if (dates.length > 0) {
  console.log(`\nDate range: ${dates[0]} to ${dates[dates.length - 1]}`);
}

// Show unique years
const years = new Set(dates.map(d => d.split('-')[0]));
console.log('Years covered:', Array.from(years).sort().join(', '));
