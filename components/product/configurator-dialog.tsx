'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FinishSwatch } from './finish-swatch';
import type { CatalogItem, ConfiguratorOption } from '@/lib/catalog/loadCatalog';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ConfiguratorDialogProps {
  product: CatalogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (configuration: { baseItemCode: string; options: Record<string, string>; productName: string }) => void;
}

export function ConfiguratorDialog({
  product,
  open,
  onOpenChange,
  onComplete,
}: ConfiguratorDialogProps) {
  // State for selected options
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Find matching SKU based on selected options
  const matchingSku = useMemo(() => {
    if (!product.skuVariants) return null;

    const variant = product.skuVariants.find(v => {
      return Object.entries(selectedOptions).every(
        ([optionName, value]) => v.optionCombination[optionName] === value
      );
    });

    return variant || null;
  }, [selectedOptions, product.skuVariants]);

  // Check if all required options are selected
  const isComplete = useMemo(() => {
    if (!product.configuratorOptions) return false;

    return product.configuratorOptions
      .filter(opt => opt.required)
      .every(opt => selectedOptions[opt.optionName]);
  }, [selectedOptions, product.configuratorOptions]);

  // Calculate price range if prices vary
  const priceRange = useMemo(() => {
    if (!product.skuVariants || product.skuVariants.length === 0) {
      return { min: product.list, max: product.list, varies: false };
    }

    const prices = product.skuVariants
      .map(v => v.price || product.list)
      .filter(p => p > 0);

    if (prices.length === 0) {
      return { min: product.list, max: product.list, varies: false };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return { min, max, varies: min !== max };
  }, [product.skuVariants, product.list]);

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const handleAddToSelection = () => {
    if (!isComplete) return;

    onComplete({
      baseItemCode: product.baseItemCode || product.sku,
      options: selectedOptions,
      productName: product.name,
    });

    // Reset and close
    setSelectedOptions({});
    onOpenChange(false);
  };

  const renderOptionSelector = (option: ConfiguratorOption) => {
    const isFinishType = option.optionType === 'finish' || option.optionType === 'accent-finish';
    const currentValue = selectedOptions[option.optionName];

    if (isFinishType) {
      // Render visual swatch selector for finish options
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {option.values.map((value) => (
              <div
                key={value}
                onClick={() => handleOptionChange(option.optionName, value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all cursor-pointer',
                  currentValue === value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <FinishSwatch
                  finishName={value}
                  selected={currentValue === value}
                  size="lg"
                />
                <span className="text-xs font-medium text-center max-w-[80px]">
                  {value}
                </span>
                {currentValue === value && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Render radio group for other option types
    return (
      <RadioGroup
        value={currentValue || ''}
        onValueChange={(value) => handleOptionChange(option.optionName, value)}
      >
        <div className="grid grid-cols-2 gap-3">
          {option.values.map((value) => (
            <div key={value} className="flex items-center space-x-2">
              <RadioGroupItem value={value} id={`${option.optionName}-${value}`} />
              <Label
                htmlFor={`${option.optionName}-${value}`}
                className="cursor-pointer"
              >
                {value}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configure {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Info Card */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                  Collection
                </div>
                <div className="font-semibold">{product.collectionName}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-muted-foreground">
                  Price
                </div>
                {priceRange.varies ? (
                  <div className="font-semibold">
                    {priceRange.min.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })} - {priceRange.max.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })}
                  </div>
                ) : (
                  <div className="font-semibold">
                    {product.list.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })}
                  </div>
                )}
              </div>
            </div>

            {product.shadeInfo && (
              <div className="pt-2 border-t">
                <div className="text-sm font-medium text-muted-foreground">Shade</div>
                <div className="text-sm">{product.shadeInfo}</div>
              </div>
            )}

            {product.skuVariants && product.skuVariants.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  {product.skuVariants.length} available configurations
                </div>
              </div>
            )}
          </div>

          {/* Option Selectors */}
          <div className="space-y-6">
            {product.configuratorOptions?.map((option) => (
              <div key={option.optionName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-base font-semibold">
                    {option.optionName}
                  </label>
                  {option.required && (
                    <span className="text-red-500 text-sm">*Required</span>
                  )}
                </div>
                {renderOptionSelector(option)}
              </div>
            ))}
          </div>

          {/* Selected Configuration Display */}
          {matchingSku ? (
            <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <div className="font-semibold text-green-900">Configuration Complete</div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-mono font-medium">{matchingSku.sku}</span>
                </div>
                {matchingSku.price && matchingSku.price !== product.list && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Final Price:</span>
                    <span className="font-semibold">{matchingSku.price.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })}</span>
                  </div>
                )}
              </div>
            </div>
          ) : isComplete ? (
            <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
              <div className="text-sm text-amber-900">
                No matching SKU found for this configuration. Please try different options.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
              <div className="text-sm text-muted-foreground text-center">
                Select all required options to see final SKU and pricing
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToSelection}
              disabled={!isComplete || !matchingSku}
              className="min-w-[160px]"
            >
              {!isComplete ? 'Select Options' : 'Add to Selection'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
