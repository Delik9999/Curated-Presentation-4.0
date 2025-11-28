import { NextResponse } from 'next/server';
import { resetCatalogCache } from '@/lib/catalog/loadCatalog';

export async function POST() {
  resetCatalogCache();
  return NextResponse.json({ message: 'Catalog cache cleared' });
}
