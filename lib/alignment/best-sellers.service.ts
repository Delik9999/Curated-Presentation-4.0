import { promises as fs } from 'fs';
import * as path from 'path';
import type { DisplayItem } from '@/lib/displays/types';
import { getWorkingSelection } from '@/lib/selections/store';

interface SalesRow {
  sku: string;
  itemDescription: string;
  customerNo: string;
  customerName: string;
  postingDate: string;
  orderQuantity: number;
  amountExclVAT: number;
  province: string;
  year: number;
}

export interface CollectionBestSeller {
  collectionName: string;
  totalRevenue: number;
  totalUnits: number;
  customerCount: number;  // How many customers bought this
  rank: number;
}

export interface YearOverYearGrowth {
  collectionName: string;
  currentYearRevenue: number;
  previousYearRevenue: number;
  growthPercent: number;
  growthAmount: number;
}

export interface CustomerYearOverYear {
  customerId: string;
  customerName: string;
  currentYearRevenue: number;
  previousYearRevenue: number;
  growthPercent: number;
  growthAmount: number;
  collectionsOrdered: string[];
}

export interface BestSellersReport {
  customerId: string;
  vendorId: string;
  territoryBestSellers: CollectionBestSeller[];
  recommendedBestSellers: CollectionBestSeller[];  // Filtered: collections customer doesn't have
  customerCollections: string[];  // Collections customer already has (displays + orders)
  yearOverYearGrowth?: YearOverYearGrowth[];
  customerGrowth?: CustomerYearOverYear;
}

// Sales data file - uses history file with multi-year data
const SALES_FILE = 'libco-sales-history.csv';

/**
 * Extract collection name from item description
 * e.g., "Catania, 1 Light LED Pendant, Chrome" -> "Catania"
 */
function extractCollectionName(itemDescription: string): string {
  const parts = itemDescription.split(',');
  return parts[0].trim();
}

/**
 * Parse CSV file and return sales rows
 */
async function parseCSV(filePath: string): Promise<SalesRow[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const rows: SalesRow[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV with proper handling of quoted fields
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(field);
        field = '';
      } else {
        field += char;
      }
    }
    fields.push(field);

    if (fields.length >= 11) {
      const postingDate = fields[8];
      const year = postingDate ? parseInt(postingDate.split('-')[0], 10) : 0;

      rows.push({
        sku: fields[0],
        itemDescription: fields[1],
        province: fields[3],
        customerNo: fields[4],
        customerName: fields[5],
        postingDate,
        orderQuantity: parseFloat(fields[9]) || 0,
        amountExclVAT: parseFloat(fields[10]) || 0,
        year,
      });
    }
  }

  return rows;
}

/**
 * Load customer displays from displays.json
 */
async function loadCustomerDisplays(customerId: string): Promise<string[]> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'displays.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    const displays: DisplayItem[] = data.displays || [];
    const customerDisplays = displays.filter(d =>
      d.customerId === customerId &&
      d.status !== 'ARCHIVED'
    );

    // Get unique collection names from displays
    const collections = new Set<string>();
    customerDisplays.forEach(d => {
      if (d.collectionName) {
        collections.add(d.collectionName);
      }
    });

    return Array.from(collections);
  } catch (error) {
    console.error('[loadCustomerDisplays] Error:', error);
    return [];
  }
}

/**
 * Get all sales data (optionally filtered by year)
 */
async function getSalesData(vendorId: string, year?: number): Promise<SalesRow[]> {
  if (vendorId !== 'lib-and-co') {
    return [];
  }

  const csvPath = path.join(process.cwd(), 'data', SALES_FILE);

  try {
    const rows = await parseCSV(csvPath);
    if (year) {
      return rows.filter(r => r.year === year);
    }
    return rows;
  } catch (error) {
    console.error('[getSalesData] Error:', error);
    return [];
  }
}

/**
 * Get territory-wide best sellers ranked by total revenue
 * @param vendorId - vendor to get data for
 * @param year - optional year filter (defaults to current year)
 */
