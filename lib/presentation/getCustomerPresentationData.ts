import { getActiveDallas, getWorkingSelection, createWorkingFromSnapshot, getPromotionConfig, getActivePresentation } from '@/lib/selections/store';
import { loadCatalog } from '@/lib/catalog/loadCatalog';
import { groupProductsByVariants } from '@/lib/catalog/groupVariants';
import type { CustomerPresentationData, PresentationCollection } from './types';
import type { CatalogItem } from '@/lib/catalog/loadCatalog';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarketBaselineService } from '@/lib/alignment/market-baseline.service';
import { RecommendationService } from '@/lib/alignment/recommendation.service';
import { getBestSellersReport } from '@/lib/alignment/best-sellers.service';

// Load collection media configuration
function loadCollectionMedia(vendor?: string): Record<string, any> {
  try {
    const mediaFilePath = join(process.cwd(), 'data', 'collection-media.json');
    const data = JSON.parse(readFileSync(mediaFilePath, 'utf-8'));
    // Return vendor-specific media or all media
    if (vendor) {
      return data[vendor] || {};
    }
    // Merge all vendor media into one object
    return Object.values(data).reduce((acc: Record<string, any>, vendorMedia: any) => {
      return { ...acc, ...vendorMedia };
    }, {});
  } catch (error) {
    console.error('[loadCollectionMedia] Error loading collection-media.json:', error);
    return {};
  }
}

/**
 * Get complete presentation data for a customer
 *
 * This is the SINGLE SOURCE OF TRUTH for determining what a customer sees in their presentation.
 *
 * Logic:
 * 1. Check if customer has an active Dallas market snapshot (isVisibleToCustomer === true)
 * 2. If yes:
 *    - Get or create their working selection from that snapshot
 *    - Split collections into "Your Market Selection" (has items) and "Everything Else" (doesn't)
 * 3. If no:
 *    - Return default presentation only
 * 4. Load catalog and enrich collections with actual products
 *
 * @param customerId - The customer ID
 * @param vendor - Optional vendor filter (e.g., 'lib-and-co', 'hubbardton-forge', 'savoy-house')
 * @returns Complete presentation data for rendering
 */
