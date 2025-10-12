import { notFound } from 'next/navigation';
import { findCustomer } from '@/lib/customers/loadCustomers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DallasTab from './_components/dallas-tab';
import SelectionTab from './_components/selection-tab';
import CollectionsTab from './_components/collections-tab';
import { getRequestBaseUrl } from '@/lib/utils/url';

async function fetchDallasData(baseUrl: string, customerId: string) {
  const response = await fetch(`${baseUrl}/api/customers/${customerId}/dallas/latest`, {
    cache: 'no-store',
    next: { tags: [`customer-dallas-${customerId}`] },
  });
  if (!response.ok) {
    return { snapshot: null, versions: [] };
  }
  return response.json();
}

async function fetchWorkingSelection(baseUrl: string, customerId: string) {
  const response = await fetch(`${baseUrl}/api/customers/${customerId}/selection/working`, {
    cache: 'no-store',
    next: { tags: [`customer-working-${customerId}`] },
  });
  if (!response.ok) {
    return { selection: null };
  }
  return response.json();
}

export default async function CustomerPresentationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const customer = await findCustomer(params.id);
  if (!customer) {
    notFound();
  }

  const activeTab = searchParams.tab ?? 'collections';
  const baseUrl = getRequestBaseUrl();
  const [dallasData, workingData] = await Promise.all([
    fetchDallasData(baseUrl, customer.id),
    fetchWorkingSelection(baseUrl, customer.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Curated Presentation</p>
        <h1 className="text-4xl font-semibold text-foreground">{customer.name}</h1>
        <p className="text-base text-muted-foreground">
          Explore curated lighting selections crafted for {customer.city ?? customer.name}. Export-ready snapshots keep your team aligned.
        </p>
      </div>
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="dallas">Dallas</TabsTrigger>
          <TabsTrigger value="selection">Selection</TabsTrigger>
        </TabsList>
        <TabsContent value="collections" className="mt-8">
          <CollectionsTab customer={customer} />
        </TabsContent>
        <TabsContent value="dallas" className="mt-8">
          <DallasTab customer={customer} data={dallasData} />
        </TabsContent>
        <TabsContent value="selection" className="mt-8">
          <SelectionTab customer={customer} dallasData={dallasData} workingData={workingData} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
