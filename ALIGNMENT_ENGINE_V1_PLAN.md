# Field Lab Alignment Engine - V1 Architecture (Dallas 2026)

## Executive Summary

**Goal**: Ship a working alignment engine before Dallas 2026 market that provides actionable dealer recommendations based on market trends and dealer behavior.

**Strategy**: Start with proven statistical methods (weighted aggregation, percentile ranking) before investing in ML/graph algorithms. Focus on business value first, algorithmic sophistication second.

---

## V1 vs V2 Feature Mapping

| Feature | V1 (Dallas 2026) | V2 (Post-Launch) | Rationale |
|---------|------------------|------------------|-----------|
| **Dealer Influence Score** | ✅ Sales volume + Display breadth | Eigenvector Centrality | Start simple, validate it works |
| **Trend Aggregation** | ✅ Weighted sum by DIS | Matrix Factorization | Weighted sum is proven, easy to debug |
| **Product Similarity** | ❌ Skip | pgvector embeddings | Not critical for market trend analysis |
| **Recommendation Logic** | ✅ KEEP/DROP/ADD (rules-based) | + SHIFT (ML-based) | Rules are explainable, fast to build |
| **Explanations** | ✅ Template strings | Structured JSON schema | Templates are sufficient for v1 |
| **Computation Strategy** | ✅ Nightly batch jobs | Hybrid (batch + real-time) | Batch is simpler to operate |
| **Dealer Segmentation** | ✅ Simple percentile (Top 10% = Trendsetters) | Graph centrality | Percentile is "good enough" |

**Bottom Line**: V1 is 100% implementable in 6-8 weeks without ML dependencies. V2 adds sophistication after validating market fit.

---

## V1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Nightly Batch Jobs                       │
│  (Run at 2 AM, triggered by Vercel Cron or GitHub Actions)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  1. DealerInfluenceService             │
         │     - Calculate DIS for all dealers    │
         │     - Store in DealerInfluence table   │
         └────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  2. TrendService                       │
         │     - Aggregate weighted selections    │
         │     - Normalize to 0-1 scale           │
         │     - Store in SKUTrend, CollectionTrend│
         └────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  3. AlignmentService                   │
         │     - For each dealer, compute          │
         │       alignment vs market baseline      │
         │     - Store in AlignmentReport (cached) │
         └────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   On-Demand API Routes                       │
│         GET /api/alignment/report/[dealerId]                 │
│         - Return cached report or generate if stale          │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models (Prisma Schema)

