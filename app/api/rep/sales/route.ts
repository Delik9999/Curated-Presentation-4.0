import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type SalesRecord = {
  sku: string;
  itemDescription: string;
  province: string;
  customerNo: string;
  customerName: string;
  salesRep: string;
  currency: string;
  postingDate: string;
  orderQuantity: number;
  amountExclVAT: number;
  amountInclVAT: number;
};

type CollectionSales = {
  collectionName: string;
  sales: number;
  units: number;
  percentage: number;
};

type CustomerSales = {
  customerNo: string;
  customerName: string;
  totalSales: number;
  totalUnits: number;
  monthlySales: Record<string, number>;
  topCollections: CollectionSales[];
};

type SalesData = {
  totalSales: number;
  totalUnits: number;
  monthlySales: { month: string; sales: number; units: number }[];
  customers: CustomerSales[];
  year: number;
};

type MultiYearMonthlySales = {
  month: string;
  [year: string]: number | string; // e.g., sales2023, sales2024, sales2025
};

type CustomerYoYData = {
  customerNo: string;
  customerName: string;
  currentYearSales: number;
  previousYearSales: number;
  growthAmount: number;
  growthPercent: number;
};

type MultiYearSalesData = {
  years: number[];
  monthlySales: MultiYearMonthlySales[];
  customerYoY: CustomerYoYData[];
  totalsByYear: Record<number, { sales: number; units: number; customers: number }>;
};

function parseCSV(content: string): SalesRecord[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    // Handle CSV with quoted fields containing commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return {
      sku: values[0] || '',
      itemDescription: values[1] || '',
      province: values[3] || '',
      customerNo: values[4] || '',
      customerName: values[5] || '',
      salesRep: values[6] || '',
      currency: values[7] || '',
      postingDate: values[8] || '',
      orderQuantity: parseFloat(values[9]) || 0,
      amountExclVAT: parseFloat(values[10]) || 0,
      amountInclVAT: parseFloat(values[11]) || 0,
    };
  });
}

function extractCollectionName(itemDescription: string): string {
  // Format: "CollectionName, product details"
  const commaIndex = itemDescription.indexOf(',');
  if (commaIndex > 0) {
    return itemDescription.substring(0, commaIndex).trim();
  }
  return itemDescription.trim();
}

