/**
 * Utility script to map Hubbardton Forge SKUs to available CDN image URLs
 *
 * This script tests various SKU patterns against the Cloudflare CDN to find
 * which images are actually available, then creates a mapping file.
 *
 * Usage: tsx scripts/mapHubbardtonImages.ts
 */

import { promises as fs } from 'fs';
import path from 'path';

type HubbardtonSpecRecord = {
  'Part Num': string;
  'Smart String': string;
  'Product Name': string;
  'Base Item / Design ID'?: string;
  [key: string]: unknown;
};

// Generate Cloudflare CDN URL for testing
function generateCDNUrl(filename: string): string {
  const firstChar = filename.charAt(0);
  const secondChar = filename.charAt(1);
  return `https://hubbardtonforge.com/cdn-cgi/image/width=2560,height=3200,quality=85,format=auto/media/catalog/product/${firstChar}/${secondChar}/${filename}_1.png`;
}

// Test if an image URL exists (returns 200)
async function imageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.status === 200;
  } catch {
    return false;
  }
}

// Test multiple filename patterns for a SKU
async function findImageForSku(
  record: HubbardtonSpecRecord,
  smartString: string
): Promise<string | null> {
  // Patterns to test (in order of likelihood)
  const patterns = [
    smartString,                           // Full Smart String (e.g., "271201-SKT-14-44-SF2302")
    record['Part Num'],                    // Part Num (e.g., "271201-1234")
    record['Base Item / Design ID'] || '', // Base Item (e.g., "271201")
  ].filter(Boolean);

  for (const pattern of patterns) {
    const url = generateCDNUrl(pattern);
    const exists = await imageExists(url);

    if (exists) {
      console.log(`✓ Found image for ${smartString}: ${pattern}`);
      return pattern;
    }
  }

  console.log(`✗ No image found for ${smartString}`);
  return null;
}

async function main() {
  const dataPath = path.join(process.cwd(), 'data', 'hubbardtonspecs.json');
  const outputPath = path.join(process.cwd(), 'data', 'hubbardton-image-map.json');

  console.log('Loading Hubbardton specs...');
  const data = JSON.parse(await fs.readFile(dataPath, 'utf-8')) as Record<string, HubbardtonSpecRecord>;

  const skus = Object.keys(data);
  console.log(`Testing ${skus.length} SKUs for image availability...`);
  console.log('This may take several minutes...\n');

  const imageMap: Record<string, string> = {};
  let foundCount = 0;
  let notFoundCount = 0;

  // Process in batches to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < skus.length; i += batchSize) {
    const batch = skus.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (smartString) => {
        const record = data[smartString];
        const imageFilename = await findImageForSku(record, smartString);

        if (imageFilename) {
          imageMap[smartString] = imageFilename;
          foundCount++;
        } else {
          notFoundCount++;
        }
      })
    );

    // Progress update
    console.log(`\nProgress: ${i + batch.length}/${skus.length} (${foundCount} found, ${notFoundCount} missing)`);
  }

  // Save mapping file
  await fs.writeFile(outputPath, JSON.stringify(imageMap, null, 2), 'utf-8');

  console.log('\n=== SUMMARY ===');
  console.log(`Total SKUs: ${skus.length}`);
  console.log(`Images found: ${foundCount}`);
  console.log(`Images missing: ${notFoundCount}`);
  console.log(`\nMapping saved to: ${outputPath}`);
}

main().catch(console.error);
