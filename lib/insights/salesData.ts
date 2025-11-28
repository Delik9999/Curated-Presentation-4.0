import { promises as fs } from 'fs';
import * as path from 'path';
import type { CustomerInsights, CollectionPerformance, MonthlySales, GhostPerformer, SwapCandidate, DisplayMixRecommendation, NewIntroRecommendation, OpportunityCollection, TopSkuNotOnDisplay } from './types';

interface SalesRow {
  sku: string;
  itemDescription: string;
  customerNo: string;
  customerName: string;
  postingDate: string;
  orderQuantity: number;
  amountExclVAT: number;
  province: string;
}

interface SkuSales {
  sku: string;
  productName: string;
  collectionName: string;
  totalUnits: number;
  totalRevenue: number;
  monthlySales: Map<string, { units: number; revenue: number }>;
}

interface CollectionSales {
  collectionName: string;
  totalUnits: number;
  totalRevenue: number;
  monthlySales: Map<string, { units: number; revenue: number }>;
  skus: Map<string, SkuSales>;
}

interface CustomerSalesData {
  customerNo: string;
  customerName: string;
  collections: Map<string, CollectionSales>;
}

/**
 * Extract collection name from item description
 * e.g., "Catania, 1 Light LED Pendant, Chrome" -> "Catania"
 */
function extractCollectionName(itemDescription: string): string {
  const parts = itemDescription.split(',');
  return parts[0].trim();
}

/**
 * Extract month abbreviation from posting date
 * e.g., "2025-07-08" -> "Jul"
 */
function extractMonth(postingDate: string): string {
  const date = new Date(postingDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()];
}

/**
 * Generate customer slug from customer name
 * e.g., "Signature Lighting and Fans" -> "signature-lighting-and-fans"
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
        province: fields[3],
        customerNo: fields[4],
        customerName: fields[5],
        postingDate: fields[8],
        orderQuantity: parseFloat(fields[9]) || 0,
        amountExclVAT: parseFloat(fields[10]) || 0,
      });
    }
  }

  return rows;
}

/**
 * Aggregate sales data by customer and collection
 */
function aggregateSales(rows: SalesRow[]): Map<string, CustomerSalesData> {
  const customerMap = new Map<string, CustomerSalesData>();

  for (const row of rows) {
    const customerKey = row.customerNo;
    const collectionName = extractCollectionName(row.itemDescription);
    const month = extractMonth(row.postingDate);

    // Get or create customer
    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, {
        customerNo: row.customerNo,
        customerName: row.customerName,
        collections: new Map(),
      });
    }
    const customer = customerMap.get(customerKey)!;

    // Get or create collection
    if (!customer.collections.has(collectionName)) {
      customer.collections.set(collectionName, {
        collectionName,
        totalUnits: 0,
        totalRevenue: 0,
        monthlySales: new Map(),
        skus: new Map(),
      });
    }
    const collection = customer.collections.get(collectionName)!;

    // Add to totals
    collection.totalUnits += row.orderQuantity;
    collection.totalRevenue += row.amountExclVAT;

    // Add to monthly sales
    if (!collection.monthlySales.has(month)) {
      collection.monthlySales.set(month, { units: 0, revenue: 0 });
    }
    const monthData = collection.monthlySales.get(month)!;
    monthData.units += row.orderQuantity;
    monthData.revenue += row.amountExclVAT;

    // Track SKU-level sales
    if (!collection.skus.has(row.sku)) {
      collection.skus.set(row.sku, {
        sku: row.sku,
        productName: row.itemDescription,
        collectionName,
        totalUnits: 0,
        totalRevenue: 0,
        monthlySales: new Map(),
      });
    }
    const skuData = collection.skus.get(row.sku)!;
    skuData.totalUnits += row.orderQuantity;
    skuData.totalRevenue += row.amountExclVAT;

    if (!skuData.monthlySales.has(month)) {
      skuData.monthlySales.set(month, { units: 0, revenue: 0 });
    }
    const skuMonthData = skuData.monthlySales.get(month)!;
    skuMonthData.units += row.orderQuantity;
    skuMonthData.revenue += row.amountExclVAT;
  }

  return customerMap;
}