export async function getCustomerPresentationData(
  customerId: string,
  vendor?: string
): Promise<CustomerPresentationData> {
  console.log('[getCustomerPresentationData] Starting for customer:', customerId, 'vendor:', vendor);

  // Step 1: Check for active Dallas market snapshot
  const activeMarketSnapshot = await getActiveDallas(customerId, vendor);
  console.log('[getCustomerPresentationData] Active market snapshot:', activeMarketSnapshot?.id ?? 'none');

  // Step 2: Get or create working selection
  let workingSelection = await getWorkingSelection(customerId, vendor);
  console.log('[getCustomerPresentationData] Existing working selection:', workingSelection?.id ?? 'none');

  // If customer has a market snapshot but no working selection, create one
  if (activeMarketSnapshot && !workingSelection) {
    console.log('[getCustomerPresentationData] Creating working selection from snapshot:', activeMarketSnapshot.id);
    workingSelection = await createWorkingFromSnapshot(
      customerId,
      activeMarketSnapshot.id,
      `${activeMarketSnapshot.name} - Working`
    );
    console.log('[getCustomerPresentationData] Created working selection:', workingSelection.id);
  }

  // Step 3: Load default presentation configuration (global promotion config for this vendor)
  const promotionConfig = await getPromotionConfig(undefined, vendor);
  const activePresentation = await getActivePresentation(undefined, vendor);

  console.log('[getCustomerPresentationData] Promotion config:', {
    hasConfig: !!promotionConfig,
    hasPresentation: !!activePresentation,
    presentationItemsCount: activePresentation?.presentationItems?.length ?? 0,
    collectionsCount: activePresentation?.collections?.length ?? 0,
  });

  // Step 4: Load full catalog
  const catalog = await loadCatalog(vendor);
  const productsWithVariants = groupProductsByVariants(catalog);
  console.log('[getCustomerPresentationData] Catalog loaded:', {
    totalItems: catalog.length,
    groupedProducts: productsWithVariants.length,
  });

  // Step 5: Build enriched collections from promotion config
  let allCollections = await buildEnrichedCollections(
    activePresentation?.presentationItems ?? [],
    activePresentation?.collections ?? [],
    productsWithVariants,
    vendor
  );

  console.log('[getCustomerPresentationData] Built collections from presentation:', {
    total: allCollections.length,
    names: allCollections.map(c => c.collectionName),
  });

  // Step 6: If customer has market selection, add any missing collections from their selection
  if (activeMarketSnapshot && workingSelection) {
    // Load collection media for missing collections
    const collectionMediaConfig = loadCollectionMedia(vendor);

    // Find collections that contain items from the working selection but aren't in the presentation
    const presentationCollectionNames = new Set(allCollections.map(c => c.collectionName.toLowerCase()));
    const selectionSkus = new Set(workingSelection.items.map((item: any) => item.sku));

    console.log('[getCustomerPresentationData] Selection SKUs:', Array.from(selectionSkus));

    // Group all catalog products by collection (CASE-INSENSITIVE)
    // Map: lowercase key -> { canonicalName, products }
    const productsByCollectionMap = new Map<string, { canonicalName: string; products: CatalogItem[] }>();
    productsWithVariants.forEach((product) => {
      const collectionName = (product as any).collection || product.collectionName;
      if (!collectionName || collectionName === 'Uncategorized' || collectionName.trim() === '') {
        return;
      }
      const key = collectionName.toLowerCase();
      if (!productsByCollectionMap.has(key)) {
        productsByCollectionMap.set(key, { canonicalName: collectionName, products: [] });
      }
      productsByCollectionMap.get(key)!.products.push(product);
    });

    // Convert to Record for backward compatibility
    const productsByCollection: Record<string, CatalogItem[]> = {};
    productsByCollectionMap.forEach(({ canonicalName, products }) => {
      productsByCollection[canonicalName] = products;
    });

    // Find collections from the selection that aren't in the presentation
    const missingCollections: PresentationCollection[] = [];

    for (const [collectionName, products] of Object.entries(productsByCollection)) {
      // Skip if already in presentation (case-insensitive)
      if (presentationCollectionNames.has(collectionName.toLowerCase())) continue;

      // Check if any product in this collection is in the selection
      const hasSelectedProduct = products.some(product => {
        // Check baseSku first
        const baseSku = (product as any).baseSku || product.sku;
        if (baseSku && selectionSkus.has(baseSku)) return true;

        // Check variant SKUs from groupProductsByVariants (variants array)
        const variants = (product as any).variants;
        if (variants && Array.isArray(variants)) {
          const found = variants.some((variant: any) => selectionSkus.has(variant.sku));
          if (found) return true;
        }

        // Check skuVariants for configurable products
        if (product.isConfigurable && product.skuVariants) {
          return product.skuVariants.some(variant => selectionSkus.has(variant.sku));
        }
        return false;
      });

      if (hasSelectedProduct) {
        console.log('[getCustomerPresentationData] Adding missing collection from selection:', collectionName);
        missingCollections.push({
          collectionName,
          vendor: vendor ?? 'lib-and-co',
          years: [],
          includeAllYears: true,
          products,
          media: collectionMediaConfig[collectionName],
        });
      }
    }

    // Add missing collections to allCollections
    if (missingCollections.length > 0) {
      allCollections = [...allCollections, ...missingCollections];
      console.log('[getCustomerPresentationData] Added missing collections:', {
        count: missingCollections.length,
        names: missingCollections.map(c => c.collectionName),
      });
    }

    // Step 6b: Fetch alignment recommendations and add those collections
    // This ensures recommended collections appear even if not in the default presentation
    try {
      const marketService = new MarketBaselineService();
      const recommendationService = new RecommendationService(marketService);
      const alignmentReport = await recommendationService.generateReport(customerId, vendor || 'lib-and-co');

      const recommendedCollections = alignmentReport.suggestions.add.map(s => s.collectionName);
      const existingCollectionNames = new Set(allCollections.map(c => c.collectionName.toLowerCase()));

      console.log('[getCustomerPresentationData] Alignment recommendations:', recommendedCollections);

      const alignmentCollections: PresentationCollection[] = [];
      for (const collectionName of recommendedCollections) {
        // Skip if already in allCollections (case-insensitive)
        if (existingCollectionNames.has(collectionName.toLowerCase())) continue;

        // Find products for this collection in the catalog
        const products = Object.entries(productsByCollection).find(
          ([name]) => name.toLowerCase() === collectionName.toLowerCase()
        )?.[1] ?? [];

        if (products.length > 0) {
          alignmentCollections.push({
            collectionName,
            vendor: vendor ?? 'lib-and-co',
            years: [],
            includeAllYears: true,
            products,
            media: collectionMediaConfig[collectionName],
          });
        }
      }

      if (alignmentCollections.length > 0) {
        allCollections = [...allCollections, ...alignmentCollections];
        console.log('[getCustomerPresentationData] Added alignment collections:', {
          count: alignmentCollections.length,
          names: alignmentCollections.map(c => c.collectionName),
        });
      }
    } catch (error) {
      console.error('[getCustomerPresentationData] Error fetching alignment recommendations:', error);
      // Continue without alignment recommendations - not a fatal error
    }

    const { selectedCollections, otherCollections } = splitCollectionsBySelection(
      allCollections,
      workingSelection
    );

    console.log('[getCustomerPresentationData] Split collections:', {
      selected: selectedCollections.length,
      other: otherCollections.length,
    });

    // Step 6c: Fetch territory best sellers that customer doesn't have
    const bestSellerCollections: PresentationCollection[] = [];
    const bestSellerRankings: Array<{
      collectionName: string;
      rank: number;
      totalRevenue: number;
      customerCount: number;
    }> = [];

    try {
      const bestSellersReport = await getBestSellersReport(customerId, vendor || 'lib-and-co');
      const existingCollectionNames = new Set(allCollections.map(c => c.collectionName.toLowerCase()));

      console.log('[getCustomerPresentationData] Best sellers report:', {
        recommendedCount: bestSellersReport.recommendedBestSellers.length,
        recommended: bestSellersReport.recommendedBestSellers.slice(0, 5).map(bs => bs.collectionName),
      });

      // Build best seller collections that aren't already in presentation
      for (const bestSeller of bestSellersReport.recommendedBestSellers) {
        // Skip if already in allCollections
        if (existingCollectionNames.has(bestSeller.collectionName.toLowerCase())) continue;

        // Find products for this collection in the catalog
        const products = Object.entries(productsByCollection).find(
          ([name]) => name.toLowerCase() === bestSeller.collectionName.toLowerCase()
        )?.[1] ?? [];

        if (products.length > 0) {
          bestSellerCollections.push({
            collectionName: bestSeller.collectionName,
            vendor: vendor ?? 'lib-and-co',
            years: [],
            includeAllYears: true,
            products,
            media: collectionMediaConfig[bestSeller.collectionName],
          });

          bestSellerRankings.push({
            collectionName: bestSeller.collectionName,
            rank: bestSeller.rank,
            totalRevenue: bestSeller.totalRevenue,
            customerCount: bestSeller.customerCount,
          });
        }
      }

      console.log('[getCustomerPresentationData] Added best seller collections:', {
        count: bestSellerCollections.length,
        names: bestSellerCollections.map(c => c.collectionName),
      });
    } catch (error) {
      console.error('[getCustomerPresentationData] Error fetching best sellers:', error);
      // Continue without best sellers - not a fatal error
    }

    return {
      hasMarketSelection: true,
      workingSelection,
      activeMarketSnapshot,
      selectedCollections,
      otherCollections,
      bestSellerCollections,
      bestSellerRankings,
      allCollections,
    };
  }

  // Step 7: No market selection - return all collections as "other"
  console.log('[getCustomerPresentationData] No market selection, returning default presentation');
  return {
    hasMarketSelection: false,
    workingSelection,
    activeMarketSnapshot: null,
    selectedCollections: [],
    otherCollections: allCollections,
    bestSellerCollections: [],
    bestSellerRankings: [],
    allCollections,
  };
}