function aggregateSalesData(records: SalesRecord[], year: number): SalesData {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize monthly totals
  const monthlyTotals: Record<string, { sales: number; units: number }> = {};
  monthNames.forEach(month => {
    monthlyTotals[month] = { sales: 0, units: 0 };
  });

  // Aggregate by customer with collection tracking
  const customerMap = new Map<string, {
    customerNo: string;
    customerName: string;
    totalSales: number;
    totalUnits: number;
    monthlySales: Record<string, number>;
    collectionSales: Map<string, { sales: number; units: number }>;
  }>();

  let totalSales = 0;
  let totalUnits = 0;

  for (const record of records) {
    // Parse date
    const date = new Date(record.postingDate);
    if (isNaN(date.getTime())) continue;

    // Filter by year
    if (date.getFullYear() !== year) continue;

    const monthIndex = date.getMonth();
    const monthName = monthNames[monthIndex];
    const collectionName = extractCollectionName(record.itemDescription);

    // Update totals
    totalSales += record.amountExclVAT;
    totalUnits += record.orderQuantity;

    // Update monthly totals
    monthlyTotals[monthName].sales += record.amountExclVAT;
    monthlyTotals[monthName].units += record.orderQuantity;

    // Update customer data
    if (!customerMap.has(record.customerNo)) {
      const monthlySales: Record<string, number> = {};
      monthNames.forEach(m => { monthlySales[m] = 0; });

      customerMap.set(record.customerNo, {
        customerNo: record.customerNo,
        customerName: record.customerName,
        totalSales: 0,
        totalUnits: 0,
        monthlySales,
        collectionSales: new Map(),
      });
    }

    const customer = customerMap.get(record.customerNo)!;
    customer.totalSales += record.amountExclVAT;
    customer.totalUnits += record.orderQuantity;
    customer.monthlySales[monthName] += record.amountExclVAT;

    // Track collection sales
    if (!customer.collectionSales.has(collectionName)) {
      customer.collectionSales.set(collectionName, { sales: 0, units: 0 });
    }
    const collection = customer.collectionSales.get(collectionName)!;
    collection.sales += record.amountExclVAT;
    collection.units += record.orderQuantity;
  }

  // Convert to arrays and sort
  const monthlySales = monthNames.map(month => ({
    month,
    sales: monthlyTotals[month].sales,
    units: monthlyTotals[month].units,
  }));

  // Convert customers with top collections
  const customers: CustomerSales[] = Array.from(customerMap.values())
    .map(customer => {
      // Get top 5 collections by sales
      const topCollections = Array.from(customer.collectionSales.entries())
        .map(([collectionName, data]) => ({
          collectionName,
          sales: data.sales,
          units: data.units,
          percentage: customer.totalSales > 0
            ? Math.round((data.sales / customer.totalSales) * 1000) / 10
            : 0,
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      return {
        customerNo: customer.customerNo,
        customerName: customer.customerName,
        totalSales: customer.totalSales,
        totalUnits: customer.totalUnits,
        monthlySales: customer.monthlySales,
        topCollections,
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales);

  return {
    totalSales,
    totalUnits,
    monthlySales,
    customers,
    year,
  };
}

function aggregateMultiYearData(records: SalesRecord[]): MultiYearSalesData {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get all unique years
  const yearsSet = new Set<number>();
  for (const record of records) {
    const date = new Date(record.postingDate);
    if (!isNaN(date.getTime())) {
      yearsSet.add(date.getFullYear());
    }
  }
  const years = Array.from(yearsSet).sort();

  // Initialize monthly sales structure
  const monthlyData: Record<string, Record<number, number>> = {};
  monthNames.forEach(month => {
    monthlyData[month] = {};
    years.forEach(year => {
      monthlyData[month][year] = 0;
    });
  });

  // Aggregate totals by year
  const totalsByYear: Record<number, { sales: number; units: number; customers: Set<string> }> = {};
  years.forEach(year => {
    totalsByYear[year] = { sales: 0, units: 0, customers: new Set() };
  });

  // Aggregate by customer and year
  const customerYearSales = new Map<string, { name: string; byYear: Record<number, number> }>();

  for (const record of records) {
    const date = new Date(record.postingDate);
    if (isNaN(date.getTime())) continue;

    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const monthName = monthNames[monthIndex];

    // Update monthly data
    if (monthlyData[monthName] && monthlyData[monthName][year] !== undefined) {
      monthlyData[monthName][year] += record.amountExclVAT;
    }

    // Update yearly totals
    if (totalsByYear[year]) {
      totalsByYear[year].sales += record.amountExclVAT;
      totalsByYear[year].units += record.orderQuantity;
      totalsByYear[year].customers.add(record.customerNo);
    }

    // Update customer sales by year
    if (!customerYearSales.has(record.customerNo)) {
      const byYear: Record<number, number> = {};
      years.forEach(y => { byYear[y] = 0; });
      customerYearSales.set(record.customerNo, {
        name: record.customerName,
        byYear,
      });
    }
    const customerData = customerYearSales.get(record.customerNo)!;
    customerData.byYear[year] = (customerData.byYear[year] || 0) + record.amountExclVAT;
  }

  // Convert monthly data to array
  const monthlySales: MultiYearMonthlySales[] = monthNames.map(month => {
    const entry: MultiYearMonthlySales = { month };
    years.forEach(year => {
      entry[`sales${year}`] = Math.round(monthlyData[month][year]);
    });
    return entry;
  });

  // Calculate YoY for customers (using most recent two years)
  const currentYear = years[years.length - 1] || new Date().getFullYear();
  const previousYear = years[years.length - 2] || currentYear - 1;

  const customerYoY: CustomerYoYData[] = Array.from(customerYearSales.entries())
    .map(([customerNo, data]) => {
      const currentYearSales = data.byYear[currentYear] || 0;
      const previousYearSales = data.byYear[previousYear] || 0;
      const growthAmount = currentYearSales - previousYearSales;
      const growthPercent = previousYearSales > 0
        ? ((currentYearSales - previousYearSales) / previousYearSales) * 100
        : (currentYearSales > 0 ? 100 : 0);

      return {
        customerNo,
        customerName: data.name,
        currentYearSales: Math.round(currentYearSales),
        previousYearSales: Math.round(previousYearSales),
        growthAmount: Math.round(growthAmount),
        growthPercent: Math.round(growthPercent * 10) / 10,
      };
    })
    .sort((a, b) => b.growthAmount - a.growthAmount);

  // Convert totals
  const formattedTotals: Record<number, { sales: number; units: number; customers: number }> = {};
  years.forEach(year => {
    formattedTotals[year] = {
      sales: Math.round(totalsByYear[year].sales),
      units: Math.round(totalsByYear[year].units),
      customers: totalsByYear[year].customers.size,
    };
  });

  return {
    years,
    monthlySales,
    customerYoY,
    totalsByYear: formattedTotals,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendor = searchParams.get('vendor') || 'lib-and-co';
    const mode = searchParams.get('mode') || 'single-year';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);

    // Currently only Lib & Co has sales data
    if (vendor !== 'lib-and-co') {
      return NextResponse.json({
        totalSales: 0,
        totalUnits: 0,
        monthlySales: [],
        customers: [],
        year,
        message: `No sales data available for ${vendor}`,
      });
    }

    // Load CSV file - use history file with multi-year data
    const filePath = path.join(process.cwd(), 'data', 'libco-sales-history.csv');
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse records
    const records = parseCSV(content);

    // Multi-year mode returns data for all years
    if (mode === 'multi-year') {
      const multiYearData = aggregateMultiYearData(records);
      return NextResponse.json(multiYearData);
    }

    // Single-year mode (default)
    const salesData = aggregateSalesData(records, year);
    return NextResponse.json(salesData);
  } catch (error) {
    console.error('[Sales API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load sales data' },
      { status: 500 }
    );
  }
}
