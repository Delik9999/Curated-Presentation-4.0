import { loadCustomers } from '@/lib/customers/loadCustomers';
import SharedShowroomGrid from './_components/shared-showroom-grid';

interface PageProps {
  params: { customerId: string };
}

export default async function ActiveShowroomPage({ params }: PageProps) {
  const customers = await loadCustomers();
  const customer = customers.find(c => c.id === params.customerId);

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Showroom Not Found</h1>
          <p className="text-muted-foreground">The requested showroom could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SharedShowroomGrid
        customerId={params.customerId}
        customerName={customer.name}
        isPublicView={true}
      />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const customers = await loadCustomers();
  const customer = customers.find(c => c.id === params.customerId);

  return {
    title: customer ? `Active Showroom: ${customer.name}` : 'Showroom Not Found',
  };
}