```prisma
// Core entities (already exist)
model Dealer {
  id                String   @id @default(cuid())
  name              String
  region            String?
  dealerType        DealerType

  selections        Selection[]
  displayRecords    DisplayRecord[]
  influenceScores   DealerInfluence[]
  alignmentReports  AlignmentReport[]
}

model Product {
  id                String   @id @default(cuid())
  sku               String   @unique
  name              String
  description       String   @db.Text
  collectionId      String
  collection        Collection @relation(fields: [collectionId], references: [id])

  selections        Selection[]
  displayRecords    DisplayRecord[]
  trends            SKUTrend[]
}

model Collection {
  id                String   @id @default(cuid())
  name              String
  vendorId          String
  priority          Int      @default(0)

  products          Product[]
  trends            CollectionTrend[]
}

model Selection {
  id                String   @id @default(cuid())
  dealerId          String
  dealer            Dealer   @relation(fields: [dealerId], references: [id])
  productId         String
  product           Product  @relation(fields: [productId], references: [id])
  status            SelectionStatus
  source            String   // "VirtualDallas", "eCat"
  createdAt         DateTime @default(now())

  @@unique([dealerId, productId])
  @@index([dealerId])
  @@index([status])
}

model DisplayRecord {
  id                String   @id @default(cuid())
  dealerId          String
  dealer            Dealer   @relation(fields: [dealerId], references: [id])
  productId         String
  product           Product  @relation(fields: [productId], references: [id])
  displayOrderDate  DateTime
  sourceMarket      String   // "Jan 2025 Dallas"
  newToDealer       Boolean  @default(false)

  @@unique([dealerId, productId, sourceMarket])
  @@index([dealerId])
}

enum SelectionStatus {
  PASSED
  INTERESTED
  SELECTED
  MUST_CARRY
}

enum DealerType {
  SHOWROOM
  DESIGNER
  DISTRIBUTOR
  OTHER
}

// NEW: V1 Alignment Engine Tables

model DealerInfluence {
  id                    String   @id @default(cuid())
  dealerId              String
  dealer                Dealer   @relation(fields: [dealerId], references: [id])
  vendorId              String
  score                 Float    // 0-100

  // Breakdown for transparency
  salesVolumeScore      Float    // 0-100
  displayBreadthScore   Float    // 0-100
  marketParticipation   Float    // 0-100

  computedAt            DateTime @default(now())

  @@unique([dealerId, vendorId])
  @@index([vendorId])
  @@index([score])
}

model SKUTrend {
  id                  String   @id @default(cuid())
  productId           String
  product             Product  @relation(fields: [productId], references: [id])
  vendorId            String

  rawTrend            Float    // Weighted sum
  normalizedTrend     Float    // 0-1

  // Metrics for transparency
  selectionCount      Int
  mustCarryCount      Int
  passCount           Int
  avgDealerInfluence  Float    // Average DIS of dealers who selected

  computedAt          DateTime @default(now())

  @@unique([productId, vendorId])
  @@index([vendorId])
  @@index([normalizedTrend])
}

model CollectionTrend {
  id                  String     @id @default(cuid())
  collectionId        String
  collection          Collection @relation(fields: [collectionId], references: [id])
  vendorId            String

  rawTrend            Float
  normalizedTrend     Float      // 0-1

  // Metrics
  selectionCount      Int
  displayCount        Int
  avgDealerInfluence  Float

  computedAt          DateTime   @default(now())

  @@unique([collectionId, vendorId])
  @@index([vendorId])
  @@index([normalizedTrend])
}

model AlignmentReport {
  id               String   @id @default(cuid())
  dealerId         String
  dealer           Dealer   @relation(fields: [dealerId], references: [id])
  vendorId         String

  alignmentScore   Float    // 0-100
  confidence       String   // "low", "medium", "high"

  // Full report as JSON (flexible schema)
  reportData       Json

  generatedAt      DateTime @default(now())

  @@unique([dealerId, vendorId])
  @@index([vendorId])
  @@index([alignmentScore])
}
```

---

## Service Implementations

### 1. DealerInfluenceService

**Purpose**: Calculate a 0-100 score for each dealer representing their market influence.

**Formula (V1)**:
```
DIS = (0.50 × SalesVolumeScore) + (0.30 × DisplayBreadthScore) + (0.20 × MarketParticipation)
```

**Implementation**:

