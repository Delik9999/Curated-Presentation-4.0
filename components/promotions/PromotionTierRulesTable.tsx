import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ActivePromotion } from '@/types/promotion';

interface PromotionTierRulesTableProps {
  tierRules: ActivePromotion['tierRules'];
  startDate?: string | null;
  endDate?: string | null;
}

export function PromotionTierRulesTable({ tierRules, startDate, endDate }: PromotionTierRulesTableProps) {
  if (!tierRules || tierRules.length === 0) {
    return null;
  }

  const formattedEndDate = endDate
    ? new Date(endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  // Get first tier for requirements display
  const firstTier = tierRules.sort((a, b) => a.tierLevel - b.tierLevel)[0];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">Promotion Details</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Requirements and tier benefits
        </p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Requirements Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Requirements & Rates
          </h3>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-5 space-y-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {firstTier.displayDiscountPercent}%
              </span>
              <span className="text-base text-neutral-700 dark:text-neutral-300">
                off display items
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                {firstTier.backupDiscountPercent}%
              </span>
              <span className="text-base text-neutral-700 dark:text-neutral-300">
                off backup inventory
              </span>
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-3">
              Minimum {firstTier.minSkuCount || 5} qualifying SKUs required to unlock benefits
            </div>
          </div>
        </div>

        {/* Tier Table */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Tier Structure
          </h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Tier</TableHead>
                  <TableHead className="font-semibold">SKU Requirement</TableHead>
                  <TableHead className="text-right font-semibold">Display</TableHead>
                  <TableHead className="text-right font-semibold">Backup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierRules
                  .sort((a, b) => a.tierLevel - b.tierLevel)
                  .map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell className="font-semibold">Tier {tier.tierLevel}</TableCell>
                      <TableCell className="font-medium">{tier.skuRangeText}</TableCell>
                      <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">
                        {tier.displayDiscountPercent !== null && tier.displayDiscountPercent !== undefined
                          ? `${tier.displayDiscountPercent}%`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-500">
                        {tier.backupDiscountPercent !== null && tier.backupDiscountPercent !== undefined
                          ? `${tier.backupDiscountPercent}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">
            Orders must be finalized by {formattedEndDate || 'the promotion end date'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
