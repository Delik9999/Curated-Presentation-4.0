/**
 * Customer Display Types
 *
 * Data structures for tracking what products/collections
 * are on display in each customer's showroom.
 */

export type DisplayStatus = 'ACTIVE' | 'MISSING' | 'ARCHIVED';

export type DisplayItem = {
  id: string;                    // Unique ID for this display entry
  customerId: string;            // Customer slug ID
  sku: string;                   // Product SKU on display
  collectionName: string;        // Collection name (for easier querying)
  installedAt: string;           // ISO date when put on display
  faces?: number;                // Number of display faces (optional)
  location?: string;             // Where in showroom (e.g., "Front window", "Feature wall")
  notes?: string;                // Any additional notes
  status?: DisplayStatus;        // Display status (default: ACTIVE)
  lastVerifiedAt?: string;       // ISO date when last verified during audit
  createdAt: string;             // When this record was created
  updatedAt: string;             // When this record was last updated
};

export type CustomerDisplays = {
  customerId: string;
  customerName: string;
  items: DisplayItem[];
  totalFaces: number;
  lastAuditDate?: string;        // When the display was last audited
};

export type AuditPhoto = {
  url: string;                   // URL to the uploaded photo
  filename: string;              // Original filename
  capturedAt: string;            // ISO date when photo was taken
};

export type AuditType = 'in-person' | 'report';

export type AuditSession = {
  id: string;
  customerId: string;
  completedAt: string;           // ISO date when audit was completed
  auditType?: AuditType;         // Type of audit: in-person visit or dealer report
  summary: AuditSummary;
  notes?: string;
  photos?: AuditPhoto[];         // Photos captured during audit
};

export type DisplaysData = {
  displays: DisplayItem[];
  auditSessions: AuditSession[];
  lastUpdated: string;
};

// For creating new display items
export type CreateDisplayInput = {
  customerId: string;
  sku: string;
  collectionName: string;
  installedAt: string;
  faces?: number;
  location?: string;
  notes?: string;
};

// For updating existing display items
export type UpdateDisplayInput = {
  id: string;
  sku?: string;
  collectionName?: string;
  installedAt?: string;
  faces?: number;
  location?: string;
  notes?: string;
  status?: DisplayStatus;
  lastVerifiedAt?: string;
};

// For audit operations
export type AuditAction = 'CONFIRM' | 'MISSING' | 'NOTE';

export type AuditUpdate = {
  id: string;
  action: AuditAction;
  notes?: string;
};

export type BulkAuditInput = {
  customerId: string;
  updates: AuditUpdate[];
};

export type AuditSummary = {
  total: number;
  verified: number;
  missing: number;
  unverified: number;
};
