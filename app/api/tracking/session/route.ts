import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Session } from '@/lib/tracking/types';

const SESSIONS_FILE = path.join(process.cwd(), 'data/tracking/sessions.json');

async function readSessions(): Promise<Session[]> {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeSessions(sessions: Session[]): Promise<void> {
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, customerId, ipAddress, userAgent } = body;

    const sessions = await readSessions();

    if (action === 'start') {
      // Start a new session
      const newSession: Session = {
        id: sessionId || crypto.randomUUID(),
        customerId,
        startTime: new Date().toISOString(),
        ipAddress,
        userAgent,
        lastActivity: new Date().toISOString(),
      };

      sessions.push(newSession);
      await writeSessions(sessions);

      return NextResponse.json({ session: newSession });
    } else if (action === 'end') {
      // End an existing session
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(session.startTime).getTime();

      session.endTime = endTime;
      session.duration = duration;

      await writeSessions(sessions);

      return NextResponse.json({ session });
    } else if (action === 'update-activity') {
      // Update last activity timestamp
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      session.lastActivity = new Date().toISOString();
      await writeSessions(sessions);

      return NextResponse.json({ session });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in session tracking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
