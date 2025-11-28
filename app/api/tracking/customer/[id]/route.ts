import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  Session,
  ActivityEvent,
  SelectionChange,
  EngagementMetrics,
  CustomerTrackingData,
} from '@/lib/tracking/types';

const SESSIONS_FILE = path.join(process.cwd(), 'data/tracking/sessions.json');
const ACTIVITY_FILE = path.join(process.cwd(), 'data/tracking/activity.json');
const CHANGES_FILE = path.join(process.cwd(), 'data/tracking/selection-changes.json');
const METRICS_FILE = path.join(process.cwd(), 'data/tracking/metrics.json');

async function readSessions(): Promise<Session[]> {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function readActivity(): Promise<ActivityEvent[]> {
  try {
    const data = await fs.readFile(ACTIVITY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function readChanges(): Promise<SelectionChange[]> {
  try {
    const data = await fs.readFile(CHANGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function readMetrics(): Promise<Record<string, EngagementMetrics>> {
  try {
    const data = await fs.readFile(METRICS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function writeMetrics(metrics: Record<string, EngagementMetrics>): Promise<void> {
  await fs.writeFile(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

function calculateMetrics(
  customerId: string,
  sessions: Session[],
  activities: ActivityEvent[],
  changes: SelectionChange[]
): EngagementMetrics {
  const customerSessions = sessions.filter((s) => s.customerId === customerId);
  const customerActivities = activities.filter((a) => a.customerId === customerId);
  const customerChanges = changes.filter((c) => c.customerId === customerId);

  // Calculate total engagement time
  let totalEngagementTime = 0;
  customerSessions.forEach((session) => {
    if (session.duration) {
      totalEngagementTime += session.duration;
    } else if (session.startTime && session.endTime) {
      totalEngagementTime += new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
    }
  });

  // Calculate average session duration
  const completedSessions = customerSessions.filter((s) => s.duration || s.endTime);
  const averageSessionDuration =
    completedSessions.length > 0 ? totalEngagementTime / completedSessions.length : 0;

  // Find last sign in (most recent session start)
  const sortedSessions = [...customerSessions].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  const lastSignIn = sortedSessions.length > 0 ? sortedSessions[0].startTime : undefined;

  // Count activity types
  const pageViews = customerActivities.filter((a) => a.type === 'page_view').length;
  const searches = customerActivities.filter((a) => a.type === 'search').length;
  const collectionsViewed = customerActivities.filter((a) => a.type === 'collection_opened').length;
  const productsViewed = customerActivities.filter((a) => a.type === 'product_viewed').length;
  const exports = customerActivities.filter(
    (a) => a.type === 'selection_exported' || a.type === 'presentation_downloaded'
  ).length;

  return {
    customerId,
    lastSignIn,
    totalSessions: customerSessions.length,
    totalEngagementTime,
    averageSessionDuration,
    pageViews,
    searches,
    collectionsViewed,
    productsViewed,
    selectionChanges: customerChanges.length,
    exports,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const { searchParams } = new URL(request.url);
    const recentSessionsLimit = parseInt(searchParams.get('recentSessions') || '10');
    const recentActivityLimit = parseInt(searchParams.get('recentActivity') || '50');
    const recentChangesLimit = parseInt(searchParams.get('recentChanges') || '50');

    // Read all data
    const [allSessions, allActivities, allChanges] = await Promise.all([
      readSessions(),
      readActivity(),
      readChanges(),
    ]);

    // Filter by customer
    const sessions = allSessions.filter((s) => s.customerId === customerId);
    const activities = allActivities.filter((a) => a.customerId === customerId);
    const selectionChanges = allChanges.filter((c) => c.customerId === customerId);

    // Calculate metrics
    const metrics = calculateMetrics(customerId, allSessions, allActivities, allChanges);

    // Update stored metrics
    const allMetrics = await readMetrics();
    allMetrics[customerId] = metrics;
    await writeMetrics(allMetrics);

    // Sort and limit recent data
    const recentSessions = sessions
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, recentSessionsLimit);

    const recentActivity = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, recentActivityLimit);

    const recentSelectionChanges = selectionChanges
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, recentChangesLimit);

    const response: CustomerTrackingData = {
      metrics,
      recentSessions,
      recentActivity,
      selectionChanges: recentSelectionChanges,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching customer tracking data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