/**
 * Calculate territory averages per collection
 * Returns average units and revenue per store in the territory
 */
function calculateTerritoryAverages(rows: SalesRow[]): Map<string, { avgUnits: number; avgRevenue: number; totalRevenue: number }> {
  const collectionSales = new Map<string, { units: number; revenue: number; customers: Set<string> }>();

  for (const row of rows) {
    const collectionName = extractCollectionName(row.itemDescription);

    if (!collectionSales.has(collectionName)) {
      collectionSales.set(collectionName, { units: 0, revenue: 0, customers: new Set() });
    }
    const data = collectionSales.get(collectionName)!;
    data.units += row.orderQuantity;
    data.revenue += row.amountExclVAT;
    data.customers.add(row.customerNo);
  }

  // Calculate average per customer (store)
  const averages = new Map<string, { avgUnits: number; avgRevenue: number; totalRevenue: number }>();
  Array.from(collectionSales.entries()).forEach(([collection, data]) => {
    const avgUnits = data.units / data.customers.size;
    const avgRevenue = data.revenue / data.customers.size;
    averages.set(collection, { avgUnits, avgRevenue, totalRevenue: data.revenue });
  });

  return averages;
}

/**
 * Convert monthly sales map to array format
 */
function convertMonthlySales(monthlySales: Map<string, { units: number; revenue: number }>): MonthlySales[] {
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result: MonthlySales[] = [];

  for (const month of monthOrder) {
    const data = monthlySales.get(month);
    if (data) {
      result.push({
        month,
        units: Math.round(data.units),
        revenue: Math.round(data.revenue),
      });
    }
  }

  return result;
}

/**
 * Build CustomerInsights from real sales data
 */