```typescript
// lib/alignment/services/dealer-influence.service.ts

import { PrismaClient } from '@prisma/client';

interface InfluenceWeights {
  salesVolume: number;
  displayBreadth: number;
  marketParticipation: number;
}

const DEFAULT_WEIGHTS: InfluenceWeights = {
  salesVolume: 0.5,
  displayBreadth: 0.3,
  marketParticipation: 0.2,
};

export class DealerInfluenceService {
  constructor(private prisma: PrismaClient) {}

  async computeInfluenceScore(
    dealerId: string,
    vendorId: string,
    weights: InfluenceWeights = DEFAULT_WEIGHTS
  ) {
    // 1. Sales Volume Score (0-100)
    const annualSales = await this.getAnnualSales(dealerId, vendorId);
    const TOP_DEALER_VOLUME = 500000; // $500k = 100 points
    const salesVolumeScore = Math.min(100, (annualSales / TOP_DEALER_VOLUME) * 100);

    // 2. Display Breadth Score (0-100)
    const displayMetrics = await this.getDisplayMetrics(dealerId, vendorId);
    const MAX_COLLECTIONS = 20; // Displaying 20 collections = 100 points
    const displayBreadthScore = Math.min(
      100,
      (displayMetrics.uniqueCollections / MAX_COLLECTIONS) * 100
    );

    // 3. Market Participation (0-100)
    const marketVisits = await this.getMarketVisitCount(dealerId);
    const MAX_VISITS = 4; // 4 markets in 2 years = 100 points
    const marketParticipation = Math.min(100, (marketVisits / MAX_VISITS) * 100);

    // Weighted average
    const score =
      salesVolumeScore * weights.salesVolume +
      displayBreadthScore * weights.displayBreadth +
      marketParticipation * weights.marketParticipation;

    return {
      dealerId,
      vendorId,
      score: Math.round(score),
      breakdown: {
        salesVolumeScore: Math.round(salesVolumeScore),
        displayBreadthScore: Math.round(displayBreadthScore),
        marketParticipation: Math.round(marketParticipation),
      },
    };
  }

  async computeAllForVendor(vendorId: string) {
    // Get all dealers with activity for this vendor
    const dealers = await this.prisma.dealer.findMany({
      where: {
        OR: [
          { selections: { some: { product: { collection: { vendorId } } } } },
          { displayRecords: { some: { product: { collection: { vendorId } } } } },
        ],
      },
    });

    console.log(`[DIS] Computing for ${dealers.length} dealers...`);

    for (const dealer of dealers) {
      const result = await this.computeInfluenceScore(dealer.id, vendorId);

      // Persist to DB
      await this.prisma.dealerInfluence.upsert({
        where: {
          dealerId_vendorId: {
            dealerId: dealer.id,
            vendorId,
          },
        },
        update: {
          score: result.score,
          salesVolumeScore: result.breakdown.salesVolumeScore,
          displayBreadthScore: result.breakdown.displayBreadthScore,
          marketParticipation: result.breakdown.marketParticipation,
          computedAt: new Date(),
        },
        create: {
          dealerId: dealer.id,
          vendorId,
          score: result.score,
          salesVolumeScore: result.breakdown.salesVolumeScore,
          displayBreadthScore: result.breakdown.displayBreadthScore,
          marketParticipation: result.breakdown.marketParticipation,
        },
      });

      console.log(`  ✓ ${dealer.name}: ${result.score}`);
    }

    console.log(`[DIS] Complete`);
  }

  private async getAnnualSales(dealerId: string, vendorId: string): Promise<number> {
    // TODO: If you have actual sales data, query it here
    // For now, use display count as proxy (1 display ≈ $5k revenue assumption)
    const displayCount = await this.prisma.displayRecord.count({
      where: {
        dealerId,
        product: { collection: { vendorId } },
      },
    });

    return displayCount * 5000; // Rough proxy
  }

  private async getDisplayMetrics(dealerId: string, vendorId: string) {
    const displays = await this.prisma.displayRecord.findMany({
      where: {
        dealerId,
        product: { collection: { vendorId } },
      },
      include: {
        product: { include: { collection: true } },
      },
    });

    const uniqueCollections = new Set(displays.map(d => d.product.collection.id));

    return {
      totalDisplays: displays.length,
      uniqueCollections: uniqueCollections.size,
    };
  }

  private async getMarketVisitCount(dealerId: string): Promise<number> {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const uniqueMarkets = await this.prisma.displayRecord.groupBy({
      by: ['sourceMarket'],
      where: {
        dealerId,
        displayOrderDate: { gte: twoYearsAgo },
      },
    });

    return uniqueMarkets.length;
  }
}
```

---

### 2. TrendService

**Purpose**: Aggregate dealer selections into SKU/collection trend scores, weighted by dealer influence.

