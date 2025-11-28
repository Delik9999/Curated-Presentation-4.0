import { loadCustomers, Customer, getAuthorizedVendors } from '@/lib/customers/loadCustomers';
import { loadCollections } from '@/lib/catalog/loadCollections';
import { loadPromotions } from '@/lib/promotions/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CollectionsManager from './_components/collections-manager';
import PromotionsManager from './_components/promotions/promotions-manager';
import CollectionVideosManager from './_components/collection-videos-manager';
import DallasWorkspace from './dallas/_components/dallas-workspace';
import MarketManagement from './_components/market-management';
import { LogoutButton } from '@/components/auth/logout-button';
import { VendorManager, VendorBadges } from './_components/vendor-manager';
import { CustomerAvatar } from './_components/customer-avatar';
import { CustomersTable } from './_components/customers-table';
import ImportWorkspace from './imports/_components/import-workspace';
import DisplaysManager from './_components/displays-manager';
import SalesTracker from './_components/sales-tracker';
import AlignmentManager from './_components/alignment-manager';
import Link from 'next/link';
import { ExternalLink, MapPin } from 'lucide-react';

async function CollectionsTabContent() {
  const collections = await loadCollections();
  return <CollectionsManager collections={collections} />;
}

async function VideosTabContent() {
  const collections = await loadCollections();
  return <CollectionVideosManager collections={collections} />;
}

async function PromotionsTabContent() {
  const promotions = await loadPromotions();
  return <PromotionsManager initialPromotions={promotions} />;
}

async function DallasTabContent() {
  const customers = await loadCustomers();
  const initialCustomerId = customers[0]?.id ?? '';
  const defaultYear = new Date().getFullYear();
  return <DallasWorkspace customers={customers} initialCustomerId={initialCustomerId} initialYear={defaultYear} />;
}

async function DisplaysTabContent() {
  const customers = await loadCustomers();
  return <DisplaysManager customers={customers} />;
}

function CustomersTabContent({ customers }: { customers: Customer[] }) {
  return <CustomersTable customers={customers} />;
}

function AlignmentTabContent({ customers }: { customers: Customer[] }) {
  return <AlignmentManager customers={customers} />;
}

export default async function RepPortalPage() {
  const customers = await loadCustomers();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
      <Tabs defaultValue="customers" className="w-full">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="collections">Presentation</TabsTrigger>
            <TabsTrigger value="videos">Media</TabsTrigger>
            <TabsTrigger value="promotion">Promotion</TabsTrigger>
            <TabsTrigger value="dallas">Selections</TabsTrigger>
            <TabsTrigger value="alignment">Alignment</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="displays">Displays</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="imports">Imports</TabsTrigger>
          </TabsList>
          <div className="flex-shrink-0">
            <LogoutButton />
          </div>
        </div>
        <TabsContent value="customers">
          <CustomersTabContent customers={customers} />
        </TabsContent>
        <TabsContent value="collections">
          <CollectionsTabContent />
        </TabsContent>
        <TabsContent value="videos">
          <VideosTabContent />
        </TabsContent>
        <TabsContent value="promotion">
          <PromotionsTabContent />
        </TabsContent>
        <TabsContent value="dallas">
          <DallasTabContent />
        </TabsContent>
        <TabsContent value="alignment">
          <AlignmentTabContent customers={customers} />
        </TabsContent>
        <TabsContent value="market">
          <MarketManagement />
        </TabsContent>
        <TabsContent value="displays">
          <DisplaysTabContent />
        </TabsContent>
        <TabsContent value="sales">
          <SalesTracker />
        </TabsContent>
        <TabsContent value="imports">
          <ImportWorkspace />
        </TabsContent>
      </Tabs>
    </main>
  );
}
