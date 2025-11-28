'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import type { ActivePromotion } from '@/types/promotion';

interface PromotionTierBenefitsTableProps {
  tierRules: ActivePromotion['tierRules'];
  currentTierLevel?: number | null;
  potentialSavingsByTier?: ActivePromotion['potentialSavingsByTier'];
}

export function PromotionTierBenefitsTable({
  tierRules,
  currentTierLevel,
  potentialSavingsByTier,
}: PromotionTierBenefitsTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedTiers = [...tierRules].sort((a, b) => a.tierLevel - b.tierLevel);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Detailed Tier Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Technical details and formulas
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            {isExpanded ? (
              <>
                Collapse <ChevronUpIcon className="h-4 w-4" />
              </>
            ) : (
              <>
                Expand <ChevronDownIcon className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead>SKU Requirement</TableHead>
              <TableHead>Discount Rate</TableHead>
              <TableHead className="text-right">Est. Savings</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTiers.map((tier) => {
              const isCurrent = tier.tierLevel === currentTierLevel;
              const tierProjection = potentialSavingsByTier?.find((p) => p.tierLevel === tier.tierLevel);
              const isAchieved = currentTierLevel ? tier.tierLevel <= currentTierLevel : false;

              // Build discount rate display
              let discountRateDisplay = '';
              if (tier.displayDiscountPercent !== null && tier.displayDiscountPercent !== undefined) {
                discountRateDisplay = `${tier.displayDiscountPercent}% Display`;
                if (tier.backupDiscountPercent !== null && tier.backupDiscountPercent !== undefined) {
                  discountRateDisplay += ` / ${tier.backupDiscountPercent}% Backup`;
                }
              } else if (tier.backupDiscountPercent !== null && tier.backupDiscountPercent !== undefined) {
                discountRateDisplay = `${tier.backupDiscountPercent}% Backup`;
              }

              return (
                <TableRow
                  key={tier.id}
                  className={cn(isCurrent && 'bg-green-50 dark:bg-green-950/20')}
                >
                  <TableCell className="font-medium">Tier {tier.tierLevel}</TableCell>
                  <TableCell>
                    {tier.minSkuCount ? `${tier.minSkuCount}+ SKUs` : tier.skuRangeText}
                  </TableCell>
                  <TableCell>{discountRateDisplay || '—'}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {tierProjection ? formatCurrency(tierProjection.estSavings) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {isCurrent ? (
                      <Badge className="bg-green-500 text-white">🟢 Current Tier</Badge>
                    ) : isAchieved ? (
                      <Badge variant="outline">Achieved</Badge>
                    ) : tierProjection && tierProjection.skusToReachTier > 0 ? (
                      <Badge variant="outline">
                        {tierProjection.skusToReachTier} more needed
                      </Badge>
                    ) : (
                      <Badge variant="outline">—</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </CardContent>
      )}
    </Card>
  );
}
