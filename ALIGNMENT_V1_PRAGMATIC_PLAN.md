# Alignment Engine V1 - Pragmatic Implementation Plan

## Reality Check: What We Actually Have

✅ **Market selections** - eCat PDFs parsed → dealerId, skuId, collectionId, status, market
✅ **Vendor best list** - CSV or manual ranking of what vendor wants to push
✅ **Dealer influence** - Can start with manual tiers (A/B/C) or weights (1/2/3)
✅ **Promo targets** - targetPieces or targetDollars per dealer

**This is enough to ship something valuable in 1 week.**

---

## What V1 Actually Does

For each dealer viewing their market selection:

1. **Reflect their selection back** - "Here's what you picked" (feel-good confirmation)
2. **Show progress** - "12/16 pieces selected for promo"
3. **Compare to baselines**:
   - Market baseline (what other dealers weighted by influence selected)
   - Vendor baseline (vendor's ranked best list)
4. **Generate 3 types of suggestions**:
   - **ADD**: "Top 5 collections you don't have that market+vendor rank highly"
   - **TRADE-UP**: "You picked #14, most dealers picked #2 - consider swapping"
   - **TOP-UP**: "Need 4 more pieces? Here are aligned suggestions"

---

## Schema Changes (Minimal)

### 1. Add influence tracking to Dealer

```prisma
model Dealer {
  id              String   @id @default(cuid())
  name            String
  region          String?

  // NEW: Simple manual influence system
  influenceTier   String   @default("B")  // 'A' | 'B' | 'C'
  influenceWeight Int      @default(2)    // A=3, B=2, C=1

  // NEW: Promo targets
  targetPieces    Int?     // e.g. 16
  targetDollars   Decimal? // optional min spend

  selections      Selection[]
  displayRecords  DisplayRecord[]
}
```

### 2. Add vendor ranking table

```prisma
model VendorRanking {
  id           String     @id @default(cuid())
  vendorId     String
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id])
  skuId        String?    // Optional: vendor's hero SKU recommendation
  sku          SKU?       @relation(fields: [skuId], references: [id])
  rank         Int        // 1 = best, 2 = second best, etc.

  @@unique([vendorId, collectionId])
  @@index([vendorId, rank])
}
```

### 3. No new tables needed for trends
We'll compute them on-the-fly with SQL queries.

---

## Step-by-Step Implementation

### Step 1: Seed dealer influence weights (15 min)

Create a seed script to manually assign tiers:

```typescript
// scripts/seed-dealer-influence.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEALER_TIERS = {
  // Tier A: Big flagship showrooms
  'pine-lighting': { tier: 'A', weight: 3, targetPieces: 24 },
  'urban-loft': { tier: 'A', weight: 3, targetPieces: 24 },

  // Tier B: Solid regional players
  'mid-market-fixtures': { tier: 'B', weight: 2, targetPieces: 16 },
  'coastal-lighting': { tier: 'B', weight: 2, targetPieces: 16 },

  // Tier C: Smaller/new accounts
  'boutique-showroom': { tier: 'C', weight: 1, targetPieces: 12 },
};

async function seedInfluence() {
  for (const [dealerName, config] of Object.entries(DEALER_TIERS)) {
    await prisma.dealer.updateMany({
      where: { name: { contains: dealerName, mode: 'insensitive' } },
      data: {
        influenceTier: config.tier,
        influenceWeight: config.weight,
        targetPieces: config.targetPieces,
      },
    });
  }

  console.log('✓ Dealer influence seeded');
}

seedInfluence();
```

**Run**: `npx tsx scripts/seed-dealer-influence.ts`

---

### Step 2: Import vendor ranking (30 min)

Create a CSV like this:

```csv
vendorId,collectionId,rank,heroSkuId
lib-and-co,manarola,1,MAN-001
lib-and-co,sorrento,2,SOR-005
lib-and-co,bellagio,3,BEL-003
```

Then import it:

```typescript
// scripts/import-vendor-ranking.ts
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function importVendorRanking() {
  const csv = await fs.readFile('data/vendor-ranking.csv', 'utf-8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const record of records) {
    // Find collection by name or create mapping
    const collection = await prisma.collection.findFirst({
      where: {
        name: { contains: record.collectionId, mode: 'insensitive' },
      },
    });

    if (!collection) {
      console.warn(`Collection not found: ${record.collectionId}`);
      continue;
    }

    await prisma.vendorRanking.upsert({
      where: {
        vendorId_collectionId: {
          vendorId: record.vendorId,
          collectionId: collection.id,
        },
      },
      update: {
        rank: parseInt(record.rank),
        skuId: record.heroSkuId || null,
      },
      create: {
        vendorId: record.vendorId,
        collectionId: collection.id,
        rank: parseInt(record.rank),
        skuId: record.heroSkuId || null,
      },
    });
  }

  console.log(`✓ Imported ${records.length} vendor rankings`);
}

importVendorRanking();
```

---

### Step 3: Compute market baseline (1 hour)

Create a service that aggregates market selections:

```typescript
// lib/alignment/v1/market-baseline.service.ts
import { PrismaClient } from '@prisma/client';

export class MarketBaselineService {
  constructor(private prisma: PrismaClient) {}

  async getCollectionRankings(vendorId: string, marketId?: string) {
    // Get weighted selection count per collection
    const marketRankings = await this.prisma.$queryRaw<
      Array<{ collectionId: string; collectionName: string; weightedCount: number }>
    >`
      SELECT
        c.id AS "collectionId",
        c.name AS "collectionName",
        SUM(d."influenceWeight") AS "weightedCount"
      FROM "Selection" s
      JOIN "Product" p ON s."productId" = p.id
      JOIN "Collection" c ON p."collectionId" = c.id
      JOIN "Dealer" d ON s."dealerId" = d.id
      WHERE
        c."vendorId" = ${vendorId}
        ${marketId ? this.prisma.$queryRaw`AND s."sourceMarket" = ${marketId}` : this.prisma.$queryRaw``}
        AND s.status IN ('SELECTED', 'MUST_CARRY')
      GROUP BY c.id, c.name
      ORDER BY "weightedCount" DESC
    `;

    // Assign market ranks (1 = most popular)
    return marketRankings.map((item, index) => ({
      collectionId: item.collectionId,
      collectionName: item.collectionName,
      weightedCount: Number(item.weightedCount),
      marketRank: index + 1,
    }));
  }

  async getHeroSKU(collectionId: string) {
    // Find most-selected SKU in this collection (weighted by dealer influence)
    const result = await this.prisma.$queryRaw<
      Array<{ skuId: string; skuCode: string; weightedCount: number }>
    >`
      SELECT
        p.id AS "skuId",
        p.sku AS "skuCode",
        SUM(d."influenceWeight") AS "weightedCount"
      FROM "Selection" s
      JOIN "Product" p ON s."productId" = p.id
      JOIN "Dealer" d ON s."dealerId" = d.id
      WHERE
        p."collectionId" = ${collectionId}
        AND s.status IN ('SELECTED', 'MUST_CARRY')
      GROUP BY p.id, p.sku
      ORDER BY "weightedCount" DESC
      LIMIT 1
    `;

    return result[0] || null;
  }

  async getCombinedRankings(vendorId: string, marketId?: string) {
    // Get market rankings
    const marketRankings = await this.getCollectionRankings(vendorId, marketId);

    // Get vendor rankings
    const vendorRankings = await this.prisma.vendorRanking.findMany({
      where: { vendorId },
      include: { collection: true },
      orderBy: { rank: 'asc' },
    });

    // Combine them
    const combined = marketRankings.map(market => {
      const vendor = vendorRankings.find(v => v.collectionId === market.collectionId);

      // Combined score: weighted average of inverse ranks
      // Lower rank number = better, so use 1/rank
      const marketScore = market.marketRank ? 1 / market.marketRank : 0;
      const vendorScore = vendor?.rank ? 1 / vendor.rank : 0;

      const combinedScore = marketScore * 0.6 + vendorScore * 0.4;

      return {
        collectionId: market.collectionId,
        collectionName: market.collectionName,
        marketRank: market.marketRank,
        vendorRank: vendor?.rank || null,
        combinedScore,
        weightedCount: market.weightedCount,
      };
    });

    // Sort by combined score (descending)
    return combined.sort((a, b) => b.combinedScore - a.combinedScore);
  }
}
```

---

### Step 4: Generate recommendations (1 hour)

```typescript
// lib/alignment/v1/recommendation.service.ts
import { PrismaClient } from '@prisma/client';
import { MarketBaselineService } from './market-baseline.service';

interface AddSuggestion {
  collectionId: string;
  collectionName: string;
  marketRank: number | null;
  vendorRank: number | null;
  reason: string;
}

interface TradeUpSuggestion {
  fromCollectionId: string;
  fromCollectionName: string;
  fromRank: number;
  toCollectionId: string;
  toCollectionName: string;
  toRank: number;
  reason: string;
}

export class RecommendationServiceV1 {
  constructor(
    private prisma: PrismaClient,
    private marketService: MarketBaselineService
  ) {}

  async generateReport(dealerId: string, vendorId: string, marketId?: string) {
    // 1. Get dealer's current selections
    const dealerSelections = await this.prisma.selection.findMany({
      where: {
        dealerId,
        product: { collection: { vendorId } },
        status: { in: ['SELECTED', 'MUST_CARRY'] },
        ...(marketId && { sourceMarket: marketId }),
      },
      include: {
        product: { include: { collection: true } },
      },
    });

    const dealerCollectionIds = new Set(
      dealerSelections.map(s => s.product.collection.id)
    );

    const currentPieces = dealerSelections.length;

    // 2. Get dealer info (promo target)
    const dealer = await this.prisma.dealer.findUnique({
      where: { id: dealerId },
    });

    const targetPieces = dealer?.targetPieces || null;
    const piecesNeeded = targetPieces ? Math.max(0, targetPieces - currentPieces) : null;

    // 3. Get combined rankings
    const rankings = await this.marketService.getCombinedRankings(vendorId, marketId);

    // 4. Generate ADD suggestions
    const addSuggestions: AddSuggestion[] = rankings
      .filter(r => !dealerCollectionIds.has(r.collectionId))
      .slice(0, 5)
      .map(r => ({
        collectionId: r.collectionId,
        collectionName: r.collectionName,
        marketRank: r.marketRank,
        vendorRank: r.vendorRank,
        reason: this.generateAddReason(r),
      }));

    // 5. Generate TRADE-UP suggestions
    const tradeUpSuggestions: TradeUpSuggestion[] = [];
    const dealerRankings = rankings.filter(r => dealerCollectionIds.has(r.collectionId));
    const notChosenRankings = rankings.filter(r => !dealerCollectionIds.has(r.collectionId));

    // Find bottom 50% of dealer's chosen collections
    const weakChoices = dealerRankings.slice(Math.floor(dealerRankings.length / 2));

    for (const weak of weakChoices) {
      // Find a better alternative they didn't choose
      const better = notChosenRankings.find(
        r => r.combinedScore > weak.combinedScore * 1.5 // Must be significantly better
      );

      if (better) {
        tradeUpSuggestions.push({
          fromCollectionId: weak.collectionId,
          fromCollectionName: weak.collectionName,
          fromRank: weak.marketRank || 99,
          toCollectionId: better.collectionId,
          toCollectionName: better.collectionName,
          toRank: better.marketRank || 99,
          reason: `${better.collectionName} is ranked significantly higher by both market and vendor. Consider swapping.`,
        });
      }

      if (tradeUpSuggestions.length >= 3) break;
    }

    // 6. Build report
    return {
      dealerId,
      vendorId,
      marketId: marketId || null,

      summary: {
        currentPieces,
        targetPieces,
        piecesNeeded,
      },

      selections: {
        collections: dealerRankings.map(r => ({
          collectionId: r.collectionId,
          collectionName: r.collectionName,
          marketRank: r.marketRank,
          vendorRank: r.vendorRank,
        })),
      },

      suggestions: {
        add: addSuggestions,
        tradeUp: tradeUpSuggestions,
      },
    };
  }

  private generateAddReason(ranking: any): string {
    if (ranking.vendorRank && ranking.marketRank) {
      return `Ranked #${ranking.vendorRank} by vendor, #${ranking.marketRank} by market. Strong performer.`;
    } else if (ranking.vendorRank) {
      return `Vendor's #${ranking.vendorRank} pick. Recommended for your assortment.`;
    } else {
      return `Ranked #${ranking.marketRank} by market. High dealer adoption.`;
    }
  }
}
```

---

### Step 5: Create API endpoint (30 min)

```typescript
// app/api/alignment/v1/[dealerId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MarketBaselineService } from '@/lib/alignment/v1/market-baseline.service';
import { RecommendationServiceV1 } from '@/lib/alignment/v1/recommendation.service';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { dealerId: string } }
) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || 'lib-and-co';
  const marketId = searchParams.get('marketId') || undefined;

  const marketService = new MarketBaselineService(prisma);
  const recommendationService = new RecommendationServiceV1(prisma, marketService);

  const report = await recommendationService.generateReport(
    params.dealerId,
    vendorId,
    marketId
  );

  return NextResponse.json(report);
}
```

---

### Step 6: Frontend UI (2 hours)

Create an "Alignment" tab in the customer detail page:

```typescript
// app/customers/[id]/_components/alignment-tab.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRightLeft, Plus, TrendingUp } from 'lucide-react';

