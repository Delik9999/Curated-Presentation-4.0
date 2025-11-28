import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'default',
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-neutral-200',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded-md h-4',
        variant === 'default' && 'rounded-lg',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  );
}

// Skeleton card for product loading
export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image skeleton */}
      <Skeleton className="aspect-square w-full" animation="wave" />

      {/* Content skeleton */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <Skeleton className="h-5 w-20" animation="wave" />
        <Skeleton className="h-6 w-full" animation="wave" />
        <Skeleton className="h-6 w-3/4" animation="wave" />
        <Skeleton className="h-4 w-24 mt-2" animation="wave" />
        <div className="mt-auto pt-2 border-t border-neutral-100">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-3 w-12" animation="wave" />
            <Skeleton className="h-7 w-20" animation="wave" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for customer card
export function CustomerCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" animation="wave" />
            <Skeleton className="h-4 w-32" animation="wave" />
          </div>
          <Skeleton className="h-6 w-16" animation="wave" />
        </div>

        <Skeleton className="h-10 w-full" animation="wave" />

        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" animation="wave" />
          <Skeleton className="h-10 flex-1" animation="wave" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for table rows
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-neutral-200">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <Skeleton className="h-4 w-full" animation="wave" />
        </td>
      ))}
    </tr>
  );
}

// Skeleton for data table
export function DataTableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="py-3 px-4 text-left">
                <Skeleton className="h-4 w-24" animation="wave" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
