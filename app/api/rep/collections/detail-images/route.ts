/**
 * API endpoint to fetch detail/macro images for a collection
 * Used by the presentation builder's Ken Burns image gallery
 *
 * GET /api/rep/collections/detail-images?collectionName=Aspen&vendor=hubbardton-forge
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { loadCatalog } from '@/lib/catalog/loadCatalog';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collectionName = searchParams.get('collectionName');
    const vendor = searchParams.get('vendor');

    if (!collectionName || !vendor) {
      return NextResponse.json(
        { error: 'collectionName and vendor are required' },
        { status: 400 }
      );
    }

    // Currently only supporting Hubbardton Forge
    if (vendor !== 'hubbardton-forge') {
      return NextResponse.json({
        images: [],
        message: `Detail images not available for vendor: ${vendor}`,
      });
    }

    // Load the detail images mapping
    const detailMappingPath = path.join(process.cwd(), 'data', 'hubbardton-detail-images.json');
    let detailMapping: Record<string, string[]> = {};

    try {
      const file = await fs.readFile(detailMappingPath, 'utf-8');
      detailMapping = JSON.parse(file);
    } catch {
      console.log('[API] No detail images mapping found');
      return NextResponse.json({ images: [] });
    }

    // Load catalog to find products in this collection
    const catalog = await loadCatalog(vendor);
    const collectionProducts = catalog.filter(
      (item) => item.collectionName?.toLowerCase() === collectionName.toLowerCase()
    );

    if (collectionProducts.length === 0) {
      return NextResponse.json({
        images: [],
        message: `No products found in collection: ${collectionName}`,
      });
    }

    // Collect all detail images for products in this collection
    const detailImages: Array<{
      url: string;
      sku: string;
      productName: string;
    }> = [];

    for (const product of collectionProducts) {
      // For configurable products, check all variants
      if (product.isConfigurable && product.skuVariants) {
        for (const variant of product.skuVariants) {
          const urls = detailMapping[variant.sku];
          if (urls && urls.length > 0) {
            urls.forEach((url) => {
              detailImages.push({
                url,
                sku: variant.sku,
                productName: product.name,
              });
            });
          }
        }
      } else {
        // Regular product
        const urls = detailMapping[product.sku];
        if (urls && urls.length > 0) {
          urls.forEach((url) => {
            detailImages.push({
              url,
              sku: product.sku,
              productName: product.name,
            });
          });
        }
      }
    }

    console.log(`[API] Found ${detailImages.length} detail images for collection: ${collectionName}`);

    return NextResponse.json({
      images: detailImages,
      collection: collectionName,
      vendor,
      productCount: collectionProducts.length,
    });
  } catch (error) {
    console.error('[API] Error fetching detail images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detail images' },
      { status: 500 }
    );
  }
}
