'use client';

import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FinishSwatch } from './finish-swatch';
import type { CatalogItem, ConfiguratorOption } from '@/lib/catalog/loadCatalog';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle } from 'lucide-react';

interface ConfiguratorSheetProps {
  product: CatalogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (configuration: { baseItemCode: string; variantSku: string; options: Record<string, string>; productName: string; oldSkuToReplace?: string }) => void;
  onImageUpdate?: (imageUrl: string | null) => void;
  /** When reconfiguring an existing selection, pass the current SKU to replace */
  existingSku?: string;
  /** Initial options to pre-populate when reconfiguring */
  initialOptions?: Record<string, string>;
}

export function ConfiguratorSheet({
  product,
  open,
  onOpenChange,
  onComplete,
  onImageUpdate,
  existingSku,
  initialOptions,
}: ConfiguratorSheetProps) {
  // Initialize with existing options (reconfigure mode) or default variant options
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    // If reconfiguring with initial options, use those
    if (initialOptions && Object.keys(initialOptions).length > 0) {
      console.log('[ConfiguratorSheet] Initializing with existing configuration:', initialOptions);
      return initialOptions;
    }
    // Otherwise use default variant
    if (product.defaultVariantSku && product.skuVariants) {
      const defaultVariant = product.skuVariants.find(v => v.sku === product.defaultVariantSku);
      if (defaultVariant) {
        console.log('[ConfiguratorSheet] Initializing with default variant:', product.defaultVariantSku, defaultVariant.optionCombination);
        return defaultVariant.optionCombination;
      }
    }
    return {};
  });

  // Sort options by priority
  const optionFlow = useMemo(() => {
    if (!product.configuratorOptions) return [];

    const priority: Record<string, number> = {
      'finish': 1,
      'accent-finish': 2,
      'shade': 3,
      'glass': 3,
    };

    return [...product.configuratorOptions].sort((a, b) => {
      const aPriority = priority[a.optionType] || 99;
      const bPriority = priority[b.optionType] || 99;
      return aPriority - bPriority;
    });
  }, [product.configuratorOptions]);

  // Reset options when dialog opens - use initialOptions (reconfigure) or default variant
  useEffect(() => {
    if (open) {
      // If reconfiguring with initial options, use those
      if (initialOptions && Object.keys(initialOptions).length > 0) {
        console.log('[ConfiguratorSheet] Setting existing configuration on open:', initialOptions);
        setSelectedOptions(initialOptions);
      } else if (product.defaultVariantSku && product.skuVariants) {
        const defaultVariant = product.skuVariants.find(v => v.sku === product.defaultVariantSku);
        if (defaultVariant) {
          console.log('[ConfiguratorSheet] Resetting to default variant on open:', product.defaultVariantSku);
          setSelectedOptions(defaultVariant.optionCombination);
        }
      }
    }
  }, [open, product.defaultVariantSku, product.skuVariants, initialOptions]);

  // Real-time variant tracking
  const currentVariant = useMemo(() => {
    if (!product.skuVariants || Object.keys(selectedOptions).length === 0) {
      return null;
    }

    return product.skuVariants.find(v => {
      return Object.entries(selectedOptions).every(
        ([key, value]) => !v.optionCombination[key] || v.optionCombination[key] === value
      );
    }) || null;
  }, [selectedOptions, product.skuVariants]);

  const currentPrice = currentVariant?.price || product.list;
  const priceChange = currentVariant ? currentVariant.price - product.list : 0;

  // Communicate image updates to parent
  useEffect(() => {
    if (currentVariant?.imageUrl && onImageUpdate) {
      onImageUpdate(currentVariant.imageUrl);
    } else if (onImageUpdate && Object.keys(selectedOptions).length === 0) {
      onImageUpdate(null);
    }
  }, [currentVariant, selectedOptions, onImageUpdate]);

  // Get available options (smart dependency filtering)
  const getAvailableOptions = (option: ConfiguratorOption): string[] => {
    if (Object.keys(selectedOptions).length === 0) {
      return option.values;
    }

    const selectionsFromOtherOptions = Object.entries(selectedOptions).filter(
      ([key]) => key !== option.optionName
    );

    if (selectionsFromOtherOptions.length === 0) {
      return option.values;
    }

    const compatibleVariants = product.skuVariants?.filter(variant => {
      return selectionsFromOtherOptions.every(
        ([key, value]) => variant.optionCombination[key] === value
      );
    }) || [];

    const availableValues = new Set(
      compatibleVariants
        .map(v => v.optionCombination[option.optionName])
        .filter(Boolean)
    );

    return option.values.filter(value => availableValues.has(value));
  };

  // Check if all required options are selected
  const isComplete = useMemo(() => {
    if (!product.configuratorOptions) return false;

    return product.configuratorOptions
      .filter(opt => opt.required)
      .every(opt => selectedOptions[opt.optionName]);
  }, [selectedOptions, product.configuratorOptions]);

  // Get the default variant (the one whose image is displayed)
  const defaultVariant = useMemo(() => {
    if (!product.defaultVariantSku || !product.skuVariants) return null;
    return product.skuVariants.find(v => v.sku === product.defaultVariantSku) || null;
  }, [product.defaultVariantSku, product.skuVariants]);

  // Check if current selection matches the photographed configuration
  const matchesImageConfig = useMemo(() => {
    if (!defaultVariant) return true;

    return Object.entries(defaultVariant.optionCombination).every(
      ([key, value]) => selectedOptions[key] === value
    );
  }, [selectedOptions, defaultVariant]);

  // Reset to photographed configuration
  const handleConfigureAsShown = () => {
    if (defaultVariant) {
      setSelectedOptions(defaultVariant.optionCombination);
    }
  };

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const handleAddToSelection = () => {
    if (!isComplete || !currentVariant) return;

    onComplete({
      baseItemCode: product.baseItemCode || product.sku,
      variantSku: currentVariant.sku,
      options: selectedOptions,
      productName: product.name,
      // Include the old SKU to replace when reconfiguring
      oldSkuToReplace: existingSku,
    });

    // Reset state and close
    setSelectedOptions({});
    if (onImageUpdate) onImageUpdate(null);
    onOpenChange(false);
  };

  const renderOptionSelector = (option: ConfiguratorOption) => {
    const isFinishType = option.optionType === 'finish' || option.optionType === 'accent-finish';
    const currentValue = selectedOptions[option.optionName];
    const availableValues = getAvailableOptions(option);

    if (isFinishType) {
      // 4-WIDE GRID - Clean swatches, consistent 4px radius, tooltip on hover only
      return (
        <div className="grid grid-cols-4 gap-1.5">
          {option.values.map((value) => {
            const isAvailable = availableValues.includes(value);
            const isSelected = currentValue === value;

            return (
              <div key={value} className="relative group">
                <button
                  type="button"
                  onClick={() => isAvailable && handleOptionChange(option.optionName, value)}
                  disabled={!isAvailable}
                  className={cn(
                    'w-full aspect-square rounded overflow-hidden transition-all',
                    isSelected && 'ring-2 ring-blue-600 ring-offset-1',
                    !isSelected && isAvailable && 'hover:ring-2 hover:ring-gray-400',
                    !isAvailable && 'opacity-30 cursor-not-allowed grayscale'
                  )}
                >
                  {/* Use bare mode - swatch fills entire button */}
                  <FinishSwatch
                    finishName={value}
                    bare={true}
                    size="mega"
                  />
                </button>
                {/* Tooltip on hover - appears above swatch */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {value}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Render radio group for other option types
    return (
      <RadioGroup
        value={currentValue || ''}
        onValueChange={(value) => handleOptionChange(option.optionName, value)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {option.values.map((value) => {
            const isAvailable = availableValues.includes(value);

            return (
              <div
                key={value}
                className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg border-2 transition-all',
                  currentValue === value && 'border-blue-600 bg-blue-50',
                  currentValue !== value && isAvailable && 'border-gray-200 hover:border-gray-300',
                  !isAvailable && 'opacity-40 cursor-not-allowed'
                )}
              >
                <RadioGroupItem
                  value={value}
                  id={`${option.optionName}-${value}`}
                  disabled={!isAvailable}
                />
                <Label
                  htmlFor={`${option.optionName}-${value}`}
                  className={cn(
                    'flex-1 cursor-pointer text-sm',
                    !isAvailable && 'cursor-not-allowed'
                  )}
                >
                  {value}
                  {!isAvailable && (
                    <span className="ml-2 text-xs text-red-600">(Unavailable)</span>
                  )}
                </Label>
              </div>
            );
          })}
        </div>
      </RadioGroup>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col h-full w-[480px] sm:w-[540px]"
        aria-label="Product configuration panel"
      >
        {/* COMPACT HEADER - Price, SKU, Title, Status in minimal space */}
        <div className="shrink-0 bg-gray-900 text-white px-3 py-1.5 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight">
            {currentPrice.toLocaleString('en-CA', {
              style: 'currency',
              currency: 'CAD',
            })}
          </span>
          <div className="flex items-center gap-2">
            {currentVariant && (
              <span className="font-mono text-[10px] font-medium text-gray-300">
                {currentVariant.sku}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-5 w-5 p-0 shrink-0 text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Close configurator"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* TITLE & STATUS - Compact */}
        <div className="shrink-0 bg-white px-3 pt-2 pb-2">
          {/* Product Title + Status inline */}
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-sm font-bold text-gray-900">
              {product.name}
            </h2>
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-medium",
              isComplete ? "text-green-600" : "text-amber-600"
            )}>
              {isComplete ? (
                <Check className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
            </div>
          </div>

          {/* Configure as Shown Button */}
          {defaultVariant && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConfigureAsShown}
              disabled={matchesImageConfig}
              className={cn(
                "w-full h-6 text-[10px] font-medium",
                matchesImageConfig
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
              )}
            >
              <img
                src="https://hubbardtonforge.com/configureIcon-4xq.svg"
                alt=""
                className="w-2.5 h-2.5 mr-1"
              />
              Configure as Shown
            </Button>
          )}
        </div>

        {/* OPTIMIZED CONTROLS - Compact layout for no-scroll experience */}
        <div className="flex-1 overflow-hidden px-3 py-2">
          <div className="space-y-2">
            {optionFlow.map((option, index) => {
              const currentValue = selectedOptions[option.optionName];
              const isSelected = !!currentValue;

              return (
                <div key={option.optionName}>
                  {/* Separator between option groups */}
                  {index > 0 && <div className="border-t border-gray-100 mb-2" />}
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1">
                      {option.optionName}
                      {option.required && !isSelected && (
                        <span className="text-red-500 text-xs" aria-label="Required">*</span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      )}
                    </h3>
                    {renderOptionSelector(option)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FIXED BOTTOM BAR - Add/Update Selection */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2">
          <Button
            onClick={handleAddToSelection}
            disabled={!isComplete || !currentVariant}
            className={cn(
              "w-full text-xs font-bold h-8 transition-all",
              isComplete && currentVariant
                ? existingSku
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
            size="default"
            title={!isComplete ? 'Please complete all required finish selections' : existingSku ? 'Update configured product in selection' : 'Add configured product to selection'}
          >
            {isComplete ? (
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {existingSku ? 'Update Selection' : 'Add to Selection'}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                Select All Options
              </span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
