// API endpoint for vendor mapping management

import { NextRequest, NextResponse } from 'next/server';
import { VendorMapping } from '@/lib/imports/mapping-types';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MAPPINGS_PATH = path.join(process.cwd(), 'data/imports/mappings.json');

// GET - Load mappings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorCode = searchParams.get('vendorCode');

    // Load all mappings
    let mappings: VendorMapping[] = [];
    if (fs.existsSync(MAPPINGS_PATH)) {
      const content = fs.readFileSync(MAPPINGS_PATH, 'utf-8');
      mappings = JSON.parse(content);
    }

    // Filter by vendor if specified
    if (vendorCode) {
      mappings = mappings.filter((m) => m.vendorCode === vendorCode);
    }

    // Sort by most recent first
    mappings.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Failed to load mappings:', error);
    return NextResponse.json(
      { error: 'Failed to load mappings' },
      { status: 500 }
    );
  }
}

// POST - Create or update mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mapping }: { mapping: Partial<VendorMapping> } = body;

    if (!mapping.vendorCode) {
      return NextResponse.json(
        { error: 'vendorCode is required' },
        { status: 400 }
      );
    }

    // Load existing mappings
    let mappings: VendorMapping[] = [];
    if (fs.existsSync(MAPPINGS_PATH)) {
      const content = fs.readFileSync(MAPPINGS_PATH, 'utf-8');
      mappings = JSON.parse(content);
    }

    const now = new Date().toISOString();

    // If mapping has an ID, update existing
    if (mapping.id) {
      const index = mappings.findIndex((m) => m.id === mapping.id);
      if (index >= 0) {
        const version = mappings[index].version + 1;
        mappings[index] = {
          ...mapping,
          id: mapping.id,
          version,
          updatedAt: now,
        } as VendorMapping;
      } else {
        return NextResponse.json(
          { error: 'Mapping not found' },
          { status: 404 }
        );
      }
    } else {
      // Create new mapping
      const newMapping: VendorMapping = {
        ...mapping,
        id: crypto.randomUUID(),
        version: 1,
        createdAt: now,
        updatedAt: now,
      } as VendorMapping;
      mappings.push(newMapping);
    }

    // Save mappings
    fs.writeFileSync(MAPPINGS_PATH, JSON.stringify(mappings, null, 2), 'utf-8');

    // Return the saved mapping
    const savedMapping = mapping.id
      ? mappings.find((m) => m.id === mapping.id)
      : mappings[mappings.length - 1];

    return NextResponse.json({ mapping: savedMapping });
  } catch (error) {
    console.error('Failed to save mapping:', error);
    return NextResponse.json(
      { error: 'Failed to save mapping' },
      { status: 500 }
    );
  }
}

// DELETE - Delete mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Load existing mappings
    let mappings: VendorMapping[] = [];
    if (fs.existsSync(MAPPINGS_PATH)) {
      const content = fs.readFileSync(MAPPINGS_PATH, 'utf-8');
      mappings = JSON.parse(content);
    }

    // Filter out the mapping to delete
    const filtered = mappings.filter((m) => m.id !== id);

    if (filtered.length === mappings.length) {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      );
    }

    // Save updated mappings
    fs.writeFileSync(MAPPINGS_PATH, JSON.stringify(filtered, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}
