import * as React from 'react';
import { clsx } from 'clsx';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <table
        ref={ref}
        className={clsx('w-full border-collapse text-left text-sm text-foreground', className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={clsx('bg-secondary/60 text-xs uppercase tracking-wide text-slate-600', className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={clsx('divide-y divide-border/70', className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={clsx('transition-colors hover:bg-secondary/40', className)} {...props} />
);

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={clsx('px-4 py-3 font-semibold text-slate-600', className)} {...props} />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={clsx('px-4 py-3 align-top text-sm', className)} {...props} />
);

export const TableFooter = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tfoot className={clsx('bg-secondary/70 text-slate-600', className)} {...props} />
);
