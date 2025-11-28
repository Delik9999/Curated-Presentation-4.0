/**
 * Quick pilot test to verify image mapping approach
 * Tests a small sample of SKUs
 */

import { promises as fs } from 'fs';
import path from 'path';

// Test SKUs - mix of different product types
const TEST_SKUS = [
  '271201-SKT-14-44-SF2302', // Known working from user
  '401320-LED-MULT-02-LC-AR', // Aspen (might not work)
  '402749-SKT-02-02-SF1810',  // Coral (might not work)
  '209321-SKT-02-02',         // Henry
  '241200-SKT-85-SF1520',     // Found in full scan
];

function generateCDNUrl(filename: string): string {
  const firstChar = filename.charAt(0);
  const secondChar = filename.charAt(1);
  return `https://hubbardtonforge.com/cdn-cgi/image/width=2560,height=3200,quality=85,format=auto/media/catalog/product/${firstChar}/${secondChar}/${filename}_1.png`;
}

async function testImage(sku: string): Promise<boolean> {
  const url = generateCDNUrl(sku);
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function main() {
  console.log('Testing sample SKUs for image availability...\n');

  for (const sku of TEST_SKUS) {
    const url = generateCDNUrl(sku);
    const exists = await testImage(sku);

    if (exists) {
      console.log(`✓ FOUND: ${sku}`);
      console.log(`  URL: ${url}\n`);
    } else {
      console.log(`✗ MISSING: ${sku}`);
      console.log(`  Tried: ${url}\n`);
    }
  }

  console.log('\n=== Test Complete ===');
  console.log('If images are found, the approach is working correctly.');
}

main().catch(console.error);
