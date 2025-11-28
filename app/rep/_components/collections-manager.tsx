'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  PlayCircleIcon,
  ImageIcon,
  VideoIcon,
  PlusCircleIcon,
  GripVertical,
  X,
  Filter,
  ChevronsUpDown,
  FileText,
  Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PresentationItem, PresentationItemProperties, Presentation } from '@/lib/selections/types';
import { PropertiesInspector } from './properties-inspector';
import { PresentationSelector } from './presentation-selector';

// YouTube Looping Player Component
function YouTubeLoopPlayer({ videoId, startTime, endTime }: { videoId: string; startTime?: number; endTime?: number }) {
  const playerRef = React.useRef<HTMLDivElement>(null);
  const [player, setPlayer] = React.useState<any>(null);

  React.useEffect(() => {
    // Load YouTube IFrame API
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Initialize player when API is ready
    const initPlayer = () => {
      if (playerRef.current && (window as any).YT?.Player) {
        const ytPlayer = new (window as any).YT.Player(playerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 1,
            start: startTime || 0,
          },
          events: {
            onReady: (event: any) => {
              setPlayer(event.target);
              if (startTime) {
                event.target.seekTo(startTime);
              }
            },
            onStateChange: (event: any) => {
              // When video is playing, check current time
              if (event.data === (window as any).YT.PlayerState.PLAYING) {
                const checkTime = setInterval(() => {
                  const currentTime = event.target.getCurrentTime();
                  if (endTime && currentTime >= endTime) {
                    event.target.seekTo(startTime || 0);
                  }
                }, 100);

                // Store interval ID to clean up
                (event.target as any)._checkInterval = checkTime;
              } else {
                // Clear interval when not playing
                if ((event.target as any)._checkInterval) {
                  clearInterval((event.target as any)._checkInterval);
                }
              }
            },
          },
        });
      }
    };

    if ((window as any).YT?.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, [videoId, startTime, endTime]);

  return <div ref={playerRef} className="w-full h-full" />;
}

type CollectionWithMeta = {
  name: string;
  itemCount: number;
  years: number[];
  vendor?: string;
};

type FlattenedCollectionItem = {
  id: string; // unique identifier: "collectionName-year"
  collectionName: string;
  year: number;
  vendor?: string;
  itemCount: number;
  videoUrl: string | null;
};

type VideoConfig = {
  url: string;
  startTime?: number; // in seconds
  endTime?: number; // in seconds
};

interface CollectionsManagerProps {
  collections: CollectionWithMeta[];
  customerId?: string;
}

