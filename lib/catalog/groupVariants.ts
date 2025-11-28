/**
 * Product Variant Grouping System
 *
 * Groups products by their base SKU and classifies them into:
 * - Simple variants: BASE-FINISH (e.g., 12121-02)
 * - Matrix variants: BASE-OPTION1-OPTION2 (e.g., 12166-017-01)
 * - No variants: Single product
 */

export interface OptionValue {
  code: string;           // "017", "01", "02"
  label: string;          // "Clear", "Chrome", "Matte Black"
  abbreviation: string;   // "CL", "CR", "MB"
}

export interface OptionDimension {
  name: string;           // "Glass Type", "Canopy Finish", "Finish"
  options: OptionValue[];
}

export interface ProductVariant {
  sku: string;
  fullProductName: string;
  price: number;
  imageUrl: string;
  options: Record<string, string>; // { "Glass Type": "Clear", "Canopy Finish": "Chrome" }
}

export interface ProductWithVariants {
  baseSku: string;
  baseProductName: string;     // Name without finish/options
  collection: string;
  year?: number;               // Product year for filtering
  variantType: 'simple' | 'matrix' | 'none';
  dimensions: OptionDimension[];
  variants: ProductVariant[];
  defaultVariant: ProductVariant;

  // Configurable products (Hubbardton Forge multi-option)
  isConfigurable?: boolean;
  catalogItem?: any; // Full CatalogItem with configuratorOptions, skuVariants, etc.
}

/**
 * Main grouping function - groups products by base SKU and extracts variants
 */
export function groupProductsByVariants(
  products: Array<{
    sku: string;
    name: string;
    list: number;
    image?: string | null;
    collectionName?: string;
    year?: number;
    baseItemCode?: string; // For Hubbardton Forge variants
    finish?: string;
    isConfigurable?: boolean; // For Hubbardton Forge multi-option configurables
    configuratorOptions?: any[];
    skuVariants?: any[];
    shadeInfo?: string;
  }>
): ProductWithVariants[] {
  // Handle configurable products (Hubbardton Forge multi-option)
  // These bypass normal grouping and get converted directly
  const configurableProducts = products.filter((p) => p.isConfigurable);
  const regularProducts = products.filter((p) => !p.isConfigurable);

  const configurableResult: ProductWithVariants[] = configurableProducts.map((product) => ({
    baseSku: product.sku,
    baseProductName: product.name,
    collection: product.collectionName || 'Uncategorized',
    year: product.year,
    variantType: 'none' as const,
    dimensions: [],
    variants: [
      {
        sku: product.sku,
        fullProductName: product.name,
        price: product.list,
        imageUrl: product.image || `https://libandco.com/cdn/shop/files/${product.sku}.jpg?v=1`,
        options: {},
      },
    ],
    defaultVariant: {
      sku: product.sku,
      fullProductName: product.name,
      price: product.list,
      imageUrl: product.image || `https://libandco.com/cdn/shop/files/${product.sku}.jpg?v=1`,
      options: {},
    },
    isConfigurable: true,
    catalogItem: product, // Store full product with configuratorOptions, skuVariants, etc.
  }));

  // Group by base SKU first for regular products
  const baseGroups = new Map<string, typeof regularProducts>();

  regularProducts.forEach((product) => {
    // For Hubbardton products with baseItemCode, use that for grouping
    const baseSku = product.baseItemCode || extractBaseSku(product.sku);
    const baseProductConfig = extractBaseProductConfig(product.name);
    const groupKey = `${baseSku}|${baseProductConfig}`;

    if (!baseGroups.has(groupKey)) {
      baseGroups.set(groupKey, []);
    }
    baseGroups.get(groupKey)!.push(product);
  });

  // Process each group
  const result: ProductWithVariants[] = [];

  baseGroups.forEach((products, groupKey) => {
    const variantType = detectVariantType(products.map((p) => p.sku));
    const dimensions = extractDimensions(products, variantType);
    const baseProductName = extractBaseProductName(products[0].name, variantType);
    // Use collectionName field if available, otherwise fall back to parsing product name
    const collection = products[0].collectionName || products[0].name.split(',')[0]?.trim() || 'Uncategorized';
    const baseSku = groupKey.split('|')[0];

    const variants: ProductVariant[] = products.map((product) => ({
      sku: product.sku,
      fullProductName: product.name,
      price: product.list,
      imageUrl: product.image || `https://libandco.com/cdn/shop/files/${product.sku}.jpg?v=1`,
      options: extractOptions(product.sku, product.name, dimensions, variantType),
    }));

    // Select a random variant as default for visual variety
    const randomIndex = Math.floor(Math.random() * variants.length);

    result.push({
      baseSku,
      baseProductName,
      collection,
      year: products[0].year,
      variantType,
      dimensions,
      variants,
      defaultVariant: variants[randomIndex],
    });
  });

  // Combine configurable products with grouped regular products
  return [...configurableResult, ...result];
}

