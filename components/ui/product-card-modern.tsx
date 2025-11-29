'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge-modern';
import { Button } from '@/components/ui/button-modern';
import { ProductWithVariants } from '@/lib/catalog/groupVariants';
import { Badge as BadgeType } from '@/lib/selections/types';
import { ConfiguratorSheet } from '@/components/product/configurator-sheet';
import { FinishSwatch } from '@/components/product/finish-swatch';

export interface ProductCardProps {
  productWithVariants: ProductWithVariants;
  index?: number;
  onAddToSelection?: (sku: string, configuration?: { baseItemCode: string; variantSku: string; options: Record<string, string>; productName: string; oldSkuToReplace?: string }) => void;
  onRemoveFromSelection?: (sku: string) => void;
  productBadges?: BadgeType[];
  selectedSkus?: Set<string>;
  marketSnapshotSkus?: Set<string>;
  marketSnapshotItems?: Array<{ sku: string; name?: string }>; // Full items for finding original finish
  selectionItems?: Array<{
    sku: string;
    configuration?: {
      baseItemCode: string;
      variantSku?: string;
      options: Record<string, string>;
      productName: string;
    };
  }>; // Selection items with configuration for showing finish thumbnails
}

export function ProductCard({
  productWithVariants,
  index = 0,
  onAddToSelection,
  onRemoveFromSelection,
  productBadges = [],
  selectedSkus,
  marketSnapshotSkus,
  marketSnapshotItems = [],
  selectionItems = [],
}: ProductCardProps) {
  // State for selected options (initialized with default variant's options)
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string>>(() => {
    return productWithVariants.defaultVariant.options;
  });

  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [hoveredOption, setHoveredOption] = React.useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);
  const [preloadedImages] = React.useState(() => new Set<string>());
  const [configuratorOpen, setConfiguratorOpen] = React.useState(false);
  const [configuratorImageUrl, setConfiguratorImageUrl] = React.useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = React.useState(false);
  const [ignoreHover, setIgnoreHover] = React.useState(false);
  const [isInitialMount, setIsInitialMount] = React.useState(true);
  const [hoveredSlice, setHoveredSlice] = React.useState<number | null>(null);
  // Scrubber position for diagonal split (0-100 percentage)
  const [scrubberPosition, setScrubberPosition] = React.useState(50);
  const splitContainerRef = React.useRef<HTMLDivElement>(null);

  // Find the selected variant based on current option selections
  const selectedVariant = React.useMemo(() => {
    const found = productWithVariants.variants.find((variant) => {
      return Object.entries(selectedOptions).every(([dimension, value]) => {
        return variant.options[dimension] === value;
      });
    });
    return found || productWithVariants.defaultVariant;
  }, [selectedOptions, productWithVariants]);

  // Check if the currently selected variant is in the working selection
  // For configurable products, check if ANY variant or the baseSku is in selection
  const isInSelection = React.useMemo(() => {
    if (!selectedSkus) return false;

    // For non-configurable products, just check the selected variant
    if (!productWithVariants.isConfigurable) {
      return selectedSkus.has(selectedVariant.sku);
    }

    // For configurable products, check if baseSku or any variant SKU is in selection
    if (selectedSkus.has(productWithVariants.baseSku)) return true;

    // Check all variants
    if (productWithVariants.variants.some(variant => selectedSkus.has(variant.sku))) {
      return true;
    }

    // For configurable products (like Hubbardton Forge), also check if any selected SKU
    // starts with the baseSku (e.g., "271202-SKT-07-44-SF2023" starts with "271202")
    // This catches dynamically generated variant SKUs
    const baseSkuPrefix = productWithVariants.baseSku + '-';
    for (const sku of Array.from(selectedSkus)) {
      if (sku.startsWith(baseSkuPrefix)) {
        return true;
      }
    }

    return false;
  }, [selectedSkus, selectedVariant.sku, productWithVariants]);

  // Check if the EXACT current configuration is in selection (for 3-state button)
  const isExactConfigInSelection = React.useMemo(() => {
    if (!selectedSkus) return false;
    // Check if the currently displayed variant's SKU is in selection
    return selectedSkus.has(selectedVariant.sku);
  }, [selectedSkus, selectedVariant.sku]);

  // Check if ANY variant of this product was in the original market snapshot (a "Market Pick")
  // This makes the aura appear for the entire product line, not just specific SKU
  const isProductMarketPick = React.useMemo(() => {
    if (!marketSnapshotSkus || marketSnapshotSkus.size === 0) return false;

    // Check if baseSku matches any market pick
    if (marketSnapshotSkus.has(productWithVariants.baseSku)) return true;

    // Check if any variant SKU is in the market snapshot
    return productWithVariants.variants.some(variant => marketSnapshotSkus.has(variant.sku));
  }, [marketSnapshotSkus, productWithVariants]);

  // Check if the EXACT current variant was the market pick
  const isExactMarketPick = React.useMemo(() => {
    return marketSnapshotSkus ? marketSnapshotSkus.has(selectedVariant.sku) : false;
  }, [marketSnapshotSkus, selectedVariant.sku]);

  // Find the original market pick variant for this product (to show the finish)
  const originalMarketPickInfo = React.useMemo(() => {
    if (!isProductMarketPick || !marketSnapshotItems.length) return null;

    // Find which variant of this product was in the market snapshot
    for (const item of marketSnapshotItems) {
      // Check if this item's SKU matches the baseSku or any variant
      if (item.sku === productWithVariants.baseSku) {
        return { sku: item.sku, name: item.name };
      }
      // Check variants
      const matchingVariant = productWithVariants.variants.find(v => v.sku === item.sku);
      if (matchingVariant) {
        // Extract finish from the variant's options or full product name
        const finishOption = matchingVariant.options?.['Finish'] || matchingVariant.options?.['Color'];
        return {
          sku: item.sku,
          name: item.name,
          finish: finishOption || (item.name?.split(',').pop()?.trim()) // Try to get finish from name
        };
      }
    }
    return null;
  }, [isProductMarketPick, marketSnapshotItems, productWithVariants]);

  // Determine if we should show the "Original Market Finish" reminder
  // Only show when viewing a different configuration than the market pick
  const showOriginalFinishReminder = isProductMarketPick && !isExactMarketPick && originalMarketPickInfo?.finish;

  // Build the card stack: all selected variants of this product, ordered with current variant first
  // This enables the "stacked deck" visual where clicking background cards shuffles them to front
  const cardStack = React.useMemo(() => {
    if (!selectionItems.length) return [];

    // Find all selection items that belong to this product family
    const allVariantsInSelection = selectionItems.filter(item => {
      // Match by baseSku or prefix match
      if (item.sku === productWithVariants.baseSku) return true;
      if (item.sku.startsWith(productWithVariants.baseSku + '-')) return true;
      if (item.configuration?.baseItemCode === productWithVariants.baseSku) return true;
      // Check if SKU matches any variant of this product
      return productWithVariants.variants.some(v => v.sku === item.sku);
    });

    if (allVariantsInSelection.length === 0) return [];

    // Build card details for each variant
    const cards = allVariantsInSelection.map(item => {
      const variant = productWithVariants.variants.find(v => v.sku === item.sku);
      const isMarketPick = marketSnapshotSkus?.has(item.sku) || false;
      const isFront = item.sku === selectedVariant.sku;

      return {
        sku: item.sku,
        imageUrl: variant?.imageUrl || null,
        options: variant?.options || item.configuration?.options || {},
        isMarketPick,
        isFront,
      };
    });

    // Sort so the current variant is first (will be rendered last = on top)
    // Other cards follow in their original order
    const frontCard = cards.find(c => c.isFront);
    const backCards = cards.filter(c => !c.isFront).slice(0, 2); // Max 2 background cards

    if (frontCard) {
      return [...backCards.reverse(), frontCard]; // Render order: back to front
    }
    return cards.slice(0, 3);
  }, [selectionItems, selectedVariant.sku, productWithVariants, marketSnapshotSkus]);

  // For backward compatibility, also provide stackedVariants (cards behind the front)
  const stackedVariants = React.useMemo(() => {
    return cardStack.filter(card => !card.isFront);
  }, [cardStack]);

  // Find configured finish options and the actual SKU for this product from the working selection
  const { selectedConfiguration, existingSelectionSku } = React.useMemo(() => {
    if (!selectionItems.length) return { selectedConfiguration: null, existingSelectionSku: null };

    // Find selection item for this product
    for (const item of selectionItems) {
      // Check if item's configuration baseItemCode matches this product's baseSku
      if (item.configuration?.baseItemCode === productWithVariants.baseSku) {
        return { selectedConfiguration: item.configuration, existingSelectionSku: item.sku };
      }
      // Check if item SKU starts with base SKU (e.g., 271202-SKT-07-44-SF2023 starts with 271202)
      if (item.sku.startsWith(productWithVariants.baseSku + '-') && item.configuration) {
        return { selectedConfiguration: item.configuration, existingSelectionSku: item.sku };
      }
      // Check if this item's SKU matches the baseSku exactly
      if (item.sku === productWithVariants.baseSku && item.configuration) {
        return { selectedConfiguration: item.configuration, existingSelectionSku: item.sku };
      }
      // Check if it matches any variant SKU
      const matchingVariant = productWithVariants.variants.find(v => v.sku === item.sku);
      if (matchingVariant && item.configuration) {
        return { selectedConfiguration: item.configuration, existingSelectionSku: item.sku };
      }
    }
    return { selectedConfiguration: null, existingSelectionSku: null };
  }, [selectionItems, productWithVariants]);

  // Track previous variant SKU to detect changes
  const prevSkuRef = React.useRef(selectedVariant.sku);
  // Track ref to the actual img element for checking complete status
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Reset image loading state when variant changes (but not on initial mount)
  React.useEffect(() => {
    // On initial mount, check if image is already cached and set states accordingly
    if (isInitialMount) {
      // Use requestAnimationFrame to wait for the img element to be in DOM
      // and check if browser has already loaded it from cache
      requestAnimationFrame(() => {
        if (imgRef.current?.complete && imgRef.current?.naturalHeight > 0) {
          // Image already loaded from cache
          setImageLoaded(true);
        }
        // Only set isInitialMount to false AFTER we've set imageLoaded
        // This prevents the flash where both are false
        setIsInitialMount(false);
      });
      return;
    }

    // Only reset if the SKU actually changed (not on initial mount)
    if (prevSkuRef.current !== selectedVariant.sku) {
      console.log(`[ProductCard] Variant changed from ${prevSkuRef.current} to ${selectedVariant.sku}`);
      prevSkuRef.current = selectedVariant.sku;

      // If image is already preloaded, mark as loaded immediately
      if (selectedVariant.imageUrl && preloadedImages.has(selectedVariant.imageUrl)) {
        setImageLoaded(true);
        setImageError(false);
      } else {
        setImageLoaded(false);
        setImageError(false);
      }
    }
  }, [selectedVariant.sku, selectedVariant.imageUrl, preloadedImages, isInitialMount]);

  // Preload all variant images on mount
  React.useEffect(() => {
    const preloadImage = (url: string) => {
      if (!url || preloadedImages.has(url)) return;

      const img = new Image();
      img.src = url;
      // Set crossOrigin to allow loading from external sources
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        preloadedImages.add(url);
      };
      img.onerror = () => {
        console.warn(`[ProductCard] Failed to preload image: ${url}`);
      };
    };

    // Preload all variant images in the background
    productWithVariants.variants.forEach((variant) => {
      if (variant.imageUrl) {
        preloadImage(variant.imageUrl);
      }
    });
  }, [productWithVariants.variants, preloadedImages]);

  const handleOptionChange = (dimensionName: string, optionLabel: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [dimensionName]: optionLabel,
    }));
  };

  // Get preview image URL for a hovered option (without changing selection)
  const getPreviewImageUrl = (dimensionName: string, optionLabel: string): string | null => {
    // Create a hypothetical options object with the hovered value
    const previewOptions = {
      ...selectedOptions,
      [dimensionName]: optionLabel,
    };

    // Find the variant that matches these options
    const previewVariant = productWithVariants.variants.find((variant) => {
      return Object.entries(previewOptions).every(([dim, value]) => {
        return variant.options[dim] === value;
      });
    });

    return previewVariant?.imageUrl || null;
  };

  const handleOptionHover = (dimensionName: string, optionLabel: string) => {
    setHoveredOption(`${dimensionName}:${optionLabel}`);
    // Set preview if different from selection, clear if same (to show selected variant)
    if (selectedOptions[dimensionName] !== optionLabel) {
      const previewUrl = getPreviewImageUrl(dimensionName, optionLabel);
      setPreviewImageUrl(previewUrl);
    } else {
      // Hovering over the selected option - clear preview to show selected variant image
      setPreviewImageUrl(null);
    }
  };

  const handleOptionLeave = () => {
    setHoveredOption(null);
    setPreviewImageUrl(null);
  };

  // Swap to a stacked variant (when clicking a background card)
  const handleStackedCardClick = (stackedVariant: { sku: string; options: Record<string, string> }) => {
    // Update selected options to match the clicked variant
    setSelectedOptions(stackedVariant.options);
  };

  const handleAddToSelection = () => {
    console.log('[ProductCard] handleAddToSelection called, isConfigurable:', productWithVariants.isConfigurable, 'onAddToSelection defined:', !!onAddToSelection, 'sku:', selectedVariant.sku);
    if (productWithVariants.isConfigurable) {
      // Open configurator dialog for multi-option products
      setConfiguratorOpen(true);
    } else if (onAddToSelection) {
      console.log('[ProductCard] Calling onAddToSelection with SKU:', selectedVariant.sku);
      onAddToSelection(selectedVariant.sku);
    } else {
      console.warn('[ProductCard] onAddToSelection is not defined! Cannot add item.');
    }
  };

  const handleRemoveFromSelection = () => {
    console.log('[ProductCard] handleRemoveFromSelection called for SKU:', selectedVariant.sku);
    if (onRemoveFromSelection) {
      onRemoveFromSelection(selectedVariant.sku);
    } else {
      console.warn('[ProductCard] onRemoveFromSelection callback is not provided!');
    }
  };

  const handleButtonClick = () => {
    console.log('[ProductCard] Button clicked - isInSelection:', isInSelection, 'isExactConfigInSelection:', isExactConfigInSelection, 'isConfigurable:', productWithVariants.isConfigurable);

    // For non-configurable products: toggle based on exact match
    if (!productWithVariants.isConfigurable && isExactConfigInSelection) {
      // Exact match - remove this specific config
      handleRemoveFromSelection();
    } else {
      // New config or not in selection - add
      handleAddToSelection();
    }
    // Reset hover state
    setIsButtonHovered(false);
    setIgnoreHover(true);
  };

  const handleConfigurationComplete = (configuration: { baseItemCode: string; variantSku: string; options: Record<string, string>; productName: string; oldSkuToReplace?: string }) => {
    if (onAddToSelection) {
      // Pass the full variant SKU (e.g., 241202-LED-07-07) and configuration metadata
      // If reconfiguring, oldSkuToReplace will be set to replace the existing item
      onAddToSelection(configuration.variantSku, configuration);
    }
    setConfiguratorOpen(false);
  };

  // Parse product title into hierarchy
  // Expected format: "Catania, 18 Light Round LED Chandelier, Chrome"
  const parseProductTitle = (title: string) => {
    const parts = title.split(',').map((part) => part.trim());

    if (parts.length >= 3) {
      return {
        primary: parts[0], // Collection name (e.g., "Catania")
        secondary: parts.slice(1, -1).join(', '), // Description (e.g., "18 Light Round LED Chandelier")
        tertiary: parts[parts.length - 1], // Finish (e.g., "Chrome")
      };
    } else if (parts.length === 2) {
      return {
        primary: parts[0],
        secondary: parts[1],
        tertiary: null,
      };
    } else {
      return {
        primary: title,
        secondary: null,
        tertiary: null,
      };
    }
  };

  const titleParts = parseProductTitle(productWithVariants.baseProductName);

  // Get current configuration name for button text
  const currentConfigName = React.useMemo(() => {
    // For products with variant dimensions, show the selected option values
    if (productWithVariants.dimensions.length > 0) {
      const optionValues = productWithVariants.dimensions
        .map(dim => selectedOptions[dim.name])
        .filter(Boolean);
      if (optionValues.length > 0) {
        return optionValues.join(' / ');
      }
    }
    // Fallback to finish from title parts
    return titleParts.tertiary || '';
  }, [selectedOptions, productWithVariants.dimensions, titleParts.tertiary]);

  // Generate initials for fallback image
  const initials = productWithVariants.baseSku
    .split('-')
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  // Helper to proxy external images through our API to avoid CORS issues
  const getProxiedImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // Check if it's a Hubbardton Forge CDN image
    if (url.includes('hubbardtonforge.com')) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }

    // Return original URL for other sources
    return url;
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white dark:bg-neutral-900 transition-all shadow-lg hover:shadow-xl",
        isProductMarketPick
          ? "border-amber-500/60 ring-2 ring-amber-500/30 shadow-amber-500/20"
          : "border-neutral-200 dark:border-neutral-700"
      )}
    >

      {/* Image Section */}
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {/* Vertical Split - static centered vertical line showing two variants */}
        {cardStack.length > 1 && cardStack.length <= 2 && (
          <div className="absolute inset-0 z-[5]">
            {/* Left Slice (Variant A) */}
            {cardStack[0] && (
              <button
                onClick={() => handleStackedCardClick(cardStack[0])}
                className="absolute inset-0 cursor-pointer"
                style={{
                  // Left slice: straight vertical at 50%
                  clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
                }}
                title={`Select ${Object.values(cardStack[0].options).join(' / ')}`}
              >
                {cardStack[0].imageUrl ? (
                  <img
                    src={getProxiedImageUrl(cardStack[0].imageUrl) || ''}
                    alt={`Variant: ${cardStack[0].sku}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-neutral-100 dark:bg-neutral-700" />
                )}
              </button>
            )}

            {/* Right Slice (Variant B) */}
            {cardStack[1] && (
              <button
                onClick={() => handleStackedCardClick(cardStack[1])}
                className="absolute inset-0 cursor-pointer"
                style={{
                  // Right slice: straight vertical at 50%
                  clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
                }}
                title={`Select ${Object.values(cardStack[1].options).join(' / ')}`}
              >
                {cardStack[1].imageUrl ? (
                  <img
                    src={getProxiedImageUrl(cardStack[1].imageUrl) || ''}
                    alt={`Variant: ${cardStack[1].sku}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-neutral-100 dark:bg-neutral-700" />
                )}
              </button>
            )}

            {/* Center Coin - shows count */}
            <div
              className="absolute z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-bold shadow-lg border border-neutral-200 dark:border-neutral-600"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {cardStack.length}
            </div>
          </div>
        )}

        {/* "In Selection" Badge - shows when any variant of this product is in selection */}
        {isInSelection && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 dark:bg-neutral-800/90 text-emerald-700 dark:text-emerald-400 shadow-sm backdrop-blur-sm text-xs font-medium">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            In Selection
          </div>
        )}

        {/* "Market Pick" Coin Badge - shows if this product was selected at market */}
        {isProductMarketPick && (
          <div className="absolute top-3 right-3 z-20 group/market">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/90 dark:bg-amber-600/90 text-white shadow-md backdrop-blur-sm cursor-help">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            {/* Tooltip on hover */}
            <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-neutral-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/market:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg">
              Market Pick{originalMarketPickInfo?.finish ? `: ${originalMarketPickInfo.finish}` : ''}
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedVariant.sku}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {(previewImageUrl || configuratorImageUrl || selectedVariant.imageUrl) && !imageError ? (
              <>
                <img
                  ref={imgRef}
                  src={getProxiedImageUrl(previewImageUrl || configuratorImageUrl || selectedVariant.imageUrl) || ''}
                  alt={selectedVariant.fullProductName}
                  onLoad={() => {
                    setImageLoaded(true);
                  }}
                  onError={(e) => {
                    console.error(`[ProductCard] Image failed to load: ${previewImageUrl || configuratorImageUrl || selectedVariant.imageUrl}`, e);
                    setImageError(true);
                  }}
                  className={cn(
                    'h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
                    // On initial mount, show the image immediately (no fade-in)
                    // On variant change, use fade-in transition
                    isInitialMount || imageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {!isInitialMount && !imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                <span className="text-4xl font-bold text-neutral-400">{initials}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Content Section */}
      <div className="relative z-10 flex flex-1 flex-col gap-3 p-5">
        {/* Product Title Hierarchy */}
        <div className="space-y-1">
          {/* Primary Title (Collection Name) */}
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {titleParts.primary}
          </h3>

          {/* Secondary Description */}
          {titleParts.secondary && (
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {titleParts.secondary}
            </p>
          )}

          {/* Tertiary Info (Finish) */}
          {titleParts.tertiary && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-medium">Finish:</span> {titleParts.tertiary}
            </p>
          )}
        </div>

        {/* Product Badges */}
        {productBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {productBadges.map((badge) => (
              <span
                key={badge.id}
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-transparent border border-neutral-500 text-neutral-500"
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Base SKU - Always show */}
        <p className="text-xs text-neutral-400 font-mono">
          SKU: {productWithVariants.baseSku}
        </p>

        {/* Configured Options Display - Larger swatches, clearer hierarchy */}
        {selectedConfiguration && Object.keys(selectedConfiguration.options).length > 0 && (
          <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Configured Options</span>
            {Object.entries(selectedConfiguration.options).map(([optionName, value]) => (
              <div key={optionName} className="flex items-center gap-3">
                {(optionName.toLowerCase().includes('finish') || optionName.toLowerCase().includes('accent')) && (
                  <div className="relative flex-shrink-0">
                    <FinishSwatch finishName={value} size="sm" />
                    <div className="absolute -inset-0.5 rounded-lg ring-2 ring-neutral-200 dark:ring-neutral-600 pointer-events-none" />
                  </div>
                )}
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{optionName}:</span>{' '}
                  <span className="text-neutral-900 dark:text-neutral-100 font-semibold">{value}</span>
                </span>
              </div>
            ))}

            {/* Full Configured SKU - Emphasized */}
            <p className="text-sm font-mono font-medium text-neutral-700 dark:text-neutral-300 pt-1">
              SKU: {(() => {
                // First check if configuration has variantSku directly
                if (selectedConfiguration.variantSku) {
                  return selectedConfiguration.variantSku;
                }
                // Fallback: find the item in selection that matches this product
                const configuredItem = selectionItems.find(item => {
                  if (item.configuration?.baseItemCode === productWithVariants.baseSku) {
                    return true;
                  }
                  if (item.sku.startsWith(productWithVariants.baseSku + '-')) {
                    return true;
                  }
                  return false;
                });
                return configuredItem?.sku || selectedVariant.sku;
              })()}
            </p>
          </div>
        )}

        {/* Option Selectors */}
        {productWithVariants.variantType !== 'none' && (
          <div className="space-y-3">
            {productWithVariants.dimensions.map((dimension) => (
              <div key={dimension.name} className="space-y-2">
                <p className="text-xs text-neutral-700 font-medium">
                  <span className="uppercase tracking-wider text-neutral-500">{dimension.name}:</span>{' '}
                  <span className="text-neutral-900">{selectedOptions[dimension.name]}</span>
                </p>
                <div className="inline-flex flex-wrap gap-2" onMouseLeave={handleOptionLeave}>
                  {dimension.options.map((option) => {
                    const isSelected = selectedOptions[dimension.name] === option.label;

                    return (
                      <button
                        key={option.code}
                        onClick={() => handleOptionChange(dimension.name, option.label)}
                        onMouseEnter={() => handleOptionHover(dimension.name, option.label)}
                        className={cn(
                          'relative flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all',
                          isSelected
                            ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                        )}
                        aria-label={option.label}
                      >
                        {option.abbreviation}

                        {/* Tooltip on hover */}
                        {hoveredOption === `${dimension.name}:${option.label}` && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white shadow-lg z-50 pointer-events-none"
                          >
                            {option.label}
                            {/* Arrow */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-neutral-900" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Original Market Finish Reminder - only show when viewing different config */}
        {showOriginalFinishReminder && (
          <p className="text-xs text-neutral-400 italic">
            Original Market Finish: {originalMarketPickInfo?.finish}
          </p>
        )}

        {/* Price */}
        <div className="mt-auto pt-2 border-t border-neutral-100">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Dealer Cost</span>
            <span className="text-xl font-bold text-neutral-900">
              {selectedVariant.price.toLocaleString('en-CA', {
                style: 'currency',
                currency: 'CAD',
              })}
            </span>
          </div>
        </div>

        {/* Add to Selection / Configure Button */}
        <Button
          onClick={handleButtonClick}
          onMouseEnter={() => {
            if (!ignoreHover) setIsButtonHovered(true);
          }}
          onMouseLeave={() => {
            setIsButtonHovered(false);
            setIgnoreHover(false);
          }}
          className={cn(
            "w-full mt-3 transition-all duration-200 font-semibold text-sm h-11",
            productWithVariants.isConfigurable ? (
              // Configurable products (Hubbardton) - blue styling
              "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md hover:shadow-lg"
            ) : isExactConfigInSelection ? (
              // Exact match - green "Selected" state, red on hover for remove
              isButtonHovered
                ? "!bg-rose-600 hover:!bg-rose-700 !text-white"
                : "!bg-emerald-600 hover:!bg-emerald-700 !text-white"
            ) : (
              // New config or empty - dark button
              "!bg-neutral-900 hover:!bg-neutral-800 !text-white dark:!bg-neutral-100 dark:!text-neutral-900 dark:hover:!bg-neutral-200"
            )
          )}
          size="md"
          variant="default"
        >
          {productWithVariants.isConfigurable ? (
            isInSelection ? (
              // Configurable product is in selection - show Selected with option to reconfigure
              isButtonHovered ? (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-bold">Reconfigure</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  <span className="font-bold">Selected</span>
                </>
              )
            ) : (
              // Configurable product not in selection - show Configure & Add with prominent styling
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-bold tracking-wide">Configure & Add</span>
              </>
            )
          ) : isExactConfigInSelection ? (
            // Exact match - show "Selected ✓" or "Remove" on hover
            isButtonHovered ? (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-bold">Remove</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                <span className="font-bold">Selected</span>
              </>
            )
          ) : (
            // New config or empty - show "Add [Config]"
            <>
              <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-bold truncate">
                {currentConfigName ? `Add ${currentConfigName}` : 'Add to Selection'}
              </span>
            </>
          )}
        </Button>
      </div>

      {/* Configurator Sheet for multi-option products */}
      {productWithVariants.isConfigurable && productWithVariants.catalogItem && (
        <ConfiguratorSheet
          open={configuratorOpen}
          onOpenChange={setConfiguratorOpen}
          product={productWithVariants.catalogItem}
          onComplete={handleConfigurationComplete}
          onImageUpdate={setConfiguratorImageUrl}
          // When reconfiguring an existing selection, pass the current SKU and options
          existingSku={isInSelection ? existingSelectionSku || undefined : undefined}
          initialOptions={isInSelection && selectedConfiguration ? selectedConfiguration.options : undefined}
        />
      )}
    </motion.article>
  );
}