/**
 * Build enriched collections from presentation items and catalog
 * Combines promotion config metadata with actual catalog products
 */
async function buildEnrichedCollections(
  presentationItems: any[],
  legacyCollections: any[],
  catalogProducts: CatalogItem[],
  vendor?: string
): Promise<PresentationCollection[]> {
  // Load collection media configuration from file
  const collectionMediaConfig = loadCollectionMedia(vendor);
  console.log('[buildEnrichedCollections] Loaded collection media config for vendor:', vendor, Object.keys(collectionMediaConfig));

  // Group catalog products by collection (CASE-INSENSITIVE)
  // Map: lowercase key -> { canonicalName, products }
  const productsByCollectionMap = new Map<string, { canonicalName: string; products: CatalogItem[] }>();
  catalogProducts.forEach((product) => {
    // Note: groupProductsByVariants returns products with a "collection" field, not "collectionName"
    const collectionName = (product as any).collection || product.collectionName;

    if (!collectionName || collectionName === 'Uncategorized' || collectionName.trim() === '') {
      return;
    }
    const key = collectionName.toLowerCase();
    if (!productsByCollectionMap.has(key)) {
      productsByCollectionMap.set(key, { canonicalName: collectionName, products: [] });
    }
    productsByCollectionMap.get(key)!.products.push(product);
  });

  // Convert to Record for backward compatibility
  const productsByCollection: Record<string, CatalogItem[]> = {};
  productsByCollectionMap.forEach(({ canonicalName, products }) => {
    productsByCollection[canonicalName] = products;
  });

  const collections: PresentationCollection[] = [];

  // Build from presentation items (preferred, has all metadata)
  if (presentationItems && presentationItems.length > 0) {
    for (const item of presentationItems) {
      if (item.type !== 'collection') continue;
      if (!item.collectionData) continue;

      const collectionName = item.collectionData.collectionName;
      // Look up products using case-insensitive match
      const products = Object.entries(productsByCollection).find(
        ([name]) => name.toLowerCase() === collectionName.toLowerCase()
      )?.[1] ?? [];

      // Apply year filter if specified
      const filteredProducts = item.collectionData.includeAllYears
        ? products
        : products.filter(p =>
            item.collectionData.years?.includes(p.year ?? 0)
          );

      // Merge media from collection-media.json with presentation item media
      // collection-media.json takes precedence (most recent user configuration)
      const fileMedia = collectionMediaConfig[collectionName];
      const mergedMedia = fileMedia || item.properties?.media;

      collections.push({
        collectionName,
        vendor: item.collectionData.vendor ?? vendor ?? 'lib-and-co',
        years: item.collectionData.years,
        includeAllYears: item.collectionData.includeAllYears ?? true,
        products: filteredProducts,

        // Metadata from presentation item
        heroVideoUrl: item.collectionData.heroVideoUrl,
        customTitle: item.properties?.customTitle,
        narrativeDescription: item.properties?.narrativeDescription,
        customNotes: item.properties?.customNotes,
        badges: item.properties?.badges,
        skuBadges: item.properties?.skuBadges,
        media: mergedMedia,
        startExpanded: item.properties?.startExpanded,
        showProductCount: item.properties?.showProductCount,
      });
    }
  }
  // Fallback to legacy collections format
  else if (legacyCollections && legacyCollections.length > 0) {
    for (const collection of legacyCollections) {
      const collectionName = collection.collectionName;
      // Look up products using case-insensitive match
      const products = Object.entries(productsByCollection).find(
        ([name]) => name.toLowerCase() === collectionName.toLowerCase()
      )?.[1] ?? [];

      // Apply year filter if specified
      const filteredProducts = collection.includeAllYears
        ? products
        : products.filter(p =>
            collection.years?.includes(p.year ?? 0)
          );

      // Load media from collection-media.json for this collection
      const fileMedia = collectionMediaConfig[collectionName];

      collections.push({
        collectionName,
        vendor: vendor ?? 'lib-and-co',
        years: collection.years,
        includeAllYears: collection.includeAllYears ?? true,
        products: filteredProducts,
        media: fileMedia,
      });
    }
  }

  // Sort collections by order in presentation (maintain order from presentationItems)
  return collections;
}

