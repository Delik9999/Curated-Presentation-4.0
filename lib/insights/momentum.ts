import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Luxury Momentum Engine Types
 * Uses Annualized Revenue Per Display (ARPD) for ranking
 */
export type MomentumStatus = 'rent-payer' | 'rising-star' | 'high-value-stable' | 'decelerating' | 'stable';

export interface MomentumEntry {
  rank: number;
  collectionName: string;
  skuCount: number;
  // Productivity (The Hero Metric)
  productivityScore: number;      // ARPD: Total Revenue / Stocking Dealers
  totalRevenue: number;           // L12M revenue
  stockingDealerCount: number;    // Dealers with displays
  avgUnitPrice: number;           // Average sale price
  isHighTicket: boolean;          // > $2,500 avg price
  // Momentum
  revenueMomentumDelta: number;   // Revenue trend %
  status: MomentumStatus;
  // Volumes
  retailUnits: number;
  projectUnits: number;
  // Chart data
  weeklyData: WeeklyMomentumPoint[];
}

export interface WeeklyMomentumPoint {
  weekStart: string;
  revenue: number;
  signalMA: number;      // 4-week revenue MA
  baselineMA: number;    // 12-week revenue MA
  stockingVolume: number;     // Wide orders (8+ SKUs, depth <2)
  replenishmentVolume: number; // Standard orders (proof of sell-through)
  projectVolume: number;      // Deep orders (depth >4, pass-through)
}

export interface MomentumGroups {
  rentPayers: MomentumEntry[];      // Top productivity
  risingStars: MomentumEntry[];     // High momentum
  highValueStable: MomentumEntry[]; // Flat but high value
  decelerating: MomentumEntry[];    // Losing momentum
  other: MomentumEntry[];           // Everything else
}