**Formula**:
```
SKU Raw Trend = Σ (DealerInfluenceScore × SelectionWeight)
  where SelectionWeight = { PASSED: 1, INTERESTED: 2, SELECTED: 3, MUST_CARRY: 4 }

SKU Normalized Trend = RawTrend / MaxRawTrend (across all SKUs)
```

**Implementation**:

```typescript
// lib/alignment/services/trend.service.ts

import { PrismaClient, SelectionStatus } from '@prisma/client';

const SELECTION_WEIGHTS: Record<SelectionStatus, number> = {
  PASSED: 1,
  INTERESTED: 2,
  SELECTED: 3,
  MUST_CARRY: 4,
};

export class TrendService {
  constructor(private prisma: PrismaClient) {}

  async computeSKUTrends(vendorId: string) {
    // 1. Get all products for this vendor with their selections
    const products = await this.prisma.product.findMany({
      where: { collection: { vendorId } },
      include: {
        selections: {
          include: {
            dealer: {
              include: {
                influenceScores: {
                  where: { vendorId },
                },
              },
            },
          },
        },
      },
    });

    console.log(`[Trends] Processing ${products.length} SKUs...`);

    const trends = [];

    for (const product of products) {
      let rawTrend = 0;
      let selectionCount = 0;
      let mustCarryCount = 0;
      let passCount = 0;
      let totalInfluence = 0;

      for (const selection of product.selections) {
        const dealerInfluence = selection.dealer.influenceScores[0]?.score || 50; // Default to median
        const selectionWeight = SELECTION_WEIGHTS[selection.status];

        // Weighted contribution
        rawTrend += (dealerInfluence / 100) * selectionWeight;
        totalInfluence += dealerInfluence;

        selectionCount++;
        if (selection.status === 'MUST_CARRY') mustCarryCount++;
        if (selection.status === 'PASSED') passCount++;
      }

      const avgDealerInfluence = selectionCount > 0 ? totalInfluence / selectionCount : 0;

      trends.push({
        productId: product.id,
        vendorId,
        rawTrend,
        normalizedTrend: 0, // Will normalize after collecting all
        selectionCount,
        mustCarryCount,
        passCount,
        avgDealerInfluence,
      });
    }

    // 2. Normalize to 0-1 scale
    const maxRawTrend = Math.max(...trends.map(t => t.rawTrend), 1);
    trends.forEach(t => {
      t.normalizedTrend = t.rawTrend / maxRawTrend;
    });

    // 3. Persist to DB
    for (const trend of trends) {
      await this.prisma.sKUTrend.upsert({
        where: {
          productId_vendorId: {
            productId: trend.productId,
            vendorId,
          },
        },
        update: {
          rawTrend: trend.rawTrend,
          normalizedTrend: trend.normalizedTrend,
          selectionCount: trend.selectionCount,
          mustCarryCount: trend.mustCarryCount,
          passCount: trend.passCount,
          avgDealerInfluence: trend.avgDealerInfluence,
          computedAt: new Date(),
        },
        create: trend,
      });
    }

    console.log(`[Trends] SKU trends computed (max raw trend: ${maxRawTrend.toFixed(2)})`);
    return trends;
  }

  async computeCollectionTrends(vendorId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { vendorId },
      include: {
        products: {
          include: {
            trends: { where: { vendorId } },
            displayRecords: true,
          },
        },
      },
    });

    console.log(`[Trends] Processing ${collections.length} collections...`);

    const trends = [];

    for (const collection of collections) {
      // Aggregate SKU trends
      const rawTrend = collection.products.reduce(
        (sum, product) => sum + (product.trends[0]?.rawTrend || 0),
        0
      );

      const selectionCount = collection.products.reduce(
        (sum, product) => sum + (product.trends[0]?.selectionCount || 0),
        0
      );

      const avgDealerInfluence = selectionCount > 0
        ? collection.products.reduce(
            (sum, product) => sum + (product.trends[0]?.avgDealerInfluence || 0) * (product.trends[0]?.selectionCount || 0),
            0
          ) / selectionCount
        : 0;

      // Count unique dealers with displays
      const dealerDisplays = new Set(
        collection.products.flatMap(p => p.displayRecords.map(d => d.dealerId))
      );

      trends.push({
        collectionId: collection.id,
        vendorId,
        rawTrend,
        normalizedTrend: 0,
        selectionCount,
        displayCount: dealerDisplays.size,
        avgDealerInfluence,
      });
    }

    // Normalize
    const maxRawTrend = Math.max(...trends.map(t => t.rawTrend), 1);
    trends.forEach(t => {
      t.normalizedTrend = t.rawTrend / maxRawTrend;
    });

    // Persist
    for (const trend of trends) {
      await this.prisma.collectionTrend.upsert({
        where: {
          collectionId_vendorId: {
            collectionId: trend.collectionId,
            vendorId,
          },
        },
        update: {
          rawTrend: trend.rawTrend,
          normalizedTrend: trend.normalizedTrend,
          selectionCount: trend.selectionCount,
          displayCount: trend.displayCount,
          avgDealerInfluence: trend.avgDealerInfluence,
          computedAt: new Date(),
        },
        create: trend,
      });
    }

    console.log(`[Trends] Collection trends computed`);
    return trends;
  }
}
```

