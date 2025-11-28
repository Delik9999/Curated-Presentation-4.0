'use client';

import { useState, useEffect } from 'react';
import { X, Flame, Clock, Sparkles, HelpCircle, Check, ShoppingBag } from 'lucide-react';
import type { DisplayItem, AuditSession } from '@/lib/displays/types';

interface SharedShowroomGridProps {
  customerId: string;
  customerName: string;
  isPublicView: boolean;
}

type PerformanceBadge = 'top-performer' | 'sleeper' | 'fresh' | null;

interface ProductPerformance {
  sku: string;
  revenue: number;
  territoryRank: number;
  installedDaysAgo: number;
}

export default function SharedShowroomGrid({
  customerId,
  customerName,
  isPublicView,
}: SharedShowroomGridProps) {
  const [displays, setDisplays] = useState<DisplayItem[]>([]);
  const [auditSessions, setAuditSessions] = useState<AuditSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);

  // Mock performance data - would come from Momentum Engine
  const [performanceData] = useState<Map<string, ProductPerformance>>(() => {
    const data = new Map<string, ProductPerformance>();
    // This would be populated from actual analytics
    return data;
  });

  // Mock recommended products - would come from territory best sellers
  const [recommendations] = useState([
    { sku: '10150-01', name: 'Moderna Chandelier', collection: 'Moderna', reason: '#1 Territory Seller' },
    { sku: '10160-01', name: 'Lumina Pendant', collection: 'Lumina', reason: '#3 Territory Seller' },
    { sku: '10170-01', name: 'Cascada Sconce', collection: 'Cascada', reason: 'Trending Up 45%' },
  ]);

  useEffect(() => {
    fetchDisplays();
  }, [customerId]);

  const fetchDisplays = async () => {
    try {
      const response = await fetch(`/api/displays?customerId=${customerId}`);
      const data = await response.json();
      setDisplays(data.items || []);
      setAuditSessions(data.auditSessions || []);
    } catch (error) {
      console.error('Error fetching displays:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceBadge = (item: DisplayItem): PerformanceBadge => {
    const installedDate = new Date(item.installedAt);
    const daysAgo = Math.floor((Date.now() - installedDate.getTime()) / (1000 * 60 * 60 * 24));

    // Fresh: < 30 days
    if (daysAgo < 30) return 'fresh';

    // Mock logic for top performer / sleeper
    const perf = performanceData.get(item.sku);
    if (perf) {
      if (perf.territoryRank <= 5) return 'top-performer';
      if (daysAgo > 180 && perf.revenue < 1000) return 'sleeper';
    }

    // Random assignment for demo (would be real data)
    const hash = item.sku.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    if (hash % 5 === 0) return 'top-performer';
    if (hash % 7 === 0 && daysAgo > 180) return 'sleeper';

    return null;
  };

  const getInstalledText = (item: DisplayItem): string => {
    const installedDate = new Date(item.installedAt);
    const daysAgo = Math.floor((Date.now() - installedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo < 30) return `${daysAgo} days ago`;
    if (daysAgo < 365) return `${Math.floor(daysAgo / 30)} months ago`;
    return `${Math.floor(daysAgo / 365)} year${daysAgo >= 730 ? 's' : ''} ago`;
  };

  const handleMissingAction = async (item: DisplayItem, action: 'sold' | 'found') => {
    if (action === 'found') {
      // Update status to ACTIVE
      await fetch('/api/displays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: 'ACTIVE',
          lastVerifiedAt: new Date().toISOString().split('T')[0],
        }),
      });
      fetchDisplays();
    } else {
      // Mark as sold - could trigger recommendation flow
      alert('Great! We\'ll suggest a best seller replacement.');
    }
    setSelectedItem(null);
  };

  // Get latest audit date
  const latestAudit = auditSessions.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )[0];

  // Filter items for public view
  const activeItems = displays.filter(d => d.status !== 'MISSING' || !isPublicView);
  const missingItems = displays.filter(d => d.status === 'MISSING');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Active Showroom</h1>
        <p className="text-xl text-muted-foreground">{customerName}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Live inventory & performance insights
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
          <p className="text-2xl font-bold">{activeItems.length}</p>
          <p className="text-sm text-muted-foreground">On Display</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
          <p className="text-2xl font-bold">
            {activeItems.filter(d => getPerformanceBadge(d) === 'top-performer').length}
          </p>
          <p className="text-sm text-muted-foreground">Top Performers</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
          <p className="text-2xl font-bold">
            {activeItems.filter(d => getPerformanceBadge(d) === 'fresh').length}
          </p>
          <p className="text-sm text-muted-foreground">Fresh Arrivals</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {activeItems.map((item) => {
          const badge = getPerformanceBadge(item);

          return (
            <div
              key={item.id}
              className="group cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <div
                className={`aspect-square rounded-lg overflow-hidden mb-2 ring-1 ring-black/5 dark:ring-white/10 relative ${
                  badge === 'top-performer'
                    ? 'ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20'
                    : badge === 'sleeper'
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <img
                  src={`https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
                  alt={item.sku}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                    badge === 'sleeper' ? 'grayscale-[50%]' : ''
                  }`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                  }}
                />

                {/* Performance Badge */}
                {badge && (
                  <div
                    className={`absolute top-2 right-2 p-1.5 rounded-full ${
                      badge === 'top-performer'
                        ? 'bg-amber-500 text-white'
                        : badge === 'fresh'
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500/50 text-white'
                    }`}
                  >
                    {badge === 'top-performer' && <Flame className="h-3 w-3" />}
                    {badge === 'fresh' && <Sparkles className="h-3 w-3" />}
                    {badge === 'sleeper' && <Clock className="h-3 w-3" />}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{item.collectionName}</p>
              <p className="font-mono text-xs font-medium truncate">{item.sku}</p>
            </div>
          );
        })}

        {/* Missing Items - Verification Needed */}
        {missingItems.map((item) => (
          <div
            key={item.id}
            className="group cursor-pointer"
            onClick={() => setSelectedItem(item)}
          >
            <div className="aspect-square rounded-lg overflow-hidden mb-2 ring-2 ring-amber-500/50 bg-gray-100 dark:bg-gray-900 relative">
              <img
                src={`https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
                alt={item.sku}
                className="w-full h-full object-cover grayscale opacity-40"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-product.png';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-amber-500 text-white rounded-full p-2">
                  <HelpCircle className="h-5 w-5" />
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">Verification needed</p>
            <p className="font-mono text-xs font-medium truncate">{item.sku}</p>
          </div>
        ))}
      </div>

      {/* Recommended Additions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Recommended Additions</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Top performers in your territory that you don't have on display
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <div
              key={rec.sku}
              className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800">
                <img
                  src={`https://libandco.com/cdn/shop/files/${rec.sku}.jpg`}
                  alt={rec.name}
                  className="w-full h-full object-cover opacity-60"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                  }}
                />
              </div>
              <p className="text-sm font-medium truncate">{rec.name}</p>
              <p className="text-xs text-muted-foreground mb-2">{rec.collection}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mb-3">{rec.reason}</p>
              <button className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90">
                <ShoppingBag className="h-3 w-3" />
                Request Quote
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4 border-t">
        {latestAudit ? (
          <p>
            Data last verified:{' '}
            {new Date(latestAudit.completedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        ) : (
          <p>Inventory data synced from display records</p>
        )}
      </div>

      {/* Performance Micro-Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-sm overflow-hidden">
            {/* Modal Header */}
            <div className="relative">
              <img
                src={`https://libandco.com/cdn/shop/files/${selectedItem.sku}.jpg`}
                alt={selectedItem.sku}
                className="w-full aspect-video object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-product.png';
                }}
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <h3 className="font-medium">{selectedItem.collectionName}</h3>
              <p className="font-mono text-sm text-muted-foreground mb-4">{selectedItem.sku}</p>

              {selectedItem.status === 'MISSING' ? (
                /* Missing Item Actions */
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                    Our records show this is missing. Is it sold?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleMissingAction(selectedItem, 'sold')}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                      Yes, Sold
                    </button>
                    <button
                      onClick={() => handleMissingAction(selectedItem, 'found')}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm border rounded hover:bg-muted"
                    >
                      No, It's Here
                    </button>
                  </div>
                </div>
              ) : (
                /* Performance Stats */
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Installed</span>
                    <span>
                      {new Date(selectedItem.installedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      ({getInstalledText(selectedItem)})
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue Generated</span>
                    <span className="font-medium">
                      ${((selectedItem.sku.charCodeAt(0) * 100) % 10000).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Territory Rank</span>
                    <span className="font-medium">
                      #{(selectedItem.sku.charCodeAt(1) % 20) + 1} Best Seller
                    </span>
                  </div>

                  {getPerformanceBadge(selectedItem) === 'sleeper' && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
                      <p className="text-blue-700 dark:text-blue-400">
                        Consider refreshing with a trending product?
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
