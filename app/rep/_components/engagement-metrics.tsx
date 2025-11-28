'use client';

import { EngagementMetrics } from '@/lib/tracking/types';
import { Clock, Eye, MousePointerClick, Package, Search, FileDown } from 'lucide-react';

interface EngagementMetricsProps {
  metrics: EngagementMetrics;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Never';
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

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EngagementMetricsComponent({ metrics }: EngagementMetricsProps) {
  const stats = [
    {
      label: 'Total Sessions',
      value: metrics.totalSessions.toString(),
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Time',
      value: formatDuration(metrics.totalEngagementTime),
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Avg Session',
      value: formatDuration(metrics.averageSessionDuration),
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      label: 'Page Views',
      value: metrics.pageViews.toString(),
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Searches',
      value: metrics.searches.toString(),
      icon: Search,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Collections',
      value: metrics.collectionsViewed.toString(),
      icon: Package,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      label: 'Products',
      value: metrics.productsViewed.toString(),
      icon: MousePointerClick,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      label: 'Selection Changes',
      value: metrics.selectionChanges.toString(),
      icon: MousePointerClick,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Exports',
      value: metrics.exports.toString(),
      icon: FileDown,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Last Sign In */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Last Sign In</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
              {formatDate(metrics.lastSignIn)}
            </p>
          </div>
          <Clock className="w-8 h-8 text-slate-400" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.bgColor} rounded-lg p-3`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Last Updated */}
      <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
        Last updated: {formatDate(metrics.lastUpdated)}
      </div>
    </div>
  );
}