export async function buildCustomerInsightsFromSales(customerId: string): Promise<CustomerInsights | null> {
  const csvPath = path.join(process.cwd(), 'data', 'libco-sales-2025.csv');

  try {
    const rows = await parseCSV(csvPath);
    const customerMap = aggregateSales(rows);
    const territoryAverages = calculateTerritoryAverages(rows);

    // Find customer by ID (try CustomerNo first, then by slug match)
    let customerData: CustomerSalesData | null = null;

    // Direct CustomerNo match (e.g., "C00070")
    if (customerMap.has(customerId)) {
      customerData = customerMap.get(customerId)!;
    } else {
      // Try to match by slug with fuzzy matching
      const entries = Array.from(customerMap.values());
      const customerIdLower = customerId.toLowerCase();

      for (const data of entries) {
        const slug = generateSlug(data.customerName);

        // Direct slug match
        if (slug === customerIdLower || customerIdLower.includes(slug) || slug.includes(customerIdLower)) {
          customerData = data;
          break;
        }

        // Fuzzy match: check if key words from CSV name appear in app customer ID
        const csvWords = data.customerName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const matchingWords = csvWords.filter(word => customerIdLower.includes(word));

        // If most key words match (at least 2 and more than half), consider it a match
        if (matchingWords.length >= 2 && matchingWords.length >= csvWords.length * 0.5) {
          customerData = data;
          break;
        }
      }
    }

    if (!customerData) {
      return null;
    }

    // Build collection performance data
    const topCollections: CollectionPerformance[] = [];
    let totalUnits = 0;
    let maxRevenue = 0;

    // First pass: calculate base metrics and find max revenue
    const collectionData: Array<{
      collection: typeof customerData.collections extends Map<string, infer V> ? V : never;
      territoryAvg: { avgUnits: number; avgRevenue: number; totalRevenue: number };
      performanceIndex: number;
    }> = [];

    for (const collection of Array.from(customerData.collections.values())) {
      const territoryAvg = territoryAverages.get(collection.collectionName) || { avgUnits: 1, avgRevenue: 0, totalRevenue: 0 };
      const performanceIndex = collection.totalUnits / territoryAvg.avgUnits;
      totalUnits += collection.totalUnits;
      maxRevenue = Math.max(maxRevenue, collection.totalRevenue);
      collectionData.push({ collection, territoryAvg, performanceIndex });
    }

    // Second pass: calculate normalized metrics and quadrants
    for (const { collection, territoryAvg, performanceIndex } of collectionData) {
      // Normalize sales velocity (0-1 scale)
      const salesVelocityIndex = maxRevenue > 0 ? collection.totalRevenue / maxRevenue : 0;

      // Display presence (will be overridden by API with real data)
      const displayPresenceScore = 0;
      const marketAvgPresence = 2; // Default market average

      // Determine quadrant based on sales velocity and display presence
      // Must be at least 15% of top seller to be considered "high sales"
      const highSales = salesVelocityIndex > 0.15;
      const highDisplay = false; // Will be updated by API

      let quadrant: 'unrealized' | 'optimized' | 'evaluate' | 'sleeper';
      if (highSales && !highDisplay) {
        quadrant = 'unrealized'; // High sales, low display - biggest opportunity
      } else if (highSales && highDisplay) {
        quadrant = 'optimized'; // High sales, high display - maintain
      } else if (!highSales && highDisplay) {
        quadrant = 'evaluate'; // Low sales, high display - evaluate
      } else {
        quadrant = 'sleeper'; // Low sales, low display - ignore
      }

      // Calculate projected revenue lift based on gap to territory average
      // If below average: potential to close the gap
      // If above average: smaller incremental lift (10%)
      const gapToAverage = territoryAvg.avgRevenue - collection.totalRevenue;
      const projectedRevenueLift = quadrant === 'unrealized'
        ? gapToAverage > 0
          ? Math.round(gapToAverage)  // Close the gap to average
          : Math.round(collection.totalRevenue * 0.1)  // 10% lift if already above average
        : 0;

      // Opportunity flag: high sales velocity but low presence
      const opportunityFlag = salesVelocityIndex > 0.5 && displayPresenceScore < marketAvgPresence;

      topCollections.push({
        collectionName: collection.collectionName,
        unitsCustomer: Math.round(collection.totalUnits),
        unitsTerritoryPerStore: Math.round(territoryAvg.avgUnits * 10) / 10,
        revenueCustomer: Math.round(collection.totalRevenue),
        performanceIndex: Math.round(performanceIndex * 100) / 100,
        onDisplay: false, // Will be overridden by real display data
        hasNewIntros: false, // Would need catalog data to determine
        monthlySales: convertMonthlySales(collection.monthlySales),
        salesVelocityIndex: Math.round(salesVelocityIndex * 100) / 100,
        displayPresenceScore,
        marketAvgPresence,
        opportunityFlag,
        projectedRevenueLift,
        quadrant,
        // Efficiency Engine fields (will be calculated in API with real display data)
        turnRate: 0,
        stockingDealerAvgTurns: Math.round(territoryAvg.avgUnits * 10) / 10,
        efficiencyStatus: 'ghost' as const,
        // Lifecycle fields (will be calculated in API with real display data)
        monthsOnFloor: 0,
      });
    }

    // Sort by revenue descending
    topCollections.sort((a, b) => b.revenueCustomer - a.revenueCustomer);

    // Calculate opportunity collections (high territory sales, low customer performance)
    const opportunityCollections: OpportunityCollection[] = [];

    // Find collections with high total territory revenue but customer is underperforming
    Array.from(territoryAverages.entries()).forEach(([collectionName, avgData]) => {
      const customerCollection = customerData.collections.get(collectionName);
      const customerUnits = customerCollection?.totalUnits || 0;
      const customerRevenue = customerCollection?.totalRevenue || 0;
      const performanceIndex = customerUnits / avgData.avgUnits;

      // Only include if customer is underperforming (index < 0.8) and territory has decent sales
      if (performanceIndex < 0.8 && avgData.totalRevenue > 5000) {
        const opportunityGap = avgData.avgRevenue - customerRevenue;

        opportunityCollections.push({
          collectionName,
          territoryAvgUnits: Math.round(avgData.avgUnits * 10) / 10,
          territoryAvgRevenue: Math.round(avgData.avgRevenue),
          customerUnits: Math.round(customerUnits),
          customerRevenue: Math.round(customerRevenue),
          opportunityGap: Math.round(opportunityGap),
          performanceIndex: Math.round(performanceIndex * 100) / 100,
        });
      }
    });

    // Sort by opportunity gap (biggest missed opportunity first)
    opportunityCollections.sort((a, b) => b.opportunityGap - a.opportunityGap);

    // Get top SKUs not on display (will be filtered by display data in API route)
    const allSkus: TopSkuNotOnDisplay[] = [];

    for (const collection of Array.from(customerData.collections.values())) {
      for (const sku of Array.from(collection.skus.values())) {
        allSkus.push({
          sku: sku.sku,
          collectionName: sku.collectionName,
          productName: sku.productName,
          unitsCustomer: Math.round(sku.totalUnits),
          revenueCustomer: Math.round(sku.totalRevenue),
          monthlySales: convertMonthlySales(sku.monthlySales),
        });
      }
    }

    // Sort by revenue and take top ones
    allSkus.sort((a, b) => b.revenueCustomer - a.revenueCustomer);

    // Determine period label from data
    const dates = rows
      .filter(r => r.customerNo === customerData!.customerNo)
      .map(r => new Date(r.postingDate))
      .sort((a, b) => a.getTime() - b.getTime());

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const periodLabel = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Generate placeholder recommendations (would need more data for real recommendations)
    const ghostPerformers: GhostPerformer[] = [];
    const swapCandidates: SwapCandidate[] = [];
    const displayMix: DisplayMixRecommendation[] = topCollections.slice(0, 7).map((c, i) => ({
      collectionName: c.collectionName,
      recommendedFaces: Math.max(2, 8 - i),
    }));
    const newIntroRecommendations: NewIntroRecommendation[] = [];

    return {
      customerId: customerData.customerNo,
      customerName: customerData.customerName,
      periodLabel,
      totalUnits: Math.round(totalUnits),
      totalCollectionsActive: topCollections.length,
      topCollections,
      ghostPerformers,
      swapCandidates,
      displayMix,
      newIntroRecommendations,
      opportunityCollections: opportunityCollections.slice(0, 10), // Top 10 opportunities
      topSkusNotOnDisplay: allSkus.slice(0, 20), // Top 20 SKUs, will be filtered by display data
      nonPerformingAssets: [], // Will be populated by API with real display data
    };
  } catch (error) {
    console.error('Error building insights from sales data:', error);
    return null;
  }
}