/**
 * Extract base SKU
 * - Lib & Co format: BASE-FINISH (e.g., "12121-02") → extract "12121"
 * - Savoy House format: X-XXXX-X-XX (e.g., "7-6381-5-60") → extract "7-6381"
 */
function extractBaseSku(sku: string): string {
  const parts = sku.split('-');

  // If no dashes, return as-is
  if (parts.length === 1) return sku;

  // Detect format based on first part length
  // Lib & Co base SKUs are typically 4-5 digits (e.g., "12121")
  // Savoy base SKUs start with 1 digit (e.g., "7-6381")
  const firstPart = parts[0];

  if (firstPart.length >= 4) {
    // Lib & Co format: return first part
    return firstPart;
  } else {
    // Savoy House format: return first two parts
    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : sku;
  }
}

/**
 * Extract base product configuration (size, light count, etc.)
 * Used to distinguish "1 Light" from "3 Light" when grouping
 */
function extractBaseProductConfig(name: string): string {
  // Extract the configuration part (e.g., "1 Light LED Pendant")
  const parts = name.split(',').map((s) => s.trim());
  if (parts.length >= 2) {
    let config = parts[1]; // Second part is usually the config

    // Normalize "32 Light Round LED Chandelier" to "32 Light LED Grand Chandelier"
    // so they group together (Round variant has Copper glass, Grand has other glass types)
    if (config === '32 Light Round LED Chandelier') {
      config = '32 Light LED Grand Chandelier';
    }

    return config;
  }
  return '';
}

/**
 * Detect variant type based on SKU patterns
 */
function detectVariantType(skus: string[]): 'simple' | 'matrix' | 'none' {
  if (skus.length === 1) return 'none';

  const dashCounts = skus.map((sku) => (sku.match(/-/g) || []).length);
  const maxDashes = Math.max(...dashCounts);

  if (maxDashes >= 2) return 'matrix';
  if (maxDashes === 1) return 'simple';
  return 'none';
}

/**
 * Extract option dimensions (Finish, Glass Type, Canopy Finish, etc.)
 */
function extractDimensions(
  products: Array<{ sku: string; name: string }>,
  variantType: 'simple' | 'matrix' | 'none'
): OptionDimension[] {
  if (variantType === 'none') return [];

  if (variantType === 'simple') {
    // Extract finish from name (last part after comma)
    const finishes = new Map<string, string>();

    products.forEach((product) => {
      const finishCode = product.sku.split('-').pop() || '';
      const finishLabel = extractFinishFromName(product.name);
      finishes.set(finishCode, finishLabel);
    });

    return [
      {
        name: 'Finish',
        options: Array.from(finishes.entries()).map(([code, label]) => ({
          code,
          label,
          abbreviation: getFinishAbbreviation(label),
        })),
      },
    ];
  }

  if (variantType === 'matrix') {
    // Extract glass type and canopy finish from name
    // "Sorrento, 1 Light LED Pendant, Clear, Chrome Canopy"
    // Glass = 3rd part (index 2), Canopy = 4th part (index 3)

    const glassTypes = new Map<string, string>();
    const canopyFinishes = new Map<string, string>();

    products.forEach((product) => {
      const skuParts = product.sku.split('-');
      const glassCode = skuParts[1] || '';
      const canopyCode = skuParts[2] || '';

      const nameParts = product.name.split(',').map((s) => s.trim());
      const glassLabel = nameParts[2] || '';
      const canopyLabel = nameParts[3]?.replace(' Canopy', '').replace(' canopy', '') || '';

      glassTypes.set(glassCode, glassLabel);
      canopyFinishes.set(canopyCode, canopyLabel);
    });

    return [
      {
        name: 'Glass Type',
        options: Array.from(glassTypes.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([code, label]) => ({
            code,
            label,
            abbreviation: getGlassAbbreviation(label),
          })),
      },
      {
        name: 'Canopy Finish',
        options: Array.from(canopyFinishes.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([code, label]) => ({
            code,
            label,
            abbreviation: getFinishAbbreviation(label),
          })),
      },
    ];
  }

  return [];
}

