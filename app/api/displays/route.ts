import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { DisplayItem, DisplaysData, CreateDisplayInput, UpdateDisplayInput, BulkAuditInput, AuditPhoto, AuditType } from '@/lib/displays/types';

const DISPLAYS_FILE = path.join(process.cwd(), 'data', 'displays.json');

async function readDisplaysFile(): Promise<DisplaysData> {
  try {
    const data = await fs.readFile(DISPLAYS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Ensure auditSessions array exists for backward compatibility
    if (!parsed.auditSessions) {
      parsed.auditSessions = [];
    }
    return parsed;
  } catch {
    return { displays: [], auditSessions: [], lastUpdated: new Date().toISOString() };
  }
}

async function writeDisplaysFile(data: DisplaysData): Promise<void> {
  await fs.writeFile(DISPLAYS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId(): string {
  return `disp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Fetch all displays or filter by customerId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const data = await readDisplaysFile();

    if (customerId) {
      const customerDisplays = data.displays.filter(d => d.customerId === customerId);
      const customerAudits = data.auditSessions.filter(a => a.customerId === customerId);
      return NextResponse.json({
        customerId,
        items: customerDisplays,
        auditSessions: customerAudits,
        totalFaces: customerDisplays.reduce((sum, d) => sum + (d.faces || 1), 0),
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching displays:', error);
    return NextResponse.json({ error: 'Failed to fetch displays' }, { status: 500 });
  }
}

// POST - Create a new display item
export async function POST(request: NextRequest) {
  try {
    const input: CreateDisplayInput = await request.json();

    if (!input.customerId || !input.sku || !input.collectionName || !input.installedAt) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, sku, collectionName, installedAt' },
        { status: 400 }
      );
    }

    const data = await readDisplaysFile();

    const newItem: DisplayItem = {
      id: generateId(),
      customerId: input.customerId,
      sku: input.sku,
      collectionName: input.collectionName,
      installedAt: input.installedAt,
      faces: input.faces,
      location: input.location,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.displays.push(newItem);
    data.lastUpdated = new Date().toISOString();

    await writeDisplaysFile(data);

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating display:', error);
    return NextResponse.json({ error: 'Failed to create display' }, { status: 500 });
  }
}

// PUT - Update an existing display item or audit session
export async function PUT(request: NextRequest) {
  try {
    const input: UpdateDisplayInput & {
      auditId?: string;
      photos?: AuditPhoto[];
      itemUpdates?: Array<{ id: string; status: 'ACTIVE' | 'MISSING' }>;
      auditType?: AuditType;
    } = await request.json();

    const data = await readDisplaysFile();

    // Handle audit session update
    if (input.auditId) {
      const auditIndex = data.auditSessions.findIndex(a => a.id === input.auditId);
      if (auditIndex === -1) {
        return NextResponse.json({ error: 'Audit session not found' }, { status: 404 });
      }

      const audit = data.auditSessions[auditIndex];
      const auditDate = audit.completedAt.split('T')[0];

      // Update audit session photos
      if (input.photos !== undefined) {
        audit.photos = input.photos;
      }

      // Update audit type
      if (input.auditType !== undefined) {
        audit.auditType = input.auditType;
      }

      // Update item statuses if provided
      if (input.itemUpdates && input.itemUpdates.length > 0) {
        for (const update of input.itemUpdates) {
          const itemIndex = data.displays.findIndex(d => d.id === update.id);
          if (itemIndex === -1) continue;

          const item = data.displays[itemIndex];

          if (update.status === 'ACTIVE') {
            item.status = 'ACTIVE';
            item.lastVerifiedAt = auditDate;
          } else if (update.status === 'MISSING') {
            item.status = 'MISSING';
            item.lastVerifiedAt = auditDate;
          }

          item.updatedAt = new Date().toISOString();
          data.displays[itemIndex] = item;
        }

        // Recalculate audit summary based on the customer's displays
        const customerId = audit.customerId;
        const customerDisplays = data.displays.filter(d => d.customerId === customerId);
        const verified = customerDisplays.filter(d => d.lastVerifiedAt === auditDate && d.status === 'ACTIVE').length;
        const missingCount = customerDisplays.filter(d => d.status === 'MISSING').length;
        const unverified = customerDisplays.length - verified - missingCount;

        audit.summary = {
          total: customerDisplays.length,
          verified,
          missing: missingCount,
          unverified,
        };
      }

      data.auditSessions[auditIndex] = audit;
      data.lastUpdated = new Date().toISOString();
      await writeDisplaysFile(data);

      return NextResponse.json(audit);
    }

    // Handle display item update
    if (!input.id) {
      return NextResponse.json({ error: 'Missing required field: id or auditId' }, { status: 400 });
    }

    const index = data.displays.findIndex(d => d.id === input.id);

    if (index === -1) {
      return NextResponse.json({ error: 'Display item not found' }, { status: 404 });
    }

    // Update fields
    const updatedItem: DisplayItem = {
      ...data.displays[index],
      ...(input.sku && { sku: input.sku }),
      ...(input.collectionName && { collectionName: input.collectionName }),
      ...(input.installedAt && { installedAt: input.installedAt }),
      ...(input.faces !== undefined && { faces: input.faces }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.status && { status: input.status }),
      ...(input.lastVerifiedAt && { lastVerifiedAt: input.lastVerifiedAt }),
      updatedAt: new Date().toISOString(),
    };

    data.displays[index] = updatedItem;
    data.lastUpdated = new Date().toISOString();

    await writeDisplaysFile(data);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating display:', error);
    return NextResponse.json({ error: 'Failed to update display' }, { status: 500 });
  }
}

// PATCH - Bulk audit operations
export async function PATCH(request: NextRequest) {
  try {
    const input: BulkAuditInput & { photos?: AuditPhoto[]; auditType?: AuditType } = await request.json();

    if (!input.customerId) {
      return NextResponse.json(
        { error: 'Missing required field: customerId' },
        { status: 400 }
      );
    }

    // Allow audits with only photos (no item updates)
    const hasUpdates = input.updates && input.updates.length > 0;
    const hasPhotos = input.photos && input.photos.length > 0;

    if (!hasUpdates && !hasPhotos) {
      return NextResponse.json(
        { error: 'Must provide updates or photos' },
        { status: 400 }
      );
    }

    const data = await readDisplaysFile();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Process updates if present
    if (hasUpdates) {
      for (const update of input.updates) {
        const index = data.displays.findIndex(d => d.id === update.id);
        if (index === -1) continue;

        const item = data.displays[index];

        switch (update.action) {
          case 'CONFIRM':
            item.status = 'ACTIVE';
            item.lastVerifiedAt = today;
            break;
          case 'MISSING':
            item.status = 'MISSING';
            item.lastVerifiedAt = today;
            break;
          case 'NOTE':
            if (update.notes) {
              item.notes = update.notes;
            }
            break;
        }

        item.updatedAt = now;
        data.displays[index] = item;
      }
    }

    // Calculate summary
    const customerDisplays = data.displays.filter(d => d.customerId === input.customerId);
    const verified = customerDisplays.filter(d => d.lastVerifiedAt === today && d.status === 'ACTIVE').length;
    const missingCount = customerDisplays.filter(d => d.status === 'MISSING').length;
    const unverified = customerDisplays.length - verified - missingCount;

    const summary = {
      total: customerDisplays.length,
      verified,
      missing: missingCount,
      unverified,
    };

    // Save audit session with photos and audit type
    const auditSession = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: input.customerId,
      completedAt: now,
      auditType: input.auditType || 'in-person',
      summary,
      ...(hasPhotos && { photos: input.photos }),
    };
    data.auditSessions.push(auditSession);

    data.lastUpdated = now;
    await writeDisplaysFile(data);

    return NextResponse.json({
      success: true,
      summary,
      auditSession,
    });
  } catch (error) {
    console.error('Error processing audit:', error);
    return NextResponse.json({ error: 'Failed to process audit' }, { status: 500 });
  }
}

// DELETE - Remove a display item or audit session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const auditId = searchParams.get('auditId');

    const data = await readDisplaysFile();

    // Delete audit session
    if (auditId) {
      const auditIndex = data.auditSessions.findIndex(a => a.id === auditId);
      if (auditIndex === -1) {
        return NextResponse.json({ error: 'Audit session not found' }, { status: 404 });
      }
      data.auditSessions.splice(auditIndex, 1);
      data.lastUpdated = new Date().toISOString();
      await writeDisplaysFile(data);
      return NextResponse.json({ success: true, message: 'Audit session deleted' });
    }

    // Delete display item
    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id or auditId' }, { status: 400 });
    }

    const index = data.displays.findIndex(d => d.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Display item not found' }, { status: 404 });
    }

    data.displays.splice(index, 1);
    data.lastUpdated = new Date().toISOString();

    await writeDisplaysFile(data);

    return NextResponse.json({ success: true, message: 'Display item deleted' });
  } catch (error) {
    console.error('Error deleting:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
