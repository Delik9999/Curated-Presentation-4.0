'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input-modern';
import { Button } from '@/components/ui/button-modern';
import { Badge } from '@/components/ui/badge-modern';
import { MagnifyingGlassIcon, ArrowUpIcon, ArrowDownIcon, MixerHorizontalIcon } from '@radix-ui/react-icons';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  rowKey: keyof T;
  emptyMessage?: string;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  onRowClick,
  rowKey,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    new Set(columns.map((col) => String(col.key)))
  );

  // Filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data;

    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery]);

  // Sort filtered data
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Handle column sort
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Get visible columns
  const visibleColumnsArray = columns.filter((col) =>
    visibleColumns.has(String(col.key))
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header controls */}
      {searchable && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {data.length > 0 && (
            <Badge variant="secondary" className="whitespace-nowrap">
              {sortedData.length} / {data.length} rows
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                {visibleColumnsArray.map((column, idx) => {
                  const isActive = sortColumn === column.key;
                  const isSortable = column.sortable !== false;

                  return (
                    <motion.th
                      key={String(column.key)}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600',
                        column.width && `w-${column.width}`,
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(String(column.key))}
                          className={cn(
                            'inline-flex items-center gap-1.5 transition-colors hover:text-neutral-900',
                            isActive && 'text-primary-600'
                          )}
                        >
                          {column.label}
                          {isActive && (
                            <span className="flex-shrink-0">
                              {sortDirection === 'asc' ? (
                                <ArrowUpIcon className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDownIcon className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </motion.th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnsArray.length} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-neutral-100 p-3">
                        <MagnifyingGlassIcon className="h-6 w-6 text-neutral-400" />
                      </div>
                      <p className="text-sm text-neutral-500">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rowIdx) => (
                  <motion.tr
                    key={String(row[rowKey])}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rowIdx * 0.02 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'border-b border-neutral-100 transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-neutral-50',
                      'group'
                    )}
                  >
                    {visibleColumnsArray.map((column) => {
                      const value = row[column.key as keyof T];
                      const content = column.render ? column.render(value, row) : String(value);

                      return (
                        <td
                          key={String(column.key)}
                          className={cn(
                            'px-4 py-3 text-sm text-neutral-700',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
