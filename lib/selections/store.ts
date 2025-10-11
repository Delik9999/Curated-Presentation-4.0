import { randomUUID } from 'crypto';
import { z } from 'zod';
import { readJsonFile, writeJsonFile } from '@/lib/utils/file';
import { selectionSchema, selectionItemSchema } from './schema';
import type { Selection, SelectionItem } from './types';

const COLLECTION_PATH = 'data/selections.json';

const selectionsSchema = z.array(selectionSchema);

async function loadSelections(): Promise<Selection[]> {
  const selections = await readJsonFile<Selection[]>(COLLECTION_PATH, []);
  return selectionsSchema.parse(selections);
}

async function persistSelections(selections: Selection[]): Promise<void> {
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

export async function listSnapshots(customerId: string): Promise<Selection[]> {
  const selections = await loadSelections();
  return selections.filter(
    (selection) =>
      selection.customerId === customerId &&
      selection.status === 'snapshot' &&
      selection.source === 'dallas'
  );
}

export async function getLatestDallas(customerId: string): Promise<Selection | null> {
  const snapshots = await listSnapshots(customerId);
  if (snapshots.length === 0) return null;
  return snapshots
    .filter((snapshot) => snapshot.isPublished)
    .sort((a, b) => b.version - a.version || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export type SaveDallasSnapshotInput = {
  customerId: string;
  sourceYear: number;
  sourceEventId: string;
  name: string;
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
    isPublished: true,
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

export async function getWorkingSelection(customerId: string): Promise<Selection | null> {
  const selections = await loadSelections();
  const working = selections
    .filter((selection) => selection.customerId === customerId && selection.status === 'working')
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

export async function listWorkingHistory(customerId: string): Promise<Selection[]> {
  const selections = await loadSelections();
  return selections.filter((selection) => selection.customerId === customerId && selection.source !== 'dallas');
}

export async function updateWorkingSelection(
  customerId: string,
  updates: {
    items: { sku: string; qty: number; notes?: string }[];
    name?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Selection> {
  const selections = await loadSelections();
  const working = await getWorkingSelection(customerId);
  if (!working) {
    throw new Error('No working selection to update');
  }

  const now = nextTimestamp();
  const updatesMap = new Map(updates.items.map((item) => [item.sku, item]));

  const updatedItems = working.items.map((item) => {
    const overrides = updatesMap.get(item.sku);
    if (!overrides) return item;
    return computeFinancials({
      ...item,
      qty: overrides.qty,
      notes: overrides.notes,
    });
  });

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
