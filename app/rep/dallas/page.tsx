import { loadCustomers } from '@/lib/customers/loadCustomers';
import DallasWorkspace from './_components/dallas-workspace';

export default async function DallasAuthoringPage({
  searchParams,
}: {
  searchParams: { customer?: string; year?: string };
}) {
  const customers = await loadCustomers();
  const initialCustomerId = searchParams.customer ?? customers[0]?.id ?? '';
  const initialYear = Number.parseInt(searchParams.year ?? '', 10);
  const defaultYear = Number.isFinite(initialYear) ? initialYear : new Date().getFullYear();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14">
      <DallasWorkspace customers={customers} initialCustomerId={initialCustomerId} initialYear={defaultYear} />
    </main>
  );
}
