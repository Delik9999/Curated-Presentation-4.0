import { randomUUID } from 'crypto';
import { unstable_noStore as noStore } from 'next/cache';
import { z } from 'zod';
import { readJsonFile, writeJsonFile } from '@/lib/utils/file';
import { selectionSchema, selectionItemSchema } from './schema';
import type { Selection, SelectionItem, PromotionConfig, PresentationItem, CollectionSelection, Presentation } from './types';
import {
  loadSelections as loadSelectionsFromDataClient,
  saveSelection as saveSelectionToDataClient,
  isSupabaseConfigured,
  type SelectionData,
} from '@/lib/supabase/dataClient';

const COLLECTION_PATH = 'data/selections.json';
const PROMOTIONS_PATH = 'data/promotions.json';

const selectionsSchema = z.array(selectionSchema);

// Convert from dataClient format to store format
function fromDataClientFormat(data: SelectionData): Selection {
  return {
    id: data.id,
    customerId: data.customerId,
    name: data.name,
    status: data.status,
    source: data.source || 'manual', // Default to 'manual' if undefined
    vendor: data.vendor,
    isPublished: data.isPublished,
    isVisibleToCustomer: data.isVisibleToCustomer,
    version: data.version,
    marketCycle: data.marketCycle,
    sourceEventId: data.sourceEventId,
    sourceYear: data.sourceYear,
    marketMonth: data.marketMonth,
    items: data.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      imageUrl: item.imageUrl,
      qty: item.qty,
      displayQty: item.displayQty,
      backupQty: item.backupQty,
      unitList: item.unitList,
      programDisc: item.programDisc,
      netUnit: item.netUnit,
      extendedNet: item.extendedNet,
      notes: item.notes,
      tags: item.tags,
      collection: item.collection,
      year: item.year,
      configuration: item.configuration,
    })),
    metadata: data.metadata,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// Convert from store format to dataClient format
function toDataClientFormat(selection: Selection): SelectionData {
  return {
    id: selection.id,
    customerId: selection.customerId,
    name: selection.name,
    status: selection.status,
    source: selection.source,
    vendor: selection.vendor,
    isPublished: selection.isPublished,
    isVisibleToCustomer: selection.isVisibleToCustomer,
    version: selection.version,
    marketCycle: selection.marketCycle,
    sourceEventId: selection.sourceEventId,
    sourceYear: selection.sourceYear,
    marketMonth: selection.marketMonth,
    items: selection.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      imageUrl: item.imageUrl,
      qty: item.qty,
      displayQty: item.displayQty,
      backupQty: item.backupQty,
      unitList: item.unitList,
      programDisc: item.programDisc,
      netUnit: item.netUnit,
      extendedNet: item.extendedNet,
      notes: item.notes,
      tags: item.tags,
      collection: item.collection,
      year: item.year,
      configuration: item.configuration,
    })),
    metadata: selection.metadata,
    createdAt: selection.createdAt,
    updatedAt: selection.updatedAt,
  };
}

async function loadSelections(): Promise<Selection[]> {
  if (isSupabaseConfigured()) {
    const data = await loadSelectionsFromDataClient();
    return data.map(fromDataClientFormat);
  }
  // Fallback to JSON
  const selections = await readJsonFile<Selection[]>(COLLECTION_PATH, []);
  return selectionsSchema.parse(selections);
}

async function persistSelections(selections: Selection[]): Promise<void> {
  if (isSupabaseConfigured()) {
    // For Supabase, we save each selection individually
    // This is a simplified approach - in production you might want batch operations
    for (const selection of selections) {
      await saveSelectionToDataClient(toDataClientFormat(selection));
    }
    return;
  }
  // Fallback to JSON
  const parsed = selectionsSchema.parse(selections);
  await writeJsonFile(COLLECTION_PATH, parsed);
}

function computeFinancials(item: SelectionItem): SelectionItem {
  const programDisc = item.programDisc ?? 0;
  const netUnit = Number((item.unitList * (1 - programDisc)).toFixed(2));
  const extendedNet = Number((netUnit * item.qty).toFixed(2));
  return {
    ...item,
    programDisc: item.programDisc,
    netUnit,
    extendedNet,
  };
}

function cloneItems(items: SelectionItem[]): SelectionItem[] {
  return items.map((item) => computeFinancials({ ...item }));
}

function nextTimestamp() {
  return new Date().toISOString();
}

function archiveSelection(selection: Selection): Selection {
  return {
    ...selection,
    status: 'archived',
    isPublished: false,
    updatedAt: nextTimestamp(),
  };
}

function marketCyclesMatch(
  cycle1: { year: number; month: 'January' | 'June' } | undefined,
  cycle2: { year: number; month: 'January' | 'June' } | undefined
): boolean {
  if (!cycle1 || !cycle2) return false;
  return cycle1.year === cycle2.year && cycle1.month === cycle2.month;
}

/**
 * Archives working selections that don't match the current market cycle.
 * This should be called when a promotion config's market cycle changes.
 */
