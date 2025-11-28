import type { Selection } from '@/lib/selections/types';
import type { CatalogItem } from '@/lib/catalog/loadCatalog';

/**
 * Enriched collection data for presentation rendering
 * Includes both promotion config and actual catalog products
 */
export type PresentationCollection = {
  collectionName: string;
  vendor: string;
  years?: number[];
  includeAllYears: boolean;
  products: CatalogItem[];

  // Media and customization from presentation items
  heroVideoUrl?: string;
  customTitle?: string;
  narrativeDescription?: string;
  customNotes?: string;

  // Badge data
  badges?: Array<{
    id: string;
    type: string;
    label: string;
    color?: string;
    icon?: string;
  }>;

  // SKU-level badges
  skuBadges?: Record<string, Array<{
    id: string;
    type: string;
    label: string;
    color?: string;
    icon?: string;
  }>>;

  // Media configuration
  media?: {
    mediaType: 'none' | 'youtube' | 'mp4' | 'photos' | 'immersive-slideshow';
    youtubeUrl?: string;
    youtubeStartTime?: number;
    mp4Url?: string;
    photos?: Array<{
      url: string;
      order: number;
    }>;
  };

  // Presentation properties
  startExpanded?: boolean;
  showProductCount?: boolean;
};

/**
 * Complete presentation data for a customer
 * Determines what they see in their Collections tab
 */
export type CustomerPresentationData = {
  // Whether this customer has an active market selection
  hasMarketSelection: boolean;

  // The working selection (editable)
  // Auto-created from market snapshot if it doesn't exist
  workingSelection: Selection | null;

  // The active market snapshot (read-only reference)
  // This is the Dallas market order marked as visible to customer
  activeMarketSnapshot: Selection | null;

  // Collections that contain items from their market selection
  // Section 1: "Your Market Selection"
  selectedCollections: PresentationCollection[];

  // Collections that DO NOT contain items from their market selection
  // Section 2: "Everything Else" / "Browse More Collections"
  otherCollections: PresentationCollection[];

  // Best seller collections that customer doesn't have (from territory sales data)
  // Section 3: "Territory Best Sellers"
  bestSellerCollections: PresentationCollection[];

  // Best seller rankings for display
  bestSellerRankings?: Array<{
    collectionName: string;
    rank: number;
    totalRevenue: number;
    customerCount: number;
  }>;

  // All collections (for reference, used in rep preview)
  allCollections: PresentationCollection[];
};
