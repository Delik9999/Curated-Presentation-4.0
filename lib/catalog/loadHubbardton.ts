import { promises as fs } from 'fs';
import path from 'path';
import type { CatalogItem } from './loadCatalog';

type HubbardtonSpecRecord = {
  'Part Num': string;
  'Product Name': string;
  'Family': string;
  'Internet/MAPP Price (CAD)': string;
  'Dealer Cost (CAD)': string;
  'Base Item / Design ID'?: string;
  'Finish'?: string;
  'Accent Finish'?: string;
  'Shade'?: string;
  'Glass'?: string;
  'Intro Year'?: string;
  [key: string]: unknown;
};

function parsePrice(priceStr: string): number {
  // Remove $, commas, and spaces, then parse
  const cleaned = priceStr.replace(/[\$,\s]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function extractYearFromIntroYear(introYear?: string): number | undefined {
  if (!introYear) return undefined;
  const yearMatch = introYear.match(/\d{4}/);
  return yearMatch ? Number.parseInt(yearMatch[0], 10) : undefined;
}

// Load image mapping (maps SKU to actual image filename)
let imageMapping: Record<string, string> | null = null;

// Fallback images for products without their own images on the CDN
// Maps base item code to a known working SKU from a similar product
const FALLBACK_IMAGES: Record<string, string> = {
  // Henry sconces without images can use similar Henry products
  '209321': '209322-SKT-86-FD0686', // Henry Large Metal Shade -> Henry Medium Metal Shade
  '209323': '209324-SKT-14-FD0673', // Henry Small Metal Shade -> Henry Mini Metal Shade
  // SNAPS products without images can use similar SNAPS products
  '401315': '401320-LED-MULT-10-LC-AR', // SNAPS Medium -> SNAPS LED
  '401316': '401321-LED-MULT-86-LK-AR', // SNAPS Large -> SNAPS LED 2
  '401850': '401322-LED-STND-85-LC', // SNAPS Small -> SNAPS LED 3
  '402031': '401848-LED-STND-85-LK', // SNAPS Sconce -> SNAPS 4
  '402801': '401849-LED-STND-85-LW', // SNAPS Floor-to-Ceiling -> SNAPS 5
  '905701': '902821-LED-86-LC-AR', // SNAPS Module 24" -> SNAPS accessory
  '905713': '902822-LED-86-LC', // SNAPS Module 72" -> SNAPS accessory
};

async function loadImageMapping(): Promise<Record<string, string>> {
  if (imageMapping) return imageMapping;

  try {
    const mappingPath = path.join(process.cwd(), 'data', 'hubbardton-image-map.json');
    const file = await fs.readFile(mappingPath, 'utf-8');
    imageMapping = JSON.parse(file);
    console.log('[Hubbardton] Loaded image mapping with', Object.keys(imageMapping || {}).length, 'entries');
    return imageMapping || {};
  } catch {
    console.log('[Hubbardton] No image mapping file found, using direct SKU mapping');
    return {};
  }
}

// Generate Hubbardton Forge product image URL
// Uses Cloudflare CDN (publicly accessible)
// Returns both the URL and the SKU that was matched (for configurator defaults)
function generateHubbardtonImageUrl(
  sku: string,
  mapping: Record<string, string> = {},
  baseItemCode?: string
): { url: string; matchedSku: string } {
  // Strategy:
  // 1. First check if this exact SKU is in the mapping (known good images)
  // 2. If not, and we have a baseItemCode, look for any mapped SKU that starts with that base code
  // 3. Check fallback images for products without their own images
  // 4. Fall back to the provided SKU as a last resort

  let imageFilename = sku;
  let matchedSku = sku;

  // Check if we have a mapped filename for this exact SKU
  if (mapping[sku]) {
    imageFilename = mapping[sku];
    matchedSku = sku;
  } else if (baseItemCode) {
    // Look for any mapping entry that starts with this base item code
    let foundInMapping = false;
    for (const mappedSku of Object.keys(mapping)) {
      if (mappedSku.startsWith(baseItemCode + '-') || mappedSku === baseItemCode) {
        imageFilename = mapping[mappedSku];
        matchedSku = mappedSku;
        foundInMapping = true;
        break;
      }
    }

    // If not found in mapping, check fallbacks for products without images
    if (!foundInMapping && FALLBACK_IMAGES[baseItemCode]) {
      imageFilename = FALLBACK_IMAGES[baseItemCode];
      matchedSku = FALLBACK_IMAGES[baseItemCode];
    }
  }

  // Extract first two characters for directory path
  const firstChar = imageFilename.charAt(0);
  const secondChar = imageFilename.charAt(1);

  // Cloudflare CDN URL with image optimization - must use full variant SKU for filename
  const imageUrl = `https://hubbardtonforge.com/cdn-cgi/image/width=2560,height=3200,quality=85,format=auto/media/catalog/product/${firstChar}/${secondChar}/${imageFilename}_1.png`;
  return { url: imageUrl, matchedSku };
}

// Helper function to extract unique option values from variants
function extractUniqueOptions(
  variants: (HubbardtonSpecRecord & { 'Part Num': string })[],
  fieldName: keyof HubbardtonSpecRecord
): string[] {
  const options = new Set<string>();

  for (const variant of variants) {
    const value = variant[fieldName];
    if (value && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        options.add(trimmed);
      }
    }
  }

  return Array.from(options).sort();
}

export async function loadHubbardtonForgeCatalog(): Promise<CatalogItem[]> {
  const filePath = path.join(process.cwd(), 'data', 'hubbardtonspecs.json');

  try {
    console.log('[Hubbardton] loadHubbardtonForgeCatalog() called');
    const file = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(file) as Record<string, HubbardtonSpecRecord>;
    console.log('[Hubbardton] Loaded data file, processing', Object.keys(data).length, 'SKUs');

    // Load image mapping
    const mapping = await loadImageMapping();

    // Group products by Base Item / Design ID
    const groupedByBase = new Map<string, (HubbardtonSpecRecord & { 'Part Num': string })[]>();

    for (const [sku, record] of Object.entries(data)) {
      const baseItem = record['Base Item / Design ID'] || record['Part Num'] || sku;
      const collectionName = record['Family']?.trim();

      // Skip products without a collection
      if (!collectionName) continue;

      if (!groupedByBase.has(baseItem)) {
        groupedByBase.set(baseItem, []);
      }
      groupedByBase.get(baseItem)!.push({ ...record, 'Part Num': sku });
    }

    const catalogItems: CatalogItem[] = [];

    // Process each base item group
    for (const [baseItem, variants] of Array.from(groupedByBase.entries())) {
      if (variants.length === 0) continue;

      const baseRecord = variants[0];
      const baseName = baseRecord['Product Name'] || '';
      const list = parsePrice(baseRecord['Dealer Cost (CAD)'] || '0');
      const collectionName = baseRecord['Family']?.trim();
      const year = extractYearFromIntroYear(baseRecord['Intro Year']);

      // Check if this is a multi-option product
      const hasMultipleVariants = variants.length > 1;

      if (hasMultipleVariants) {
        // Extract unique option values
        const finishOptions = extractUniqueOptions(variants, 'Finish');
        const accentFinishOptions = extractUniqueOptions(variants, 'Accent Finish');
        const shadeOptions = extractUniqueOptions(variants, 'Shade');
        const glassOptions = extractUniqueOptions(variants, 'Glass');

        // Determine if this product should be configurable
        // A product is configurable if it has multiple options for ANY option type
        const hasMultipleFinishes = finishOptions.length > 1;
        const hasMultipleAccentFinishes = accentFinishOptions.length > 1;
        const hasMultipleShades = shadeOptions.length > 1;
        const hasMultipleGlass = glassOptions.length > 1;

        const isConfigurable = hasMultipleFinishes || hasMultipleAccentFinishes || hasMultipleShades || hasMultipleGlass;

        if (isConfigurable) {
          // Build configurator options dynamically based on what's available
          const configuratorOptions: Array<{
            optionName: string;
            optionType: 'finish' | 'accent-finish' | 'glass' | 'shade' | 'canopy' | 'other';
            values: string[];
            required: boolean;
          }> = [];

          if (hasMultipleFinishes) {
            configuratorOptions.push({
              optionName: 'Finish',
              optionType: 'finish',
              values: finishOptions,
              required: true,
            });
          }

          if (hasMultipleAccentFinishes) {
            configuratorOptions.push({
              optionName: 'Accent Finish',
              optionType: 'accent-finish',
              values: accentFinishOptions,
              required: true,
            });
          }

          if (hasMultipleShades) {
            configuratorOptions.push({
              optionName: 'Shade',
              optionType: 'shade',
              values: shadeOptions,
              required: true,
            });
          }

          if (hasMultipleGlass) {
            configuratorOptions.push({
              optionName: 'Glass',
              optionType: 'glass',
              values: glassOptions,
              required: true,
            });
          }

          // Create configurable product
          // Use first variant's SKU for image (base SKU doesn't have images)
          const firstVariantSku = variants[0]['Part Num'];
          console.log(`[Hubbardton] About to generate image URL for first variant SKU: ${firstVariantSku}, baseItem: ${baseItem}`);
          const baseImageResult = generateHubbardtonImageUrl(firstVariantSku, mapping, baseItem);
          console.log(`[Hubbardton] Generated baseImageUrl: ${baseImageResult.url}, matched SKU: ${baseImageResult.matchedSku}`);
          catalogItems.push({
            sku: baseItem,
            name: baseName,
            list,
            image: baseImageResult.url,
            collectionName,
            year,
            vendor: 'hubbardton-forge',
            baseItemCode: baseItem,
            isConfigurable: true,
            shadeInfo: baseRecord['Shade'] || baseRecord['Glass'] || undefined,
            configuratorOptions,
            defaultVariantSku: baseImageResult.matchedSku, // Track which variant's image is displayed
            skuVariants: variants.map(v => ({
              sku: v['Part Num'],
              optionCombination: {
                ...(hasMultipleFinishes && { 'Finish': v['Finish']?.trim() || '' }),
                ...(hasMultipleAccentFinishes && { 'Accent Finish': v['Accent Finish']?.trim() || '' }),
                ...(hasMultipleShades && { 'Shade': v['Shade']?.trim() || '' }),
                ...(hasMultipleGlass && { 'Glass': v['Glass']?.trim() || '' }),
              },
              price: parsePrice(v['Dealer Cost (CAD)'] || '0'),
              // Each variant has its own image
              imageUrl: generateHubbardtonImageUrl(v['Part Num'], mapping, baseItem).url,
            })),
          });
          console.log(`[Hubbardton] Product ${baseName} (${baseItem}) image set to: ${baseImageResult.url}`);

          console.log(`[Hubbardton] Created configurable product: ${baseName} (${baseItem}) with ${variants.length} variants and ${configuratorOptions.length} option types`);
        } else {
          // Single-option variant (existing behavior for simple finish variants)
          for (const variant of variants) {
            const finish = variant['Finish']?.trim();
            catalogItems.push({
              sku: variant['Part Num'],
              name: finish ? `${baseName} - ${finish}` : baseName,
              list: parsePrice(variant['Dealer Cost (CAD)'] || '0'),
              image: generateHubbardtonImageUrl(variant['Part Num'], mapping, baseItem).url,
              collectionName,
              year,
              vendor: 'hubbardton-forge',
              finish,
              baseItemCode: baseItem,
            });
          }
        }
      } else {
        // Single product with no variants
        catalogItems.push({
          sku: baseRecord['Part Num'],
          name: baseName,
          list,
          image: generateHubbardtonImageUrl(baseRecord['Part Num'], mapping, baseItem).url,
          collectionName,
          year,
          vendor: 'hubbardton-forge',
        });
      }
    }

    console.log(`[Hubbardton] Loaded ${catalogItems.length} catalog items from ${groupedByBase.size} base items`);

    return catalogItems;
  } catch (error) {
    console.error(`Failed to load Hubbardton Forge catalog: ${(error as Error).message}`);
    return []; // Return empty array instead of throwing to allow graceful degradation
  }
}
