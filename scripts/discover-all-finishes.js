/**
 * Discover valid Hubbardton Forge product image SKUs
 *
 * This script tests all product variants from hubbardtonspecs.json
 * to find which ones have valid images on the CDN.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load the specs and existing image map
const specsPath = path.join(__dirname, '..', 'data', 'hubbardtonspecs.json');
const imageMapPath = path.join(__dirname, '..', 'data', 'hubbardton-image-map.json');

const specs = JSON.parse(fs.readFileSync(specsPath, 'utf-8'));

let existingMap = {};
try {
  existingMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf-8'));
} catch (e) {
  console.log('No existing image map found, starting fresh');
}

// Generate image URL for a SKU
function getImageUrl(sku) {
  const firstChar = sku.charAt(0);
  const secondChar = sku.charAt(1);
  return `https://hubbardtonforge.com/media/catalog/product/${firstChar}/${secondChar}/${sku}_1.png`;
}

// Test if a URL exists (returns 200)
function testUrl(sku) {
  return new Promise((resolve) => {
    const url = getImageUrl(sku);

    https.get(url, (res) => {
      resolve({
        sku,
        url,
        exists: res.statusCode === 200,
        statusCode: res.statusCode
      });
      res.resume();
    }).on('error', () => {
      resolve({
        sku,
        url,
        exists: false,
        statusCode: 'ERROR'
      });
    });
  });
}

async function discoverProductImages() {
  console.log('=== Discovering Hubbardton Forge Product Images ===\n');

  // Group products by base item code
  const baseItemGroups = new Map();

  for (const [sku, record] of Object.entries(specs)) {
    const baseItem = record['Base Item / Design ID'] || sku;
    const family = record['Family']?.trim();

    // Only include items with a family (collection)
    if (!family) continue;

    if (!baseItemGroups.has(baseItem)) {
      baseItemGroups.set(baseItem, {
        name: record['Product Name'],
        family,
        variants: []
      });
    }

    baseItemGroups.get(baseItem).variants.push({
      sku,
      finish: record['Finish']?.trim() || '',
      accentFinish: record['Accent Finish']?.trim() || ''
    });
  }

  console.log(`Found ${baseItemGroups.size} unique base items with collections\n`);

  // Find which base items don't have mappings yet
  const mappedBaseItems = new Set();
  for (const mappedSku of Object.keys(existingMap)) {
    const baseMatch = mappedSku.match(/^(\d+)/);
    if (baseMatch) {
      mappedBaseItems.add(baseMatch[1]);
    }
  }

  console.log(`Already have mappings for ${mappedBaseItems.size} base items\n`);

  // Find unmapped base items
  const unmappedBaseItems = [];
  for (const [baseItem, data] of baseItemGroups.entries()) {
    const baseMatch = baseItem.match(/^(\d+)/);
    const numericBase = baseMatch ? baseMatch[1] : baseItem;

    if (!mappedBaseItems.has(numericBase)) {
      unmappedBaseItems.push({
        baseItem,
        name: data.name,
        family: data.family,
        variants: data.variants
      });
    }
  }

  console.log(`Testing images for ${unmappedBaseItems.length} unmapped base items...\n`);

  const newMappings = {};
  let testedCount = 0;
  let foundCount = 0;

  for (const item of unmappedBaseItems) {
    console.log(`\nTesting ${item.baseItem}: ${item.name}`);

    // Test variants in order of preference:
    // 1. Variants with finish codes 07, 85, 86 (commonly have images)
    // 2. First few variants

    const preferredVariants = item.variants.filter(v =>
      v.sku.includes('-07') || v.sku.includes('-85') || v.sku.includes('-86') ||
      v.sku.includes('-10') || v.sku.includes('-14')
    );

    // Also include first 3 variants as fallback
    const variantsToTest = [
      ...preferredVariants,
      ...item.variants.slice(0, 3)
    ].filter((v, i, arr) =>
      // Remove duplicates
      arr.findIndex(x => x.sku === v.sku) === i
    ).slice(0, 8); // Test at most 8 variants per product

    let foundForThisItem = false;

    for (const variant of variantsToTest) {
      if (foundForThisItem) break;

      testedCount++;
      const result = await testUrl(variant.sku);

      if (result.exists) {
        console.log(`  ✓ Found: ${variant.sku}`);
        newMappings[variant.sku] = variant.sku;
        foundCount++;
        foundForThisItem = true;
      } else {
        console.log(`  ✗ Not found: ${variant.sku} (${result.statusCode})`);
      }

      // Small delay to be polite to server
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (!foundForThisItem) {
      console.log(`  ⚠ No working image found for any variant`);
    }
  }

  console.log(`\n=== Discovery Complete ===`);
  console.log(`Tested ${testedCount} URLs, found ${foundCount} working images\n`);

  // Merge with existing mappings
  const updatedMap = { ...existingMap, ...newMappings };

  // Sort the map by key
  const sortedMap = Object.fromEntries(
    Object.entries(updatedMap).sort(([a], [b]) => a.localeCompare(b))
  );

  // Save updated map
  fs.writeFileSync(
    imageMapPath,
    JSON.stringify(sortedMap, null, 2),
    'utf-8'
  );

  console.log(`Updated ${imageMapPath} with ${Object.keys(sortedMap).length} total mappings`);

  // Show new mappings
  if (Object.keys(newMappings).length > 0) {
    console.log('\nNew mappings added:');
    for (const [sku] of Object.entries(newMappings)) {
      console.log(`  ${sku}`);
    }
  }

  return sortedMap;
}

// Run discovery
discoverProductImages().catch(console.error);
