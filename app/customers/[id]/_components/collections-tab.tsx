import { loadCatalog } from '@/lib/catalog/loadCatalog';
import { Customer } from '@/lib/customers/loadCustomers';

export default async function CollectionsTab({ customer }: { customer: Customer }) {
  const catalog = await loadCatalog();
  return (
    <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {catalog.map((item) => (
        <article
          key={item.sku}
          className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-secondary/60 text-xl font-semibold text-secondary-foreground">
            {item.sku
              .split('-')
              .map((part) => part[0])
              .join('')
              .slice(0, 3)}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
            <p className="text-sm text-slate-500">SKU {item.sku}</p>
          </div>
          <p className="text-sm text-slate-600">List {item.list.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
          <p className="text-xs text-slate-500">
            Featured for {customer.name}. Blend this with the Dallas selection to create a bespoke presentation.
          </p>
        </article>
      ))}
    </section>
  );
}