/**
 * Get all customer IDs from sales data
 */
export async function getCustomerIdsFromSales(): Promise<Array<{ customerNo: string; customerName: string; slug: string }>> {
  const csvPath = path.join(process.cwd(), 'data', 'libco-sales-2025.csv');

  try {
    const rows = await parseCSV(csvPath);
    const customers = new Map<string, string>();

    for (const row of rows) {
      if (!customers.has(row.customerNo)) {
        customers.set(row.customerNo, row.customerName);
      }
    }

    return Array.from(customers.entries()).map(([customerNo, customerName]) => ({
      customerNo,
      customerName,
      slug: generateSlug(customerName),
    }));
  } catch (error) {
    console.error('Error getting customer IDs from sales:', error);
    return [];
  }
}

/**
 * Get all collections from the territory with their average sales
 * Returns a map of collection name to average units and revenue per store
 */
export async function getTerritoryCollections(): Promise<Map<string, { avgUnits: number; avgRevenue: number; totalRevenue: number }>> {
  const csvPath = path.join(process.cwd(), 'data', 'libco-sales-2025.csv');

  try {
    const rows = await parseCSV(csvPath);
    return calculateTerritoryAverages(rows);
  } catch (error) {
    console.error('Error getting territory collections:', error);
    return new Map();
  }
}