export async function getTerritoryBestSellers(
  vendorId: string = 'lib-and-co',
  year?: number
): Promise<CollectionBestSeller[]> {
  // Currently only lib-and-co has sales data
  if (vendorId !== 'lib-and-co') {
    return [];
  }

  // Default to current year if not specified
  const targetYear = year || new Date().getFullYear();
  const rows = await getSalesData(vendorId, targetYear);

  // Aggregate by collection
  const collectionMap = new Map<string, {
    totalRevenue: number;
    totalUnits: number;
    customers: Set<string>;
  }>();

  for (const row of rows) {
    const collectionName = extractCollectionName(row.itemDescription);

    if (!collectionMap.has(collectionName)) {
      collectionMap.set(collectionName, {
        totalRevenue: 0,
        totalUnits: 0,
        customers: new Set(),
      });
    }

    const data = collectionMap.get(collectionName)!;
    data.totalRevenue += row.amountExclVAT;
    data.totalUnits += row.orderQuantity;
    data.customers.add(row.customerNo);
  }

  // Convert to array and sort by revenue
  const bestSellers: CollectionBestSeller[] = [];
  let rank = 1;

  const sorted = Array.from(collectionMap.entries())
    .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue);

  for (const [collectionName, data] of sorted) {
    bestSellers.push({
      collectionName,
      totalRevenue: Math.round(data.totalRevenue),
      totalUnits: Math.round(data.totalUnits),
      customerCount: data.customers.size,
      rank: rank++,
    });
  }

  return bestSellers;
}

/**
 * Get year-over-year growth for all collections
 */
export async function getCollectionYearOverYear(
  vendorId: string = 'lib-and-co',
  currentYear?: number
): Promise<YearOverYearGrowth[]> {
  const targetYear = currentYear || new Date().getFullYear();
  const previousYear = targetYear - 1;

  const [currentRows, previousRows] = await Promise.all([
    getSalesData(vendorId, targetYear),
    getSalesData(vendorId, previousYear),
  ]);

  // Aggregate current year by collection
  const currentMap = new Map<string, number>();
  for (const row of currentRows) {
    const collection = extractCollectionName(row.itemDescription);
    currentMap.set(collection, (currentMap.get(collection) || 0) + row.amountExclVAT);
  }

  // Aggregate previous year by collection
  const previousMap = new Map<string, number>();
  for (const row of previousRows) {
    const collection = extractCollectionName(row.itemDescription);
    previousMap.set(collection, (previousMap.get(collection) || 0) + row.amountExclVAT);
  }

  // Calculate YoY growth
  const allCollections = new Set([...currentMap.keys(), ...previousMap.keys()]);
  const growth: YearOverYearGrowth[] = [];

  for (const collectionName of allCollections) {
    const currentRevenue = currentMap.get(collectionName) || 0;
    const previousRevenue = previousMap.get(collectionName) || 0;
    const growthAmount = currentRevenue - previousRevenue;
    const growthPercent = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : (currentRevenue > 0 ? 100 : 0);

    growth.push({
      collectionName,
      currentYearRevenue: Math.round(currentRevenue),
      previousYearRevenue: Math.round(previousRevenue),
      growthPercent: Math.round(growthPercent * 10) / 10,
      growthAmount: Math.round(growthAmount),
    });
  }

  // Sort by growth amount descending
  return growth.sort((a, b) => b.growthAmount - a.growthAmount);
}

/**
 * Get year-over-year growth for a specific customer
 */