/**
 * Extract base product name (without finish/options)
 */
function extractBaseProductName(
  fullName: string,
  variantType: 'simple' | 'matrix' | 'none'
): string {
  const parts = fullName.split(',').map((s) => s.trim());

  if (variantType === 'none') {
    return fullName;
  }

  if (variantType === 'simple') {
    // "Calcolo, 9 Light Round LED Chandelier, Matte Black"
    // Return: "Calcolo, 9 Light Round LED Chandelier"
    return parts.slice(0, -1).join(', ');
  }

  if (variantType === 'matrix') {
    // "Sorrento, 1 Light LED Pendant, Clear, Chrome Canopy"
    // Return: "Sorrento, 1 Light LED Pendant"
    return parts.slice(0, 2).join(', ');
  }

  return fullName;
}

/**
 * Extract finish from product name (last part after comma)
 */
function extractFinishFromName(name: string): string {
  const parts = name.split(',').map((s) => s.trim());
  return parts[parts.length - 1] || 'Standard';
}

/**
 * Extract option values for a specific product
 */
function extractOptions(
  sku: string,
  name: string,
  dimensions: OptionDimension[],
  variantType: 'simple' | 'matrix' | 'none'
): Record<string, string> {
  const options: Record<string, string> = {};
  const nameParts = name.split(',').map((s) => s.trim());

  if (variantType === 'simple') {
    options['Finish'] = nameParts[nameParts.length - 1];
  } else if (variantType === 'matrix') {
    // Glass Type is 3rd part, Canopy Finish is 4th part
    if (nameParts[2]) {
      options['Glass Type'] = nameParts[2];
    }
    if (nameParts[3]) {
      options['Canopy Finish'] = nameParts[3].replace(' Canopy', '').replace(' canopy', '');
    }
  }

  return options;
}

/**
 * Get abbreviation for glass types
 */
function getGlassAbbreviation(glass: string): string {
  const abbreviations: Record<string, string> = {
    Clear: 'CL',
    Amber: 'AM',
    Smoke: 'SM',
    Copper: 'CO',
    Mixed: 'MX',
    'Mixed with Copper Leaf': 'ML',
  };
  return abbreviations[glass] || glass.substring(0, 2).toUpperCase();
}

/**
 * Get abbreviation for finishes
 */
function getFinishAbbreviation(finish: string): string {
  const abbreviations: Record<string, string> = {
    'Matte Black': 'MB',
    'Matte black': 'MB',
    Black: 'BK',
    'Painted Antique Brass': 'AB',
    'Antique Brass': 'AB',
    'Painted Brushed Brass': 'BB',
    'Brushed Brass': 'BB',
    Chrome: 'CR',
    'Polished Chrome': 'CR',
    Bronze: 'BZ',
    'Oil Rubbed Bronze': 'ORB',
    'Brushed Nickel': 'BN',
    'Polished Nickel': 'PN',
    Silver: 'SV',
    Gold: 'GD',
    White: 'WH',
  };
  return abbreviations[finish] || finish.substring(0, 2).toUpperCase();
}
