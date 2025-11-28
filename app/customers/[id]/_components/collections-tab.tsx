import { Customer, getAuthorizedVendors } from '@/lib/customers/loadCustomers';
import CollectionsTabClient from './collections-tab-client';
import type { CustomerPresentationData } from '@/lib/presentation/types';

/**
 * Collections Tab (Server Component)
 *
 * This component receives pre-computed presentation data from getCustomerPresentationData()
 * and passes it to the client component for rendering.
 *
 * The presentation data is split into two sections:
 * 1. "Your Market Selection" - Collections with items from their Dallas market order
 * 2. "Everything Else" - All other collections they can browse
 */
export default async function CollectionsTab({
  customer,
  selectedVendor,
  presentationData,
}: {
  customer: Customer;
  selectedVendor?: string;
  presentationData: CustomerPresentationData;
}) {
  // Get customer's authorized vendors
  const authorizedVendors = getAuthorizedVendors(customer);

  console.log('[CollectionsTab] Received presentation data:', {
    customerId: customer.id,
    hasMarketSelection: presentationData.hasMarketSelection,
    selectedCollectionsCount: presentationData.selectedCollections.length,
    otherCollectionsCount: presentationData.otherCollections.length,
    workingSelectionId: presentationData.workingSelection?.id,
  });

  // Create a stable key that changes when vendor changes
  const componentKey = `${selectedVendor || 'all'}`;

  return (
    <CollectionsTabClient
      key={componentKey} // Force remount when vendor changes
      customerId={customer.id}
      authorizedVendors={authorizedVendors}
      selectedVendor={selectedVendor}
      presentationData={presentationData}
    />
  );
}