/**
 * Split collections into "selected" (has items from working selection) and "other" (doesn't)
 *
 * Section 1 "Your Market Selection": Collections that contain at least one item from their working selection
 * Section 2 "Everything Else": Collections that don't have any items from their working selection
 */
function splitCollectionsBySelection(
  allCollections: PresentationCollection[],
  workingSelection: any
): {
  selectedCollections: PresentationCollection[];
  otherCollections: PresentationCollection[];
} {
  // Build a Set of SKUs in the working selection for fast lookup
  const selectedSkus = new Set(
    workingSelection.items.map((item: any) => item.sku)
  );

  console.log('[splitCollectionsBySelection] Selection has', selectedSkus.size, 'SKUs:', Array.from(selectedSkus));

  const selectedCollections: PresentationCollection[] = [];
  const otherCollections: PresentationCollection[] = [];

  for (const collection of allCollections) {
    // Check if ANY product in this collection is in the working selection
    const hasSelectedProducts = collection.products.some(product => {
      // Products from groupProductsByVariants have baseSku instead of sku
      const baseSku = (product as any).baseSku || product.sku;

      // Check baseSku first
      if (baseSku && selectedSkus.has(baseSku)) {
        return true;
      }

      // Check variant SKUs from groupProductsByVariants (variants array)
      // These contain the full SKU like "12121-02" that matches selection items
      const variants = (product as any).variants;
      if (variants && Array.isArray(variants)) {
        const found = variants.some((variant: any) => selectedSkus.has(variant.sku));
        if (found) {
          console.log('[splitCollectionsBySelection] Found match via variant SKU in collection:', collection.collectionName);
          return true;
        }
      }

      // Check skuVariants for configurable products (Hubbardton Forge)
      if (product.isConfigurable && product.skuVariants) {
        return product.skuVariants.some(variant => selectedSkus.has(variant.sku));
      }

      return false;
    });

    if (hasSelectedProducts) {
      selectedCollections.push(collection);
    } else {
      otherCollections.push(collection);
    }
  }

  console.log('[splitCollectionsBySelection] Result:', {
    selected: selectedCollections.length,
    selectedNames: selectedCollections.map(c => c.collectionName),
    other: otherCollections.length,
  });

  return { selectedCollections, otherCollections };
}
