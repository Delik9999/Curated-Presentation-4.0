'use client';

import { ActivityEvent } from '@/lib/tracking/types';
import {
  Eye,
  Search,
  Package,
  MousePointerClick,
  FileDown,
  Play,
  Download,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ActivityTimelineProps {
  activities: ActivityEvent[];
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

function getActivityIcon(type: string) {
  switch (type) {
    case 'page_view':
      return Eye;
    case 'search':
      return Search;
    case 'collection_opened':
    case 'collection_closed':
      return Package;
    case 'product_viewed':
      return MousePointerClick;
    case 'selection_item_added':
    case 'selection_item_removed':
    case 'selection_item_updated':
    case 'selection_item_reordered':
      return Layers;
    case 'selection_exported':
      return FileDown;
    case 'presentation_opened':
      return Play;
    case 'presentation_downloaded':
      return Download;
    case 'tab_changed':
      return ArrowRight;
    default:
      return MousePointerClick;
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'page_view':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'search':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
    case 'collection_opened':
    case 'collection_closed':
      return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400';
    case 'product_viewed':
      return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400';
    case 'selection_item_added':
    case 'selection_item_removed':
    case 'selection_item_updated':
    case 'selection_item_reordered':
      return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
    case 'selection_exported':
      return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400';
    case 'presentation_opened':
    case 'presentation_downloaded':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    case 'tab_changed':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function getActivityDescription(event: ActivityEvent): string {
  const { type, metadata } = event;

  switch (type) {
    case 'page_view':
      return `Viewed page: ${metadata.pagePath || 'Unknown'}`;
    case 'search':
      return `Searched for: "${metadata.searchQuery}"${metadata.vendor ? ` in ${metadata.vendor}` : ''}`;
    case 'collection_opened':
      return `Opened collection: ${metadata.collectionName}${metadata.vendor ? ` (${metadata.vendor})` : ''}`;
    case 'collection_closed':
      return `Closed collection: ${metadata.collectionName}${metadata.vendor ? ` (${metadata.vendor})` : ''}`;
    case 'product_viewed':
      return `Viewed product: ${metadata.productName || metadata.productSku}${metadata.vendor ? ` (${metadata.vendor})` : ''}`;
    case 'selection_item_added':
      return `Added item to selection: ${metadata.productName || metadata.productSku || 'Unknown'}`;
    case 'selection_item_removed':
      return `Removed item from selection: ${metadata.productName || metadata.productSku || 'Unknown'}`;
    case 'selection_item_updated':
      return `Updated selection item: ${metadata.productName || metadata.productSku || 'Unknown'}`;
    case 'selection_item_reordered':
      return 'Reordered selection items';
    case 'selection_exported':
      return `Exported selection "${metadata.selectionName}" as ${metadata.exportFormat?.toUpperCase()}`;
    case 'presentation_opened':
      return `Opened presentation${metadata.vendor ? ` for ${metadata.vendor}` : ''}`;
    case 'presentation_downloaded':
      return `Downloaded presentation${metadata.vendor ? ` for ${metadata.vendor}` : ''}`;
    case 'tab_changed':
      return `Switched to ${metadata.tabName} tab`;
    default:
      return `Unknown activity: ${type}`;
  }
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((event, index) => {
        const Icon = getActivityIcon(event.type);
        const colorClass = getActivityColor(event.type);
        const description = getActivityDescription(event);

        return (
          <div
            key={event.id}
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatTime(event.timestamp)}
              </p>
            </div>

            {/* Session indicator */}
            <div className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 font-mono">
              {event.sessionId.slice(0, 8)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