// Sortable List Item Component (New Design)
// Compact Collection List Row Component
function CollectionListRow({
  item,
  isSelected,
  onSelect,
  onRemove,
  isDragOverlay = false,
}: {
  item: PresentationItem;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  isDragOverlay?: boolean;
}) {
  const hasVideo = !!item.collectionData?.heroVideoUrl;

  return (
    <div
      onClick={onSelect}
      className={`h-12 px-3 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${
        isDragOverlay
          ? 'bg-card border-2 border-primary shadow-xl'
          : isSelected
          ? 'bg-primary/10 border border-primary ring-1 ring-primary/40'
          : 'bg-card/40 border border-border hover:bg-card/60 hover:border-primary/50'
      }`}
    >
      {/* Video indicator - prominent badge instead of dot */}
      {hasVideo ? (
        <div className="flex-shrink-0 bg-green-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-0.5">
          <VideoIcon className="w-2.5 h-2.5" />
          VIDEO
        </div>
      ) : (
        <div className="flex-shrink-0 w-14" />
      )}

      {/* Collection name */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="font-medium text-sm truncate text-foreground">
          {item.collectionData?.collectionName || 'Untitled'}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {item.collectionData?.years?.join(', ') || 'All'} • {item.collectionData?.productCount || 0}
        </span>
      </div>

      {/* Remove button */}
      {!isDragOverlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 w-6 h-6 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Sortable wrapper for CollectionListRow
function SortableListItem({
  item,
  index,
  isSelected,
  onSelect,
  onRemove,
  getVideoThumbnail,
}: {
  item: PresentationItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  getVideoThumbnail: (url: string | null) => string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: item.id });

  // Use only translate (no scale) for smooth dragging
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 30 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle wrapper */}
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1 hover:bg-muted/50 rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1">
          <CollectionListRow
            item={item}
            isSelected={isSelected || isOver}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        </div>
      </div>
    </div>
  );
}

export default function CollectionsManager({ collections, customerId }: CollectionsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [vendorFilter, setVendorFilter] = useState<string>('lib-and-co');
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Customer preview state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customerId ?? null);
  const [showCustomerPreview, setShowCustomerPreview] = useState(false);

  // Presentation state
  const [presentationItems, setPresentationItems] = useState<PresentationItem[]>([]);
  const [inspectorTarget, setInspectorTarget] = useState<string | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null); // For drag preview

  // Presentation management state
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [currentPresentationId, setCurrentPresentationId] = useState<string | null>(null);

  // Video dialog state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideoItem, setEditingVideoItem] = useState<FlattenedCollectionItem | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load collection videos dynamically (legacy)
  const collectionVideosQuery = useQuery({
    queryKey: ['collection-videos'],
    queryFn: async () => {
      const response = await fetch('/api/rep/collections/videos');
      if (!response.ok) throw new Error('Failed to load collection videos');
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds to pick up changes
  });

  const collectionVideos = collectionVideosQuery.data?.videos ?? {};

  // Load collection media (new system)
  const collectionMediaQuery = useQuery({
    queryKey: ['collection-media'],
    queryFn: async () => {
      const response = await fetch('/api/rep/collection-media');
      if (!response.ok) throw new Error('Failed to load collection media');
      return response.json();
    },
    refetchInterval: 5000,
  });

  const collectionMediaData = collectionMediaQuery.data?.data ?? {};

  // Load customers list for preview selector
  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to load customers');
      return response.json();
    },
  });

  const customers = customersQuery.data ?? [];

  // Load customer presentation data when a customer is selected
  const customerPresentationQuery = useQuery({
    queryKey: ['customer-presentation', selectedCustomerId, vendorFilter],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const response = await fetch(`/api/rep/customer-presentation?customerId=${selectedCustomerId}&vendor=${vendorFilter}`);
      if (!response.ok) throw new Error('Failed to load customer presentation data');
      return response.json();
    },
    enabled: !!selectedCustomerId && showCustomerPreview,
  });

  const customerPresentationData = customerPresentationQuery.data;

  // Load promotion config
  const promotionQuery = useQuery({
    queryKey: ['promotion-config', customerId ?? 'global'],
    queryFn: async () => {
      const url = customerId
        ? `/api/rep/collections?customerId=${encodeURIComponent(customerId)}`
        : '/api/rep/collections';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load promotion config');
      return response.json();
    },
  });

  const promotion = promotionQuery.data?.promotion;

  // Load presentations when vendor changes
  React.useEffect(() => {
    if (!vendorFilter) return;

    fetch(`/api/rep/presentations?vendor=${vendorFilter}`)
      .then(res => res.json())
      .then(async (data) => {
        setPresentations(data.presentations || []);
        const active = data.presentations?.find((p: Presentation) => p.isActive);
        if (active) {
          setCurrentPresentationId(active.id);
          // Load presentation items
          setPresentationItems(active.presentationItems || []);
        } else if (data.presentations && data.presentations.length > 0) {
          // If no active presentation, select the first one
          setCurrentPresentationId(data.presentations[0].id);
          setPresentationItems(data.presentations[0].presentationItems || []);
        } else {
          // No presentations at all - auto-create a default one
          console.log('No presentations found for vendor, creating default presentation...');
          try {
            const res = await fetch('/api/rep/presentations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'create',
                customerId: undefined,
                vendor: vendorFilter,
                name: 'Default Presentation'
              }),
            });
            const createData = await res.json();
            if (createData.presentation) {
              setPresentations([createData.presentation]);
              setCurrentPresentationId(createData.presentation.id);
              setPresentationItems([]);
              toast({
                title: 'Presentation created',
                description: 'A default presentation has been created for this vendor.',
              });
            }
          } catch (error) {
            console.error('Failed to auto-create presentation:', error);
            setCurrentPresentationId(null);
            setPresentationItems([]);
          }
        }
      })
      .catch(error => {
        console.error('Error loading presentations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load presentations',
          variant: 'destructive',
        });
      });
  }, [vendorFilter, toast]);

  // Initialize presentation items from promotion data (legacy support)
  React.useEffect(() => {
    if (!promotion?.presentationItems && !promotion?.collections) return;
    // Only initialize if we don't have presentations loaded
    if (presentations.length > 0) return;

    // If we have presentationItems, use those
    if (promotion.presentationItems && promotion.presentationItems.length > 0) {
      setPresentationItems(promotion.presentationItems);
      return;
    }

    // Otherwise, convert legacy collections format to presentation items
    if (promotion.collections) {
      const items: PresentationItem[] = [];
      let order = 0;

      for (const savedCollection of promotion.collections) {
        const collection = collections.find(c => c.name === savedCollection.collectionName);
        if (!collection) continue;

        const slug = collection.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-collection';

        // Check both new collection media and legacy videos
        const collectionMedia = collection.vendor ? collectionMediaData[collection.vendor]?.[collection.name] : undefined;
        const hasNewMedia = collectionMedia?.mediaType && collectionMedia.mediaType !== 'none';
        const legacyVideoUrl = (collectionVideos as Record<string, string>)[slug];

        const videoUrl = hasNewMedia ? 'has-media' : (legacyVideoUrl || null);

        const years = savedCollection.includeAllYears ? collection.years : savedCollection.years || [];

        items.push({
          id: `${savedCollection.collectionName}-${Date.now()}-${order}`,
          type: 'collection',
          order,
          collectionData: {
            collectionName: savedCollection.collectionName,
            productCount: collection.itemCount,
            heroVideoUrl: videoUrl || undefined,
            vendor: collection.vendor,
            includeAllYears: savedCollection.includeAllYears,
            years: years,
          },
          properties: {
            startExpanded: false,
            showProductCount: true,
            badges: [],
          },
        });
        order++;
      }

      setPresentationItems(items);
    }
  }, [promotion, collections, presentations.length]);

  // Flatten collections into individual collection-year items
  const flattenedItems: FlattenedCollectionItem[] = useMemo(() => {
    const items: FlattenedCollectionItem[] = [];

    for (const collection of collections) {
      // Create slug matching the format in collection-videos.json
      const slug = collection.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-collection';

      // Check both new collection media and legacy videos
      const collectionMedia = collection.vendor ? collectionMediaData[collection.vendor]?.[collection.name] : undefined;
      const hasNewMedia = collectionMedia?.mediaType && collectionMedia.mediaType !== 'none';
      const legacyVideoUrl = (collectionVideos as Record<string, string>)[slug];

      const videoUrl = hasNewMedia ? 'has-media' : (legacyVideoUrl || null);

      // Handle collections with no years (e.g., Lib&Co products)
      const yearsToUse = collection.years.length > 0 ? collection.years : [0];

      for (const year of yearsToUse) {
        items.push({
          id: `${collection.name}-${year}`,
          collectionName: collection.name,
          year,
          vendor: collection.vendor,
          itemCount: collection.itemCount,
          videoUrl,
        });
      }
    }

    return items;
  }, [collections, collectionMediaData, collectionVideos]);

  // Get unique vendors and years
  const allVendors = useMemo(() => {
    const vendors = new Set<string>();
    flattenedItems.forEach((item) => {
      if (item.vendor) vendors.add(item.vendor);
    });
    return Array.from(vendors).sort();
  }, [flattenedItems]);

  const allYears = useMemo(() => {
    const years = new Set<number>();
    // Only include years from items matching the current vendor filter
    // and exclude year 0 (placeholder for "All Years")
    flattenedItems
      .filter((item) => item.vendor === vendorFilter && item.year !== 0)
      .forEach((item) => years.add(item.year));
    return Array.from(years).sort((a, b) => b - a); // Newest first
  }, [flattenedItems, vendorFilter]);

  // Auto-select first available vendor if current vendor is not in the list
  React.useEffect(() => {
    console.log('[CollectionsManager] Available vendors:', allVendors);
    console.log('[CollectionsManager] Current vendorFilter:', vendorFilter);

    if (allVendors.length > 0 && !allVendors.includes(vendorFilter)) {
      console.log('[CollectionsManager] Vendor filter not in list, switching to:', allVendors[0]);
      setVendorFilter(allVendors[0]);
    }
  }, [allVendors, vendorFilter]);

  // Sort collections helper
  const sortCollections = (items: FlattenedCollectionItem[]) => {
    switch (sortBy) {
      case 'name-asc':
        return [...items].sort((a, b) => a.collectionName.localeCompare(b.collectionName));
      case 'name-desc':
        return [...items].sort((a, b) => b.collectionName.localeCompare(a.collectionName));
      case 'date-newest':
        return [...items].sort((a, b) => b.year - a.year);
      case 'date-oldest':
        return [...items].sort((a, b) => a.year - b.year);
      default:
        return items;
    }
  };

  // Filter items based on search, year, and vendor
  const filteredItems = useMemo(() => {
    // Get collection names already in presentation
    const presentationCollectionNames = new Set(
      presentationItems
        .filter(item => item.type === 'collection')
        .map(item => item.collectionData?.collectionName)
    );

    const filtered = flattenedItems
      .filter((item) => {
        const matchesSearch = item.collectionName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesYear = selectedYears.size === 0 || selectedYears.has(item.year);
        const matchesVendor = item.vendor === vendorFilter;
        const notInPresentation = !presentationCollectionNames.has(item.collectionName);
        return matchesSearch && matchesYear && matchesVendor && notInPresentation;
      });

    return sortCollections(filtered);
  }, [flattenedItems, searchQuery, selectedYears, vendorFilter, presentationItems, sortBy]);

  // Vendor name mapping
  const vendorNames: Record<string, string> = {
    'lib-and-co': 'Lib & Co',
    'savoy-house': 'Savoy House',
    'hubbardton-forge': 'Hubbardton Forge',
  };

  // Get current presentation and vendor names
  const currentPresentation = presentations.find(p => p.id === currentPresentationId);
  const presentationName = currentPresentation?.name;
  const vendorName = vendorNames[vendorFilter] || vendorFilter;

  // Filter presentation items to only show current vendor
  const filteredPresentationItems = useMemo(() => {
    return presentationItems.filter(item => {
      if (item.type === 'collection' && item.collectionData) {
        return item.collectionData.vendor === vendorFilter;
      }
      return true; // Keep non-collection items
    });
  }, [presentationItems, vendorFilter]);

  // Helper functions
  const addToPresentation = (id: string) => {
    const flatItem = flattenedItems.find(item => item.id === id);
    if (!flatItem) return;

    const collection = collections.find(c => c.name === flatItem.collectionName);
    if (!collection) return;

    const newItem: PresentationItem = {
      id: `${flatItem.collectionName}-${Date.now()}`,
      type: 'collection',
      order: presentationItems.length,
      collectionData: {
        collectionName: flatItem.collectionName,
        productCount: collection.itemCount,
        heroVideoUrl: flatItem.videoUrl || undefined,
        vendor: collection.vendor,
        includeAllYears: true,
        years: collection.years,
      },
      properties: {
        startExpanded: false,
        showProductCount: true,
        badges: [],
      },
    };

    setPresentationItems([...presentationItems, newItem]);
  };

  const removeFromPresentation = (id: string) => {
    setPresentationItems(presentationItems.filter(item => item.id !== id));
    if (inspectorTarget === id) {
      setInspectorTarget(null);
    }
  };

  const handleReorder = (oldIndex: number, newIndex: number) => {
    setPresentationItems((items) => {
      const reordered = arrayMove(items, oldIndex, newIndex);
      // Update order property to match new positions
      return reordered.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const handlePropertyUpdate = (id: string, properties: Partial<PresentationItemProperties>) => {
    setPresentationItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, properties: { ...item.properties, ...properties } }
          : item
      )
    );
  };

  const toggleItem = (id: string) => {
    const isInPresentation = presentationItems.some(item =>
      item.collectionData?.collectionName === flattenedItems.find(fi => fi.id === id)?.collectionName
    );

    if (isInPresentation) {
      const flatItem = flattenedItems.find(fi => fi.id === id);
      if (flatItem) {
        const presentationItem = presentationItems.find(
          item => item.collectionData?.collectionName === flatItem.collectionName
        );
        if (presentationItem) {
          removeFromPresentation(presentationItem.id);
        }
      }
    } else {
      addToPresentation(id);
    }
  };

  const toggleYearFilter = (year: number) => {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const handleBulkAdd = () => {
    bulkSelected.forEach(id => addToPresentation(id));
    setBulkSelected(new Set());
  };

  const handleMoveUp = (id: string) => {
    const index = presentationItems.findIndex(item => item.id === id);
    if (index > 0) {
      handleReorder(index, index - 1);
    }
  };

  const handleMoveDown = (id: string) => {
    const index = presentationItems.findIndex(item => item.id === id);
    if (index < presentationItems.length - 1) {
      handleReorder(index, index + 1);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = presentationItems.findIndex(item => item.id === active.id);
      const newIndex = presentationItems.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        handleReorder(oldIndex, newIndex);
      }
    }
  };

  // Presentation management handlers
  const handleCreatePresentation = async (name: string) => {
    try {
      const res = await fetch('/api/rep/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', customerId: undefined, vendor: vendorFilter, name }),
      });
      const data = await res.json();
      setPresentations([...presentations, data.presentation]);
      setCurrentPresentationId(data.presentation.id);
      setPresentationItems([]);
      toast({
        title: 'Success',
        description: 'Presentation created successfully',
      });
    } catch (error) {
      console.error('Error creating presentation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create presentation',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePresentation = async (id: string) => {
    try {
      await fetch('/api/rep/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', customerId: undefined, vendor: vendorFilter, presentationId: id }),
      });
      const newPresentations = presentations.filter(p => p.id !== id);
      setPresentations(newPresentations);
      if (currentPresentationId === id && newPresentations.length > 0) {
        setCurrentPresentationId(newPresentations[0].id);
        setPresentationItems(newPresentations[0].presentationItems || []);
      }
      toast({
        title: 'Success',
        description: 'Presentation deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting presentation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete presentation',
        variant: 'destructive',
      });
    }
  };

  const handleRenamePresentation = async (id: string, newName: string) => {
    try {
      const res = await fetch('/api/rep/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', customerId: undefined, vendor: vendorFilter, presentationId: id, updates: { name: newName } }),
      });
      const data = await res.json();
      setPresentations(presentations.map(p => p.id === id ? data.presentation : p));
      toast({
        title: 'Success',
        description: 'Presentation renamed successfully',
      });
    } catch (error) {
      console.error('Error renaming presentation:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename presentation',
        variant: 'destructive',
      });
    }
  };

  const handleSetActivePresentation = async (id: string) => {
    try {
      await fetch('/api/rep/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setActive', customerId: undefined, vendor: vendorFilter, presentationId: id }),
      });
      setPresentations(presentations.map(p => ({ ...p, isActive: p.id === id })));
      toast({
        title: 'Success',
        description: 'Active presentation updated',
      });
    } catch (error) {
      console.error('Error setting active presentation:', error);
      toast({
        title: 'Error',
        description: 'Failed to set active presentation',
        variant: 'destructive',
      });
    }
  };

  const handleSelectPresentation = (id: string) => {
    const presentation = presentations.find(p => p.id === id);
    if (presentation) {
      setCurrentPresentationId(id);
      setPresentationItems(presentation.presentationItems || []);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentPresentationId) {
        throw new Error('No presentation selected');
      }

      // Filter out items that don't belong to the current vendor
      const validItems = presentationItems.filter(item => {
        if (item.type === 'collection' && item.collectionData) {
          return item.collectionData.vendor === vendorFilter;
        }
        return true; // Keep non-collection items
      });

      // Update local state to remove filtered items
      if (validItems.length !== presentationItems.length) {
        setPresentationItems(validItems);
      }

      // Update the current presentation
      const response = await fetch('/api/rep/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          customerId: undefined, // Global presentation (no customer-specific)
          vendor: vendorFilter,
          presentationId: currentPresentationId,
          updates: {
            presentationItems: validItems,
            collections: validItems
              .filter(item => item.type === 'collection')
              .map(item => ({
                collectionName: item.collectionData!.collectionName,
                years: item.collectionData!.years,
                includeAllYears: item.collectionData!.includeAllYears ?? true,
              })),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save presentation' }));
        throw new Error(error.error ?? 'Failed to save presentation');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Presentation saved',
        description: 'Your changes have been saved successfully.'
      });
      queryClient.invalidateQueries({ queryKey: ['promotion-config'] });
      router.refresh();
    },
    onError: (error) => {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    },
  });

  // Helper to convert seconds to MM:SS format
  const secondsToTimeFormat = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to convert MM:SS format to seconds
  const timeFormatToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      return mins * 60 + secs;
    }
    // If just a number, treat as seconds
    return parseInt(timeStr) || 0;
  };

  // Helper to check if URL is YouTube (accepts multiple formats)
  const isYouTubeUrl = (url: string): boolean => {
    if (url.startsWith('youtube:')) return true;
    if (url.includes('youtube.com') || url.includes('youtu.be')) return true;
    return false;
  };

  // Helper to convert YouTube URL to youtube:VIDEO_ID format
  const convertToYouTubeFormat = (url: string): string => {
    // Already in youtube:VIDEO_ID format
    if (url.startsWith('youtube:')) return url;

    // Extract video ID from various YouTube URL formats
    try {
      const urlObj = new URL(url);

      // https://www.youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return `youtube:${videoId}`;
      }

      // https://youtu.be/VIDEO_ID
      if (urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.pathname.slice(1).split('?')[0];
        if (videoId) return `youtube:${videoId}`;
      }
    } catch {
      // If URL parsing fails, return original
      return url;
    }

    return url;
  };

  const openVideoDialog = (item: FlattenedCollectionItem) => {
    setEditingVideoItem(item);

    // Parse video URL for time parameters if it exists
    if (item.videoUrl) {
      // Check if it's a JSON object with time parameters
      try {
        const parsed = JSON.parse(item.videoUrl);
        if (typeof parsed === 'object' && parsed.url) {
          setVideoUrlInput(parsed.url);
          setStartTimeInput(parsed.startTime ? secondsToTimeFormat(parsed.startTime) : '');
          setEndTimeInput(parsed.endTime ? secondsToTimeFormat(parsed.endTime) : '');
        } else {
          setVideoUrlInput(item.videoUrl);
          setStartTimeInput('');
          setEndTimeInput('');
        }
      } catch {
        // Not JSON, just a plain URL
        setVideoUrlInput(item.videoUrl);
        setStartTimeInput('');
        setEndTimeInput('');
      }
    } else {
      setVideoUrlInput('');
      setStartTimeInput('');
      setEndTimeInput('');
    }

    setVideoDialogOpen(true);
  };

  const handleSaveVideo = async () => {
    if (!editingVideoItem) return;

    // Convert YouTube URL to standard format
    let finalUrl = videoUrlInput;
    if (isYouTubeUrl(videoUrlInput)) {
      finalUrl = convertToYouTubeFormat(videoUrlInput);
    }

    // If we have time parameters, create JSON object (works for both YouTube and MP4)
    if (startTimeInput || endTimeInput) {
      const videoConfig = {
        url: finalUrl,
        ...(startTimeInput && { startTime: timeFormatToSeconds(startTimeInput) }),
        ...(endTimeInput && { endTime: timeFormatToSeconds(endTimeInput) }),
      };
      finalUrl = JSON.stringify(videoConfig);
    }

    // Create collection slug
    const slug = editingVideoItem.collectionName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') + '-collection';

    try {
      const response = await fetch('/api/rep/collections/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionSlug: slug,
          videoUrl: finalUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save video URL');
      }

      toast({
        title: 'Success',
        description: `Video URL saved for ${editingVideoItem.collectionName}`,
      });

      // Refresh the page to show updated video
      window.location.reload();
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: 'Error',
        description: 'Failed to save video URL',
        variant: 'destructive',
      });
    }
  };

  // Get video thumbnail helper
  const getVideoThumbnail = (videoUrl: string | null) => {
    if (!videoUrl) return null;

    if (videoUrl.startsWith('youtube:')) {
      const youtubeId = videoUrl.replace('youtube:', '');
      return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    }

    // For MP4 videos, we'll show a placeholder
    return null;
  };

  const selectedItem = presentationItems.find(item => item.id === inspectorTarget) || null;

  return (
    <div className="space-y-6">
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-6 px-6">
        {/* Top Row: Vendor, Presentation, Save */}
        <div className="flex h-16 items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold whitespace-nowrap">Presentation Builder</h1>
            <Select value={vendorFilter} onValueChange={(value) => {
              setVendorFilter(value);
              setSelectedYears(new Set()); // Clear year filter when vendor changes
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select vendor..." />
              </SelectTrigger>
              <SelectContent>
                {allVendors.map((vendor) => {
                  const vendorName = vendor === 'lib-and-co' ? 'Lib&Co' : vendor === 'savoy-house' ? 'Savoy House' : vendor === 'hubbardton-forge' ? 'Hubbardton Forge' : vendor;
                  return (
                    <SelectItem key={vendor} value={vendor}>
                      {vendorName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {vendorFilter && presentations.length > 0 && (
              <div className="relative z-50">
                <PresentationSelector
                  presentations={presentations}
                  currentPresentationId={currentPresentationId}
                  onSelect={handleSelectPresentation}
                  onCreate={handleCreatePresentation}
                  onDelete={handleDeletePresentation}
                  onRename={handleRenamePresentation}
                  onSetActive={handleSetActivePresentation}
                />
              </div>
            )}
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || presentationItems.length === 0 || !currentPresentationId}
            size="sm"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Presentation'}
          </Button>
        </div>

        {/* Bottom Row: Customer Preview Controls */}
        <div className="flex h-12 items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Customer Preview:</span>
          <Select
            value={selectedCustomerId ?? 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                setSelectedCustomerId(null);
                setShowCustomerPreview(false);
              } else {
                setSelectedCustomerId(value);
              }
            }}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select customer..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No customer selected</SelectItem>
              {customers.map((customer: any) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCustomerId && (
            <>
              <Button
                variant={showCustomerPreview ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowCustomerPreview(!showCustomerPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showCustomerPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!currentPresentationId) {
                    toast({
                      title: 'Cannot Open',
                      description: 'Please select a presentation first.',
                      variant: 'destructive',
                    });
                    return;
                  }

                  const previewUrl = `/customers/${selectedCustomerId}?tab=collections&vendor=${vendorFilter}`;
                  window.open(previewUrl, '_blank');
                }}
                disabled={!currentPresentationId}
              >
                Open in New Tab
              </Button>
            </>
          )}
        </div>
      </header>

      {/* CUSTOMER PREVIEW PANEL */}
      {showCustomerPreview && selectedCustomerId && (
        <div className="bg-muted/30 border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                Customer Preview: {customers.find((c: any) => c.id === selectedCustomerId)?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                This shows what the customer sees in their Collections tab
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomerPreview(false)}
            >
              Close
            </Button>
          </div>

          {customerPresentationQuery.isLoading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading customer presentation data...
            </div>
          )}

          {customerPresentationQuery.isError && (
            <div className="py-12 text-center text-sm text-destructive">
              Failed to load customer presentation data
            </div>
          )}

          {customerPresentationData && (
            <div className="space-y-4">
              {/* Market Selection Status */}
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${customerPresentationData.hasMarketSelection ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <h3 className="font-medium">
                      {customerPresentationData.hasMarketSelection ? 'Has Market Selection' : 'No Market Selection'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {customerPresentationData.hasMarketSelection
                        ? `This customer has a Dallas market order. Collections are split into "Your Market Selection" (${customerPresentationData.selectedCollections.length} collections) and "Browse More Collections" (${customerPresentationData.otherCollections.length} collections).`
                        : `This customer does not have a Dallas market order. They will see all ${customerPresentationData.allCollections.length} collections in a single section.`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Collections Preview */}
              <div className="bg-background rounded-lg p-4 border">
                <h3 className="font-medium mb-3">Collections Overview</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {customerPresentationData.hasMarketSelection && customerPresentationData.selectedCollections.length > 0 && (
                    <>
                      <div className="text-sm font-medium text-primary">Your Market Selection ({customerPresentationData.selectedCollections.length})</div>
                      {customerPresentationData.selectedCollections.map((collection: any) => (
                        <div key={collection.collectionName} className="text-sm pl-4 py-1 border-l-2 border-primary/30">
                          {collection.collectionName} ({collection.products.length} products)
                        </div>
                      ))}
                      <div className="h-px bg-border my-2" />
                    </>
                  )}

                  {customerPresentationData.hasMarketSelection && customerPresentationData.otherCollections.length > 0 && (
                    <>
                      <div className="text-sm font-medium text-muted-foreground">Browse More Collections ({customerPresentationData.otherCollections.length})</div>
                      {customerPresentationData.otherCollections.map((collection: any) => (
                        <div key={collection.collectionName} className="text-sm pl-4 py-1 border-l-2 border-muted-foreground/30">
                          {collection.collectionName} ({collection.products.length} products)
                        </div>
                      ))}
                    </>
                  )}

                  {!customerPresentationData.hasMarketSelection && customerPresentationData.allCollections.length > 0 && (
                    <>
                      <div className="text-sm font-medium">All Collections ({customerPresentationData.allCollections.length})</div>
                      {customerPresentationData.allCollections.map((collection: any) => (
                        <div key={collection.collectionName} className="text-sm pl-4 py-1 border-l-2 border-border">
                          {collection.collectionName} ({collection.products.length} products)
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* THREE-PANE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr,320px] gap-6">
        {/* LEFT PANE: Source Library */}
        <div>
          {/* Source Library - Consolidated */}
          <Card>
            <CardHeader className="pb-4 space-y-4">
              {/* Search Bar as Header */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* Sort & Filter Controls */}
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Sort..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="date-newest">Date Added (Newest)</SelectItem>
                    <SelectItem value="date-oldest">Date Added (Oldest)</SelectItem>
                  </SelectContent>
                </Select>

                {allYears.length > 0 ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 relative">
                        <Filter className="h-4 w-4" />
                        {selectedYears.size > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                            {selectedYears.size}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Filter by Year</h4>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {allYears.map((year) => (
                              <div key={year} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`year-${year}`}
                                  checked={selectedYears.has(year)}
                                  onCheckedChange={() => toggleYearFilter(year)}
                                />
                                <Label htmlFor={`year-${year}`} className="text-sm font-normal cursor-pointer">
                                  {year}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        {selectedYears.size > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedYears(new Set())}
                            className="w-full"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" disabled title="No year data available for this vendor">
                    <Filter className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Item Count */}
              <CardDescription className="text-xs">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No items available
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredItems.map((item) => {
                    const thumbnail = getVideoThumbnail(item.videoUrl);
                    const isSelected = bulkSelected.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className="relative group cursor-pointer bg-card border rounded-lg overflow-hidden hover:shadow-md hover:border-primary transition-all"
                      >
                        {/* Bulk Selection Checkbox */}
                        <div
                          className="absolute top-2 left-2 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBulkSelected(prev => {
                              const next = new Set(prev);
                              if (next.has(item.id)) {
                                next.delete(item.id);
                              } else {
                                next.add(item.id);
                              }
                              return next;
                            });
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            className="bg-background border-2"
                          />
                        </div>

                        {/* Thumbnail */}
                        <div
                          className="aspect-video bg-muted relative"
                          onClick={() => toggleItem(item.id)}
                        >
                          {item.videoUrl ? (
                            thumbnail ? (
                              <img src={thumbnail} alt={item.collectionName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30">
                                <VideoIcon className="w-6 h-6 text-green-700 dark:text-green-400" />
                              </div>
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700">
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}

                          {/* Video indicator badge - always visible */}
                          {item.videoUrl && (
                            <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-md">
                              <VideoIcon className="w-3 h-3" />
                              VIDEO
                            </div>
                          )}

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                              + Add
                            </div>
                          </div>

                          {/* Video edit button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openVideoDialog(item);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 bg-background/90 hover:bg-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            {item.videoUrl ? (
                              <VideoIcon className="w-3 h-3 text-green-600" />
                            ) : (
                              <PlusCircleIcon className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Info */}
                        <div className="p-2" onClick={() => toggleItem(item.id)}>
                          <div className="font-medium text-xs truncate">{item.collectionName}</div>
                          <div className="text-[10px] text-muted-foreground">{item.year === 0 ? 'All Years' : item.year} • {item.itemCount} items</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CENTER PANE: Presentation Canvas */}
        <div className="space-y-4">
          {/* Presentation Canvas with Drag-and-Drop */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Your Presentation</span>
                {filteredPresentationItems.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">Drag to reorder</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPresentationItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm">No items in presentation</p>
                  <p className="text-xs mt-2">Click items from the left panel to add them</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
                >
                  <SortableContext
                    items={filteredPresentationItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {filteredPresentationItems.map((item, index) => (
                        <SortableListItem
                          key={item.id}
                          item={item}
                          index={index}
                          isSelected={inspectorTarget === item.id}
                          onSelect={() => setInspectorTarget(item.id)}
                          onRemove={() => removeFromPresentation(item.id)}
                          getVideoThumbnail={getVideoThumbnail}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      (() => {
                        const draggedItem = presentationItems.find(item => item.id === activeId);
                        if (!draggedItem) return null;
                        return (
                          <div className="flex items-center gap-2">
                            <div className="p-1">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <CollectionListRow
                                item={draggedItem}
                                isSelected={false}
                                onSelect={() => {}}
                                onRemove={() => {}}
                                isDragOverlay={true}
                              />
                            </div>
                          </div>
                        );
                      })()
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANE: Properties Inspector */}
        <div className="space-y-4">
          <PropertiesInspector
            selectedItem={selectedItem}
            onUpdate={handlePropertyUpdate}
            presentationItems={filteredPresentationItems}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            presentationName={presentationName}
            vendorName={vendorName}
          />
        </div>
      </div>

      {/* Bulk Selection Floating Action Bar */}
      {bulkSelected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-2xl border-2 border-primary">
            <CardContent className="p-4 flex items-center gap-4">
              <Badge variant="muted">{bulkSelected.size} selected</Badge>
              <Button onClick={handleBulkAdd}>Add to Presentation</Button>
              <Button variant="ghost" onClick={() => setBulkSelected(new Set())}>Cancel</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video URL Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hero Video URL</DialogTitle>
            <DialogDescription>
              {editingVideoItem && (
                <>
                  Managing video for <strong>{editingVideoItem.collectionName}</strong> ({editingVideoItem.year})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="e.g., https://www.youtube.com/watch?v=... or https://cdn.shopify.com/..."
              />
              <p className="text-xs text-muted-foreground">
                For YouTube videos: Paste the full YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
                <br />
                For direct MP4 videos: Use the full CDN URL
              </p>
            </div>

            <div className={`space-y-3 pt-2 border-t transition-opacity ${!videoUrlInput ? 'opacity-50' : ''}`}>
              <div>
                <Label className="text-sm font-medium">Video Time Range (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {videoUrlInput
                    ? 'Enter start and end times to loop a specific section of the video'
                    : 'Enter a video URL first to enable time range looping'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="text-xs">
                    Start Time (MM:SS)
                  </Label>
                  <Input
                    id="start-time"
                    type="text"
                    value={startTimeInput}
                    onChange={(e) => setStartTimeInput(e.target.value)}
                    placeholder="e.g., 1:25"
                    disabled={!videoUrlInput}
                    className={!videoUrlInput ? 'cursor-not-allowed' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time" className="text-xs">
                    End Time (MM:SS)
                  </Label>
                  <Input
                    id="end-time"
                    type="text"
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    placeholder="e.g., 2:15"
                    disabled={!videoUrlInput}
                    className={!videoUrlInput ? 'cursor-not-allowed' : ''}
                  />
                </div>
              </div>

              {videoUrlInput && (startTimeInput || endTimeInput) && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  The video will loop between these times when displayed
                </p>
              )}
            </div>

            {/* Video Preview */}
            {isYouTubeUrl(videoUrlInput) && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                  <YouTubeLoopPlayer
                    videoId={convertToYouTubeFormat(videoUrlInput).replace('youtube:', '')}
                    startTime={startTimeInput ? timeFormatToSeconds(startTimeInput) : undefined}
                    endTime={endTimeInput ? timeFormatToSeconds(endTimeInput) : undefined}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Preview shows how the video will loop. The video will automatically jump back to the start time when it reaches the end time.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVideo}>
              Save Video URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