export async function archiveStaleWorkingSelections(
  customerId: string,
  currentMarketCycle: { year: number; month: 'January' | 'June' },
  vendor?: string
): Promise<{ archived: Selection[]; kept: Selection[] }> {
  const selections = await loadSelections();
  const archived: Selection[] = [];
  const kept: Selection[] = [];

  const updatedSelections = selections.map((selection) => {
    // Only check working selections for this customer and vendor
    if (
      selection.customerId !== customerId ||
      selection.status !== 'working' ||
      (vendor && (selection.vendor || 'lib-and-co') !== vendor)
    ) {
      return selection;
    }

    // If the selection has a different market cycle, archive it
    if (!marketCyclesMatch(selection.marketCycle, currentMarketCycle)) {
      const archivedSelection = archiveSelection(selection);
      archived.push(archivedSelection);
      return archivedSelection;
    }

    kept.push(selection);
    return selection;
  });

  await persistSelections(updatedSelections);
  return { archived, kept };
}

export async function listSnapshots(customerId: string, vendor?: string): Promise<Selection[]> {
  const selections = await loadSelections();
  return selections.filter(
    (selection) =>
      selection.customerId === customerId &&
      selection.status === 'snapshot' &&
      selection.source === 'dallas' &&
      (!vendor || (selection.vendor || 'lib-and-co') === vendor)
  );
}

export async function listDallasMarketOrders(customerId: string, vendor?: string): Promise<Selection[]> {
  const selections = await loadSelections();
  const dallasSnapshots = selections.filter(
    (selection) =>
      selection.customerId === customerId &&
      selection.status === 'snapshot' &&
      selection.source === 'dallas' &&
      selection.isPublished &&
      (!vendor || (selection.vendor || 'lib-and-co') === vendor)
  );

  // Group by sourceEventId and return the latest version of each market order
  const grouped = new Map<string, Selection>();
  dallasSnapshots.forEach((snapshot) => {
    const eventId = snapshot.sourceEventId ?? '';
    const existing = grouped.get(eventId);
    if (!existing || snapshot.version > existing.version) {
      grouped.set(eventId, snapshot);
    }
  });

  // Sort by year and month, most recent first
  return Array.from(grouped.values()).sort((a, b) => {
    if (a.sourceYear !== b.sourceYear) {
      return (b.sourceYear ?? 0) - (a.sourceYear ?? 0);
    }
    // June comes after January in the same year
    const monthOrder = { January: 0, June: 1 };
    const aMonth = monthOrder[a.marketMonth ?? 'January'];
    const bMonth = monthOrder[b.marketMonth ?? 'January'];
    return bMonth - aMonth;
  });
}

