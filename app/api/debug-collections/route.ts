import { NextRequest, NextResponse } from 'next/server';
import { loadCatalog } from '@/lib/catalog/loadCatalog';
import { groupProductsByVariants } from '@/lib/catalog/groupVariants';
import { getPromotionConfig } from '@/lib/selections/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get('vendor') || undefined;

  try {
    // Load promotion config
    const promotionConfig = await getPromotionConfig(undefined, vendor);

    // Load catalog
    const catalog = await loadCatalog(vendor);
    const abbottInCatalog = catalog.filter(p => p.collectionName === 'Abbott');

    // Group by variants
    const productsWithVariants = groupProductsByVariants(catalog);
    const abbottInVariants = productsWithVariants.filter(p => p.collection === 'Abbott');

    // Group by collection
    const groupedByCollection: Record<string, typeof productsWithVariants> = {};
    productsWithVariants.forEach((product) => {
      const collectionName = product.collection;
      if (!collectionName || collectionName === 'Uncategorized' || collectionName.trim() === '') {
        return;
      }
      if (!groupedByCollection[collectionName]) {
        groupedByCollection[collectionName] = [];
      }
      groupedByCollection[collectionName].push(product);
    });

    // Filter collections based on promotion config
    let filteredCollections: Array<[string, typeof productsWithVariants]> = [];

    if (promotionConfig?.collections && promotionConfig.collections.length > 0) {
      const selectedCollectionsMap = new Map(
        promotionConfig.collections.map((c) => [c.collectionName, c])
      );

      filteredCollections = Object.entries(groupedByCollection)
        .filter(([collectionName]) => selectedCollectionsMap.has(collectionName))
        .map(([collectionName, products]) => {
          const config = selectedCollectionsMap.get(collectionName);

          if (config?.includeAllYears || !config?.years || config.years.length === 0) {
            return [collectionName, products] as const;
          }

          const filteredProducts = products.filter((product) => {
            return product.year && config.years?.includes(product.year);
          });

          return [collectionName, filteredProducts] as const;
        })
        .filter(([, products]) => products.length > 0);
    }

    return NextResponse.json({
      vendor,
      promotionConfig: {
        exists: !!promotionConfig,
        vendor: promotionConfig?.vendor,
        collectionsCount: promotionConfig?.collections?.length || 0,
        collections: promotionConfig?.collections?.map(c => c.collectionName) || []
      },
      catalog: {
        totalItems: catalog.length,
        sampleItem: catalog[0],
        abbottCount: abbottInCatalog.length,
        abbottSample: abbottInCatalog[0]
      },
      variantsStep: {
        abbottCount: abbottInVariants.length,
        abbottSample: abbottInVariants[0],
        allCollections: [...new Set(productsWithVariants.map(p => p.collection))].sort(),
        totalVariantGroups: productsWithVariants.length
      },
      groupedByCollection: {
        totalCollections: Object.keys(groupedByCollection).length,
        collectionNames: Object.keys(groupedByCollection).sort(),
        hasAbbott: 'Abbott' in groupedByCollection
      },
      filteredCollections: {
        count: filteredCollections.length,
        collectionNames: filteredCollections.map(([name]) => name),
        details: filteredCollections.map(([name, products]) => ({
          name,
          productCount: products.length
        }))
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
