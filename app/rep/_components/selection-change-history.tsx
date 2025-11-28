'use client';

import { SelectionChange } from '@/lib/tracking/types';
import { Plus, Minus, Edit, MoveVertical, User, Building } from 'lucide-react';

interface SelectionChangeHistoryProps {
  changes: SelectionChange[];
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getChangeIcon(type: string) {
  switch (type) {
    case 'add':
      return Plus;
    case 'remove':
      return Minus;
    case 'update':
      return Edit;
    case 'reorder':
      return MoveVertical;
    default:
      return Edit;
  }
}

function getChangeColor(type: string): string {
  switch (type) {
    case 'add':
      return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    case 'remove':
      return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    case 'update':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'reorder':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function getChangeDescription(change: SelectionChange): string {
  const { changeType, changes } = change;
  const productInfo = changes.productName || changes.sku || 'Unknown product';

  switch (changeType) {
    case 'add':
      return `Added ${productInfo}${changes.newQty ? ` (qty: ${changes.newQty})` : ''}`;
    case 'remove':
      return `Removed ${productInfo}`;
    case 'update':
      const updates: string[] = [];
      if (changes.oldQty !== undefined && changes.newQty !== undefined) {
        updates.push(`qty: ${changes.oldQty} → ${changes.newQty}`);
      }
      if (changes.oldNotes !== undefined && changes.newNotes !== undefined) {
        updates.push('notes updated');
      }
      return `Updated ${productInfo}${updates.length > 0 ? ` (${updates.join(', ')})` : ''}`;
    case 'reorder':
      if (changes.oldOrder !== undefined && changes.newOrder !== undefined) {
        return `Reordered ${productInfo} from position ${changes.oldOrder} to ${changes.newOrder}`;
      }
      return 'Reordered items';
    default:
      return `Changed ${productInfo}`;
  }
}

export default function SelectionChangeHistory({ changes }: SelectionChangeHistoryProps) {
  if (changes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <Edit className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No selection changes recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change) => {
        const Icon = getChangeIcon(change.changeType);
        const colorClass = getChangeColor(change.changeType);
        const description = getChangeDescription(change);

        return (
          <div
            key={change.id}
            className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow"
          >
            {/* Icon */}
            <div className={`rounded-lg p-2 ${colorClass} flex-shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 dark:text-white font-medium">
                {description}
              </p>

              {/* User info */}
              {(change.userName || change.userRole) && (
                <div className="flex items-center gap-2 mt-1">
                  {change.userRole === 'rep' ? (
                    <Building className="w-3 h-3 text-slate-400" />
                  ) : (
                    <User className="w-3 h-3 text-slate-400" />
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {change.userName}
                    {change.userRole && (
                      <span className="text-slate-400 dark:text-slate-500"> • {change.userRole}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatTime(change.timestamp)}
              </p>
            </div>

            {/* Selection ID */}
            <div className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 font-mono">
              {change.selectionId.slice(0, 8)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
