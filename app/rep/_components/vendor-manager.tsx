'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Store } from 'lucide-react';

type Vendor = {
  id: string;
  name: string;
  displayName: string;
};

type VendorManagerProps = {
  customerId: string;
  customerName: string;
  initialAuthorizedVendors: string[];
};

export function VendorManager({
  customerId,
  customerName,
  initialAuthorizedVendors,
}: VendorManagerProps) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [authorizedVendors, setAuthorizedVendors] = useState<string[]>(initialAuthorizedVendors);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && vendors.length === 0) {
      // Load available vendors
      fetch('/api/vendors')
        .then((res) => res.json())
        .then((data) => setVendors(data.vendors))
        .catch((err) => console.error('Failed to load vendors:', err));
    }
  }, [open, vendors.length]);

  const handleToggleVendor = (vendorId: string) => {
    setAuthorizedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizedVendors }),
      });

      if (response.ok) {
        setOpen(false);
        // Reload the page to reflect changes
        window.location.reload();
      } else {
        alert('Failed to update vendor authorizations');
      }
    } catch (error) {
      console.error('Failed to save vendors:', error);
      alert('Failed to update vendor authorizations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl font-medium">
          <Store className="h-3.5 w-3.5 mr-1.5" />
          Vendors
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Vendor Access</DialogTitle>
          <DialogDescription>
            Select which vendors {customerName} has accounts with
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {vendors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading vendors...</p>
          ) : (
            vendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center space-x-3 rounded-lg border p-4">
                <Checkbox
                  id={`vendor-${vendor.id}`}
                  checked={authorizedVendors.includes(vendor.id)}
                  onCheckedChange={() => handleToggleVendor(vendor.id)}
                />
                <label
                  htmlFor={`vendor-${vendor.id}`}
                  className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {vendor.displayName}
                </label>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Badge component to show authorized vendors in the table with "Slot" system
export function VendorBadges({ authorizedVendors }: { authorizedVendors: string[] }) {
  const [showPopover, setShowPopover] = useState(false);

  // Full vendor names for popover
  const vendorNames: Record<string, string> = {
    'lib-and-co': 'Lib & Co',
    'savoy-house': 'Savoy House',
    'hubbardton-forge': 'Hubbardton Forge',
  };

  // Abbreviated vendor names for tags
  const vendorAbbreviations: Record<string, string> = {
    'lib-and-co': 'Lib&Co',
    'savoy-house': 'Savoy',
    'hubbardton-forge': 'HF',
  };

  // Handle empty vendors
  if (authorizedVendors.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  // "Slot" system: Three dedicated slots for perfect vertical alignment
  const slot1 = authorizedVendors[0];
  const slot2 = authorizedVendors[1];
  const slot3 = authorizedVendors[2];
  const remainingCount = authorizedVendors.length - 3;

  return (
    <div className="inline-grid grid-cols-[auto_auto_auto] gap-1.5 items-center">
      {/* Slot 1: Always shows Vendor 1 (if exists) */}
      {slot1 && (
        <Badge
          variant="secondary"
          className="text-xs font-medium whitespace-nowrap"
        >
          {vendorAbbreviations[slot1] || slot1}
        </Badge>
      )}

      {/* Slot 2: Always shows Vendor 2 (if exists) */}
      {slot2 && (
        <Badge
          variant="secondary"
          className="text-xs font-medium whitespace-nowrap"
        >
          {vendorAbbreviations[slot2] || slot2}
        </Badge>
      )}

      {/* Slot 3 (Smart Slot): Shows Vendor 3 OR "+N more" link OR empty */}
      {authorizedVendors.length === 3 ? (
        // Exactly 3 vendors: Show the 3rd vendor
        <Badge
          variant="secondary"
          className="text-xs font-medium whitespace-nowrap"
        >
          {vendorAbbreviations[slot3] || slot3}
        </Badge>
      ) : authorizedVendors.length > 3 ? (
        // 4+ vendors: Show "+N more" link
        <div className="relative">
          <button
            onMouseEnter={() => setShowPopover(true)}
            onMouseLeave={() => setShowPopover(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
          >
            +{remainingCount} more
          </button>

          {showPopover && (
            <div
              className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[180px]"
              onMouseEnter={() => setShowPopover(true)}
              onMouseLeave={() => setShowPopover(false)}
            >
              <div className="text-xs font-semibold text-popover-foreground mb-2">
                Authorized Vendors
              </div>
              <div className="space-y-1.5">
                {authorizedVendors.map((vendorId) => (
                  <div
                    key={vendorId}
                    className="text-xs text-muted-foreground"
                  >
                    {vendorNames[vendorId] || vendorId}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
      {/* < 3 vendors: Slot 3 is empty */}
    </div>
  );
}