interface SalesRow {
  sku: string;
  itemDescription: string;
  postingDate: string;
  orderQuantity: number;
  amountExclVAT: number;
  customerNo: string;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function extractCollectionName(itemDescription: string): string {
  const parts = itemDescription.split(',');
  return parts[0].trim();
}

async function parseCSV(filePath: string): Promise<SalesRow[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const rows: SalesRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

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
 * Calculate Luxury Momentum using ARPD (Annualized Revenue Per Display)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function calculateMomentum(
  customerId?: string,
  projectThreshold: number = 4,
  minStockingDealers: number = 1
): Promise<MomentumGroups> {
  const csvPath = path.join(process.cwd(), 'data', 'libco-sales-2025.csv');

  try {
    const rows = await parseCSV(csvPath);

    // For territory-wide analysis, use all data
    // For customer-specific, filter by customer
    const filteredRows = customerId
      ? rows.filter(r => {
          const slug = r.customerNo.toLowerCase();
          return slug === customerId.toLowerCase() ||
                 slug.includes(customerId.toLowerCase()) ||
                 customerId.toLowerCase().includes(slug);
        })
      : rows;

    // Step 1: Group rows by ORDER (customer + date = one order)
    // This allows Width/Depth classification at order level
    const orderMap = new Map<string, {
      customerNo: string;
      postingDate: string;
      items: { sku: string; qty: number; amount: number; description: string }[];
    }>();

    for (const row of filteredRows) {
      const orderKey = `${row.customerNo}|${row.postingDate}`;

      if (!orderMap.has(orderKey)) {
        orderMap.set(orderKey, {
          customerNo: row.customerNo,
          postingDate: row.postingDate,
          items: [],
        });
      }

      orderMap.get(orderKey)!.items.push({
        sku: row.sku,
        qty: row.orderQuantity,
        amount: row.amountExclVAT,
        description: row.itemDescription,
      });
    }

    // Step 2: Classify each order using Width/Depth algorithm
    type OrderType = 'STOCKING' | 'PROJECT' | 'REPLENISH';

    function classifyOrder(items: { sku: string; qty: number }[]): OrderType {
      // Calculate "Width" (unique SKUs) and "Depth" (avg units per line item)
      const totalUnits = items.reduce((acc, item) => acc + item.qty, 0);
      const uniqueSKUs = new Set(items.map(i => i.sku)).size;
      const depthRatio = uniqueSKUs > 0 ? totalUnits / uniqueSKUs : 0;

      // Wide Order: Many items, 1-2 of each = STOCKING
      if (uniqueSKUs >= 8 && depthRatio < 2) {
        return 'STOCKING';
      }

      // Deep Order: Avg 4+ of same item = PROJECT
      if (depthRatio > 4) {
        return 'PROJECT';
      }

      // Standard flow = REPLENISH
      return 'REPLENISH';
    }

    // Step 3: Group by collection with order-level classification
    const collectionData = new Map<string, {
      skus: Set<string>;
      customers: Set<string>;
      totalRevenue: number;
      totalUnits: number;
      projectUnits: number;
      weeks: Map<string, {
        revenue: number;
        units: number;
        stockingVolume: number;
        replenishmentVolume: number;
        projectVolume: number;
      }>;
    }>();

    for (const [, order] of orderMap) {
      const weekStart = getWeekStart(new Date(order.postingDate));
      const orderType = classifyOrder(order.items);

      // Process each item in the order
      for (const item of order.items) {
        const collectionName = extractCollectionName(item.description);

        if (!collectionData.has(collectionName)) {
          collectionData.set(collectionName, {
            skus: new Set(),
            customers: new Set(),
            totalRevenue: 0,
            totalUnits: 0,
            projectUnits: 0,
            weeks: new Map(),
          });
        }

        const data = collectionData.get(collectionName)!;
        data.skus.add(item.sku);
        data.customers.add(order.customerNo);
        data.totalRevenue += item.amount;
        data.totalUnits += item.qty;

        if (orderType === 'PROJECT') {
          data.projectUnits += item.qty;
        }

        if (!data.weeks.has(weekStart)) {
          data.weeks.set(weekStart, {
            revenue: 0,
            units: 0,
            stockingVolume: 0,
            replenishmentVolume: 0,
            projectVolume: 0,
          });
        }
        const weekData = data.weeks.get(weekStart)!;
        weekData.revenue += item.amount;
        weekData.units += item.qty;

        // Classify volume by order type
        switch (orderType) {
          case 'STOCKING':
            weekData.stockingVolume += item.amount;
            break;
          case 'PROJECT':
            weekData.projectVolume += item.amount;
            break;
          case 'REPLENISH':
            weekData.replenishmentVolume += item.amount;
            break;
        }
      }
    }

    // Get sorted weeks
    const allWeeks = new Set<string>();
    for (const data of collectionData.values()) {
      for (const week of data.weeks.keys()) {
        allWeeks.add(week);
      }
    }
    const sortedWeeks = Array.from(allWeeks).sort().reverse();

    if (sortedWeeks.length < 4) {
      return { rentPayers: [], risingStars: [], highValueStable: [], decelerating: [], other: [] };
    }

    // Load display data to get stocking dealer counts
    const displaysByCollection = new Map<string, Set<string>>();
    try {
      const displaysPath = path.join(process.cwd(), 'data', 'displays.json');
      const displaysContent = await fs.readFile(displaysPath, 'utf-8');
      const displaysData = JSON.parse(displaysContent);

      for (const display of (displaysData.displays || [])) {
        if (!displaysByCollection.has(display.collectionName)) {
          displaysByCollection.set(display.collectionName, new Set());
        }
        displaysByCollection.get(display.collectionName)!.add(display.customerId);
      }
    } catch {
      // Use customer count as proxy if no display data
      for (const [collectionName, data] of collectionData) {
        displaysByCollection.set(collectionName, data.customers);
      }
    }

    // Calculate momentum for each collection
    const momentumData: MomentumEntry[] = [];

    for (const [collectionName, data] of collectionData) {
      // Ghost Filter: Skip if no revenue
      if (data.totalRevenue === 0) continue;

      // Get stocking dealer count - use actual customer count from sales as source of truth
      // (displays.json may be incomplete)
      const stockingDealers = data.customers.size;

      // Sample Size Filter: Skip if too few dealers (for territory-wide only)
      if (!customerId && stockingDealers < minStockingDealers) continue;

      // Calculate ARPD (Productivity Score)
      const productivityScore = stockingDealers > 0
        ? Math.round(data.totalRevenue / stockingDealers)
        : data.totalRevenue;

      // Calculate average unit price
      const avgUnitPrice = data.totalUnits > 0
        ? Math.round(data.totalRevenue / data.totalUnits)
        : 0;

      // High ticket flag (>$2,500)
      const isHighTicket = avgUnitPrice > 2500;

      // Calculate revenue momentum (4wk vs 12wk)
      let revenue4Week = 0;
      let revenue12Week = 0;

      for (let i = 0; i < Math.min(12, sortedWeeks.length); i++) {
        const week = sortedWeeks[i];
        const weekSales = data.weeks.get(week) || { revenue: 0, units: 0 };

        if (i < 4) revenue4Week += weekSales.revenue;
        revenue12Week += weekSales.revenue;
      }

      const avg4Week = revenue4Week / Math.min(4, sortedWeeks.length);
      const avg12Week = revenue12Week / Math.min(12, sortedWeeks.length);

      const revenueMomentumDelta = avg12Week > 0
        ? Math.round(((avg4Week - avg12Week) / avg12Week) * 100)
        : 0;

      // Build weekly data for sparkline - include ALL weeks for full history view
      const weeklyData: WeeklyMomentumPoint[] = [];
      for (let i = 0; i < sortedWeeks.length; i++) {
        const week = sortedWeeks[i];
        const weekSales = data.weeks.get(week) || {
          revenue: 0,
          units: 0,
          stockingVolume: 0,
          replenishmentVolume: 0,
          projectVolume: 0,
        };

        // Calculate rolling MAs
        let ma4 = 0, ma12 = 0;
        let count4 = 0, count12 = 0;

        for (let j = i; j < Math.min(i + 4, sortedWeeks.length); j++) {
          const maWeek = sortedWeeks[j];
          const maSales = data.weeks.get(maWeek) || {
            revenue: 0,
            units: 0,
            stockingVolume: 0,
            replenishmentVolume: 0,
            projectVolume: 0,
          };
          ma4 += maSales.revenue;
          count4++;
        }

        for (let j = i; j < Math.min(i + 12, sortedWeeks.length); j++) {
          const maWeek = sortedWeeks[j];
          const maSales = data.weeks.get(maWeek) || {
            revenue: 0,
            units: 0,
            stockingVolume: 0,
            replenishmentVolume: 0,
            projectVolume: 0,
          };
          ma12 += maSales.revenue;
          count12++;
        }

        weeklyData.unshift({
          weekStart: week,
          revenue: weekSales.revenue,
          signalMA: count4 > 0 ? Math.round(ma4 / count4) : 0,
          baselineMA: count12 > 0 ? Math.round(ma12 / count12) : 0,
          stockingVolume: weekSales.stockingVolume,
          replenishmentVolume: weekSales.replenishmentVolume,
          projectVolume: weekSales.projectVolume,
        });
      }

      // Determine status
      let status: MomentumStatus;
      if (revenueMomentumDelta >= 15) {
        status = 'rising-star';
      } else if (revenueMomentumDelta <= -10) {
        status = 'decelerating';
      } else if (productivityScore >= 5000) {
        status = 'high-value-stable';
      } else {
        status = 'stable';
      }

      momentumData.push({
        rank: 0,
        collectionName,
        skuCount: data.skus.size,
        productivityScore,
        totalRevenue: Math.round(data.totalRevenue),
        stockingDealerCount: stockingDealers,
        avgUnitPrice,
        isHighTicket,
        revenueMomentumDelta,
        status,
        retailUnits: Math.round(data.totalUnits - data.projectUnits),
        projectUnits: Math.round(data.projectUnits),
        weeklyData,
      });
    }

    // Sort by Productivity Score (ARPD) - high to low
    momentumData.sort((a, b) => b.productivityScore - a.productivityScore);
    momentumData.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Mark top performers as rent-payers (top 20% or top 5, whichever is larger)
    // Rent Payers are purely based on ARPD ranking - momentum shown separately
    const rentPayerThreshold = Math.max(5, Math.ceil(momentumData.length * 0.2));
    for (let i = 0; i < rentPayerThreshold && i < momentumData.length; i++) {
      momentumData[i].status = 'rent-payer';
    }

    // Group into buckets
    // Rising Stars and Decelerating only show collections NOT already in Rent Payers
    const groups: MomentumGroups = {
      rentPayers: momentumData.filter(m => m.status === 'rent-payer'),
      risingStars: momentumData.filter(m => m.status !== 'rent-payer' && m.revenueMomentumDelta >= 15),
      highValueStable: momentumData.filter(m => m.status === 'high-value-stable'),
      decelerating: momentumData.filter(m => m.status !== 'rent-payer' && m.revenueMomentumDelta <= -10),
      other: momentumData.filter(m => m.status === 'stable'),
    };

    return groups;
  } catch (error) {
    console.error('Error calculating momentum:', error);
    return { rentPayers: [], risingStars: [], highValueStable: [], decelerating: [], other: [] };
  }
}

export async function getMomentumLeaderboard(
  customerId?: string,
  projectThreshold: number = 4,
  limit: number = 15
): Promise<MomentumEntry[]> {
  const groups = await calculateMomentum(customerId, projectThreshold);
  const all = [
    ...groups.rentPayers,
    ...groups.risingStars,
    ...groups.highValueStable,
    ...groups.other,
    ...groups.decelerating,
  ].sort((a, b) => a.rank - b.rank);

  return all.slice(0, limit);
}
