'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { formatCurrency } from '@/lib/utils/currency';

type Product = {
  sku: string;
  name: string;
  unitList: number;
  collectionName?: string;
  year?: number;
  imageUrl?: string;
};

type SkuSearchAddProps = {
  customerId: string;
  vendor?: string;
  onProductAdded: () => void;
};

export function SkuSearchAdd({ customerId, vendor, onProductAdded }: SkuSearchAddProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ query: searchQuery });
        if (vendor) params.set('vendor', vendor);
        if (customerId) params.set('customerId', customerId);

        const response = await fetch(`/api/catalog/search?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, vendor, customerId]);

  const handleAddProduct = async (product: Product) => {
    setIsAdding(product.sku);
    try {
      const response = await fetch(`/api/customers/${customerId}/selection/add-sku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: product.sku,
          name: product.name,
          unitList: product.unitList,
          qty: 1,
          vendor,
          collection: product.collectionName,
          year: product.year,
        }),
      });

      if (response.ok) {
        setSearchQuery('');
        setResults([]);
        setShowResults(false);
        onProductAdded();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Add product error:', error);
      alert('Failed to add product');
    } finally {
      setIsAdding(null);
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by SKU or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowResults(true);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-2 max-h-96 overflow-y-auto shadow-lg">
          <div className="p-2 space-y-1">
            {results.map((product) => (
              <button
                key={product.sku}
                onClick={() => handleAddProduct(product)}
                disabled={isAdding === product.sku}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50"
              >
                {/* Product Image */}
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-semibold text-foreground">
                    {product.sku}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {product.name}
                  </div>
                  {product.collectionName && (
                    <div className="text-xs text-muted-foreground">
                      {product.collectionName}
                      {product.year && ` • ${product.year}`}
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {formatCurrency(product.unitList)}
                  </div>
                  <div className="text-xs text-muted-foreground">WSP</div>
                </div>

                {/* Add Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  disabled={isAdding === product.sku}
                >
                  {isAdding === product.sku ? (
                    <span className="text-xs">Adding...</span>
                  ) : (
                    <PlusIcon className="h-4 w-4" />
                  )}
                </Button>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* No Results */}
      {showResults && searchQuery.trim().length >= 2 && results.length === 0 && !isSearching && (
        <Card className="absolute z-50 w-full mt-2 shadow-lg">
          <div className="p-4 text-center text-sm text-muted-foreground">
            No products found for &quot;{searchQuery}&quot;
          </div>
        </Card>
      )}

      {/* Loading */}
      {isSearching && (
        <Card className="absolute z-50 w-full mt-2 shadow-lg">
          <div className="p-4 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        </Card>
      )}
    </div>
  );
}
