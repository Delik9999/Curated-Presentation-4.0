'use client';

import * as React from 'react';
import type { Customer } from '@/lib/customers/loadCustomers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export interface ManageCustomerModalProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedCustomer: Customer) => void;
}

const AVAILABLE_VENDORS = [
  { id: 'lib-and-co', name: 'Lib & Co' },
  { id: 'savoy-house', name: 'Savoy House' },
  { id: 'hubbardton-forge', name: 'Hubbardton Forge' },
];

export function ManageCustomerModal({
  customer,
  open,
  onOpenChange,
  onSuccess,
}: ManageCustomerModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    name: customer.name,
    city: customer.city || '',
    region: customer.region || '',
    logoUrl: customer.logoUrl || null,
    authorizedVendors: customer.authorizedVendors || ['lib-and-co'],
  });

  // Reset form data when customer changes
  React.useEffect(() => {
    setFormData({
      name: customer.name,
      city: customer.city || '',
      region: customer.region || '',
      logoUrl: customer.logoUrl || null,
      authorizedVendors: customer.authorizedVendors || ['lib-and-co'],
    });
  }, [customer]);

  const handleVendorToggle = (vendorId: string) => {
    setFormData((prev) => {
      const isCurrentlyAuthorized = prev.authorizedVendors.includes(vendorId);
      const newVendors = isCurrentlyAuthorized
        ? prev.authorizedVendors.filter((id) => id !== vendorId)
        : [...prev.authorizedVendors, vendorId];

      // Ensure at least one vendor is always selected
      if (newVendors.length === 0) {
        toast({
          title: 'Cannot remove all vendors',
          description: 'Customer must have at least one authorized vendor',
          variant: 'destructive',
        });
        return prev;
      }

      return { ...prev, authorizedVendors: newVendors };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Customer name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          city: formData.city.trim() || undefined,
          region: formData.region.trim() || undefined,
          logoUrl: formData.logoUrl,
          authorizedVendors: formData.authorizedVendors,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update customer' }));
        throw new Error(error.error || 'Failed to update customer');
      }

      const { customer: updatedCustomer } = await response.json();

      toast({
        title: 'Success',
        description: 'Customer information updated successfully',
      });

      onSuccess?.(updatedCustomer);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update customer',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setFormData({
      name: customer.name,
      city: customer.city || '',
      region: customer.region || '',
      logoUrl: customer.logoUrl || null,
      authorizedVendors: customer.authorizedVendors || ['lib-and-co'],
    });
    onOpenChange(false);
  };

  // Check if customer is a test account
  const isTestAccount = customer.name.startsWith('!!');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Customer</DialogTitle>
          <DialogDescription>
            Update customer information, logo, and authorized vendors.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Customer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter customer name"
              required
            />
          </div>

          {/* Location Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Calgary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region / State</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                placeholder="e.g., AB"
                maxLength={5}
              />
            </div>
          </div>

          {/* Status Badge (Display Only) */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div>
              <Badge variant={isTestAccount ? 'muted' : 'default'}>
                {isTestAccount ? 'Test Account' : 'Active'}
              </Badge>
            </div>
          </div>

          {/* Authorized Vendors */}
          <div className="space-y-3">
            <Label>Authorized Vendors <span className="text-red-500">*</span></Label>
            <div className="space-y-2">
              {AVAILABLE_VENDORS.map((vendor) => {
                const isChecked = formData.authorizedVendors.includes(vendor.id);
                return (
                  <div key={vendor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vendor-${vendor.id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleVendorToggle(vendor.id)}
                    />
                    <Label
                      htmlFor={`vendor-${vendor.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {vendor.name}
                    </Label>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              At least one vendor must be selected
            </p>
          </div>

          {/* Logo Uploader */}
          <div className="space-y-3">
            <Label>Customer Logo</Label>
            <LogoUploader
              value={formData.logoUrl || undefined}
              onChange={(logoUrl) => setFormData((prev) => ({ ...prev, logoUrl }))}
            />
            <p className="text-xs text-muted-foreground">
              Upload a logo for white-label customer experience. Displays in the customer portal and account list.
            </p>
          </div>

          {/* Form Actions */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
