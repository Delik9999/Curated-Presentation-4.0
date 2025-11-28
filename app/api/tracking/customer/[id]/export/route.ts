import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  Session,
  ActivityEvent,
  SelectionChange,
  EngagementMetrics,
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

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function exportAsCSV(
  metrics: EngagementMetrics,
  sessions: Session[],
  activities: ActivityEvent[],
  changes: SelectionChange[]
): string {
  let csv = '';

  // Metrics section
  csv += 'ENGAGEMENT METRICS\n';
  csv += 'Metric,Value\n';
  csv += `Customer ID,${metrics.customerId}\n`;
  csv += `Last Sign In,${metrics.lastSignIn || 'Never'}\n`;
  csv += `Total Sessions,${metrics.totalSessions}\n`;
  csv += `Total Engagement Time,${formatDuration(metrics.totalEngagementTime)}\n`;
  csv += `Average Session Duration,${formatDuration(metrics.averageSessionDuration)}\n`;
  csv += `Page Views,${metrics.pageViews}\n`;
  csv += `Searches,${metrics.searches}\n`;
  csv += `Collections Viewed,${metrics.collectionsViewed}\n`;
  csv += `Products Viewed,${metrics.productsViewed}\n`;
  csv += `Selection Changes,${metrics.selectionChanges}\n`;
  csv += `Exports,${metrics.exports}\n\n`;

  // Sessions section
  csv += 'SESSIONS\n';
  csv += 'Session ID,Start Time,End Time,Duration,IP Address,User Agent\n';
  sessions.forEach((s) => {
    csv += `${s.id},${s.startTime},${s.endTime || 'Active'},${s.duration ? formatDuration(s.duration) : 'N/A'},${s.ipAddress || 'N/A'},"${s.userAgent || 'N/A'}"\n`;
  });
  csv += '\n';

  // Activity section
  csv += 'ACTIVITY LOG\n';
  csv += 'Timestamp,Type,Session ID,Details\n';
  activities.forEach((a) => {
    const details = JSON.stringify(a.metadata).replace(/"/g, '""');
    csv += `${a.timestamp},${a.type},${a.sessionId},"${details}"\n`;
  });
  csv += '\n';

  // Selection changes section
  csv += 'SELECTION CHANGES\n';
  csv += 'Timestamp,Change Type,Selection ID,User,Role,Details\n';
  changes.forEach((c) => {
    const details = JSON.stringify(c.changes).replace(/"/g, '""');
    csv += `${c.timestamp},${c.changeType},${c.selectionId},${c.userName || 'N/A'},${c.userRole || 'N/A'},"${details}"\n`;
  });

  return csv;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Read all data
    const [allSessions, allActivities, allChanges, allMetrics] = await Promise.all([
      readSessions(),
      readActivity(),
      readChanges(),
      readMetrics(),
    ]);

    // Filter by customer
    const sessions = allSessions.filter((s) => s.customerId === customerId);
    const activities = allActivities.filter((a) => a.customerId === customerId);
    const changes = allChanges.filter((c) => c.customerId === customerId);
    const metrics = allMetrics[customerId];

    if (!metrics) {
      return NextResponse.json({ error: 'No tracking data found for this customer' }, { status: 404 });
    }

    if (format === 'csv') {
      const csv = exportAsCSV(metrics, sessions, activities, changes);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="customer-${customerId}-tracking.csv"`,
        },
      });
    } else if (format === 'json') {
      const data = {
        metrics,
        sessions,
        activities,
        changes,
      };

      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="customer-${customerId}-tracking.json"`,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid format. Use csv or json.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting tracking data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
