/**
 * Customer Insights Types
 *
 * Data structures for the Insights tab that shows customer-specific
 * collection performance analytics.
 */

export type MonthlySales = {
  month: string;  // e.g. "Jan", "Feb", etc.
  units: number;
  revenue: number;
};

export type CollectionPerformance = {
  collectionName: string;        // e.g. "Calcolo"
  unitsCustomer: number;         // units sold by this customer in the period
  unitsTerritoryPerStore: number; // average units per active store in territory
  revenueCustomer: number;       // revenue from this customer
  performanceIndex: number;      // unitsCustomer / unitsTerritoryPerStore
  onDisplay: boolean;            // does this collection currently have display pieces
  hasNewIntros: boolean;         // true if there are new intros in this collection
  monthlySales?: MonthlySales[]; // optional monthly breakdown
  // Opportunity Matrix fields
  salesVelocityIndex: number;    // normalized 0-1 (1.0 = best seller)
  displayPresenceScore: number;  // count of display units
  marketAvgPresence: number;     // avg display count in territory
  opportunityFlag: boolean;      // true if high sales + low presence
  projectedRevenueLift: number;  // estimated gain if display added
  quadrant: 'unrealized' | 'optimized' | 'evaluate' | 'sleeper';
  // Efficiency Engine fields (Turns)
  turnRate: number;              // units sold / display count (0 if no display)
  stockingDealerAvgTurns: number; // benchmark: avg turns among stores with displays
  efficiencyStatus: 'star' | 'average' | 'drag' | 'ghost';
  // Lifecycle fields
  monthsOnFloor: number;         // average months since displays were installed (0 if not displayed)
};

export type GhostPerformer = {
  collectionName: string;
  sku: string;
  unitsCustomer: number;
};

export type SwapCandidate = {
  collectionName: string;
  sku: string;
  onDisplaySince: string; // ISO date
  unitsCustomer: number;  // probably 0
};

export type DisplayMixRecommendation = {
  collectionName: string;
  recommendedFaces: number;
};

export type NewIntroRecommendation = {
  collectionName: string;
  sku: string;
  shortReason: string; // e.g. "You already sell Calcolo strongly; this is the new linear intro."
};

export type OpportunityCollection = {
  collectionName: string;
  territoryAvgUnits: number;
  territoryAvgRevenue: number;
  customerUnits: number;
  customerRevenue: number;
  opportunityGap: number; // territory avg revenue - customer revenue
  performanceIndex: number;
};

export type TopSkuNotOnDisplay = {
  sku: string;
  collectionName: string;
  productName: string;
  unitsCustomer: number;
  revenueCustomer: number;
  monthlySales: MonthlySales[];
};

export type NonPerformingAsset = {
  collectionName: string;
  displayCount: number;
  unitsSold: number;
  daysSinceLastSale: number | null;
  turnRate: number;
};

export type CustomerInsights = {
  customerId: string;
  customerName: string;
  periodLabel: string; // e.g. "Jan 1 – Nov 4, 2025"
  totalUnits: number;
  totalCollectionsActive: number;
  topCollections: CollectionPerformance[];            // sorted descending by unitsCustomer
  ghostPerformers: GhostPerformer[];
  swapCandidates: SwapCandidate[];
  displayMix: DisplayMixRecommendation[];
  newIntroRecommendations: NewIntroRecommendation[];
  opportunityCollections: OpportunityCollection[];    // collections with high territory sales but low customer performance
  topSkusNotOnDisplay: TopSkuNotOnDisplay[];          // best selling SKUs not on display
  nonPerformingAssets: NonPerformingAsset[];          // displayed items with low/no sales (dead weight)
};
