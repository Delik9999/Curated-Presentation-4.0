import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export type Vendor = {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string | null;
  description: string;
  active: boolean;
};

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'vendors.json');
    const file = await fs.readFile(filePath, 'utf-8');
    const vendors = JSON.parse(file) as Vendor[];

    // Filter to only active vendors
    const activeVendors = vendors.filter((v) => v.active);

    return NextResponse.json({ vendors: activeVendors });
  } catch (error) {
    console.error('Failed to load vendors:', error);
    return NextResponse.json(
      { error: 'Failed to load vendors' },
      { status: 500 }
    );
  }
}
