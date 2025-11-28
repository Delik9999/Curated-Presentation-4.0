import { loadCustomers } from '@/lib/customers/loadCustomers';
import { notFound } from 'next/navigation';
import DallasWorkspace from '../_components/dallas-workspace';

export default async function CustomerDallasPage({
  params,
  searchParams,
}: {
  params: { customerId: string };
  searchParams: { year?: string };
}) {
  const customers = await loadCustomers();
  const customer = customers.find(
    (c) => c.id === params.customerId || c.slug === params.customerId
  );

  if (!customer) {
    notFound();
  }

  const initialYear = Number.parseInt(searchParams.year ?? '', 10);
  const defaultYear = Number.isFinite(initialYear) ? initialYear : new Date().getFullYear();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14">
      <DallasWorkspace customers={customers} initialCustomerId={customer.id} initialYear={defaultYear} />
    </main>
  );
}
