'use client';

import { useState, useEffect } from 'react';
import { CustomerTrackingData } from '@/lib/tracking/types';
import EngagementMetricsComponent from './engagement-metrics';
import ActivityTimeline from './activity-timeline';
import SelectionChangeHistory from './selection-change-history';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Loader2 } from 'lucide-react';

interface CustomerTrackingModalProps {
  customerId: string;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerTrackingModal({
  customerId,
  customerName,
  open,
  onOpenChange,
}: CustomerTrackingModalProps) {
  const [trackingData, setTrackingData] = useState<CustomerTrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tracking/customer/${customerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tracking data');
      }
      const data = await response.json();
      setTrackingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTrackingData();
    }
  }, [open, customerId]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/tracking/customer/${customerId}/export?format=${format}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-${customerId}-tracking.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Customer Tracking: {customerName}</DialogTitle>
              <DialogDescription>
                View engagement metrics, activity log, and selection changes
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTrackingData}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading && !trackingData && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 p-4 rounded-lg">
            {error}
          </div>
        )}

        {trackingData && (
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
              <TabsTrigger value="changes">Selection Changes</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="mt-6">
              <EngagementMetricsComponent metrics={trackingData.metrics} />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <ActivityTimeline activities={trackingData.recentActivity} />
            </TabsContent>

            <TabsContent value="changes" className="mt-6">
              <SelectionChangeHistory changes={trackingData.selectionChanges} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