export async function getLatestDallas(customerId: string): Promise<Selection | null> {
  const snapshots = await listSnapshots(customerId);
  if (snapshots.length === 0) return null;
  return snapshots
    .filter((snapshot) => snapshot.isPublished)
    .sort((a, b) => b.version - a.version || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

/**
 * Get the market order that is marked as visible to the customer.
 * Returns the market order where isVisibleToCustomer === true.
 * If multiple are visible, returns the most recent one.
 * If none are visible, returns null.
 */
export async function getActiveDallas(customerId: string, vendor?: string): Promise<Selection | null> {
  const marketOrders = await listDallasMarketOrders(customerId, vendor);
  if (marketOrders.length === 0) return null;

  // Find orders marked as visible to customer
  const visibleOrders = marketOrders.filter((order) => order.isVisibleToCustomer === true);

  // Return the most recent visible order (already sorted by listDallasMarketOrders)
  return visibleOrders[0] ?? null;
}

export type SaveDallasSnapshotInput = {
  customerId: string;
  sourceYear: number;
  marketMonth: 'January' | 'June';
  sourceEventId: string;
  name: string;
  vendor?: string;
  items: (Omit<SelectionItem, 'netUnit' | 'extendedNet'> & {
    netUnit?: number;
    extendedNet?: number;
  })[];
  metadata?: Record<string, unknown>;
};

export async function saveDallasSnapshot(
  input: SaveDallasSnapshotInput
): Promise<Selection> {
  const selections = await loadSelections();
  const now = nextTimestamp();
  const customerSelections = selections.filter(
    (selection) =>
      selection.customerId === input.customerId &&
      selection.source === 'dallas' &&
      selection.sourceYear === input.sourceYear &&
      selection.sourceEventId === input.sourceEventId
  );

  const latestExisting = customerSelections
    .filter((selection) => selection.status === 'snapshot')
    .sort((a, b) => b.version - a.version)[0];

  const version = (latestExisting?.version ?? 0) + 1;

  const computedItems = input.items.map((item) =>
    computeFinancials({
      sku: item.sku,
      name: item.name,
      qty: item.qty,
      unitList: item.unitList,
      programDisc: item.programDisc,
      netUnit: item.netUnit ?? 0,
      extendedNet: item.extendedNet ?? 0,
      notes: item.notes,
      tags: item.tags,
    })
  );

  const newSelection: Selection = selectionSchema.parse({
    id: randomUUID(),
    customerId: input.customerId,
    name: input.name || `${input.sourceEventId} Snapshot`,
    status: 'snapshot',
    source: 'dallas',
    sourceEventId: input.sourceEventId,
    sourceYear: input.sourceYear,
    marketMonth: input.marketMonth,
    vendor: input.vendor,
    isPublished: true,
    isVisibleToCustomer: false,
    version,
    items: computedItems.map((item) => selectionItemSchema.parse(item)),
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  });

  const updatedSelections = selections.map((selection) => {
    if (
      selection.customerId === input.customerId &&
      selection.source === 'dallas' &&
      selection.sourceYear === input.sourceYear &&
      selection.sourceEventId === input.sourceEventId &&
      selection.status === 'snapshot'
    ) {
      return archiveSelection(selection);
    }
    return selection;
  });

  updatedSelections.push(newSelection);
  await persistSelections(updatedSelections);
  return newSelection;
}

export async function getWorkingSelection(customerId: string, vendor?: string): Promise<Selection | null> {
  const selections = await loadSelections();
  const working = selections
    .filter((selection) => {
      // Must be working status for this customer
      if (selection.customerId !== customerId || selection.status !== 'working') {
        return false;
      }
      // If vendor filter is provided, only return selections for that vendor
      // Default to 'lib-and-co' for legacy selections without vendor field
      if (vendor) {
        const selectionVendor = selection.vendor || 'lib-and-co';
        return selectionVendor === vendor;
      }
      return true;
    })
    .sort((a, b) => b.version - a.version || b.updatedAt.localeCompare(a.updatedAt))[0];
  return working ?? null;
}

export async function createWorkingFromSnapshot(
  customerId: string,
  snapshotId: string,
  name?: string,
  metadata?: Record<string, unknown>
): Promise<Selection> {
  const selections = await loadSelections();
  const snapshot = selections.find((selection) => selection.id === snapshotId && selection.status === 'snapshot');
  if (!snapshot) {
    throw new Error('Snapshot not found');
  }

  const existingWorking = await getWorkingSelection(customerId);
  const newVersion = (existingWorking?.version ?? 0) + 1;
  const now = nextTimestamp();

  const newSelection: Selection = selectionSchema.parse({
    id: randomUUID(),
    customerId,
    name: name || `${snapshot.name} Working`,
    status: 'working',
    source: 'manual',
    sourceEventId: snapshot.sourceEventId,
    sourceYear: snapshot.sourceYear,
    isPublished: true,
    version: newVersion,
    items: cloneItems(snapshot.items).map((item) => selectionItemSchema.parse(item)),
    metadata: {
      ...snapshot.metadata,
      ...metadata,
      importedFrom: 'Dallas',
      snapshotId,
    },
    createdAt: now,
    updatedAt: now,
  });

  const updatedSelections = selections.map((selection) =>
    selection.id === existingWorking?.id ? archiveSelection(selection) : selection
  );
  updatedSelections.push(newSelection);
  await persistSelections(updatedSelections);
  return newSelection;
}

type MergeStrategy = 'addOnlyNew' | 'sumQuantities' | 'preferDallas';

function mergeItems(
  existingItems: SelectionItem[],
  snapshotItems: SelectionItem[],
  strategy: MergeStrategy
): SelectionItem[] {
  const existingMap = new Map(existingItems.map((item) => [item.sku, { ...item }]));

  snapshotItems.forEach((snapshotItem) => {
    const current = existingMap.get(snapshotItem.sku);
    if (!current) {
      existingMap.set(snapshotItem.sku, { ...snapshotItem });
      return;
    }

    if (strategy === 'addOnlyNew') {
      return;
    }

    if (strategy === 'preferDallas') {
      existingMap.set(snapshotItem.sku, { ...snapshotItem });
      return;
    }

    if (strategy === 'sumQuantities') {
      const qty = current.qty + snapshotItem.qty;
      existingMap.set(snapshotItem.sku, {
        ...current,
        qty,
        unitList: snapshotItem.unitList,
        programDisc: snapshotItem.programDisc,
        netUnit: snapshotItem.netUnit,
        extendedNet: snapshotItem.netUnit * qty,
        notes: snapshotItem.notes ?? current.notes,
        tags: snapshotItem.tags ?? current.tags,
      });
    }
  });

  return Array.from(existingMap.values()).map((item) => computeFinancials(item));
}

export async function mergeDallasIntoWorking(
  customerId: string,
  snapshotId: string,
  strategy: MergeStrategy
): Promise<Selection> {
  const selections = await loadSelections();
  const snapshot = selections.find((selection) => selection.id === snapshotId && selection.status === 'snapshot');
  if (!snapshot) {
    throw new Error('Snapshot not found');
  }

  const working = await getWorkingSelection(customerId);
  if (!working) {
    throw new Error('No working selection to merge');
  }

  const mergedItems = mergeItems(working.items, snapshot.items, strategy);
  const now = nextTimestamp();

  const newSelection: Selection = selectionSchema.parse({
    ...working,
    id: randomUUID(),
    items: mergedItems.map((item) => selectionItemSchema.parse(item)),
    version: working.version + 1,
    status: 'working',
    source: working.source,
    isPublished: true,
    metadata: {
      ...working.metadata,
      mergedFrom: snapshotId,
      mergeStrategy: strategy,
      mergedAt: now,
    },
    createdAt: working.createdAt,
    updatedAt: now,
  });

  const updatedSelections = selections.map((selection) =>
    selection.id === working.id ? archiveSelection(selection) : selection
  );
  updatedSelections.push(newSelection);
  await persistSelections(updatedSelections);
  return newSelection;
}

export async function getSelectionById(selectionId: string): Promise<Selection | null> {
  const selections = await loadSelections();
  return selections.find((selection) => selection.id === selectionId) ?? null;
}

/**
 * Delete a market selection (Dallas snapshot)
 * This permanently removes the selection from the database
 */
export async function deleteMarketSelection(
  selectionId: string,
  customerId: string
): Promise<{ deleted: boolean }> {
  const selections = await loadSelections();
  const selection = selections.find(
    (s) => s.id === selectionId && s.customerId === customerId
  );

  if (!selection) {
    throw new Error('Selection not found');
  }

  // Only allow deleting Dallas snapshots
  if (selection.source !== 'dallas' || selection.status !== 'snapshot') {
    throw new Error('Can only delete Dallas market selections');
  }

  const updatedSelections = selections.filter((s) => s.id !== selectionId);
  await persistSelections(updatedSelections);

  return { deleted: true };
}

export async function listWorkingHistory(customerId: string): Promise<Selection[]> {
  const selections = await loadSelections();
  return selections.filter((selection) => selection.customerId === customerId && selection.source !== 'dallas');
}

export async function toggleDallasVisibility(
  selectionId: string,
  customerId: string
): Promise<Selection> {
  const selections = await loadSelections();
  const selection = selections.find((s) => s.id === selectionId && s.customerId === customerId);

  if (!selection || selection.source !== 'dallas' || selection.status !== 'snapshot') {
    throw new Error('Dallas market order not found');
  }

  const now = nextTimestamp();
  const newVisibility = !selection.isVisibleToCustomer;

  // If setting to visible, unmark all other Dallas orders for this customer
  const updatedSelections = selections.map((s) => {
    if (s.id === selectionId) {
      return selectionSchema.parse({
        ...s,
        isVisibleToCustomer: newVisibility,
        updatedAt: now,
      });
    }
    // Unmark other Dallas orders if we're marking this one as visible
    if (newVisibility && s.customerId === customerId && s.source === 'dallas' && s.status === 'snapshot' && s.isVisibleToCustomer) {
      return selectionSchema.parse({
        ...s,
        isVisibleToCustomer: false,
        updatedAt: now,
      });
    }
    return s;
  });

  await persistSelections(updatedSelections);
  return updatedSelections.find((s) => s.id === selectionId)!;
}

export async function addItemToWorkingSelection(
  customerId: string,
  newItem: {
    sku: string;
    name: string;
    qty: number;
    unitList: number;
    programDisc?: number;
    notes?: string;
    tags?: string[];
    collection?: string;
    year?: number;
    configuration?: {
      baseItemCode: string;
      options: Record<string, string>;
      productName: string;
    };
  },
  vendor?: string
): Promise<Selection> {
  const selections = await loadSelections();
  const working = await getWorkingSelection(customerId, vendor);

  const now = nextTimestamp();

  // If no working selection exists for this vendor, create one
  if (!working) {
    // Get current market cycle from promotion config
    const promotionConfig = await getPromotionConfig(customerId, vendor);
    const marketCycle = promotionConfig?.marketCycle;

    const itemWithConfig = {
      ...computeFinancials(newItem as SelectionItem),
      collection: newItem.collection,
      year: newItem.year,
      configuration: newItem.configuration,
    };
    const newSelection: Selection = selectionSchema.parse({
      id: randomUUID(),
      customerId,
      name: 'Working Selection',
      status: 'working',
      source: 'manual',
      vendor: vendor || 'lib-and-co', // Set vendor on creation
      marketCycle, // Capture current market cycle
      isPublished: true,
      version: 1,
      items: [selectionItemSchema.parse(itemWithConfig)],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
    selections.push(newSelection);
    await persistSelections(selections);
    return newSelection;
  }

  // Check if item already exists
  const existingItemIndex = working.items.findIndex((item) => item.sku === newItem.sku);

  let updatedItems: SelectionItem[];
  if (existingItemIndex >= 0) {
    // Update existing item quantity
    updatedItems = working.items.map((item, index) => {
      if (index === existingItemIndex) {
        return computeFinancials({
          ...item,
          qty: item.qty + newItem.qty,
          unitList: newItem.unitList,
          programDisc: newItem.programDisc,
        });
      }
      return item;
    });
  } else {
    // Add new item (preserve configuration, collection, year)
    const newItemWithConfig = {
      ...computeFinancials(newItem as SelectionItem),
      collection: newItem.collection,
      year: newItem.year,
      configuration: newItem.configuration,
    };
    updatedItems = [...working.items, newItemWithConfig];
  }

  // If this selection was restored from Dallas, mark it as modified
  const isRestoredFromDallas = working.metadata?.restoredFrom;

  const newSelection: Selection = selectionSchema.parse({
    ...working,
    id: randomUUID(),
    version: working.version + 1,
    items: updatedItems.map((item) => selectionItemSchema.parse(item)),
    metadata: {
      ...working.metadata,
      lastAddedSku: newItem.sku,
      lastAddedAt: now,
      // Mark as modified if it was restored from Dallas
      ...(isRestoredFromDallas ? { wasModified: true } : {}),
    },
    updatedAt: now,
  });

  const updatedSelections = selections.map((selection) =>
    selection.id === working.id ? archiveSelection(selection) : selection
  );
  updatedSelections.push(newSelection);
  await persistSelections(updatedSelections);
  return newSelection;
}

export async function updateWorkingSelection(
  customerId: string,
  updates: {
    items: { sku: string; qty: number; notes?: string }[];
    name?: string;
    metadata?: Record<string, unknown>;
  },
  vendor?: string
): Promise<Selection> {
  const selections = await loadSelections();
  const working = await getWorkingSelection(customerId, vendor);
  if (!working) {
    throw new Error('No working selection to update');
  }

  const now = nextTimestamp();

  // Build updated items list - REPLACE entirely with provided items
  // For items that exist in working selection, preserve their metadata (name, collection, pricing)
  // For new items, create them with the provided data
  const workingItemsMap = new Map(working.items.map((item) => [item.sku, item]));

  const updatedItems = updates.items.map((updateItem) => {
    const existing = workingItemsMap.get(updateItem.sku);
    if (existing) {
      // Update existing item
      return computeFinancials({
        ...existing,
        qty: updateItem.qty,
        notes: updateItem.notes,
      });
    } else {
      // New item - create with minimal data
      return computeFinancials({
        sku: updateItem.sku,
        qty: updateItem.qty,
        notes: updateItem.notes || '',
        name: updateItem.sku, // Will be enriched later if needed
        collection: '',
        unitList: 0,
      } as SelectionItem);
    }
  });

  // Check if this is a fresh restore operation (new restoredFrom in updates.metadata)
  const isFreshRestore = updates.metadata?.restoredFrom;

  // If selection was previously restored from Dallas AND this is NOT a fresh restore, mark as modified
  const isRestoredFromDallas = working.metadata?.restoredFrom && !isFreshRestore;

  const newSelection: Selection = selectionSchema.parse({
    ...working,
    id: randomUUID(),
    version: working.version + 1,
    name: updates.name ?? working.name,
    items: updatedItems.map((item) => selectionItemSchema.parse(item)),
    metadata: {
      ...working.metadata,
      ...updates.metadata,
      revisedAt: now,
      // Mark as modified if it was restored from Dallas (but not during a fresh restore)
      ...(isRestoredFromDallas ? { wasModified: true } : {}),
    },
    updatedAt: now,
  });

  const updatedSelections = selections.map((selection) =>
    selection.id === working.id ? archiveSelection(selection) : selection
  );
  updatedSelections.push(newSelection);
  await persistSelections(updatedSelections);
  return newSelection;
}

/**
 * Restore a snapshot as the working selection by completely REPLACING the items.
 * This is different from updateWorkingSelection which merges/updates existing items.
 */
export async function restoreWorkingSelection(
  customerId: string,
  snapshotId: string
): Promise<Selection> {
  const selections = await loadSelections();
  const working = await getWorkingSelection(customerId);
  const snapshot = await getSelectionById(snapshotId);

  if (!snapshot) {
    throw new Error('Snapshot not found');
  }

  if (snapshot.customerId !== customerId) {
    throw new Error('Snapshot does not belong to this customer');
  }

  const now = nextTimestamp();

  // If no working selection exists, create one from the snapshot
  if (!working) {
    // Get current market cycle from promotion config
    const promotionConfig = await getPromotionConfig(customerId, snapshot.vendor);
    const marketCycle = promotionConfig?.marketCycle;

    const newSelection: Selection = selectionSchema.parse({
      id: randomUUID(),
      customerId,
      name: 'Working Selection',
      status: 'working',
      source: snapshot.source,
      vendor: snapshot.vendor,
      marketCycle, // Capture current market cycle
      isPublished: true,
      version: 1,
      items: cloneItems(snapshot.items),
      metadata: {
        restoredFrom: snapshotId,
        restoredAt: now,
        restoredFromName: snapshot.name,
        // Do NOT set wasModified - this is a fresh restore
      },
      createdAt: now,
      updatedAt: now,
    });
    selections.push(newSelection);
    await persistSelections(selections);
    return newSelection;
  }

  // Replace the working selection with the snapshot's items
  const newSelection: Selection = selectionSchema.parse({
    ...working,
    id: randomUUID(),
    version: working.version + 1,
    vendor: snapshot.vendor, // Update vendor to match snapshot
    items: cloneItems(snapshot.items), // Completely replace items
    metadata: {
      restoredFrom: snapshotId,
      restoredAt: now,
      restoredFromName: snapshot.name,
      // Do NOT set wasModified - this is a fresh restore
      // Do NOT preserve old metadata - start fresh
    },
    updatedAt: now,
  });

  const updatedSelections = selections.map((selection) =>
    selection.id === working.id ? archiveSelection(selection) : selection
  );
  updatedSelections.push(newSelection);
  await persistSelections(updatedSelections);
  return newSelection;
}

// Promotion Config functions
async function loadPromotions(): Promise<PromotionConfig[]> {
  return await readJsonFile<PromotionConfig[]>(PROMOTIONS_PATH, []);
}

async function persistPromotions(promotions: PromotionConfig[]): Promise<void> {
  await writeJsonFile(PROMOTIONS_PATH, promotions);
}

export async function getPromotionConfig(customerId?: string, vendor?: string): Promise<PromotionConfig | null> {
  noStore(); // Opt out of caching to always get fresh promotion data
  const promotions = await loadPromotions();
  let config: PromotionConfig | undefined;

  if (customerId) {
    config = promotions.find((p) => p.customerId === customerId && (!vendor || p.vendor === vendor));
  } else {
    // Return global config for the specified vendor (no customerId)
    config = promotions.find((p) => !p.customerId && (!vendor || p.vendor === vendor));
  }

  if (!config) return null;

  // If the config has presentations, return a modified config with the active presentation's data
  if (config.presentations && config.presentations.length > 0) {
    const activePresentation = config.presentations.find(p => p.isActive) || config.presentations[0];

    return {
      ...config,
      collections: activePresentation.collections,
      presentationItems: activePresentation.presentationItems,
    };
  }

  return config;
}

export async function savePromotionConfig(
  customerId: string | undefined,
  items: PresentationItem[] | CollectionSelection[],
  vendor?: string,
  isPresentationItems: boolean = false
): Promise<PromotionConfig> {
  const promotions = await loadPromotions();
  const now = nextTimestamp();

  const existing = await getPromotionConfig(customerId, vendor);

  // Convert items based on type
  const presentationItems = isPresentationItems ? (items as PresentationItem[]) : undefined;
  const collections = !isPresentationItems
    ? (items as CollectionSelection[])
    : // Generate backward-compatible collections from presentationItems
      (items as PresentationItem[])
        .filter((item) => item.type === 'collection')
        .map((item) => ({
          collectionName: item.collectionData!.collectionName,
          years: item.collectionData!.years,
          includeAllYears: item.collectionData!.includeAllYears ?? true,
        }));

  if (existing) {
    const updated: PromotionConfig = {
      ...existing,
      collections,
      presentationItems,
      vendor,
      updatedAt: now,
    };
    const updatedPromotions = promotions.map((p) => (p.id === existing.id ? updated : p));
    await persistPromotions(updatedPromotions);
    return updated;
  }

  const newPromotion: PromotionConfig = {
    id: randomUUID(),
    customerId,
    name: customerId ? `Customer ${customerId} Promotion` : `Global Promotion${vendor ? ` (${vendor})` : ''}`,
    vendor,
    collections,
    presentationItems,
    presentations: [],
    createdAt: now,
    updatedAt: now,
  };

  promotions.push(newPromotion);
  await persistPromotions(promotions);
  return newPromotion;
}

// Get all presentations for a vendor
export async function getPresentations(customerId?: string, vendor?: string): Promise<Presentation[]> {
  noStore();
  const config = await getPromotionConfig(customerId, vendor);
  if (!config) return [];

  // Handle legacy data - if no presentations array, create one from old format and persist it
  if (!config.presentations || config.presentations.length === 0) {
    console.log('[getPresentations] No presentations found, checking for legacy data...');
    console.log('[getPresentations] presentationItems count:', config.presentationItems?.length ?? 0);
    console.log('[getPresentations] collections count:', config.collections?.length ?? 0);

    if (config.presentationItems || config.collections) {
      console.log('[getPresentations] Migrating legacy data to presentation format...');
      const promotions = await loadPromotions();
      const now = nextTimestamp();

      const migratedPresentation: Presentation = {
        id: randomUUID(),
        name: 'Default Presentation',
        presentationItems: config.presentationItems || [],
        collections: config.collections || [],
        isActive: true,
        createdAt: config.createdAt,
        updatedAt: now,
      };

      // Update the config with the new presentations array
      const updatedConfig: PromotionConfig = {
        ...config,
        presentations: [migratedPresentation],
        updatedAt: now,
      };

      // Save the updated config
      const updatedPromotions = promotions.map((p) => (p.id === config.id ? updatedConfig : p));
      await persistPromotions(updatedPromotions);

      console.log('[getPresentations] Migration complete! Created presentation:', migratedPresentation.id);
      return [migratedPresentation];
    }
    console.log('[getPresentations] No legacy data to migrate');
    return [];
  }

  return config.presentations;
}

// Get the active presentation
export async function getActivePresentation(customerId?: string, vendor?: string): Promise<Presentation | null> {
  const presentations = await getPresentations(customerId, vendor);
  return presentations.find(p => p.isActive) || presentations[0] || null;
}

// Create a new presentation
export async function createPresentation(
  customerId: string | undefined,
  vendor: string,
  name: string
): Promise<Presentation> {
  const config = await getPromotionConfig(customerId, vendor);
  const promotions = await loadPromotions();
  const now = nextTimestamp();

  const newPresentation: Presentation = {
    id: randomUUID(),
    name,
    presentationItems: [],
    collections: [],
    isActive: false, // Don't activate by default
    createdAt: now,
    updatedAt: now,
  };

  if (config) {
    // Add to existing presentations
    const presentations = config.presentations || [];
    presentations.push(newPresentation);

    const updated: PromotionConfig = {
      ...config,
      presentations,
      updatedAt: now,
    };

    const updatedPromotions = promotions.map((p) => (p.id === config.id ? updated : p));
    await persistPromotions(updatedPromotions);
    return newPresentation;
  } else {
    // Create new config with this presentation
    const newConfig: PromotionConfig = {
      id: randomUUID(),
      customerId,
      name: `${vendor} Presentations`,
      vendor,
      presentations: [newPresentation],
      createdAt: now,
      updatedAt: now,
    };

    promotions.push(newConfig);
    await persistPromotions(promotions);
    return newPresentation;
  }
}

// Update a presentation
export async function updatePresentation(
  customerId: string | undefined,
  vendor: string,
  presentationId: string,
  updates: Partial<Presentation>
): Promise<Presentation> {
  console.log('[updatePresentation] Looking for config:', { customerId: customerId ?? 'undefined', vendor, presentationId });
  const config = await getPromotionConfig(customerId, vendor);
  if (!config) {
    throw new Error(`Promotion config not found for ${customerId ? `customer ${customerId}` : 'global'} and vendor ${vendor}`);
  }

  const promotions = await loadPromotions();
  const now = nextTimestamp();

  const presentations = config.presentations || [];
  const index = presentations.findIndex(p => p.id === presentationId);
  if (index === -1) throw new Error(`Presentation ${presentationId} not found in config`);

  const updated: Presentation = {
    ...presentations[index],
    ...updates,
    updatedAt: now,
  };

  presentations[index] = updated;

  const updatedConfig: PromotionConfig = {
    ...config,
    presentations,
    updatedAt: now,
  };

  const updatedPromotions = promotions.map((p) => (p.id === config.id ? updatedConfig : p));
  await persistPromotions(updatedPromotions);
  return updated;
}

// Set active presentation
export async function setActivePresentation(
  customerId: string | undefined,
  vendor: string,
  presentationId: string
): Promise<void> {
  const config = await getPromotionConfig(customerId, vendor);
  if (!config) throw new Error('Promotion config not found');

  const promotions = await loadPromotions();
  const now = nextTimestamp();

  const presentations = (config.presentations || []).map(p => ({
    ...p,
    isActive: p.id === presentationId,
  }));

  const updatedConfig: PromotionConfig = {
    ...config,
    presentations,
    updatedAt: now,
  };

  const updatedPromotions = promotions.map((p) => (p.id === config.id ? updatedConfig : p));
  await persistPromotions(updatedPromotions);
}

// Delete a presentation
export async function deletePresentation(
  customerId: string | undefined,
  vendor: string,
  presentationId: string
): Promise<void> {
  const config = await getPromotionConfig(customerId, vendor);
  if (!config) throw new Error('Promotion config not found');

  const promotions = await loadPromotions();
  const now = nextTimestamp();

  const presentations = (config.presentations || []).filter(p => p.id !== presentationId);

  // If we deleted the active presentation, make the first one active
  if (presentations.length > 0 && !presentations.some(p => p.isActive)) {
    presentations[0].isActive = true;
  }

  const updatedConfig: PromotionConfig = {
    ...config,
    presentations,
    updatedAt: now,
  };

  const updatedPromotions = promotions.map((p) => (p.id === config.id ? updatedConfig : p));
  await persistPromotions(updatedPromotions);
}

// ===== Market Cycle Management =====

const SETTINGS_PATH = 'data/settings.json';

type AppSettings = {
  currentMarketCycle: {
    year: number;
    month: 'January' | 'June';
  };
  updatedAt: string;
};

async function loadSettings(): Promise<AppSettings> {
  const defaults: AppSettings = {
    currentMarketCycle: { year: 2026, month: 'January' },
    updatedAt: new Date().toISOString(),
  };
  return await readJsonFile<AppSettings>(SETTINGS_PATH, defaults);
}

async function persistSettings(settings: AppSettings): Promise<void> {
  await writeJsonFile(SETTINGS_PATH, settings);
}

/**
 * Get the current market cycle (e.g., January 2026)
 */
export async function getCurrentMarketCycle(): Promise<{ year: number; month: 'January' | 'June' }> {
  const settings = await loadSettings();
  return settings.currentMarketCycle;
}

/**
 * Set the current market cycle
 */
export async function setCurrentMarketCycle(
  year: number,
  month: 'January' | 'June'
): Promise<{ year: number; month: 'January' | 'June' }> {
  const settings = await loadSettings();
  settings.currentMarketCycle = { year, month };
  settings.updatedAt = nextTimestamp();
  await persistSettings(settings);
  return settings.currentMarketCycle;
}

/**
 * Get all market selections for a specific market cycle across all customers
 * Returns selections grouped by customer with their visibility status
 */
export async function getMarketSelectionsByCycle(
  cycle: { year: number; month: 'January' | 'June' },
  vendor?: string
): Promise<{
  customerId: string;
  selection: Selection;
  isActive: boolean;
}[]> {
  const selections = await loadSelections();

  const matchingSelections = selections.filter((selection) => {
    // Must be a Dallas snapshot
    if (selection.source !== 'dallas' || selection.status !== 'snapshot' || !selection.isPublished) {
      return false;
    }

    // Filter by vendor if specified
    if (vendor && (selection.vendor || 'lib-and-co') !== vendor) {
      return false;
    }

    // Match market cycle
    if (selection.marketCycle) {
      return selection.marketCycle.year === cycle.year && selection.marketCycle.month === cycle.month;
    }

    // Fall back to legacy fields
    return selection.sourceYear === cycle.year && selection.marketMonth === cycle.month;
  });

  // Group by customer, keeping the latest version for each
  const customerMap = new Map<string, Selection>();

  matchingSelections.forEach((selection) => {
    const existing = customerMap.get(selection.customerId);
    if (!existing || selection.version > existing.version) {
      customerMap.set(selection.customerId, selection);
    }
  });

  return Array.from(customerMap.values()).map((selection) => ({
    customerId: selection.customerId,
    selection,
    isActive: selection.isVisibleToCustomer === true,
  }));
}

/**
 * Bulk activate all market selections for a specific cycle
 * Makes all selections in the cycle visible to customers
 */
export async function bulkActivateMarketSelections(
  cycle: { year: number; month: 'January' | 'June' },
  vendor?: string
): Promise<{ activated: number; total: number }> {
  const selections = await loadSelections();
  const now = nextTimestamp();

  let activated = 0;
  let total = 0;

  // First, identify all selections that match the cycle
  const matchingSelectionIds = new Set<string>();
  const customerIds = new Set<string>();

  selections.forEach((selection) => {
    if (selection.source !== 'dallas' || selection.status !== 'snapshot' || !selection.isPublished) {
      return;
    }

    if (vendor && (selection.vendor || 'lib-and-co') !== vendor) {
      return;
    }

    const matchesCycle = selection.marketCycle
      ? selection.marketCycle.year === cycle.year && selection.marketCycle.month === cycle.month
      : selection.sourceYear === cycle.year && selection.marketMonth === cycle.month;

    if (matchesCycle) {
      matchingSelectionIds.add(selection.id);
      customerIds.add(selection.customerId);
      total++;
    }
  });

  // Update selections
  const updatedSelections = selections.map((selection) => {
    // If this selection matches the cycle and vendor, activate it
    if (matchingSelectionIds.has(selection.id)) {
      if (!selection.isVisibleToCustomer) {
        activated++;
      }
      return {
        ...selection,
        isVisibleToCustomer: true,
        updatedAt: now,
      };
    }

    // If this is a Dallas snapshot for a customer in our list but different cycle, deactivate it
    if (
      selection.source === 'dallas' &&
      selection.status === 'snapshot' &&
      customerIds.has(selection.customerId) &&
      selection.isVisibleToCustomer &&
      (!vendor || (selection.vendor || 'lib-and-co') === vendor)
    ) {
      return {
        ...selection,
        isVisibleToCustomer: false,
        updatedAt: now,
      };
    }

    return selection;
  });

  await persistSelections(updatedSelections);

  return { activated, total };
}

/**
 * Bulk deactivate all market selections for a specific cycle
 */
export async function bulkDeactivateMarketSelections(
  cycle: { year: number; month: 'January' | 'June' },
  vendor?: string
): Promise<{ deactivated: number; total: number }> {
  const selections = await loadSelections();
  const now = nextTimestamp();

  let deactivated = 0;
  let total = 0;

  const updatedSelections = selections.map((selection) => {
    if (selection.source !== 'dallas' || selection.status !== 'snapshot' || !selection.isPublished) {
      return selection;
    }

    if (vendor && (selection.vendor || 'lib-and-co') !== vendor) {
      return selection;
    }

    const matchesCycle = selection.marketCycle
      ? selection.marketCycle.year === cycle.year && selection.marketCycle.month === cycle.month
      : selection.sourceYear === cycle.year && selection.marketMonth === cycle.month;

    if (matchesCycle) {
      total++;
      if (selection.isVisibleToCustomer) {
        deactivated++;
        return {
          ...selection,
          isVisibleToCustomer: false,
          updatedAt: now,
        };
      }
    }

    return selection;
  });

  await persistSelections(updatedSelections);

  return { deactivated, total };
}

/**
 * Get summary statistics for market selections across all cycles
 */
export async function getMarketSelectionStats(vendor?: string): Promise<{
  byCycle: {
    cycle: { year: number; month: 'January' | 'June' };
    total: number;
    active: number;
  }[];
  totalCustomers: number;
}> {
  const selections = await loadSelections();

  const cycleMap = new Map<string, { year: number; month: 'January' | 'June'; total: number; active: number }>();
  const customers = new Set<string>();

  selections.forEach((selection) => {
    if (selection.source !== 'dallas' || selection.status !== 'snapshot' || !selection.isPublished) {
      return;
    }

    if (vendor && (selection.vendor || 'lib-and-co') !== vendor) {
      return;
    }

    const year = selection.marketCycle?.year || selection.sourceYear;
    const month = selection.marketCycle?.month || selection.marketMonth || 'January';

    if (!year) return;

    const key = `${year}-${month}`;
    const existing = cycleMap.get(key) || { year, month, total: 0, active: 0 };
    existing.total++;
    if (selection.isVisibleToCustomer) existing.active++;
    cycleMap.set(key, existing);

    customers.add(selection.customerId);
  });

  return {
    byCycle: Array.from(cycleMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return a.month === 'June' ? -1 : 1;
      })
      .map(({ year, month, total, active }) => ({
        cycle: { year, month },
        total,
        active,
      })),
    totalCustomers: customers.size,
  };
}
