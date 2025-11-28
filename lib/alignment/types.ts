// Alignment Engine V1 Types

export type VendorRanking = {
  vendorId: string;
  collectionName: string;
  rank: number; // 1 = best, 2 = second best, etc.
  heroSku?: string; // Optional: vendor's recommended hero SKU
};

export type VendorRankings = {
  vendorId: string;
  rankings: VendorRanking[];
};

export type CollectionRanking = {
  collectionName: string;
  marketRank: number | null;
  vendorRank: number | null;
  combinedScore: number;
  weightedCount: number;
};

export type AddSuggestion = {
  collectionName: string;
  marketRank: number | null;
  vendorRank: number | null;
  reason: string;
};

export type TradeUpSuggestion = {
  fromCollectionName: string;
  fromRank: number;
  toCollectionName: string;
  toRank: number;
  reason: string;
};

export type AlignmentReport = {
  customerId: string;
  vendorId: string;

  summary: {
    currentPieces: number;
    targetPieces: number | null;
    piecesNeeded: number | null;
  };

  selections: {
    collections: Array<{
      collectionName: string;
      marketRank: number | null;
      vendorRank: number | null;
    }>;
  };

  suggestions: {
    add: AddSuggestion[];
    tradeUp: TradeUpSuggestion[];
  };
};
