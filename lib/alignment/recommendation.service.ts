import { MarketBaselineService } from './market-baseline.service';
import { getWorkingSelection } from '../selections/store';
import type { AlignmentReport, AddSuggestion, TradeUpSuggestion } from './types';

export class RecommendationService {
  constructor(private marketService: MarketBaselineService) {}

  async generateReport(customerId: string, vendorId: string): Promise<AlignmentReport> {
    // Load data including valid collections for this vendor
    // Use store's getWorkingSelection for consistent selection lookup
    const [customerSelection, customers, rankings, validCollections] = await Promise.all([
      getWorkingSelection(customerId, vendorId),
      this.marketService.loadCustomers(),
      this.marketService.getCombinedRankings(vendorId),
      this.marketService.getVendorCollections(vendorId),
    ]);

    // Find customer
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Get customer's collections - only include collections that exist in this vendor's catalog
    const customerCollections = new Set<string>();
    let currentPieces = 0;

    if (customerSelection) {
      for (const item of customerSelection.items) {
        // Only count collection if it actually belongs to this vendor
        if (item.collection && validCollections.has(item.collection)) {
          customerCollections.add(item.collection);
          currentPieces += item.qty || 1;
        }
      }
    }

    // Calculate promo progress
    const targetPieces = customer.targetPieces || null;
    const piecesNeeded = targetPieces ? Math.max(0, targetPieces - currentPieces) : null;

    // Get dealer's ranked collections
    const dealerRankings = rankings.filter(r => customerCollections.has(r.collectionName));

    // Generate ADD suggestions (collections they don't have)
    const addSuggestions: AddSuggestion[] = rankings
      .filter(r => !customerCollections.has(r.collectionName))
      .slice(0, 5)
      .map(r => ({
        collectionName: r.collectionName,
        marketRank: r.marketRank,
        vendorRank: r.vendorRank,
        reason: this.generateAddReason(r),
      }));

    // Generate TRADE-UP suggestions
    const tradeUpSuggestions: TradeUpSuggestion[] = [];

    // Find bottom 50% of dealer's chosen collections
    const weakChoices = dealerRankings.slice(Math.floor(dealerRankings.length / 2));

    for (const weak of weakChoices) {
      // Find better alternatives they didn't choose
      const better = rankings.find(
        r => !customerCollections.has(r.collectionName) &&
             r.combinedScore > weak.combinedScore * 1.5 // Must be significantly better
      );

      if (better) {
        const fromRank = weak.marketRank || weak.vendorRank || 99;
        const toRank = better.marketRank || better.vendorRank || 99;

        tradeUpSuggestions.push({
          fromCollectionName: weak.collectionName,
          fromRank,
          toCollectionName: better.collectionName,
          toRank,
          reason: `${better.collectionName} is ranked significantly higher by both market and vendor. Consider swapping.`,
        });
      }

      if (tradeUpSuggestions.length >= 3) break;
    }

    // Build report
    return {
      customerId,
      vendorId,

      summary: {
        currentPieces,
        targetPieces,
        piecesNeeded,
      },

      selections: {
        collections: dealerRankings.map(r => ({
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

  private generateAddReason(ranking: { vendorRank?: number; marketRank?: number }): string {
    if (ranking.vendorRank && ranking.marketRank) {
      return `Ranked #${ranking.vendorRank} by vendor, #${ranking.marketRank} by market. Strong performer.`;
    } else if (ranking.vendorRank) {
      return `Vendor's #${ranking.vendorRank} pick. Recommended for your assortment.`;
    } else if (ranking.marketRank) {
      return `Ranked #${ranking.marketRank} by market. High dealer adoption.`;
    }
    return 'Recommended collection.';
  }
}
