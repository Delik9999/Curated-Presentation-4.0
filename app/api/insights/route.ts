import { NextRequest, NextResponse } from 'next/server';
import { buildCustomerInsightsFromSales } from '@/lib/insights/salesData';
import { promises as fs } from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }

  try {
    // Build insights from real CSV sales data
    const insights = await buildCustomerInsightsFromSales(customerId);

    if (!insights) {
      return NextResponse.json({ error: 'No insights found for customer' }, { status: 404 });
    }

    // Get real display data for this customer
    try {
      const displaysPath = path.join(process.cwd(), 'data', 'displays.json');
      const displaysContent = await fs.readFile(displaysPath, 'utf-8');
      const displaysData = JSON.parse(displaysContent);
      const allDisplays = displaysData.displays || [];

      // Calculate market average presence per collection (across ALL showrooms with displays)
      // Group by collection -> customer -> display count
      const marketPresenceByCollection = new Map<string, Map<string, number>>();

      for (const display of allDisplays) {
        const faces = display.faces || 1;
        if (faces === 0) continue; // Skip zero-display entries

        if (!marketPresenceByCollection.has(display.collectionName)) {
          marketPresenceByCollection.set(display.collectionName, new Map());
        }
        const collectionCustomers = marketPresenceByCollection.get(display.collectionName)!;
        const currentCount = collectionCustomers.get(display.customerId) || 0;
        collectionCustomers.set(display.customerId, currentCount + faces);
      }

      // Calculate average displays per showroom for each collection (only counting showrooms that have it)
      const marketAvgPresenceByCollection = new Map<string, number>();
      for (const [collectionName, customerCounts] of marketPresenceByCollection) {
        if (customerCounts.size > 0) {
          const totalFaces = Array.from(customerCounts.values()).reduce((sum, count) => sum + count, 0);
          const avgPresence = totalFaces / customerCounts.size;
          marketAvgPresenceByCollection.set(collectionName, Math.round(avgPresence * 10) / 10);
        }
      }

      // Get displays for this customer (match by slug patterns)
      const customerDisplays = allDisplays.filter((d: { customerId: string }) => {
        return d.customerId === customerId ||
               d.customerId.includes(customerId) ||
               customerId.includes(d.customerId);
      });

      const displayedCollections = new Set<string>(
        customerDisplays.map((d: { collectionName: string }) => d.collectionName)
      );

      const displayedSkus = new Set<string>(
        customerDisplays.map((d: { sku: string }) => d.sku)
      );

      // Count displays per collection and calculate months on floor
      const displayCounts = new Map<string, number>();
      const displayAges = new Map<string, number[]>(); // collection -> array of months on floor
      const now = new Date();

      for (const display of customerDisplays) {
        const faces = display.faces || 1;
        const count = displayCounts.get(display.collectionName) || 0;
        displayCounts.set(display.collectionName, count + faces);

        // Calculate months on floor for this display
        if (display.installedAt) {
          const installedDate = new Date(display.installedAt);
          const days = Math.floor((now.getTime() - installedDate.getTime()) / (1000 * 60 * 60 * 24));
          const months = Math.max(0, days / 30);

          if (!displayAges.has(display.collectionName)) {
            displayAges.set(display.collectionName, []);
          }
          displayAges.get(display.collectionName)!.push(months);
        }
      }

      // Calculate average months on floor per collection
      const avgMonthsOnFloor = new Map<string, number>();
      for (const [collectionName, ages] of displayAges) {
        if (ages.length > 0) {
          const avg = ages.reduce((sum, age) => sum + age, 0) / ages.length;
          avgMonthsOnFloor.set(collectionName, Math.round(avg * 10) / 10);
        }
      }

      // Track collections on display for non-performing assets identification
      const collectionsOnDisplay = new Set<string>(displayCounts.keys());

      // Override onDisplay values and recalculate quadrants with real data
      if (insights.topCollections) {
        insights.topCollections = insights.topCollections.map(collection => {
          const displayCount = displayCounts.get(collection.collectionName) || 0;
          const onDisplay = displayCount > 0;
          // Collection needs meaningful sales to be a "hero"
          // Must be at least 15% of top seller's velocity
          const highSales = collection.salesVelocityIndex > 0.15;

          // Get real market average presence, fallback to 2.0 if no display data exists
          const realMarketAvgPresence = marketAvgPresenceByCollection.get(collection.collectionName) || 2.0;
          const highDisplay = displayCount >= realMarketAvgPresence;

          let quadrant: 'unrealized' | 'optimized' | 'evaluate' | 'sleeper';
          if (highSales && !highDisplay) {
            quadrant = 'unrealized';
          } else if (highSales && highDisplay) {
            quadrant = 'optimized';
          } else if (!highSales && highDisplay) {
            quadrant = 'evaluate';
          } else {
            quadrant = 'sleeper';
          }

          // Calculate turn rate (units sold / display count)
          const turnRate = displayCount > 0
            ? Math.round((collection.unitsCustomer / displayCount) * 10) / 10
            : 0;

          // Determine efficiency status
          let efficiencyStatus: 'star' | 'average' | 'drag' | 'ghost';
          if (displayCount === 0) {
            efficiencyStatus = 'ghost';
          } else if (turnRate >= collection.stockingDealerAvgTurns * 1.2) {
            efficiencyStatus = 'star'; // Beating market by 20%+
          } else if (turnRate < 1.0) {
            efficiencyStatus = 'drag'; // Less than 1 turn/year
          } else {
            efficiencyStatus = 'average';
          }

          // Get months on floor for this collection
          const monthsOnFloor = avgMonthsOnFloor.get(collection.collectionName) || 0;

          return {
            ...collection,
            onDisplay,
            displayPresenceScore: displayCount,
            marketAvgPresence: realMarketAvgPresence,
            quadrant,
            opportunityFlag: highSales && !highDisplay,
            turnRate,
            efficiencyStatus,
            monthsOnFloor,
          };
        });
      }

      // Identify non-performing assets (displayed but low/no sales)
      insights.nonPerformingAssets = insights.topCollections
        .filter(c => c.displayPresenceScore > 0 && c.turnRate < 1.0)
        .map(c => ({
          collectionName: c.collectionName,
          displayCount: c.displayPresenceScore,
          unitsSold: c.unitsCustomer,
          daysSinceLastSale: null, // Would need detailed sales data
          turnRate: c.turnRate,
        }))
        .sort((a, b) => a.turnRate - b.turnRate);

      // Update ghost performers - keep only those for collections not on display
      if (insights.ghostPerformers) {
        insights.ghostPerformers = insights.ghostPerformers.filter(gp =>
          !displayedCollections.has(gp.collectionName)
        );
      }

      // Update swap candidates - keep only those for collections actually on display
      if (insights.swapCandidates) {
        insights.swapCandidates = insights.swapCandidates.filter(sc =>
          displayedCollections.has(sc.collectionName)
        );
      }

      // Filter top SKUs to only include those not on display
      if (insights.topSkusNotOnDisplay) {
        insights.topSkusNotOnDisplay = insights.topSkusNotOnDisplay.filter(sku =>
          !displayedSkus.has(sku.sku)
        );
      }
    } catch (error) {
      console.error('Error loading display data:', error);
      // Continue with insights without display data
    }

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}
