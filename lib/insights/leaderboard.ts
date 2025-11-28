import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Leaderboard Types
 */
export interface LeaderboardEntry {
  rank: number;
  sku: string;
  productName: string;
  collectionName: string;
  runRate: number;           // 3WMA units per week (retail)
  projectVolume: number;     // Excluded project units
  totalVolume: number;       // Total units (retail + project)
  trend: 'up' | 'down' | 'flat' | 'new';
  trendPercent: number;
  rankDelta: number;         // Position change from last week
  weeklyData: WeeklyDataPoint[];
  isNewIntro: boolean;
  firstSaleDate: string;
}

export interface WeeklyDataPoint {
  weekStart: string;
  retailUnits: number;
  projectUnits: number;
  movingAverage: number;
}

interface SalesRow {
  sku: string;
  itemDescription: string;
  postingDate: string;
  orderQuantity: number;
  amountExclVAT: number;
  customerNo: string;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Extract collection name from item description
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
      rows.push({
        sku: fields[0],
        itemDescription: fields[1],
        postingDate: fields[8],
        orderQuantity: parseFloat(fields[9]) || 0,
        amountExclVAT: parseFloat(fields[10]) || 0,
        customerNo: fields[4],
      });
    }
  }

  return rows;
}

/**
 * Calculate 3-Week Moving Average Leaderboard
 *
 * Filters:
 * - Project orders: Line items with qty > 4 are excluded from rank calculation
 * - Display orders: Would be filtered if we had order type field
 */
export async function calculateLeaderboard(
  customerId?: string,
  projectThreshold: number = 4
): Promise<LeaderboardEntry[]> {
  const csvPath = path.join(process.cwd(), 'data', 'libco-sales-2025.csv');

  try {
    const rows = await parseCSV(csvPath);

    // Filter by customer if specified
    const filteredRows = customerId
      ? rows.filter(r => {
          const slug = r.customerNo.toLowerCase();
          return slug === customerId.toLowerCase() ||
                 slug.includes(customerId.toLowerCase()) ||
                 customerId.toLowerCase().includes(slug);
        })
      : rows;

    // Group sales by COLLECTION and week (not by SKU)
    const collectionWeeklyData = new Map<string, {
      collectionName: string;
      skuCount: number;
      firstSaleDate: string;
      weeks: Map<string, { retail: number; project: number }>;
    }>();

    for (const row of filteredRows) {
      const weekStart = getWeekStart(new Date(row.postingDate));
      const isProject = row.orderQuantity > projectThreshold;
      const collectionName = extractCollectionName(row.itemDescription);

      if (!collectionWeeklyData.has(collectionName)) {
        collectionWeeklyData.set(collectionName, {
          collectionName,
          skuCount: 0,
          firstSaleDate: row.postingDate,
          weeks: new Map(),
        });
      }

      const collectionData = collectionWeeklyData.get(collectionName)!;

      // Track first sale date
      if (row.postingDate < collectionData.firstSaleDate) {
        collectionData.firstSaleDate = row.postingDate;
      }

      if (!collectionData.weeks.has(weekStart)) {
        collectionData.weeks.set(weekStart, { retail: 0, project: 0 });
      }

      const weekData = collectionData.weeks.get(weekStart)!;
      if (isProject) {
        weekData.project += row.orderQuantity;
      } else {
        weekData.retail += row.orderQuantity;
      }
    }

    // Count unique SKUs per collection
    const skusPerCollection = new Map<string, Set<string>>();
    for (const row of filteredRows) {
      const collectionName = extractCollectionName(row.itemDescription);
      if (!skusPerCollection.has(collectionName)) {
        skusPerCollection.set(collectionName, new Set());
      }
      skusPerCollection.get(collectionName)!.add(row.sku);
    }
    for (const [collectionName, skus] of Array.from(skusPerCollection)) {
      const data = collectionWeeklyData.get(collectionName);
      if (data) {
        data.skuCount = skus.size;
      }
    }

    // Get all weeks sorted
    const allWeeks = new Set<string>();
    for (const collectionData of Array.from(collectionWeeklyData.values())) {
      for (const week of Array.from(collectionData.weeks.keys())) {
        allWeeks.add(week);
      }
    }
    const sortedWeeks = Array.from(allWeeks).sort().reverse();

    // Need at least 3 weeks for 3WMA
    if (sortedWeeks.length < 3) {
      return [];
    }

    // Calculate 3WMA for each COLLECTION
    const leaderboardData: Array<{
      sku: string;
      productName: string;
      collectionName: string;
      current3WMA: number;
      previous3WMA: number;
      projectVolume: number;
      totalVolume: number;
      weeklyData: WeeklyDataPoint[];
      firstSaleDate: string;
    }> = [];

    for (const [collectionName, collectionData] of Array.from(collectionWeeklyData)) {
      // Get last 6 weeks of data for sparkline
      const weeklyData: WeeklyDataPoint[] = [];
      let totalRetail = 0;
      let totalProject = 0;

      for (let i = 0; i < Math.min(6, sortedWeeks.length); i++) {
        const week = sortedWeeks[i];
        const data = collectionData.weeks.get(week) || { retail: 0, project: 0 };
        totalRetail += data.retail;
        totalProject += data.project;

        // Calculate 3WMA for this week
        let ma = 0;
        let count = 0;
        for (let j = i; j < Math.min(i + 3, sortedWeeks.length); j++) {
          const maWeek = sortedWeeks[j];
          const maData = collectionData.weeks.get(maWeek) || { retail: 0, project: 0 };
          ma += maData.retail;
          count++;
        }
        ma = count > 0 ? ma / count : 0;

        weeklyData.unshift({
          weekStart: week,
          retailUnits: data.retail,
          projectUnits: data.project,
          movingAverage: Math.round(ma * 10) / 10,
        });
      }

      // Current 3WMA (weeks 0, 1, 2)
      let current3WMA = 0;
      for (let i = 0; i < 3 && i < sortedWeeks.length; i++) {
        const week = sortedWeeks[i];
        const data = collectionData.weeks.get(week) || { retail: 0, project: 0 };
        current3WMA += data.retail;
      }
      current3WMA = current3WMA / 3;

      // Previous 3WMA (weeks 1, 2, 3)
      let previous3WMA = 0;
      for (let i = 1; i < 4 && i < sortedWeeks.length; i++) {
        const week = sortedWeeks[i];
        const data = collectionData.weeks.get(week) || { retail: 0, project: 0 };
        previous3WMA += data.retail;
      }
      previous3WMA = previous3WMA / 3;

      leaderboardData.push({
        sku: `${collectionData.skuCount} SKUs`, // Show SKU count instead of individual SKU
        productName: collectionName,
        collectionName: collectionName,
        current3WMA,
        previous3WMA,
        projectVolume: totalProject,
        totalVolume: totalRetail + totalProject,
        weeklyData,
        firstSaleDate: collectionData.firstSaleDate,
      });
    }

    // Sort by current 3WMA to get ranks
    leaderboardData.sort((a, b) => b.current3WMA - a.current3WMA);

    // Calculate previous ranks for rank delta
    const previousRanks = [...leaderboardData]
      .sort((a, b) => b.previous3WMA - a.previous3WMA)
      .reduce((acc, item, index) => {
        acc.set(item.sku, index + 1);
        return acc;
      }, new Map<string, number>());

    // Determine if item is a "new intro" (first sale within last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    // Build final leaderboard entries
    const leaderboard: LeaderboardEntry[] = leaderboardData.map((item, index) => {
      const currentRank = index + 1;
      const previousRank = previousRanks.get(item.sku) || currentRank;
      const rankDelta = previousRank - currentRank;

      // Calculate trend
      let trend: 'up' | 'down' | 'flat' | 'new';
      let trendPercent = 0;

      if (item.previous3WMA === 0 && item.current3WMA > 0) {
        trend = 'new';
      } else if (item.previous3WMA > 0) {
        trendPercent = ((item.current3WMA - item.previous3WMA) / item.previous3WMA) * 100;
        if (trendPercent > 5) {
          trend = 'up';
        } else if (trendPercent < -5) {
          trend = 'down';
        } else {
          trend = 'flat';
        }
      } else {
        trend = 'flat';
      }

      const isNewIntro = item.firstSaleDate >= sixMonthsAgoStr;

      return {
        rank: currentRank,
        sku: item.sku,
        productName: item.productName,
        collectionName: item.collectionName,
        runRate: Math.round(item.current3WMA * 10) / 10,
        projectVolume: item.projectVolume,
        totalVolume: item.totalVolume,
        trend,
        trendPercent: Math.round(trendPercent),
        rankDelta,
        weeklyData: item.weeklyData,
        isNewIntro,
        firstSaleDate: item.firstSaleDate,
      };
    });

    return leaderboard;
  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    return [];
  }
}