---

### 3. AlignmentService

**Purpose**: Compute how aligned a dealer's portfolio is vs market trends.

**Formula**:
```
Dealer's Collection IDs = Set(collections they've selected or display)
Market Top Collections = Collections with normalizedTrend >= 0.6

Overlap = Intersection(Dealer's Collections, Market Top Collections)

Alignment Score = (Weighted sum of dealer's trend scores / Weighted sum of market top trends) × 100
```

**Implementation**:

```typescript
// lib/alignment/services/alignment.service.ts

import { PrismaClient } from '@prisma/client';

export class AlignmentService {
  constructor(private prisma: PrismaClient) {}

  async computeAlignment(dealerId: string, vendorId: string) {
    // 1. Get dealer's collections (from selections + displays)
    const dealerCollections = await this.getDealerCollections(dealerId, vendorId);

    // 2. Get market top collections (normalized trend >= 0.6)
    const marketTopCollections = await this.prisma.collectionTrend.findMany({
      where: {
        vendorId,
        normalizedTrend: { gte: 0.6 },
      },
      include: { collection: true },
      orderBy: { normalizedTrend: 'desc' },
    });

    if (marketTopCollections.length === 0) {
      // No strong market trends yet
      return {
        dealerId,
        vendorId,
        alignmentScore: 50, // Neutral
        confidence: 'low',
        dealerCollectionCount: dealerCollections.length,
        marketTopCount: 0,
      };
    }

    // 3. Calculate weighted alignment
    const dealerCollectionIds = new Set(dealerCollections.map(c => c.collectionId));
    const marketTopIds = new Set(marketTopCollections.map(c => c.collectionId));

    // Sum of trend scores for dealer's collections
    const dealerTrendSum = dealerCollections.reduce((sum, dc) => {
      const trend = marketTopCollections.find(mtc => mtc.collectionId === dc.collectionId);
      return sum + (trend?.normalizedTrend || 0);
    }, 0);

    // Sum of trend scores for market top collections
    const marketTrendSum = marketTopCollections.reduce(
      (sum, mtc) => sum + mtc.normalizedTrend,
      0
    );

    const alignmentScore = marketTrendSum > 0
      ? Math.min(100, (dealerTrendSum / marketTrendSum) * 100)
      : 50;

    // Confidence based on dealer's activity level
    const confidence =
      dealerCollections.length >= 5 ? 'high' :
      dealerCollections.length >= 2 ? 'medium' : 'low';

    return {
      dealerId,
      vendorId,
      alignmentScore: Math.round(alignmentScore),
      confidence,
      dealerCollectionCount: dealerCollections.length,
      marketTopCount: marketTopCollections.length,
      overlapCount: [...dealerCollectionIds].filter(id => marketTopIds.has(id)).length,
    };
  }

  private async getDealerCollections(dealerId: string, vendorId: string) {
    const selections = await this.prisma.selection.findMany({
      where: {
        dealerId,
        product: { collection: { vendorId } },
        status: { in: ['SELECTED', 'MUST_CARRY'] },
      },
      include: {
        product: { include: { collection: true } },
      },
    });

    const displays = await this.prisma.displayRecord.findMany({
      where: {
        dealerId,
        product: { collection: { vendorId } },
      },
      include: {
        product: { include: { collection: true } },
      },
    });

    const collectionMap = new Map();

    [...selections, ...displays].forEach(item => {
      const coll = item.product.collection;
      if (!collectionMap.has(coll.id)) {
        collectionMap.set(coll.id, {
          collectionId: coll.id,
          collectionName: coll.name,
        });
      }
    });

    return Array.from(collectionMap.values());
  }
}
```

