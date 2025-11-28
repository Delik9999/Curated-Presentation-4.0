import { notFound } from 'next/navigation';
import { findCustomer } from '@/lib/customers/loadCustomers';
import DallasTab from './_components/dallas-tab';
import SelectionTab from './_components/selection-tab';
import CollectionsTab from './_components/collections-tab';
import PromotionsTab from './_components/promotions-tab';
import InsightsTab from './_components/insights-tab';
import AlignmentTab from './_components/alignment-tab';
import ShowroomTab from './_components/showroom-tab';
import { CustomerPageLayout } from './_components/customer-page-layout';
import { getRequestBaseUrl } from '@/lib/utils/url';
import { getCustomerPresentationData } from '@/lib/presentation/getCustomerPresentationData';

// Disable caching for this page since it depends on query params (vendor)
export const dynamic = 'force-dynamic';

async function fetchDallasData(baseUrl: string, customerId: string, vendor?: string) {
  const params = new URLSearchParams();
  if (vendor) params.set('vendor', vendor);
  const url = `${baseUrl}/api/customers/${customerId}/dallas/latest${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    cache: 'no-store',
    next: { tags: [`customer-dallas-${customerId}`] },
  });
  if (!response.ok) {
    return { snapshot: null, versions: [] };
  }
  return response.json();
}

async function fetchWorkingSelection(baseUrl: string, customerId: string, vendor?: string) {
  const params = new URLSearchParams();
  if (vendor) params.set('vendor', vendor);
  const url = `${baseUrl}/api/customers/${customerId}/selection/working${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
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
  searchParams: { tab?: string; vendor?: string };
}) {
  const customer = await findCustomer(params.id);
  if (!customer) {
    notFound();
  }

  const activeTab = searchParams.tab ?? 'collections';

  // Get authorized vendors
  const authorizedVendors = customer.authorizedVendors || [];

  // Default to lib-and-co if customer has multiple vendors and no vendor is specified
  let selectedVendor = searchParams.vendor;
  if (!selectedVendor && authorizedVendors.length > 1 && authorizedVendors.includes('lib-and-co')) {
    selectedVendor = 'lib-and-co';
  }
  const baseUrl = getRequestBaseUrl();

  // Fetch data for all tabs in parallel
  const [dallasData, workingData, presentationData] = await Promise.all([
    fetchDallasData(baseUrl, customer.id, selectedVendor),
    fetchWorkingSelection(baseUrl, customer.id, selectedVendor),
    getCustomerPresentationData(customer.id, selectedVendor),
  ]);

  return (
    <CustomerPageLayout
      customer={customer}
      activeTab={activeTab}
      collectionsTab={<CollectionsTab customer={customer} selectedVendor={selectedVendor} presentationData={presentationData} />}
      dallasTab={<DallasTab customer={customer} data={dallasData} selectedVendor={selectedVendor} />}
      selectionTab={<SelectionTab customer={customer} dallasData={dallasData} workingData={workingData} selectedVendor={selectedVendor} />}
      promotionsTab={<PromotionsTab customer={customer} workingData={workingData} selectedVendor={selectedVendor} />}
      insightsTab={<InsightsTab customerId={customer.id} />}
      alignmentTab={<AlignmentTab customerId={customer.id} selectedVendor={selectedVendor} authorizedVendors={authorizedVendors} />}
      showroomTab={<ShowroomTab customer={customer} />}
    />
  );
}