export async function getCustomerYearOverYear(
  customerId: string,
  vendorId: string = 'lib-and-co',
  currentYear?: number
): Promise<CustomerYearOverYear | null> {
  const targetYear = currentYear || new Date().getFullYear();
  const previousYear = targetYear - 1;

  const allRows = await getSalesData(vendorId);

  // Filter to this customer
  const customerRows = allRows.filter(r => r.customerNo === customerId);
  if (customerRows.length === 0) {
    return null;
  }

  const customerName = customerRows[0]?.customerName || customerId;

  // Aggregate by year
  const currentYearRows = customerRows.filter(r => r.year === targetYear);
  const previousYearRows = customerRows.filter(r => r.year === previousYear);

  const currentRevenue = currentYearRows.reduce((sum, r) => sum + r.amountExclVAT, 0);
  const previousRevenue = previousYearRows.reduce((sum, r) => sum + r.amountExclVAT, 0);
  const growthAmount = currentRevenue - previousRevenue;
  const growthPercent = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : (currentRevenue > 0 ? 100 : 0);

  // Get collections ordered this year
  const collections = new Set<string>();
  currentYearRows.forEach(r => {
    collections.add(extractCollectionName(r.itemDescription));
  });

  return {
    customerId,
    customerName,
    currentYearRevenue: Math.round(currentRevenue),
    previousYearRevenue: Math.round(previousRevenue),
    growthPercent: Math.round(growthPercent * 10) / 10,
    growthAmount: Math.round(growthAmount),
    collectionsOrdered: Array.from(collections),
  };
}

/**
 * Get sales history for a customer by year
 */
export async function getCustomerSalesHistory(
  customerId: string,
  vendorId: string = 'lib-and-co'
): Promise<{ year: number; revenue: number; units: number; collections: string[] }[]> {
  const allRows = await getSalesData(vendorId);
  const customerRows = allRows.filter(r => r.customerNo === customerId);

  // Group by year
  const yearMap = new Map<number, { revenue: number; units: number; collections: Set<string> }>();

  for (const row of customerRows) {
    if (!yearMap.has(row.year)) {
      yearMap.set(row.year, { revenue: 0, units: 0, collections: new Set() });
    }
    const data = yearMap.get(row.year)!;
    data.revenue += row.amountExclVAT;
    data.units += row.orderQuantity;
    data.collections.add(extractCollectionName(row.itemDescription));
  }

  // Convert to array sorted by year
  return Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, data]) => ({
      year,
      revenue: Math.round(data.revenue),
      units: Math.round(data.units),
      collections: Array.from(data.collections),
    }));
}

/**
 * Get best sellers that customer doesn't have (not in displays or orders)
 */
export async function getBestSellersReport(
  customerId: string,
  vendorId: string = 'lib-and-co'
): Promise<BestSellersReport> {
  // Get all territory best sellers for current year
  const territoryBestSellers = await getTerritoryBestSellers(vendorId);

  // Get collections customer already has from:
  // 1. Their working selection (market orders)
  // 2. Their displays
  const customerCollections = new Set<string>();

  // From working selection
  const workingSelection = await getWorkingSelection(customerId, vendorId);
  if (workingSelection) {
    for (const item of workingSelection.items) {
      if (item.collection) {
        customerCollections.add(item.collection.toLowerCase());
      }
    }
  }

  // From displays
  const displayCollections = await loadCustomerDisplays(customerId);
  for (const collection of displayCollections) {
    customerCollections.add(collection.toLowerCase());
  }

  console.log('[getBestSellersReport] Customer collections:', Array.from(customerCollections));

  // Filter out collections customer already has
  const recommendedBestSellers = territoryBestSellers
    .filter(bs => !customerCollections.has(bs.collectionName.toLowerCase()))
    .slice(0, 10); // Top 10 recommendations

  console.log('[getBestSellersReport] Recommended best sellers:', recommendedBestSellers.map(bs => bs.collectionName));

  // Get year-over-year data
  const [yearOverYearGrowth, customerGrowth] = await Promise.all([
    getCollectionYearOverYear(vendorId),
    getCustomerYearOverYear(customerId, vendorId),
  ]);

  return {
    customerId,
    vendorId,
    territoryBestSellers,
    recommendedBestSellers,
    customerCollections: Array.from(customerCollections),
    yearOverYearGrowth: yearOverYearGrowth.slice(0, 20), // Top 20 growing collections
    customerGrowth: customerGrowth || undefined,
  };
}

/**
 * Get available years in the sales data
 */
export async function getAvailableYears(vendorId: string = 'lib-and-co'): Promise<number[]> {
  const rows = await getSalesData(vendorId);
  const years = new Set<number>();

  for (const row of rows) {
    if (row.year) {
      years.add(row.year);
    }
  }

  return Array.from(years).sort();
}
