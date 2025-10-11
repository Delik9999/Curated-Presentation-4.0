import type { Selection } from '@/lib/selections/types';
import {
  getLatestDallas,
  getSelectionById,
  getWorkingSelection,
  listSnapshots,
} from '@/lib/selections/store';

export type SelectionExportType = 'dallas' | 'working';

export async function resolveSelection(
  customerId: string,
  type: SelectionExportType,
  selectionId?: string
): Promise<Selection | null> {
  if (selectionId) {
    const match = await getSelectionById(selectionId);
    if (match && match.customerId === customerId) {
      if (type === 'dallas' && match.status === 'snapshot') return match;
      if (type === 'working' && match.status === 'working') return match;
    }
  }

  if (type === 'dallas') {
    return getLatestDallas(customerId);
  }

  if (type === 'working') {
    return getWorkingSelection(customerId);
  }

  return null;
}

export async function listAvailableSelections(customerId: string) {
  const [snapshots, working] = await Promise.all([
    listSnapshots(customerId),
    getWorkingSelection(customerId),
  ]);

  return {
    snapshots: snapshots.sort((a, b) => b.version - a.version),
    working,
  };
}
