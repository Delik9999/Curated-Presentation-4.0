'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailImage {
  url: string;
  sku: string;
  productName: string;
}

interface CollectionImageGalleryProps {
  collectionName: string;
  vendor: string;
  onSelectImages: (urls: string[]) => void;
  className?: string;
}

export function CollectionImageGallery({
  collectionName,
  vendor,
  onSelectImages,
  className,
}: CollectionImageGalleryProps) {
  const [images, setImages] = useState<DetailImage[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && images.length === 0) {
      loadImages();
    }
  }, [expanded]);

  const loadImages = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/rep/collections/detail-images?collectionName=${encodeURIComponent(
          collectionName
        )}&vendor=${encodeURIComponent(vendor)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      setImages(data.images || []);

      if (data.images.length === 0) {
        setError('No detail images available for this collection');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const toggleImage = (url: string) => {
    const newSelected = new Set(selectedUrls);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedUrls(newSelected);
  };

  const addSelectedImages = () => {
    if (selectedUrls.size > 0) {
      onSelectImages(Array.from(selectedUrls));
      setSelectedUrls(new Set());
      setExpanded(false);
    }
  };

  if (!expanded) {
    return (
      <div className={cn('space-y-2', className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Browse Collection Images
        </Button>
        <p className="text-xs text-muted-foreground">
          Or enter a URL manually above
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 border rounded-lg p-4 bg-muted/20', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">
          Collection Image Gallery
          {selectedUrls.size > 0 && ` (${selectedUrls.size} selected)`}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(false)}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
          {error}
        </div>
      )}

      {!loading && !error && images.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {images.map((image, idx) => (
              <button
                key={`${image.url}-${idx}`}
                type="button"
                onClick={() => toggleImage(image.url)}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02]',
                  selectedUrls.has(image.url)
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-transparent hover:border-gray-300'
                )}
              >
                <img
                  src={image.url}
                  alt={`${image.productName} detail`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {selectedUrls.has(image.url) && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                    <Plus className="w-4 h-4 text-white rotate-45" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-[10px] text-white font-medium line-clamp-1">
                    {image.productName}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={addSelectedImages}
              disabled={selectedUrls.size === 0}
              className="flex-1"
              size="sm"
            >
              Add {selectedUrls.size > 0 ? `${selectedUrls.size} ` : ''}
              {selectedUrls.size === 1 ? 'Image' : 'Images'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedUrls(new Set())}
              disabled={selectedUrls.size === 0}
            >
              Clear
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
