'use client';

import { useEffect, useState } from 'react';
import { fetchCustomerInsights } from '@/lib/insights/fetchInsights';
import type { CustomerInsights } from '@/lib/insights/types';
import { InsightsSummary } from './insights/insights-summary';
import { TopCollectionsChart } from './insights/top-collections-chart';
import { TerritoryComparison } from './insights/territory-comparison';
import { GhostSwapCards } from './insights/ghost-swap-cards';
import { RecommendationsSection } from './insights/recommendations-section';
import { OpportunityCollections } from './insights/opportunity-collections';
import { TopSkusNotDisplayed } from './insights/top-skus-not-displayed';
import { OpportunityMatrix } from './insights/opportunity-matrix';
import { SalesTrendChart } from './insights/sales-trend-chart';
import { SwapRecommendation } from './insights/swap-recommendation';
import { NonPerformingAssets } from './insights/non-performing-assets';
import { AssumptionsProxies } from './insights/assumptions-proxies';
import { MomentumEngine } from './insights/momentum-engine';
import { MoneyOnTable } from './insights/money-on-table';

interface InsightsTabProps {
  customerId: string;
}

export default function InsightsTab({ customerId }: InsightsTabProps) {
  const [insights, setInsights] = useState<CustomerInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => {
    async function loadInsights() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCustomerInsights(customerId);
        if (data) {
          setInsights(data);
        } else {
          setError('No insights data available for this customer.');
        }
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setError('Failed to load insights. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, [customerId]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
        <div className="h-80 rounded-2xl bg-muted animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 rounded-2xl bg-muted animate-pulse" />
          <div className="h-48 rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Insights Not Available
        </h3>
        <p className="text-muted-foreground max-w-md">
          {error || 'Sales insights data is not yet available for this customer.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Summary */}
      <InsightsSummary insights={insights} />

      {/* ═══════════════════════════════════════════════════════════════════
          THE THREE PILLARS OF PERSUASION
          ═══════════════════════════════════════════════════════════════════ */}

      {/* ─────────────────────────────────────────────────────────────────
          PILLAR 1: THE GREED HOOK
          "What am I missing out on?"
          ───────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <h2 className="text-lg font-semibold text-foreground">Money on the Table</h2>
          <span className="text-xs text-muted-foreground">— "You're already selling this"</span>
        </div>
        <MoneyOnTable collections={insights.topCollections} />
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          PILLAR 2: THE LOGIC HOOK
          "Does this make financial sense?"
          ───────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h2 className="text-lg font-semibold text-foreground">Floor Efficiency Audit</h2>
          <span className="text-xs text-muted-foreground">— "Better space, not more space"</span>
        </div>
        <OpportunityMatrix collections={insights.topCollections} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SwapRecommendation collections={insights.topCollections} />
          <NonPerformingAssets assets={insights.nonPerformingAssets} />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          PILLAR 3: THE FOMO HOOK
          "Is everyone else doing this?"
          ───────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h2 className="text-lg font-semibold text-foreground">Momentum Engine</h2>
          <span className="text-xs text-muted-foreground">— "What's trending vs cooling off"</span>
        </div>
        <MomentumEngine />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECONDARY INSIGHTS (Collapsible)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="border-t pt-6">
        <button
          onClick={() => setShowSecondary(!showSecondary)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showSecondary ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium">Additional Analysis</span>
          <span className="text-xs">
            ({showSecondary ? 'collapse' : 'expand for detailed breakdowns'})
          </span>
        </button>

        {showSecondary && (
          <div className="mt-6 space-y-6">
            {/* Sales Trajectory */}
            <SalesTrendChart
              collections={insights.topCollections}
              periodLabel={insights.periodLabel}
            />

            {/* Top Collections Table */}
            <TopCollectionsChart collections={insights.topCollections} />

            {/* Growth Opportunities */}
            <OpportunityCollections opportunities={insights.opportunityCollections} />

            {/* Top SKUs Not Displayed */}
            <TopSkusNotDisplayed skus={insights.topSkusNotOnDisplay} />

            {/* Territory Comparison */}
            <TerritoryComparison collections={insights.topCollections} />

            {/* Ghost Performers & Swap Candidates */}
            <GhostSwapCards
              ghostPerformers={insights.ghostPerformers}
              swapCandidates={insights.swapCandidates}
            />

            {/* Recommendations */}
            <RecommendationsSection
              displayMix={insights.displayMix}
              newIntros={insights.newIntroRecommendations}
            />

            {/* Working Assumptions */}
            <AssumptionsProxies />
          </div>
        )}
      </div>
    </div>
  );
}
