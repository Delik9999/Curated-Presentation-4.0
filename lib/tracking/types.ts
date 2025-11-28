// Session tracking
export type Session = {
  id: string;
  customerId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // milliseconds
  ipAddress?: string;
  userAgent?: string;
  lastActivity?: string;
};

// Activity event types
export type ActivityEventType =
  | 'page_view'
  | 'search'
  | 'collection_opened'
  | 'collection_closed'
  | 'product_viewed'
  | 'selection_item_added'
  | 'selection_item_removed'
  | 'selection_item_updated'
  | 'selection_item_reordered'
  | 'selection_exported'
  | 'presentation_opened'
  | 'presentation_downloaded'
  | 'tab_changed';

// Activity event
export type ActivityEvent = {
  id: string;
  customerId: string;
  sessionId: string;
  type: ActivityEventType;
  timestamp: string;
  metadata: {
    pagePath?: string;
    searchQuery?: string;
    collectionName?: string;
    productSku?: string;
    productName?: string;
    selectionId?: string;
    selectionName?: string;
    exportFormat?: 'csv' | 'json' | 'pdf';
    tabName?: string;
    vendor?: string;
    [key: string]: string | number | boolean | undefined;
  };
};

// Selection change types
export type SelectionChangeType = 'add' | 'remove' | 'update' | 'reorder';

export type SelectionChange = {
  id: string;
  customerId: string;
  selectionId: string;
  changeType: SelectionChangeType;
  timestamp: string;
  userId?: string; // who made the change
  userName?: string;
  userRole?: 'customer' | 'rep';
  changes: {
    sku?: string;
    productName?: string;
    oldQty?: number;
    newQty?: number;
    oldOrder?: number;
    newOrder?: number;
    oldNotes?: string;
    newNotes?: string;
    [key: string]: string | number | boolean | undefined;
  };
};

// Engagement metrics
export type EngagementMetrics = {
  customerId: string;
  lastSignIn?: string;
  totalSessions: number;
  totalEngagementTime: number; // milliseconds
  averageSessionDuration: number; // milliseconds
  pageViews: number;
  searches: number;
  collectionsViewed: number;
  productsViewed: number;
  selectionChanges: number;
  exports: number;
  lastUpdated: string;
};

// Tracking data aggregated response
export type CustomerTrackingData = {
  metrics: EngagementMetrics;
  recentSessions: Session[];
  recentActivity: ActivityEvent[];
  selectionChanges: SelectionChange[];
};
