'use client';

import * as React from 'react';
import { Promotion } from '@/lib/promotions/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { PromotionForm } from './promotion-form';
import { useToast } from '@/components/ui/use-toast';

interface PromotionsManagerProps {
  initialPromotions: Promotion[];
}

type PromotionStatus = 'active' | 'expiring-soon' | 'inactive' | 'expired';

const vendorNames: Record<string, string> = {
  'lib-and-co': 'Lib & Co',
  'savoy-house': 'Savoy House',
  'hubbardton-forge': 'Hubbardton Forge',
};

function getPromotionStatus(promotion: Promotion): PromotionStatus {
  if (!promotion.active) return 'inactive';

  const now = new Date();

  // Check if expired
  if (promotion.endDate && new Date(promotion.endDate) < now) {
    return 'expired';
  }

  // Check if expiring soon (within 7 days)
  if (promotion.endDate) {
    const daysUntilExpiry = Math.ceil(
      (new Date(promotion.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      return 'expiring-soon';
    }
  }

  return 'active';
}

function getStatusBadge(status: PromotionStatus) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          <span className="mr-1.5">●</span> Active
        </Badge>
      );
    case 'expiring-soon':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          <span className="mr-1.5">●</span> Expiring Soon
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="muted" className="text-muted-foreground">
          <span className="mr-1.5">●</span> Expired
        </Badge>
      );
    case 'inactive':
      return (
        <Badge variant="muted" className="text-muted-foreground">
          <span className="mr-1.5">○</span> Inactive
        </Badge>
      );
  }
}

export default function PromotionsManager({ initialPromotions }: PromotionsManagerProps) {
  const [promotions, setPromotions] = React.useState<Promotion[]>(initialPromotions);
  const [showForm, setShowForm] = React.useState(false);
  const [editingPromotion, setEditingPromotion] = React.useState<Promotion | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const refreshPromotions = async () => {
    try {
      const response = await fetch('/api/rep/promotions');
      if (!response.ok) throw new Error('Failed to fetch promotions');
      const data = await response.json();
      setPromotions(data.promotions);
    } catch (error) {
      console.error('Error refreshing promotions:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh promotions',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = () => {
    setEditingPromotion(null);
    setShowForm(true);
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/rep/promotions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete promotion');

      toast({
        title: 'Success',
        description: 'Promotion deleted successfully',
      });

      await refreshPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete promotion',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (promotion: Promotion) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rep/promotions/${promotion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !promotion.active }),
      });

      if (!response.ok) throw new Error('Failed to toggle promotion');

      toast({
        title: 'Success',
        description: `Promotion ${!promotion.active ? 'activated' : 'deactivated'}`,
      });

      await refreshPromotions();
    } catch (error) {
      console.error('Error toggling promotion:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle promotion',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingPromotion(null);
    await refreshPromotions();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPromotion(null);
  };

  if (showForm) {
    return (
      <PromotionForm
        promotion={editingPromotion}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Promotion Management</h1>
          <p className="text-base text-muted-foreground">
            Configure discount tiers and inventory incentives for customer selections.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          size="lg"
          className="shadow-sm font-medium rounded-xl"
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          Create Promotion
        </Button>
      </div>

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-lg text-muted-foreground mb-4">No promotions yet</p>
            <Button onClick={handleCreate} variant="outline">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Your First Promotion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {promotions.map((promotion) => {
            const status = getPromotionStatus(promotion);

            return (
              <Card
                key={promotion.id}
                className={`rounded-2xl shadow-sm hover:shadow-md transition-all duration-250 ${
                  !promotion.active ? 'opacity-70' : ''
                }`}
              >
                {/* Header Band */}
                <div className="px-6 py-4 border-b border-border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                        {vendorNames[promotion.vendor] || promotion.vendor}
                      </Badge>
                      <h3 className="text-lg font-semibold text-foreground">
                        {promotion.name}
                      </h3>
                      {getStatusBadge(status)}
                    </div>
                    {promotion.endDate && (
                      <span className="text-sm font-medium text-muted-foreground">
                        Expires on {new Date(promotion.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  {promotion.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {promotion.description}
                    </p>
                  )}
                </div>

                <CardContent className="space-y-6">
                  {/* Two-Column Tier Layout */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Column: SKU + Dollar Tiers */}
                    <div className="space-y-5">
                      {/* SKU Tiers */}
                      <div className="space-y-2.5">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          SKU Count Tiers
                        </h4>
                        {!promotion.skuTiers || promotion.skuTiers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No tiers configured</p>
                        ) : (
                          <ul className="text-[15px] space-y-1.5">
                            {promotion.skuTiers.map((tier) => (
                              <li key={tier.id} className="text-foreground">
                                <span className="font-medium">{tier.threshold} SKUs</span>
                                <span className="mx-2 text-muted-foreground">→</span>
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                  {tier.discountPercent}% off
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Dollar Tiers */}
                      <div className="space-y-2.5">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Dollar Amount Tiers
                        </h4>
                        {!promotion.dollarTiers || promotion.dollarTiers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No tiers configured</p>
                        ) : (
                          <ul className="text-[15px] space-y-1.5">
                            {promotion.dollarTiers.map((tier) => (
                              <li key={tier.id} className="text-foreground">
                                <span className="font-medium">${tier.threshold.toLocaleString()}</span>
                                <span className="mx-2 text-muted-foreground">→</span>
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                  {tier.discountPercent}% off
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Inventory Incentive */}
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Inventory Incentive
                      </h4>
                      {!promotion.inventoryIncentive || !promotion.inventoryIncentive.enabled ? (
                        <p className="text-sm text-muted-foreground">No tiers configured</p>
                      ) : (
                        <div className="text-[15px] space-y-2 text-foreground">
                          <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {promotion.inventoryIncentive.backupDiscountPercent}% off backup inventory
                          </p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {promotion.inventoryIncentive.displayQtyThreshold && (
                              <p>• When display qty ≥ {promotion.inventoryIncentive.displayQtyThreshold} units</p>
                            )}
                            {promotion.inventoryIncentive.dollarThreshold && (
                              <p>• When display total ≥ ${promotion.inventoryIncentive.dollarThreshold.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Bottom Right */}
                  <div className="flex items-center justify-end pt-4 border-t border-border">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => handleEdit(promotion)}
                        size="default"
                        disabled={isLoading}
                        className="font-medium bg-foreground hover:bg-foreground/90 text-white"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleToggleActive(promotion)}
                        variant="outline"
                        size="default"
                        disabled={isLoading}
                        className="font-medium"
                      >
                        {promotion.active ? 'Pause Promotion' : 'Activate'}
                      </Button>
                      <div className="w-2" />
                      <Button
                        onClick={() => handleDelete(promotion.id)}
                        variant="outline"
                        size="default"
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 border-red-300 dark:border-red-800 font-medium"
                      >
                        <TrashIcon className="mr-1.5 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
