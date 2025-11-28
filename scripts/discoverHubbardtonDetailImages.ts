/**
 * Utility to discover detail/macro images for Hubbardton Forge products
 * Detail images end in: _2, _20, _22, _23, _24 (per user specification)
 *
 * This script:
 * 1. Reads the Hubbardton image mapping (SKUs with confirmed _1 main images)
 * 2. For each mapped SKU, checks for detail image variants
 * 3. Outputs a mapping of SKU -> array of available detail image URLs
 *
 * Usage: npx tsx scripts/discoverHubbardtonDetailImages.ts
 */

import { promises as fs } from 'fs';
import path from 'path';

// Detail image suffixes to check (user specified: _2, _20, _22, _23, _24)
const DETAIL_SUFFIXES = ['_2', '_20', '_22', '_23', '_24'];

function generateCDNUrl(filename: string, suffix: string = '_1'): string {
  const firstChar = filename.charAt(0);
  const secondChar = filename.charAt(1);
  return `https://hubbardtonforge.com/cdn-cgi/image/width=2560,height=3200,quality=85,format=auto/media/catalog/product/${firstChar}/${secondChar}/${filename}${suffix}.png`;
}

async function imageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function discoverDetailImages(sku: string): Promise<string[]> {
  const detailUrls: string[] = [];

  for (const suffix of DETAIL_SUFFIXES) {
    const url = generateCDNUrl(sku, suffix);
    const exists = await imageExists(url);

    if (exists) {
      detailUrls.push(url);
      console.log(`  ✓ Found ${sku}${suffix}`);
    }
  }

  return detailUrls;
}

async function main() {
  const imageMappingPath = path.join(process.cwd(), 'data', 'hubbardton-image-map.json');
  const outputPath = path.join(process.cwd(), 'data', 'hubbardton-detail-images.json');

  console.log('Loading Hubbardton image mapping...');
  const mapping = JSON.parse(await fs.readFile(imageMappingPath, 'utf-8')) as Record<string, string>;

  const skus = Object.values(mapping); // Use the mapped filenames
  console.log(`Discovering detail images for ${skus.length} SKUs...`);
  console.log('Checking suffixes:', DETAIL_SUFFIXES.join(', '));
  console.log('This may take several minutes...\n');

  const detailMap: Record<string, string[]> = {};
  let totalFound = 0;

  // Process in batches to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < skus.length; i += batchSize) {
    const batch = skus.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (sku) => {
        console.log(`Checking ${sku}...`);
        const detailUrls = await discoverDetailImages(sku);

        if (detailUrls.length > 0) {
          detailMap[sku] = detailUrls;
          totalFound += detailUrls.length;
        } else {
          console.log(`  ✗ No detail images for ${sku}`);
        }
      })
    );

    console.log(`\nProgress: ${i + batch.length}/${skus.length} (${totalFound} detail images found)\n`);
  }

  // Save mapping file
  await fs.writeFile(outputPath, JSON.stringify(detailMap, null, 2), 'utf-8');

  console.log('\n=== SUMMARY ===');
  console.log(`Total SKUs checked: ${skus.length}`);
  console.log(`SKUs with detail images: ${Object.keys(detailMap).length}`);
  console.log(`Total detail images found: ${totalFound}`);
  console.log(`\nMapping saved to: ${outputPath}`);
}

main().catch(console.error);
