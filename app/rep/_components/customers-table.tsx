'use client';

import * as React from 'react';
import type { Customer } from '@/lib/customers/loadCustomers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VendorManager } from './vendor-manager';
import { CustomerAvatar } from './customer-avatar';
import { ManageCustomerModal } from './manage-customer-modal';
import CustomerTrackingModal from './customer-tracking-modal';
import Link from 'next/link';
import { ExternalLink, MapPin, Check, Activity } from 'lucide-react';

export interface CustomersTableProps {
  customers: Customer[];
}

export function CustomersTable({ customers: initialCustomers }: CustomersTableProps) {
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [trackingCustomer, setTrackingCustomer] = React.useState<Customer | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = React.useState(false);

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (updatedCustomer: Customer) => {
    // Update the customer in the local state
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
    );
  };

  return (
    <div>
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">
          Customer Accounts
        </h1>
      </div>

      {/* Customers Table with Sticky Header */}
      <div className="rounded-2xl border border-border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card shadow-sm border-b-2 border-border">
            <TableRow>
              <TableHead className="w-96 bg-card">Customer</TableHead>
              <TableHead className="w-64 bg-card">Location</TableHead>
              <TableHead className="w-20 text-center bg-card">LIB&CO</TableHead>
              <TableHead className="w-20 text-center bg-card">SAVOY</TableHead>
              <TableHead className="w-20 text-center bg-card">HF</TableHead>
              <TableHead className="w-32 text-center bg-card">Status</TableHead>
              <TableHead className="w-64 text-right bg-card">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
                const location = [customer.city, customer.region].filter(Boolean).join(', ') || '—';
                const isActive = !customer.name.startsWith('!!');
                // Default to lib-and-co if no vendors specified (backward compatibility)
                const authorizedVendors = customer.authorizedVendors ?? ['lib-and-co'];

                // Check vendor authorization
                const hasLibCo = authorizedVendors.includes('lib-and-co');
                const hasSavoy = authorizedVendors.includes('savoy-house');
                const hasHF = authorizedVendors.includes('hubbardton-forge');

                return (
                  <TableRow key={customer.id} className="hover:bg-muted/50">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        {/* Customer Avatar */}
                        <CustomerAvatar customer={customer} size={32} />

                        {/* Clickable Customer Name */}
                        <button
                          onClick={() => handleCustomerClick(customer)}
                          className="text-left hover:underline focus:outline-none focus:underline"
                        >
                          <p className="font-semibold text-foreground text-sm">{customer.name}</p>
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{location}</span>
                      </div>
                    </TableCell>
                    {/* Lib&Co Column */}
                    <TableCell className="py-4 text-center">
                      {hasLibCo && (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                      )}
                    </TableCell>
                    {/* Savoy Column */}
                    <TableCell className="py-4 text-center">
                      {hasSavoy && (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                      )}
                    </TableCell>
                    {/* HF Column */}
                    <TableCell className="py-4 text-center">
                      {hasHF && (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      {isActive ? (
                        <Badge variant="default" className="bg-success/10 text-success border-success/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Test
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl font-medium"
                          onClick={() => {
                            setTrackingCustomer(customer);
                            setIsTrackingModalOpen(true);
                          }}
                        >
                          <Activity className="h-3.5 w-3.5 mr-1.5" />
                          Tracking
                        </Button>
                        <VendorManager
                          customerId={customer.id}
                          customerName={customer.name}
                          initialAuthorizedVendors={authorizedVendors}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl font-medium"
                          asChild
                        >
                          <Link href={`/customers/${customer.slug ?? customer.id}?tab=collections`}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

      {/* Manage Customer Modal */}
      {selectedCustomer && (
        <ManageCustomerModal
          customer={selectedCustomer}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Customer Tracking Modal */}
      {trackingCustomer && (
        <CustomerTrackingModal
          customerId={trackingCustomer.id}
          customerName={trackingCustomer.name}
          open={isTrackingModalOpen}
          onOpenChange={setIsTrackingModalOpen}
        />
      )}
    </div>
  );
}