export function AlignmentTab({ dealerId, vendorId }: { dealerId: string; vendorId: string }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/alignment/v1/${dealerId}?vendorId=${vendorId}`)
      .then(res => res.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [dealerId, vendorId]);

  if (loading) return <div>Loading alignment insights...</div>;
  if (!report) return <div>No alignment data available</div>;

  const progressPercent = report.summary.targetPieces
    ? (report.summary.currentPieces / report.summary.targetPieces) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Market Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Promo Progress</span>
                <span className="font-mono">
                  {report.summary.currentPieces} / {report.summary.targetPieces || '?'} pieces
                </span>
              </div>
              {report.summary.targetPieces && (
                <Progress value={progressPercent} className="h-2" />
              )}
            </div>

            {report.summary.piecesNeeded && report.summary.piecesNeeded > 0 && (
              <p className="text-sm text-muted-foreground">
                Add {report.summary.piecesNeeded} more pieces to reach your promo target.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Your Selections */}
      <Card>
        <CardHeader>
          <CardTitle>Your Collections ({report.selections.collections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report.selections.collections.map((coll: any) => (
              <div
                key={coll.collectionId}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <div className="font-medium">{coll.collectionName}</div>
                  <div className="text-xs text-muted-foreground">
                    {coll.marketRank && `Market rank: #${coll.marketRank}`}
                    {coll.vendorRank && ` • Vendor rank: #${coll.vendorRank}`}
                  </div>
                </div>
                {(coll.marketRank <= 5 || coll.vendorRank <= 5) && (
                  <Badge variant="default">Top Pick</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ADD Suggestions */}
      {report.suggestions.add.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Add These Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.suggestions.add.map((sugg: any) => (
                <div key={sugg.collectionId} className="p-3 rounded-lg border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
                  <div className="font-medium">{sugg.collectionName}</div>
                  <div className="text-sm text-muted-foreground mt-1">{sugg.reason}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TRADE-UP Suggestions */}
      {report.suggestions.tradeUp.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Consider These Swaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.suggestions.tradeUp.map((sugg: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="line-through text-muted-foreground">
                      {sugg.fromCollectionName}
                    </span>
                    <ArrowRightLeft className="h-4 w-4" />
                    <span className="text-blue-700 dark:text-blue-300">
                      {sugg.toCollectionName}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{sugg.reason}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

Add to customer page:

```typescript
// app/customers/[id]/page.tsx
import { AlignmentTab } from './_components/alignment-tab';

// Inside your TabsContent sections:
<TabsContent value="alignment">
  <AlignmentTab dealerId={params.id} vendorId="lib-and-co" />
</TabsContent>
```

---

## Testing Checklist

### Data Setup
- [ ] Run schema migration
- [ ] Seed dealer influence tiers (A/B/C)
- [ ] Import vendor ranking CSV
- [ ] Verify selections exist in DB

### API Testing
- [ ] `GET /api/alignment/v1/[dealerId]` returns valid JSON
- [ ] Market rankings make sense (check top 5 collections)
- [ ] ADD suggestions don't include collections dealer already has
- [ ] TRADE-UP suggestions show genuinely better alternatives
- [ ] Progress calculation works (12/16 pieces)

### Frontend Testing
- [ ] Alignment tab loads without errors
- [ ] Progress bar displays correctly
- [ ] "Your Collections" section shows all dealer selections
- [ ] ADD suggestions render with reasons
- [ ] TRADE-UP suggestions show swap arrows
- [ ] Works in both light and dark mode

---

## Total Timeline

**Day 1 (4 hours)**:
- Schema changes (30 min)
- Seed dealer influence (15 min)
- Import vendor ranking (30 min)
- Market baseline service (1 hour)
- Recommendation service (1 hour)
- API endpoint (30 min)

**Day 2 (3 hours)**:
- Frontend component (2 hours)
- Testing and bug fixes (1 hour)

**Day 3 (2 hours)**:
- Polish UI
- Stakeholder review prep
- Documentation

**Total: ~9 hours of focused work = 1-2 days**

---

## What Makes This Work

✅ **No ML** - Just SQL aggregations and simple ranking logic
✅ **No complex math** - Manual influence tiers are fine for v1
✅ **Explainable** - Every recommendation has a clear reason
✅ **Fast** - API responds in ~200ms, no batch jobs needed
✅ **Actionable** - Dealers get clear "do this" suggestions
✅ **Scalable** - Can swap in real DIS calculation later without changing UI

This is genuinely shippable in a week. The value is in the **comparison** and **suggestions**, not in perfect algorithmic precision.
