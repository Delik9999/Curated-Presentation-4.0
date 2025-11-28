import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ActivityEvent } from '@/lib/tracking/types';

const ACTIVITY_FILE = path.join(process.cwd(), 'data/tracking/activity.json');

async function readActivity(): Promise<ActivityEvent[]> {
  try {
    const data = await fs.readFile(ACTIVITY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeActivity(events: ActivityEvent[]): Promise<void> {
  await fs.writeFile(ACTIVITY_FILE, JSON.stringify(events, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, sessionId, type, metadata } = body;

    if (!customerId || !sessionId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, sessionId, type' },
        { status: 400 }
      );
    }

    const events = await readActivity();

    const newEvent: ActivityEvent = {
      id: crypto.randomUUID(),
      customerId,
      sessionId,
      type,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };

    events.push(newEvent);
    await writeActivity(events);

    return NextResponse.json({ event: newEvent });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const events = await readActivity();
    let filteredEvents = events;

    if (customerId) {
      filteredEvents = filteredEvents.filter((e) => e.customerId === customerId);
    }

    if (sessionId) {
      filteredEvents = filteredEvents.filter((e) => e.sessionId === sessionId);
    }

    // Sort by timestamp descending (most recent first)
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit results
    filteredEvents = filteredEvents.slice(0, limit);

    return NextResponse.json({ events: filteredEvents });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
