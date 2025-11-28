export type SelectionStatus = 'snapshot' | 'working' | 'archived';
export type SelectionSource = 'manual' | 'dallas';

export type SelectionItem = {
  sku: string;
  name: string;
  imageUrl?: string; // Product image URL from catalog

  // Quantity - supports both legacy and new split format
  qty: number; // Legacy: total quantity (for backward compatibility)
  displayQty?: number; // New: quantity for display (gets tier discount)
  backupQty?: number; // New: additional backup inventory

  unitList: number;
  programDisc?: number;
  netUnit: number;
  extendedNet: number;

  // Promotion discounts (applied when promotion is active)
  displayDiscountPercent?: number; // % discount on display qty
  backupDiscountPercent?: number; // % discount on backup qty

  notes?: string;
  tags?: string[];
  collection?: string;
  year?: number;

  // Configuration metadata for configurable products (Hubbardton Forge, etc.)
  configuration?: {
    baseItemCode: string; // Base item / design ID
    variantSku?: string; // Full variant SKU (e.g., "241202-LED-07-07")
    options: Record<string, string>; // Selected options, e.g., { "Finish": "Bronze", "Accent Finish": "White" }
    productName: string; // Base product name (e.g., "Coral Table Lamp")
  };
};

export type Selection = {
  id: string;
  customerId: string;
  name: string;
  status: SelectionStatus;
  source: SelectionSource;
  sourceEventId?: string;
  sourceYear?: number;
  marketMonth?: 'January' | 'June';
  marketCycle?: {
    year: number;
    month: 'January' | 'June';
  };
  vendor?: string; // Vendor identifier (e.g., "lib-and-co", "savoy-house")
  isPublished: boolean;
  isVisibleToCustomer?: boolean;
  version: number;
  items: SelectionItem[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CollectionSelection = {
  collectionName: string;
  years?: number[];
  includeAllYears: boolean;
};

// Individual Presentation (formerly the entire PromotionConfig)
export type Presentation = {
  id: string;
  name: string; // e.g., "Spring 2025 Launch", "Core Essentials"
  presentationItems: PresentationItem[];
  collections: CollectionSelection[]; // Backward compatibility
  isActive: boolean; // Which presentation is currently being shown to customers
  createdAt: string;
  updatedAt: string;
};

// Promotion Config now manages multiple presentations per vendor
export type PromotionConfig = {
  id: string;
  customerId?: string;
  name: string; // Overall promotion name
  vendor?: string; // Vendor identifier (e.g., "lib-and-co", "savoy-house")
  marketCycle?: {
    year: number;
    month: 'January' | 'June';
  };
  presentations: Presentation[]; // Multiple saved presentations

  // Legacy support (deprecated, use presentations array)
  collections?: CollectionSelection[];
  presentationItems?: PresentationItem[];

  createdAt: string;
  updatedAt: string;
};

// Presentation Builder Types
export type PresentationItemType = 'collection' | 'section_header';

// Badge types
export type BadgeType =
  | 'dallas-favorite'
  | 'top-scanned'
  | 'designers-pick'
  | 'show-highlight'
  | 'best-selling-size'
  | 'custom';

export type Badge = {
  id: string;
  type: BadgeType;
  label: string; // Display text
  color?: string; // Optional custom color for custom badges
  icon?: string; // Optional icon name
};

// Media types for collections
export type MediaType = 'none' | 'youtube' | 'mp4' | 'photos' | 'immersive-slideshow';

// Photo layout modes
export type PhotoLayoutMode = 'auto' | 'single-fit' | 'single-fill' | 'pair-portraits' | 'manual';

// Ken Burns animation data
export type KenBurnsData = {
  startRect?: { x: number; y: number; w: number; h: number }; // 0-1 relative coords
  endRect?: { x: number; y: number; w: number; h: number }; // 0-1 relative coords
  motion?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'custom';
};

// Aspect ratio classification
export type AspectRatioClass = 'landscape' | 'portrait' | 'square';

export type PhotoSlide = {
  url: string;
  order: number;
  width?: number;
  height?: number;
  aspect?: number; // width / height
  aspectClass?: AspectRatioClass; // computed: landscape, portrait, square
  duration?: number; // per-photo override in seconds
  focalPoint?: { x: number; y: number }; // 0-1, optional center of interest
  kb?: KenBurnsData; // Ken Burns animation override
};

// Immersive Slideshow configuration
export type KenBurnsIntensity = 'subtle' | 'medium' | 'strong';
export type MotionSeed = 'auto' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out';
export type SlideOrder = 'as-uploaded' | 'shuffle';
export type FocalPointPreset = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ImmersiveSlideshowConfig = {
  slideDurationSec: number;     // default 8
  fadeDurationSec: number;      // default 0.8
  kbIntensity: KenBurnsIntensity; // maps to scale delta
  motionSeed: MotionSeed;
  order: SlideOrder;
  reduceMotionOnMobile: boolean;
  showProgressDots: boolean;    // show progress indicators
  globalFocalPoint?: FocalPointPreset; // default focal point for all slides (can be overridden per-photo)
};

export type CollectionMedia = {
  mediaType: MediaType;
  youtubeUrl?: string;
  youtubeStartTime?: number; // seconds
  youtubeEndTime?: number; // seconds
  mp4Url?: string;
  mp4StartTime?: number; // seconds
  mp4EndTime?: number; // seconds
  photos?: PhotoSlide[];
  slideDuration?: number; // seconds, global for all photos
  photoLayoutMode?: PhotoLayoutMode; // layout strategy for photo slideshow
  immersive?: ImmersiveSlideshowConfig; // immersive slideshow settings
};

export type PresentationItemProperties = {
  startExpanded: boolean;
  showProductCount: boolean;
  customNotes?: string;
  customTitle?: string;
  narrativeDescription?: string;
  badges?: Badge[]; // Collection-level badges
  skuBadges?: Record<string, Badge[]>; // SKU-level badges { sku: [badges] }
  media?: CollectionMedia; // Media configuration (video or photos)
};

export type CollectionData = {
  collectionName: string;
  productCount?: number;
  heroVideoUrl?: string;
  vendor?: string;
  includeAllYears?: boolean;
  years?: number[];
};

export type SectionHeaderData = {
  title: string;
  subtitle?: string;
};

export type PresentationItem = {
  id: string;
  type: PresentationItemType;
  order: number;
  collectionData?: CollectionData;
  headerData?: SectionHeaderData;
  properties: PresentationItemProperties;
};
