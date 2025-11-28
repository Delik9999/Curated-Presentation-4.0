'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { PresentationItem, BadgeType, Badge as BadgeTypeDefinition, MediaType } from '@/lib/selections/types';
import { PREDEFINED_BADGES, createBadge } from '@/lib/badges/badge-config';
import { BadgeDisplay } from '@/components/ui/badge-display';
import { ArrowUp, ArrowDown, Plus, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CollectionImageGallery } from './collection-image-gallery';

interface PropertiesInspectorProps {
  selectedItem: PresentationItem | null;
  onUpdate: (id: string, properties: Partial<PresentationItem['properties']>) => void;
  onBulkUpdate?: (properties: Partial<PresentationItem['properties']>) => void;
  selectionCount?: number;
  presentationItems?: PresentationItem[];
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  presentationName?: string;
  vendorName?: string;
}

export function PropertiesInspector({
  selectedItem,
  onUpdate,
  onBulkUpdate,
  selectionCount = 0,
  presentationItems = [],
  onMoveUp,
  onMoveDown,
  presentationName,
  vendorName,
}: PropertiesInspectorProps) {
  const isBulkMode = selectionCount > 1;

  // Collection badge management state
  const [selectedBadgeType, setSelectedBadgeType] = useState<BadgeType>('dallas-favorite');
  const [customBadgeLabel, setCustomBadgeLabel] = useState('');
  const [customBadgeColor, setCustomBadgeColor] = useState('bg-gray-500');

  // Product badges state
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [productBadgeType, setProductBadgeType] = useState<BadgeType>('dallas-favorite');
  const [productBadgeLabel, setProductBadgeLabel] = useState('');
  const [productBadgeColor, setProductBadgeColor] = useState('bg-gray-500');

  // Migrate old heroVideoUrl to new media structure
  useEffect(() => {
    if (selectedItem?.type === 'collection' && selectedItem.collectionData?.heroVideoUrl && !selectedItem.properties.media) {
      const heroVideoUrl = selectedItem.collectionData.heroVideoUrl;

      // Detect if it's YouTube or MP4
      const isYouTube = heroVideoUrl.includes('youtube.com') || heroVideoUrl.includes('youtu.be') || heroVideoUrl.startsWith('youtube:');

      // Auto-migrate to new media structure
      onUpdate(selectedItem.id, {
        media: {
          mediaType: isYouTube ? 'youtube' : 'mp4',
          ...(isYouTube ? { youtubeUrl: heroVideoUrl } : { mp4Url: heroVideoUrl }),
        },
      });
    }
  }, [selectedItem?.id, selectedItem?.collectionData?.heroVideoUrl, selectedItem?.properties.media, onUpdate]);

  // Fetch products when a collection is selected
  useEffect(() => {
    if (selectedItem?.type === 'collection' && selectedItem.collectionData?.collectionName) {
      const collectionName = selectedItem.collectionData.collectionName;
      const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
          // Fetch products from the catalog API
          const response = await fetch(`/api/catalog/search?collection=${encodeURIComponent(collectionName)}`);
          if (response.ok) {
            const data = await response.json();
            setProducts(data.products || []);
          }
        } catch (error) {
          console.error('Failed to fetch products:', error);
        } finally {
          setLoadingProducts(false);
        }
      };
      fetchProducts();
    } else {
      setProducts([]);
    }
  }, [selectedItem?.id]);

  // Collection badge management handlers
  const handleAddBadge = () => {
    if (!selectedItem) return;

    const isCustom = selectedBadgeType === 'custom';
    const label = isCustom ? customBadgeLabel : undefined;
    const color = isCustom ? customBadgeColor : undefined;

    if (isCustom && !customBadgeLabel.trim()) {
      return; // Don't add empty custom badges
    }

    const newBadge = createBadge(selectedBadgeType, label, color);
    const currentBadges = selectedItem.properties.badges || [];

    onUpdate(selectedItem.id, {
      badges: [...currentBadges, newBadge],
    });

    // Reset custom badge inputs
    if (isCustom) {
      setCustomBadgeLabel('');
      setCustomBadgeColor('bg-gray-500');
    }
  };

  const handleRemoveBadge = (badgeId: string) => {
    if (!selectedItem) return;

    const currentBadges = selectedItem.properties.badges || [];
    onUpdate(selectedItem.id, {
      badges: currentBadges.filter((b) => b.id !== badgeId),
    });
  };

  // Product badge management handlers
  const handleAddProductBadge = (sku: string) => {
    if (!selectedItem) return;

    const isCustom = productBadgeType === 'custom';
    const label = isCustom ? productBadgeLabel : undefined;
    const color = isCustom ? productBadgeColor : undefined;

    if (isCustom && !productBadgeLabel.trim()) {
      return; // Don't add empty custom badges
    }

    const newBadge = createBadge(productBadgeType, label, color);
    const currentSkuBadges = selectedItem.properties.skuBadges || {};
    const skuBadges = currentSkuBadges[sku] || [];

    onUpdate(selectedItem.id, {
      skuBadges: {
        ...currentSkuBadges,
        [sku]: [...skuBadges, newBadge],
      },
    });

    // Reset custom badge inputs
    if (isCustom) {
      setProductBadgeLabel('');
      setProductBadgeColor('bg-gray-500');
    }
  };

  const handleRemoveProductBadge = (sku: string, badgeId: string) => {
    if (!selectedItem) return;

    const currentSkuBadges = selectedItem.properties.skuBadges || {};
    const skuBadges = currentSkuBadges[sku] || [];

    onUpdate(selectedItem.id, {
      skuBadges: {
        ...currentSkuBadges,
        [sku]: skuBadges.filter((b) => b.id !== badgeId),
      },
    });
  };

  const getProductBadgeCount = (sku: string): number => {
    if (!selectedItem) return 0;
    const skuBadges = selectedItem.properties.skuBadges || {};
    return (skuBadges[sku] || []).length;
  };

  // When no collection is selected, show presentation-level details
  if (!selectedItem && selectionCount === 0) {
    return (
      <Card className="h-full overflow-auto">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm">Presentation Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Presentation Name */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Presentation Name</Label>
            <p className="text-sm mt-1.5 font-medium">{presentationName || 'Untitled Presentation'}</p>
          </div>

          {/* Vendor */}
          {vendorName && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Vendor</Label>
              <p className="text-sm mt-1.5">{vendorName}</p>
            </div>
          )}

          {/* Collection Count */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Total Collections</Label>
            <p className="text-sm mt-1.5">{presentationItems.length}</p>
          </div>

          {/* Collection List */}
          {presentationItems.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Collections</Label>
              <div className="space-y-1.5">
                {presentationItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground font-mono">{index + 1}.</span>
                    <span className="flex-1 truncate">{item.collectionData?.collectionName}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {item.collectionData?.productCount || 0} items
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {presentationItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No collections added yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag collections from the source library to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Properties</span>
          {isBulkMode && (
            <Badge variant="muted" className="text-xs">
              {selectionCount} selected
            </Badge>
          )}
        </CardTitle>
        {selectedItem && !isBulkMode && selectedItem.type === 'collection' && (
          <CardDescription className="text-xs">
            {selectedItem.collectionData?.collectionName}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Only show collection properties for collection items */}
        {selectedItem?.type === 'collection' && !isBulkMode && (
          <Accordion type="multiple" defaultValue={[]} className="w-full">
            {/* General Section */}
            <AccordionItem value="general">
              <AccordionTrigger className="px-6 text-sm font-medium">
                General
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <div className="space-y-4">
                  {/* Custom Title */}
                  <div className="space-y-2">
                    <Label htmlFor="custom-title" className="text-sm font-medium">
                      Custom Title
                    </Label>
                    <Input
                      id="custom-title"
                      placeholder="Override collection name..."
                      value={selectedItem.properties.customTitle ?? ''}
                      onChange={(e) => onUpdate(selectedItem.id, { customTitle: e.target.value })}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use the default collection name
                    </p>
                  </div>

                  {/* Narrative Description */}
                  <div className="space-y-2">
                    <Label htmlFor="narrative-description" className="text-sm font-medium">
                      Narrative Description
                    </Label>
                    <Textarea
                      id="narrative-description"
                      placeholder="Add a compelling narrative for this collection..."
                      value={selectedItem.properties.narrativeDescription ?? ''}
                      onChange={(e) => onUpdate(selectedItem.id, { narrativeDescription: e.target.value })}
                      rows={4}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      This description will appear above the collection
                    </p>
                  </div>

                  {/* Start Expanded Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="start-expanded" className="text-sm font-medium">
                        Start Expanded
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Show products immediately
                      </p>
                    </div>
                    <Switch
                      id="start-expanded"
                      checked={selectedItem?.properties.startExpanded ?? false}
                      onCheckedChange={(checked) => onUpdate(selectedItem.id, { startExpanded: checked })}
                    />
                  </div>

                  {/* Show Product Count Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-count" className="text-sm font-medium">
                        Show Product Count
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Display number of items
                      </p>
                    </div>
                    <Switch
                      id="show-count"
                      checked={selectedItem?.properties.showProductCount ?? true}
                      onCheckedChange={(checked) => onUpdate(selectedItem.id, { showProductCount: checked })}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Collection Badges Section */}
            <AccordionItem value="collection-badges">
              <AccordionTrigger className="px-6 text-sm font-medium">
                Collection Badges
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add badges to highlight this collection
                  </p>

                  {/* Badge Selection */}
                  <div className="space-y-2">
                    <Select
                      value={selectedBadgeType}
                      onValueChange={(value) => setSelectedBadgeType(value as BadgeType)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select badge type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dallas-favorite">Dallas Market Favorite</SelectItem>
                        <SelectItem value="top-scanned">Top Scanned</SelectItem>
                        <SelectItem value="designers-pick">Designer's Pick</SelectItem>
                        <SelectItem value="show-highlight">Show Highlight</SelectItem>
                        <SelectItem value="best-selling-size">Best Selling Size</SelectItem>
                        <SelectItem value="custom">Custom Badge</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Custom Badge Inputs */}
                    {selectedBadgeType === 'custom' && (
                      <div className="space-y-2 pt-2">
                        <Input
                          placeholder="Badge text..."
                          value={customBadgeLabel}
                          onChange={(e) => setCustomBadgeLabel(e.target.value)}
                          className="text-sm"
                        />
                        <div className="space-y-1.5">
                          <Label className="text-xs">Badge Color</Label>
                          <Select value={customBadgeColor} onValueChange={setCustomBadgeColor}>
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bg-blue-500">Blue</SelectItem>
                              <SelectItem value="bg-purple-500">Purple</SelectItem>
                              <SelectItem value="bg-pink-500">Pink</SelectItem>
                              <SelectItem value="bg-amber-500">Amber</SelectItem>
                              <SelectItem value="bg-green-500">Green</SelectItem>
                              <SelectItem value="bg-red-500">Red</SelectItem>
                              <SelectItem value="bg-indigo-500">Indigo</SelectItem>
                              <SelectItem value="bg-teal-500">Teal</SelectItem>
                              <SelectItem value="bg-gray-500">Gray</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleAddBadge}
                      size="sm"
                      className="w-full"
                      disabled={selectedBadgeType === 'custom' && !customBadgeLabel.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Badge
                    </Button>
                  </div>

                  {/* Current Badges */}
                  {selectedItem.properties.badges && selectedItem.properties.badges.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Current Badges</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.properties.badges.map((badge) => (
                          <BadgeDisplay
                            key={badge.id}
                            badge={badge}
                            onRemove={() => handleRemoveBadge(badge.id)}
                            size="sm"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Product Badges Section */}
            <AccordionItem value="product-badges">
              <AccordionTrigger className="px-6 text-sm font-medium">
                Product Badges {products.length > 0 && `(${products.length})`}
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add badges to individual products in this collection
                  </p>

                  {loadingProducts && (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      Loading products...
                    </div>
                  )}

                  {!loadingProducts && products.length === 0 && (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      No products found in this collection
                    </div>
                  )}

                  {!loadingProducts && products.length > 0 && (
                    <div className="space-y-2">
                      {products.map((product) => {
                        const badgeCount = getProductBadgeCount(product.sku);
                        const isExpanded = expandedProduct === product.sku;
                        const productBadges = selectedItem.properties.skuBadges?.[product.sku] || [];

                        return (
                          <div key={product.sku} className="border rounded-lg">
                            {/* Product Row */}
                            <button
                              onClick={() => setExpandedProduct(isExpanded ? null : product.sku)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                            >
                              {/* Chevron */}
                              <ChevronRight
                                className={`h-4 w-4 shrink-0 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />

                              {/* Thumbnail */}
                              {product.images?.[0] && (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded shrink-0"
                                />
                              )}
                              {!product.images?.[0] && (
                                <div className="w-10 h-10 bg-muted rounded shrink-0" />
                              )}

                              {/* Product Info */}
                              <div className="flex-1 text-left min-w-0">
                                <div className="text-sm font-medium truncate">{product.name}</div>
                                <div className="text-xs text-muted-foreground">{product.sku}</div>
                              </div>

                              {/* Badge Count */}
                              {badgeCount > 0 && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {badgeCount} {badgeCount === 1 ? 'badge' : 'badges'}
                                </Badge>
                              )}
                            </button>

                            {/* Expanded Badge Management */}
                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
                                <div className="pt-3 space-y-2">
                                  <Select
                                    value={productBadgeType}
                                    onValueChange={(value) => setProductBadgeType(value as BadgeType)}
                                  >
                                    <SelectTrigger className="text-sm">
                                      <SelectValue placeholder="Select badge type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="dallas-favorite">Dallas Market Favorite</SelectItem>
                                      <SelectItem value="top-scanned">Top Scanned</SelectItem>
                                      <SelectItem value="designers-pick">Designer's Pick</SelectItem>
                                      <SelectItem value="show-highlight">Show Highlight</SelectItem>
                                      <SelectItem value="best-selling-size">Best Selling Size</SelectItem>
                                      <SelectItem value="custom">Custom Badge</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  {/* Custom Badge Inputs */}
                                  {productBadgeType === 'custom' && (
                                    <div className="space-y-2 pt-2">
                                      <Input
                                        placeholder="Badge text..."
                                        value={productBadgeLabel}
                                        onChange={(e) => setProductBadgeLabel(e.target.value)}
                                        className="text-sm"
                                      />
                                      <div className="space-y-1.5">
                                        <Label className="text-xs">Badge Color</Label>
                                        <Select value={productBadgeColor} onValueChange={setProductBadgeColor}>
                                          <SelectTrigger className="text-sm">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="bg-blue-500">Blue</SelectItem>
                                            <SelectItem value="bg-purple-500">Purple</SelectItem>
                                            <SelectItem value="bg-pink-500">Pink</SelectItem>
                                            <SelectItem value="bg-amber-500">Amber</SelectItem>
                                            <SelectItem value="bg-green-500">Green</SelectItem>
                                            <SelectItem value="bg-red-500">Red</SelectItem>
                                            <SelectItem value="bg-indigo-500">Indigo</SelectItem>
                                            <SelectItem value="bg-teal-500">Teal</SelectItem>
                                            <SelectItem value="bg-gray-500">Gray</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  )}

                                  <Button
                                    onClick={() => handleAddProductBadge(product.sku)}
                                    size="sm"
                                    className="w-full"
                                    disabled={productBadgeType === 'custom' && !productBadgeLabel.trim()}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Badge
                                  </Button>
                                </div>

                                {/* Current Product Badges */}
                                {productBadges.length > 0 && (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Current Badges</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {productBadges.map((badge) => (
                                        <BadgeDisplay
                                          key={badge.id}
                                          badge={badge}
                                          onRemove={() => handleRemoveProductBadge(product.sku, badge.id)}
                                          size="sm"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>


            {/* Internal Notes Section */}
            <AccordionItem value="internal-notes">
              <AccordionTrigger className="px-6 text-sm font-medium">
                Internal Notes
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <div className="space-y-2">
                  <Textarea
                    id="notes"
                    placeholder="Add notes for this collection..."
                    value={selectedItem.properties.customNotes ?? ''}
                    onChange={(e) => onUpdate(selectedItem.id, { customNotes: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    For internal use only, not visible to customers
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Reorder Section */}
            {onMoveUp && onMoveDown && presentationItems.length > 0 && (
              <AccordionItem value="reorder">
                <AccordionTrigger className="px-6 text-sm font-medium">
                  Reorder
                </AccordionTrigger>
                <AccordionContent className="px-6">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMoveUp(selectedItem.id)}
                        disabled={selectedItem.order === 0}
                        className="flex-1"
                      >
                        <ArrowUp className="h-4 w-4 mr-1" />
                        Move Up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMoveDown(selectedItem.id)}
                        disabled={selectedItem.order === presentationItems.length - 1}
                        className="flex-1"
                      >
                        <ArrowDown className="h-4 w-4 mr-1" />
                        Move Down
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Alternatively, drag the collection card to reorder
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}

        {/* Bulk Mode UI */}
        {selectedItem?.type === 'collection' && isBulkMode && (
          <div className="p-6 space-y-4">
            <p className="text-xs text-muted-foreground mb-4">
              Changes will apply to all {selectionCount} selected collections
            </p>

            {/* Start Expanded Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bulk-start-expanded" className="text-sm font-medium">
                  Start Expanded
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show products immediately
                </p>
              </div>
              <Switch
                id="bulk-start-expanded"
                checked={selectedItem?.properties.startExpanded ?? false}
                onCheckedChange={(checked) => {
                  if (onBulkUpdate) {
                    onBulkUpdate({ startExpanded: checked });
                  }
                }}
              />
            </div>

            {/* Show Product Count Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bulk-show-count" className="text-sm font-medium">
                  Show Product Count
                </Label>
                <p className="text-xs text-muted-foreground">
                  Display number of items
                </p>
              </div>
              <Switch
                id="bulk-show-count"
                checked={selectedItem?.properties.showProductCount ?? true}
                onCheckedChange={(checked) => {
                  if (onBulkUpdate) {
                    onBulkUpdate({ showProductCount: checked });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Section Header properties */}
        {selectedItem?.type === 'section_header' && (
          <div className="p-6 text-xs text-muted-foreground">
            Section header properties can be edited inline in the canvas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
