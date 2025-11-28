'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function AssumptionsProxies() {
  const assumptions = [
    {
      category: 'Revenue Lift Projection',
      items: [
        {
          label: 'Below average customer',
          value: 'Gap to territory average',
          description: 'If customer revenue < territory avg, projected lift = gap to reach average',
        },
        {
          label: 'Above average customer',
          value: '10% incremental lift',
          description: 'If customer revenue > territory avg, projected lift = 10% of current revenue',
        },
      ],
    },
    {
      category: 'Market Average Presence',
      items: [
        {
          label: 'Calculation method',
          value: 'Avg faces per showroom with displays',
          description: 'Total faces ÷ number of showrooms that have ≥1 display of that collection',
        },
        {
          label: 'Fallback value',
          value: '2.0 displays',
          description: 'Used when no display data exists for a collection',
        },
      ],
    },
    {
      category: 'ROI Period Estimation',
      items: [
        {
          label: 'Display cost assumption',
          value: '$500 per display',
          description: 'Assumed cost to set up one display unit',
        },
        {
          label: 'Calculation',
          value: 'Cost ÷ (Annual Lift ÷ 12)',
          description: 'Months to recoup display investment from projected revenue lift',
        },
      ],
    },
    {
      category: 'Efficiency Status Thresholds',
      items: [
        {
          label: 'Star performer',
          value: '≥1.2× benchmark turns',
          description: 'Beating stocking dealer average by 20% or more',
        },
        {
          label: 'Drag / Dead weight',
          value: '<1 turn per year',
          description: 'Display is not paying for itself',
        },
        {
          label: 'Ghost performer',
          value: '0 displays',
          description: 'High sales with no floor presence',
        },
      ],
    },
    {
      category: 'Territory Averages',
      items: [
        {
          label: 'Revenue per store',
          value: 'Total revenue ÷ customer count',
          description: 'Average revenue per customer who purchased that collection (YTD)',
        },
        {
          label: 'Stocking dealer turns',
          value: 'Territory avg units per store',
          description: 'Used as benchmark for turn rate comparison',
        },
      ],
    },
    {
      category: 'Quadrant Classification',
      items: [
        {
          label: 'High sales threshold',
          value: 'Sales velocity index > 0.3',
          description: 'Normalized 0-1 scale where 1.0 = highest revenue collection',
        },
        {
          label: 'High display threshold',
          value: 'Displays ≥ market average',
          description: 'Customer has at least as many displays as average showroom',
        },
      ],
    },
    {
      category: 'Luxury Momentum Engine (ARPD)',
      items: [
        {
          label: 'ARPD (Hero Metric)',
          value: 'Total Revenue ÷ Stocking Dealers',
          description: 'Annualized Revenue Per Display - dollar yield per display spot',
        },
        {
          label: 'Signal Line (Fast)',
          value: '4-week revenue moving average',
          description: 'Current revenue velocity - sensitive to recent changes',
        },
        {
          label: 'Baseline (Slow)',
          value: '12-week revenue moving average',
          description: 'Quarterly baseline - represents normal run rate',
        },
        {
          label: 'Revenue Momentum Delta',
          value: '((Signal - Baseline) / Baseline) × 100',
          description: 'Percentage difference in revenue between signal and baseline',
        },
        {
          label: 'Rent Payers',
          value: 'Top 20% by ARPD',
          description: 'Collections with highest revenue yield per display',
        },
        {
          label: 'Rising Stars threshold',
          value: '≥ +15% momentum',
          description: 'Collections breaking out above baseline',
        },
        {
          label: 'Decelerating threshold',
          value: '≤ -10% momentum',
          description: 'Collections losing market share (knock-off risk)',
        },
        {
          label: 'High-ticket flag',
          value: 'Avg unit price > $2,500',
          description: 'Diamond 💎 tag for luxury items that move slower but yield more',
        },
        {
          label: 'Sample size filter',
          value: '≥ 1 stocking dealer',
          description: 'Collections with any sales included (was ≥3 for stats, reduced for coverage)',
        },
        {
          label: 'Stocking order (Wide)',
          value: '≥8 SKUs with depth <2',
          description: 'Many items, 1-2 of each = floor setup',
        },
        {
          label: 'Project order (Deep)',
          value: 'Avg depth >4 units/SKU',
          description: 'High quantity per SKU = pass-through to job site',
        },
        {
          label: 'Replenishment order',
          value: 'Standard flow',
          description: 'All other orders = sell-through proof',
        },
      ],
    },
  ];

  return (
    <Card className="border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-amber-600">📋</span>
          Working Assumptions & Proxies
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These calculations use assumptions where complete data is unavailable.
          Values may change as more data is collected.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {assumptions.map((section) => (
            <div key={section.category}>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                {section.category}
              </h4>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="text-sm grid grid-cols-[1fr,auto] gap-2 items-start"
                  >
                    <div>
                      <span className="text-muted-foreground">{item.label}:</span>
                      <span className="ml-1 font-medium text-foreground">{item.value}</span>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-amber-200 dark:border-amber-800">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This section documents the analytical assumptions used in this dashboard.
            As display inventory data and sales history become more complete, these proxies will be
            replaced with actual calculations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