---

### 4. RecommendationService

**Purpose**: Generate actionable KEEP/DROP/ADD recommendations.

**Logic**:
- **KEEP**: Dealer has it + trend >= 0.5
- **DROP**: Dealer has it + trend < 0.3
- **ADD**: Dealer doesn't have it + trend >= 0.7

**Implementation**:

```typescript
// lib/alignment/services/recommendation.service.ts

import { PrismaClient } from '@prisma/client';
import { AlignmentService } from './alignment.service';

interface Recommendation {
  type: 'KEEP' | 'DROP' | 'ADD';
  priority: 'high' | 'medium' | 'low';
  collectionId: string;
  collectionName: string;
  reason: string;
  trendScore: number;
  metrics: string; // Human-readable metrics
}

export class RecommendationService {
  constructor(
    private prisma: PrismaClient,
    private alignmentService: AlignmentService
  ) {}

  async generateReport(dealerId: string, vendorId: string) {
    // 1. Compute alignment
    const alignment = await this.alignmentService.computeAlignment(dealerId, vendorId);

    // 2. Get market trends
    const allTrends = await this.prisma.collectionTrend.findMany({
      where: { vendorId },
      include: { collection: true },
      orderBy: { normalizedTrend: 'desc' },
    });

    // 3. Get dealer's current collections
    const dealerCollections = await this.alignmentService['getDealerCollections'](
      dealerId,
      vendorId
    );
    const dealerCollectionIds = new Set(dealerCollections.map(c => c.collectionId));

    const keep: Recommendation[] = [];
    const drop: Recommendation[] = [];
    const add: Recommendation[] = [];

    // 4. Generate recommendations
    for (const trend of allTrends) {
      const hasCollection = dealerCollectionIds.has(trend.collectionId);

      if (hasCollection) {
        // KEEP or DROP logic
        if (trend.normalizedTrend >= 0.5) {
          keep.push({
            type: 'KEEP',
            priority: trend.normalizedTrend >= 0.8 ? 'high' : 'medium',
            collectionId: trend.collectionId,
            collectionName: trend.collection.name,
            reason: `Strong market adoption (${Math.round(trend.normalizedTrend * 100)}% trend score)`,
            trendScore: trend.normalizedTrend,
            metrics: `${trend.selectionCount} dealers selected, ${trend.displayCount} have displays`,
          });
        } else if (trend.normalizedTrend < 0.3) {
          drop.push({
            type: 'DROP',
            priority: trend.normalizedTrend < 0.15 ? 'high' : 'medium',
            collectionId: trend.collectionId,
            collectionName: trend.collection.name,
            reason: `Below-market performance (${Math.round(trend.normalizedTrend * 100)}% trend score)`,
            trendScore: trend.normalizedTrend,
            metrics: `Only ${trend.selectionCount} dealers selected this`,
          });
        }
      } else {
        // ADD logic
        if (trend.normalizedTrend >= 0.7) {
          add.push({
            type: 'ADD',
            priority: trend.normalizedTrend >= 0.9 ? 'high' : 'medium',
            collectionId: trend.collectionId,
            collectionName: trend.collection.name,
            reason: `High market momentum (${Math.round(trend.normalizedTrend * 100)}% trend score)`,
            trendScore: trend.normalizedTrend,
            metrics: `${trend.selectionCount} dealers selected, ${trend.displayCount} already displaying`,
          });
        }
      }
    }

    // 5. Build full report
    const report = {
      dealerId,
      vendorId,
      alignmentScore: alignment.alignmentScore,
      confidence: alignment.confidence,
      generatedAt: new Date(),

      marketSummary: {
        topCollections: allTrends.slice(0, 5).map(t => ({
          collectionName: t.collection.name,
          trendScore: Math.round(t.normalizedTrend * 100),
          selectionCount: t.selectionCount,
        })),
      },

      currentState: {
        collectionCount: dealerCollections.length,
        collections: dealerCollections,
      },

      recommendations: {
        keep: keep.sort((a, b) => b.trendScore - a.trendScore).slice(0, 5),
        drop: drop.sort((a, b) => a.trendScore - b.trendScore).slice(0, 3),
        add: add.sort((a, b) => b.trendScore - a.trendScore).slice(0, 5),
      },
    };

    // 6. Cache report
    await this.prisma.alignmentReport.upsert({
      where: {
        dealerId_vendorId: { dealerId, vendorId },
      },
      update: {
        alignmentScore: report.alignmentScore,
        confidence: report.confidence,
        reportData: report as any,
        generatedAt: new Date(),
      },
      create: {
        dealerId,
        vendorId,
        alignmentScore: report.alignmentScore,
        confidence: report.confidence,
        reportData: report as any,
      },
    });

    return report;
  }
}
```

