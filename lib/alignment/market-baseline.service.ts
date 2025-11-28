import { promises as fs } from 'fs';
import path from 'path';
import type { Selection } from '../selections/types';
import type { Customer } from '../customers/loadCustomers';
import type { VendorRankings, CollectionRanking } from './types';
import { loadCatalog } from '../catalog/loadCatalog';

export class MarketBaselineService {
  private vendorRankingsCache: VendorRankings[] | null = null;
  private vendorCollectionsCache: Map<string, Set<string>> = new Map();

  async loadVendorRankings(): Promise<VendorRankings[]> {
    if (this.vendorRankingsCache) {
      return this.vendorRankingsCache;
    }

    const filePath = path.join(process.cwd(), 'data', 'vendor-rankings.json');
    const file = await fs.readFile(filePath, 'utf-8');
    this.vendorRankingsCache = JSON.parse(file);
    return this.vendorRankingsCache!;
  }

  /**
   * Get all valid collection names for a specific vendor from the catalog
   */
  async getVendorCollections(vendorId: string): Promise<Set<string>> {
    if (this.vendorCollectionsCache.has(vendorId)) {
      return this.vendorCollectionsCache.get(vendorId)!;
    }

    const catalog = await loadCatalog(vendorId);
    const collections = new Set<string>();

    for (const item of catalog) {
      if (item.collectionName && item.collectionName.trim() !== '' && item.collectionName !== 'Uncategorized') {
        collections.add(item.collectionName);
      }
    }

    this.vendorCollectionsCache.set(vendorId, collections);
    return collections;
  }

  async loadSelections(): Promise<Selection[]> {
    const filePath = path.join(process.cwd(), 'data', 'selections.json');
    const file = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(file);
  }

  async loadCustomers(): Promise<Customer[]> {
    const filePath = path.join(process.cwd(), 'data', 'customershorted.json');
    const file = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(file);
  }

  /**
   * Get market-wide collection rankings based on weighted dealer selections
   * Only includes collections that exist in the vendor's catalog
   */
  async getCollectionRankings(vendorId: string): Promise<CollectionRanking[]> {
    const [selections, customers, validCollections] = await Promise.all([
      this.loadSelections(),
      this.loadCustomers(),
      this.getVendorCollections(vendorId),
    ]);

    // Create a map of customer ID to influence weight
    const customerWeights = new Map<string, number>();
    customers.forEach(c => {
      customerWeights.set(c.id, c.influenceWeight || 2); // Default to tier B (weight 2)
    });

    // Aggregate selections by collection
    const collectionCounts = new Map<string, number>();

    for (const selection of selections) {
      // Skip if wrong vendor (strict filtering)
      // Only include selections that explicitly match this vendor, or lib-and-co default
      const selectionVendor = selection.vendor || 'lib-and-co';
      if (selectionVendor !== vendorId) continue;

      // Only count working or snapshot selections
      if (selection.status !== 'working' && selection.status !== 'snapshot') continue;

      const customerWeight = customerWeights.get(selection.customerId) || 2;

      // Count collections from selection items - only if they exist in vendor catalog
      const collections = new Set<string>();
      for (const item of selection.items) {
        if (item.collection && validCollections.has(item.collection)) {
          collections.add(item.collection);
        }
      }

      // Add weighted count for each unique collection
      for (const collection of Array.from(collections)) {
        const current = collectionCounts.get(collection) || 0;
        collectionCounts.set(collection, current + customerWeight);
      }
    }

    // Convert to array and sort by weighted count
    const rankings: CollectionRanking[] = [];
    let rank = 1;

    const sorted = Array.from(collectionCounts.entries()).sort((a, b) => b[1] - a[1]);

    for (const [collectionName, weightedCount] of sorted) {
      rankings.push({
        collectionName,
        marketRank: rank++,
        vendorRank: null, // Will be filled in by getCombinedRankings
        combinedScore: 0, // Will be filled in by getCombinedRankings
        weightedCount,
      });
    }

    return rankings;
  }

  /**
   * Get combined rankings (market + vendor)
   * Only includes collections that exist in the vendor's catalog
   */
  async getCombinedRankings(vendorId: string): Promise<CollectionRanking[]> {
    const [marketRankings, vendorRankingsData, validCollections] = await Promise.all([
      this.getCollectionRankings(vendorId),
      this.loadVendorRankings(),
      this.getVendorCollections(vendorId),
    ]);

    // Find vendor rankings for this vendor
    const vendorData = vendorRankingsData.find(v => v.vendorId === vendorId);
    const vendorRankings = vendorData?.rankings || [];

    // Create a map of collection name to vendor rank (only for valid collections)
    const vendorRankMap = new Map<string, number>();
    vendorRankings.forEach(r => {
      // Only include if collection exists in vendor catalog
      if (validCollections.has(r.collectionName)) {
        vendorRankMap.set(r.collectionName, r.rank);
      }
    });

    // Combine market and vendor rankings
    const combined: CollectionRanking[] = [];

    // Add all collections from market rankings
    const processedCollections = new Set<string>();

    for (const market of marketRankings) {
      const vendorRank = vendorRankMap.get(market.collectionName) || null;

      // Calculate combined score
      // Lower rank number = better, so use 1/rank
      const marketScore = market.marketRank ? 1 / market.marketRank : 0;
      const vendorScore = vendorRank ? 1 / vendorRank : 0;

      // Weight: 60% market, 40% vendor
      const combinedScore = marketScore * 0.6 + vendorScore * 0.4;

      combined.push({
        ...market,
        vendorRank,
        combinedScore,
      });

      processedCollections.add(market.collectionName);
    }

    // Add vendor-ranked collections that aren't in market data but exist in catalog
    for (const vendorRanking of vendorRankings) {
      if (!processedCollections.has(vendorRanking.collectionName) && validCollections.has(vendorRanking.collectionName)) {
        const vendorScore = 1 / vendorRanking.rank;
        const combinedScore = vendorScore * 0.4; // Only vendor score (no market data)

        combined.push({
          collectionName: vendorRanking.collectionName,
          marketRank: null,
          vendorRank: vendorRanking.rank,
          combinedScore,
          weightedCount: 0,
        });
      }
    }

    // Sort by combined score (descending)
    return combined.sort((a, b) => b.combinedScore - a.combinedScore);
  }
}