/**
 * Get "Hot New Intros" - items that jumped >10 spots
 * Aggregates by collection to avoid showing multiple SKUs from the same collection
 * Only shows items with actual previous sales (rankDelta is meaningful)
 */
export function getHotNewIntros(leaderboard: LeaderboardEntry[]): LeaderboardEntry[] {
  // Filter for new intros with meaningful rank jumps
  // Exclude items where previous3WMA was 0 (no previous data = infinite jump)
  const validIntros = leaderboard.filter(item => {
    if (!item.isNewIntro || item.rankDelta <= 10) return false;

    // Check if there was actual previous week data
    // If all weekly data points are from the most recent period only, skip
    const hasHistoricalData = item.weeklyData.length >= 4 &&
      item.weeklyData.slice(0, -3).some(w => w.retailUnits > 0);

    return hasHistoricalData;
  });

  // Aggregate by collection - only show the best performer from each collection
  const collectionMap = new Map<string, LeaderboardEntry>();
  for (const item of validIntros) {
    const existing = collectionMap.get(item.collectionName);
    if (!existing || item.rankDelta > existing.rankDelta) {
      collectionMap.set(item.collectionName, item);
    }
  }

  return Array.from(collectionMap.values())
    .sort((a, b) => b.rankDelta - a.rankDelta);
}

/**
 * Get territory-wide leaderboard (all customers)
 */
export async function getTerritoryLeaderboard(
  projectThreshold: number = 4
): Promise<LeaderboardEntry[]> {
  return calculateLeaderboard(undefined, projectThreshold);
}