---

## Nightly Batch Job

```typescript
// lib/alignment/jobs/compute-all.job.ts

import { PrismaClient } from '@prisma/client';
import { DealerInfluenceService } from '../services/dealer-influence.service';
import { TrendService } from '../services/trend.service';
import { AlignmentService } from '../services/alignment.service';
import { RecommendationService } from '../services/recommendation.service';

const prisma = new PrismaClient();

export async function runAlignmentJob(vendorId: string) {
  console.log(`[Job] Starting alignment computation for vendor ${vendorId}`);
  const startTime = Date.now();

  try {
    // Step 1: Compute dealer influence scores
    console.log('[Step 1/3] Computing dealer influence scores...');
    const influenceService = new DealerInfluenceService(prisma);
    await influenceService.computeAllForVendor(vendorId);

    // Step 2: Compute trends
    console.log('[Step 2/3] Computing SKU and collection trends...');
    const trendService = new TrendService(prisma);
    await trendService.computeSKUTrends(vendorId);
    await trendService.computeCollectionTrends(vendorId);

    // Step 3: Generate alignment reports for all dealers
    console.log('[Step 3/3] Generating alignment reports...');
    const alignmentService = new AlignmentService(prisma);
    const recommendationService = new RecommendationService(prisma, alignmentService);

    const dealers = await prisma.dealer.findMany({
      where: {
        OR: [
          { selections: { some: { product: { collection: { vendorId } } } } },
          { displayRecords: { some: { product: { collection: { vendorId } } } } },
        ],
      },
    });

    for (const dealer of dealers) {
      await recommendationService.generateReport(dealer.id, vendorId);
      console.log(`  ✓ ${dealer.name}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Job] Complete in ${duration}s`);
  } catch (error) {
    console.error('[Job] Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
```

**API Route for Cron**:

```typescript
// app/api/cron/alignment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { runAlignmentJob } from '@/lib/alignment/jobs/compute-all.job';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run for all vendors
    await runAlignmentJob('lib-and-co');
    await runAlignmentJob('savoy-house');

    return NextResponse.json({ success: true, timestamp: new Date() });
  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}
```

