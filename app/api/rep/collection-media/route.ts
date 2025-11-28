import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const MEDIA_FILE_PATH = join(process.cwd(), 'data', 'collection-media.json');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendor = searchParams.get('vendor');
    const collection = searchParams.get('collection');

    const data = JSON.parse(readFileSync(MEDIA_FILE_PATH, 'utf-8'));

    if (vendor && collection) {
      // Return specific collection media
      const mediaConfig = data[vendor]?.[collection] || { mediaType: 'none' };
      return NextResponse.json({ mediaConfig });
    } else if (vendor) {
      // Return all collections for a vendor
      const vendorMedia = data[vendor] || {};
      return NextResponse.json({ vendorMedia });
    } else {
      // Return all data
      return NextResponse.json({ data });
    }
  } catch (error) {
    console.error('Error loading collection media:', error);
    return NextResponse.json({ error: 'Failed to load collection media' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendor, collection, mediaConfig } = body;

    if (!vendor || !collection) {
      return NextResponse.json({ error: 'Vendor and collection are required' }, { status: 400 });
    }

    // Read current data
    let data: Record<string, Record<string, any>> = {};
    try {
      data = JSON.parse(readFileSync(MEDIA_FILE_PATH, 'utf-8'));
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      data = {};
    }

    // Ensure vendor exists
    if (!data[vendor]) {
      data[vendor] = {};
    }

    // Update collection media
    data[vendor][collection] = mediaConfig;

    // Save to file
    writeFileSync(MEDIA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, mediaConfig });
  } catch (error) {
    console.error('Error saving collection media:', error);
    return NextResponse.json({ error: 'Failed to save collection media' }, { status: 500 });
  }
}
