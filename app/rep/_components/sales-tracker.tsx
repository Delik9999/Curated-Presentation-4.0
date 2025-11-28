'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

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
  message?: string;
};

type MultiYearMonthlySales = {
  month: string;
  [key: string]: number | string;
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

// Color palette for different years
const YEAR_COLORS: Record<number, string> = {
  2023: '#94a3b8', // slate-400
  2024: '#3b82f6', // blue-500
  2025: '#10b981', // emerald-500
  2026: '#f59e0b', // amber-500
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-CA').format(value);
}

function CustomerRow({ customer, rank }: { customer: CustomerSales; rank: number }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const monthlyData = Object.entries(customer.monthlySales).map(([month, sales]) => ({
    month,
    sales,
  }));

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-12">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">{rank}</TableCell>
        <TableCell>
          <div>
            <div className="font-medium">{customer.customerName}</div>
            <div className="text-xs text-muted-foreground">{customer.customerNo}</div>
          </div>
        </TableCell>
        <TableCell className="text-right font-mono font-semibold">
          {formatCurrency(customer.totalSales)}
        </TableCell>
        <TableCell className="text-right font-mono">
          {formatNumber(customer.totalUnits)}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-neutral-50 dark:bg-neutral-800/30 p-4">
            <div className="space-y-4">
              {/* Monthly Sales Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      className="text-xs text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      className="text-xs text-muted-foreground"
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Sales']}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="sales"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Collections */}
              {customer.topCollections && customer.topCollections.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Collections</h4>
                  <div className="grid gap-2">
                    {customer.topCollections.map((collection, index) => (
                      <div
                        key={collection.collectionName}
                        className="flex items-center justify-between text-sm py-1.5 px-3 rounded-md bg-white dark:bg-neutral-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-4">{index + 1}.</span>
                          <span className="font-medium">{collection.collectionName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-muted-foreground">
                            {formatCurrency(collection.sales)}
                          </span>
                          <span className="font-mono font-semibold w-16 text-right">
                            {collection.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function CustomerYoYRow({ customer, rank }: { customer: CustomerYoYData; rank: number }) {
  const isPositive = customer.growthAmount >= 0;

  return (
    <TableRow>
      <TableCell className="font-medium">{rank}</TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{customer.customerName}</div>
          <div className="text-xs text-muted-foreground">{customer.customerNo}</div>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatCurrency(customer.previousYearSales)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatCurrency(customer.currentYearSales)}
      </TableCell>
      <TableCell className="text-right">
        <div className={`flex items-center justify-end gap-1 font-mono font-semibold ${
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          {formatCurrency(Math.abs(customer.growthAmount))}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-sm ${
          isPositive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {isPositive ? '+' : ''}{customer.growthPercent}%
        </span>
      </TableCell>
    </TableRow>
  );
}

export default function SalesTracker() {
  const [salesData, setSalesData] = React.useState<SalesData | null>(null);
  const [multiYearData, setMultiYearData] = React.useState<MultiYearSalesData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadSalesData() {
      try {
        // Load both single-year (2025) and multi-year data
        const [singleYearRes, multiYearRes] = await Promise.all([
          fetch('/api/rep/sales?vendor=lib-and-co&year=2025'),
          fetch('/api/rep/sales?vendor=lib-and-co&mode=multi-year'),
        ]);

        if (!singleYearRes.ok || !multiYearRes.ok) {
          throw new Error('Failed to fetch sales data');
        }

        const [singleYearData, multiYearDataResult] = await Promise.all([
          singleYearRes.json(),
          multiYearRes.json(),
        ]);

        setSalesData(singleYearData);
        setMultiYearData(multiYearDataResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadSalesData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !salesData) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {error || 'No sales data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (salesData.message) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{salesData.message}</p>
        </CardContent>
      </Card>
    );
  }

  const years = multiYearData?.years || [2025];
  const currentYear = years[years.length - 1] || 2025;
  const previousYear = years[years.length - 2] || 2024;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {multiYearData && years.map((year) => (
          <Card key={year}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{year} Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(multiYearData.totalsByYear[year]?.sales || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(multiYearData.totalsByYear[year]?.customers || 0)} customers
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Multi-Year Monthly Sales Chart */}
      {multiYearData && multiYearData.monthlySales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Sales by Year
            </CardTitle>
            <CardDescription>
              Lib & Co. sales comparison across years
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={multiYearData.monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-sm text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    className="text-sm text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const year = name.replace('sales', '');
                      return [formatCurrency(value), year];
                    }}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend
                    formatter={(value: string) => value.replace('sales', '')}
                  />
                  {years.map((year) => (
                    <Line
                      key={year}
                      type="monotone"
                      dataKey={`sales${year}`}
                      name={`sales${year}`}
                      stroke={YEAR_COLORS[year] || '#6b7280'}
                      strokeWidth={year === currentYear ? 3 : 2}
                      dot={{ fill: YEAR_COLORS[year] || '#6b7280', strokeWidth: 0, r: year === currentYear ? 4 : 3 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer YoY Comparison */}
      {multiYearData && multiYearData.customerYoY.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {multiYearData.customerYoY[0].growthAmount >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              Customer Year-over-Year Growth
            </CardTitle>
            <CardDescription>
              {previousYear} vs {currentYear} sales comparison - sorted by growth amount
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">{previousYear}</TableHead>
                    <TableHead className="text-right">{currentYear}</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Growth %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {multiYearData.customerYoY.slice(0, 20).map((customer, index) => (
                    <CustomerYoYRow
                      key={customer.customerNo}
                      customer={customer}
                      rank={index + 1}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Leaderboard (Current Year) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Sales Leaderboard - {salesData.year}
          </CardTitle>
          <CardDescription>
            Click on a customer to see their monthly breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.customers.map((customer, index) => (
                  <CustomerRow
                    key={customer.customerNo}
                    customer={customer}
                    rank={index + 1}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