---

## V2 Evolution Path (Post-Dallas 2026)

Once V1 is validated and delivering value, add sophistication incrementally:

### V2.1: Product Embeddings (pgvector)

**Use Case**: "Show me products similar to this one based on specs/description"

**Implementation**:
1. Add `embedding vector(1536)` column to `Product` table
2. Generate embeddings using OpenAI API or sentence-transformers
3. Create HNSW index for fast similarity search
4. Use for "Similar Products" feature in Virtual Dallas UI

**Business Value**: Helps reps suggest alternatives when dealer rejects a SKU.

### V2.2: Dealer Profile Vectors

**Use Case**: "Find dealers similar to this one"

**Implementation**:
1. Add `profileVector vector(128)` to `Dealer` table
2. Create dealer embeddings from their selection history + firmographics
3. Use for "Dealers like you selected..." recommendations

**Business Value**: Better cold-start recommendations for new dealers.

### V2.3: Eigenvector Centrality

**Use Case**: Identify true "Trendsetter" dealers via network effects

**Implementation**:
1. Build dealer similarity graph (weighted by shared selections)
2. Run Power Iteration algorithm to compute centrality scores
3. Replace percentile-based Trendsetter logic with centrality-based

**Business Value**: More accurate influence scoring → better trend predictions.

### V2.4: SHIFT Recommendations

**Use Case**: "You selected 36" chandelier, but market prefers 24""

**Implementation**:
1. Group SKUs by collection + product type
2. Within each group, compare size/finish trends
3. Recommend swaps when trend delta > 0.3

**Business Value**: Helps dealers fine-tune assortment within collections they already carry.

---

## V1 vs V2 Comparison Table

| Capability | V1 (Dallas 2026) | V2 (Future) |
|------------|------------------|-------------|
| **Data Infrastructure** | Standard Postgres | Postgres + pgvector |
| **Dealer Segmentation** | Percentile (top 10%) | Eigenvector Centrality |
| **Product Similarity** | None | Vector embeddings |
| **Recommendation Types** | KEEP, DROP, ADD | + SHIFT (size/finish) |
| **Computation** | Nightly batch only | Hybrid batch + real-time |
| **Complexity** | Low (shippable in 6-8 weeks) | High (requires ML expertise) |
| **Explainability** | Template strings | Structured JSON schema |

---

## Success Metrics (V1)

### Development Metrics
- [ ] Schema migration completed (Week 1)
- [ ] All 4 services implemented and tested (Week 4)
- [ ] Nightly job running successfully (Week 5)
- [ ] API returning reports in < 500ms (Week 6)
- [ ] Frontend dashboard displaying reports (Week 7)

### Business Metrics (Post-Launch)
- [ ] 100% of active dealers have alignment reports
- [ ] >30% of dealers act on at least 1 recommendation within 30 days
- [ ] Stakeholders validate that "Trendsetter" dealers (top 10% DIS) match expectations
- [ ] Alignment scores correlate with known high/low performers

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Poor recommendation quality** | Stakeholder validation in Week 6 before full rollout |
| **Job takes too long (> 30 min)** | Optimize queries, add indexes, batch smaller chunks |
| **Dealers don't trust scores** | Show full breakdown (DIS components, trend metrics) in UI |
| **Data quality issues** | Add validation step in import scripts |

---

## Conclusion

**V1 is production-ready without ML dependencies**. You can ship this in 6-8 weeks using:
- Standard SQL aggregations
- Proven statistical methods (weighted averages, percentile ranking)
- Simple explainability (template strings)

**V2 adds sophistication after validating market fit**:
- pgvector for semantic search
- Graph algorithms for influence scoring
- Advanced recommendation types (SHIFT)

This phased approach minimizes risk while delivering value incrementally. Start simple, validate, then add complexity based on real-world feedback.
