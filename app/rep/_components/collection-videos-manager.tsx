'use client';

import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Search, VideoIcon, PlusCircleIcon, Edit, Trash2, Play, Pause, SkipBack, SkipForward, Image as ImageIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CollectionImageGallery } from './collection-image-gallery';
import collectionVideos from '@/data/collection-videos.json';
import vendorVideoLibraryData from '@/data/vendor-video-library.json';
import type { CollectionMedia, MediaType } from '@/lib/selections/types';

type CollectionWithMeta = {
  name: string;
  itemCount: number;
  years: number[];
  vendor: string;
};

interface CollectionVideosManagerProps {
  collections: CollectionWithMeta[];
}

interface Chapter {
  title: string;
  startTime: number;
}

interface VideoScrubberProps {
  videoUrl: string;
  startTime?: number;
  endTime?: number;
  onTimeRangeChange: (start: number | undefined, end: number | undefined) => void;
  vendor: string;
  collectionName: string;
  mediaConfig: CollectionMedia;
}

function VideoScrubber({ videoUrl, startTime, endTime, onTimeRangeChange, vendor, collectionName, mediaConfig }: VideoScrubberProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveStartTime = startTime ?? 0;
  const effectiveEndTime = endTime ?? duration;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (startTime !== undefined) {
        video.currentTime = startTime;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Auto-loop within range
      if (endTime !== undefined && video.currentTime >= endTime) {
        video.currentTime = startTime ?? 0;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [startTime, endTime]);

  // Auto-save with debouncing
  const autoSave = async (updatedConfig: CollectionMedia) => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/rep/collection-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor,
          collection: collectionName,
          mediaConfig: updatedConfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      console.log('Auto-saved time range:', updatedConfig.mp4StartTime, '-', updatedConfig.mp4EndTime);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save when time range changes
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1 second after last change)
    saveTimeoutRef.current = setTimeout(() => {
      const updatedConfig = {
        ...mediaConfig,
        mp4StartTime: startTime,
        mp4EndTime: endTime,
      };
      autoSave(updatedConfig);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [startTime, endTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const wholeSecs = Math.floor(seconds % 60);
    const halfSec = (seconds % 1) >= 0.5 ? '.5' : '';
    return `${mins}:${wholeSecs.toString().padStart(2, '0')}${halfSec}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current || duration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = percent * duration;
    videoRef.current.currentTime = time;
  };

  const handleMarkerDrag = (e: React.MouseEvent, type: 'start' | 'end') => {
    e.preventDefault();
    const markerType = type;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!timelineRef.current || duration === 0) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      // Round to 0.5 second precision
      const time = Math.round(percent * duration * 2) / 2;

      if (markerType === 'start') {
        const maxStart = endTime !== undefined ? endTime - 0.5 : duration - 0.5;
        const newStart = Math.min(time, maxStart);
        onTimeRangeChange(newStart === 0 ? undefined : newStart, endTime);
      } else {
        const minEnd = startTime !== undefined ? startTime + 0.5 : 0.5;
        const newEnd = Math.max(time, minEnd);
        onTimeRangeChange(startTime, newEnd >= duration ? undefined : newEnd);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (markerType === 'start') setIsDraggingStart(true);
    else setIsDraggingEnd(true);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const clearTimeRange = () => {
    onTimeRangeChange(undefined, undefined);
  };

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">Loop Range Preview</Label>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Saving...
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatTime(effectiveStartTime)} - {formatTime(effectiveEndTime)}
          </span>
          {(startTime !== undefined || endTime !== undefined) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTimeRange}
              className="h-7 text-xs"
            >
              Clear Range
            </Button>
          )}
        </div>
      </div>

      {/* Video Player */}
      <div className="relative aspect-video bg-black rounded-md overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full"
          playsInline
          muted
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70"
            onClick={togglePlayPause}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="space-y-2">
        <div
          ref={timelineRef}
          className="relative h-12 bg-background rounded-md border cursor-pointer"
          onClick={handleTimelineClick}
        >
          {/* Loop range highlight */}
          {duration > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-primary/20 border-l-2 border-r-2 border-primary"
              style={{
                left: `${(effectiveStartTime / duration) * 100}%`,
                right: `${100 - (effectiveEndTime / duration) * 100}%`,
              }}
            />
          )}

          {/* Current time indicator */}
          {duration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          )}

          {/* Start marker */}
          {duration > 0 && (
            <div
              className={`absolute top-0 bottom-0 w-1 bg-green-500 cursor-ew-resize z-20 hover:w-2 transition-all ${
                isDraggingStart ? 'w-2' : ''
              }`}
              style={{ left: `${(effectiveStartTime / duration) * 100}%` }}
              onMouseDown={(e) => handleMarkerDrag(e, 'start')}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap bg-green-500 text-white px-1.5 py-0.5 rounded">
                {formatTime(effectiveStartTime)}
              </div>
            </div>
          )}

          {/* End marker */}
          {duration > 0 && (
            <div
              className={`absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize z-20 hover:w-2 transition-all ${
                isDraggingEnd ? 'w-2' : ''
              }`}
              style={{ left: `${(effectiveEndTime / duration) * 100}%` }}
              onMouseDown={(e) => handleMarkerDrag(e, 'end')}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap bg-blue-500 text-white px-1.5 py-0.5 rounded">
                {formatTime(effectiveEndTime)}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Drag the <span className="text-green-500 font-medium">green</span> marker to set loop start,
          <span className="text-blue-500 font-medium"> blue</span> marker to set loop end.
          Click anywhere on the timeline to preview that moment.
        </p>
      </div>
    </div>
  );
}

export default function CollectionVideosManager({ collections }: CollectionVideosManagerProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionWithMeta | null>(null);

  // Media configuration state
  const [mediaConfig, setMediaConfig] = useState<CollectionMedia>({
    mediaType: 'none',
  });

  // Legacy video data (for collections still using old format)
  const [videoData, setVideoData] = useState<Record<string, string>>(collectionVideos as Record<string, string>);

  // Collection media data (new format) - keyed by vendor/collection
  const [collectionMediaData, setCollectionMediaData] = useState<Record<string, Record<string, CollectionMedia>>>({});

  // Video player state
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);

  // YouTube chapters state
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Auto-match state
  const [showAutoMatchDialog, setShowAutoMatchDialog] = useState(false);
  const [autoMatchVendor, setAutoMatchVendor] = useState<string>('');
  const [batchVideoUrl, setBatchVideoUrl] = useState<string>('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [matchedCollections, setMatchedCollections] = useState<Array<{
    chapter: Chapter;
    collection: CollectionWithMeta | null;
    confidence: number;
    videoUrl?: string;
  }>>([]);

  // Get unique vendors
  const allVendors = useMemo(() => {
    const vendors = new Set<string>();
    collections.forEach((collection) => {
      if (collection.vendor) vendors.add(collection.vendor);
    });
    return Array.from(vendors).sort();
  }, [collections]);

  // Get unique years
  const allYears = useMemo(() => {
    const years = new Set<number>();
    collections.forEach((collection) => {
      if (collection.years && collection.years.length > 0) {
        collection.years.forEach(year => years.add(year));
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  }, [collections]);

  // Vendor name mapping
  const vendorNames: Record<string, string> = {
    'lib-and-co': 'Lib & Co',
    'savoy-house': 'Savoy House',
    'hubbardton-forge': 'Hubbardton Forge',
  };

  // Filter collections
  const filteredCollections = useMemo(() => {
    return collections
      .filter((collection) => {
        const matchesSearch = collection.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesVendor = vendorFilter === 'all' || collection.vendor === vendorFilter;
        const matchesYear = yearFilter === 'all' || (collection.years && collection.years.includes(parseInt(yearFilter)));
        return matchesSearch && matchesVendor && matchesYear;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collections, searchQuery, vendorFilter, yearFilter]);

  // Helper to create collection slug
  const getCollectionSlug = (collectionName: string) => {
    return collectionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-collection';
  };

  // Helper to check if URL is YouTube
  const isYouTubeUrl = (url: string): boolean => {
    if (url.startsWith('youtube:')) return true;
    if (url.includes('youtube.com') || url.includes('youtu.be')) return true;
    return false;
  };

  // Helper to convert YouTube URL to youtube:VIDEO_ID format
  const convertToYouTubeFormat = (url: string): string => {
    if (url.startsWith('youtube:')) return url;

    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return `youtube:${videoId}`;
      }
      if (urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.pathname.slice(1).split('?')[0];
        if (videoId) return `youtube:${videoId}`;
      }
    } catch {
      return url;
    }

    return url;
  };

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
    return parseInt(timeStr) || 0;
  };

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1).split('?')[0];
      }
    } catch {
      // If URL parsing fails, try regex
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  // Load all collection media data on mount
  useEffect(() => {
    const loadAllCollectionMedia = async () => {
      try {
        const response = await fetch('/api/rep/collection-media');
        const result = await response.json();
        if (result.data) {
          setCollectionMediaData(result.data);
        }
      } catch (error) {
        console.error('Error loading collection media:', error);
      }
    };

    loadAllCollectionMedia();
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Update video ID when mediaConfig changes
  useEffect(() => {
    if (mediaConfig.mediaType === 'youtube' && mediaConfig.youtubeUrl) {
      const id = extractYouTubeId(mediaConfig.youtubeUrl);
      setVideoId(id);
      if (!id) {
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        setChapters([]);
        setSelectedChapter('');
      }
    } else {
      setVideoId(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setChapters([]);
      setSelectedChapter('');
    }
  }, [mediaConfig.mediaType, mediaConfig.youtubeUrl]);

  // Fetch YouTube chapters when video ID changes
  useEffect(() => {
    if (!videoId) return;

    const fetchChapters = async () => {
      setLoadingChapters(true);
      try {
        const response = await fetch(`/api/youtube/chapters?videoId=${videoId}`);
        const data = await response.json();

        if (data.chapters && data.chapters.length > 0) {
          setChapters(data.chapters);
          toast({
            title: 'Chapters loaded',
            description: `Found ${data.chapters.length} chapters in this video`,
          });
        } else {
          setChapters([]);
          console.log('No chapters found for video:', videoId);
          toast({
            title: 'No chapters found',
            description: 'This video doesn\'t have chapters, or they couldn\'t be loaded',
            variant: 'default',
          });
        }
      } catch (error) {
        console.error('Error fetching chapters:', error);
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [videoId, toast]);

  // Initialize YouTube player when video ID is available
  useEffect(() => {
    if (!videoId || !mediaDialogOpen || typeof window === 'undefined') return;

    const initPlayer = () => {
      if (playerRef.current) return; // Already initialized

      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          controls: 1,
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            setDuration(event.target.getDuration());
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === 1); // 1 = playing
          },
        },
      });

      // Update current time periodically
      const interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 100);

      return () => clearInterval(interval);
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, mediaDialogOpen]);

  // Player control functions
  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const seekTo = (time: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);
  };

  const setStartTimeFromPlayer = () => {
    setMediaConfig(prev => ({
      ...prev,
      youtubeStartTime: Math.floor(currentTime),
    }));
  };

  const setEndTimeFromPlayer = () => {
    setMediaConfig(prev => ({
      ...prev,
      youtubeEndTime: Math.floor(currentTime),
    }));
  };

  const handleChapterSelect = (value: string) => {
    setSelectedChapter(value);
    if (!value) return;

    const chapterIndex = parseInt(value);
    const chapter = chapters[chapterIndex];
    if (!chapter) return;

    // Set start time to the chapter's start time
    const startTime = chapter.startTime;
    const endTime = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1].startTime : undefined;

    setMediaConfig(prev => ({
      ...prev,
      youtubeStartTime: startTime,
      youtubeEndTime: endTime,
    }));

    // Seek to the chapter start in the player
    if (playerRef.current) {
      seekTo(chapter.startTime);
    }

    toast({
      title: 'Chapter selected',
      description: `Set time range for "${chapter.title}"`,
    });
  };

  // Fuzzy match chapter name to collection name
  const matchCollectionByName = (chapterTitle: string, vendor: string): { collection: CollectionWithMeta | null; confidence: number } => {
    const normalizeText = (text: string) =>
      text.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')     // Normalize spaces
        .trim();

    const chapterNorm = normalizeText(chapterTitle);
    const vendorCollections = collections.filter(c => c.vendor === vendor);

    let bestMatch: CollectionWithMeta | null = null;
    let bestScore = 0;

    for (const collection of vendorCollections) {
      const collectionNorm = normalizeText(collection.name);

      // Exact match
      if (chapterNorm === collectionNorm) {
        return { collection, confidence: 100 };
      }

      // Contains match
      if (collectionNorm.includes(chapterNorm) || chapterNorm.includes(collectionNorm)) {
        const score = 80;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = collection;
        }
      }

      // Word overlap match
      const chapterWords = new Set(chapterNorm.split(' '));
      const collectionWords = new Set(collectionNorm.split(' '));
      const overlap = [...chapterWords].filter(w => collectionWords.has(w)).length;
      const totalWords = Math.max(chapterWords.size, collectionWords.size);
      const overlapScore = (overlap / totalWords) * 70;

      if (overlapScore > bestScore && overlapScore > 40) {
        bestScore = overlapScore;
        bestMatch = collection;
      }
    }

    return { collection: bestMatch, confidence: Math.round(bestScore) };
  };

  // Start auto-match process
  const handleAutoMatch = () => {
    if (!mediaConfig.youtubeUrl || chapters.length === 0) {
      toast({
        title: 'Cannot auto-match',
        description: 'Please enter a video URL with chapters first',
        variant: 'destructive',
      });
      return;
    }

    // Detect vendor from current filter or ask user
    const vendor = vendorFilter !== 'all' ? vendorFilter : '';
    setAutoMatchVendor(vendor);
    setBatchVideoUrl(mediaConfig.youtubeUrl);

    // Perform matching
    const matches = chapters.map(chapter => ({
      chapter,
      ...matchCollectionByName(chapter.title, vendor || allVendors[0]),
      videoUrl: mediaConfig.youtubeUrl,
    }));

    setMatchedCollections(matches);
    setShowAutoMatchDialog(true);
  };

  // Batch process filtered collections against a single video
  const handleBatchAutoMatch = async () => {
    if (!batchVideoUrl) {
      toast({
        title: 'Please enter a video URL',
        description: 'Paste a YouTube URL to match against filtered collections',
        variant: 'destructive',
      });
      return;
    }

    const targetVendor = vendorFilter !== 'all' ? vendorFilter : allVendors[0];

    if (!targetVendor) {
      toast({
        title: 'Please select a vendor',
        description: 'Filter by vendor first to auto-match collections',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingBatch(true);
    setAutoMatchVendor(targetVendor);

    const videoId = extractYouTubeId(batchVideoUrl);
    if (!videoId) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube URL',
        variant: 'destructive',
      });
      setIsProcessingBatch(false);
      return;
    }

    try {
      const response = await fetch(`/api/youtube/chapters?videoId=${videoId}`);
      const data = await response.json();

      if (!data.chapters || data.chapters.length === 0) {
        toast({
          title: 'No chapters found',
          description: 'This video does not have chapters',
          variant: 'destructive',
        });
        setIsProcessingBatch(false);
        return;
      }

      const allMatches: Array<{
        chapter: Chapter;
        collection: CollectionWithMeta | null;
        confidence: number;
        videoUrl: string;
      }> = [];

      // Match each chapter to filtered collections
      for (const chapter of data.chapters) {
        const match = matchCollectionByName(chapter.title, targetVendor);

        if (match.collection && match.confidence >= 40) {
          // Check if collection is in filtered list
          const isInFilteredList = filteredCollections.some(c => c.name === match.collection?.name);

          if (isInFilteredList) {
            allMatches.push({
              chapter,
              ...match,
              videoUrl: batchVideoUrl,
            });
          }
        }
      }

      setMatchedCollections(allMatches);
      setShowAutoMatchDialog(true);

      toast({
        title: 'Matching complete',
        description: `Found ${allMatches.length} matches from ${data.chapters.length} chapters`,
      });
    } catch (error) {
      console.error('Error fetching chapters:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch video chapters',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Apply auto-matched collections
  const handleApplyAutoMatch = async () => {
    const successfulMatches = matchedCollections.filter(m => m.collection !== null);

    if (successfulMatches.length === 0) {
      toast({
        title: 'No matches found',
        description: 'Could not match any chapters to collections',
        variant: 'destructive',
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const match of successfulMatches) {
      if (!match.collection) continue;

      const videoUrl = match.videoUrl || batchVideoUrl;

      // Find the video ID and re-fetch chapters to get timing info
      const videoId = extractYouTubeId(videoUrl);
      if (!videoId) continue;

      try {
        const response = await fetch(`/api/youtube/chapters?videoId=${videoId}`);
        const data = await response.json();

        if (data.chapters && data.chapters.length > 0) {
          const chapterIndex = data.chapters.findIndex((c: Chapter) =>
            c.title === match.chapter.title && c.startTime === match.chapter.startTime
          );

          if (chapterIndex === -1) continue;

          const nextChapter = data.chapters[chapterIndex + 1];

          const mediaConfig: CollectionMedia = {
            mediaType: 'youtube',
            youtubeUrl: convertToYouTubeFormat(videoUrl),
            youtubeStartTime: match.chapter.startTime,
            ...(nextChapter && { youtubeEndTime: nextChapter.startTime }),
          };

          const saveResponse = await fetch('/api/rep/collection-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendor: match.collection.vendor,
              collection: match.collection.name,
              mediaConfig,
            }),
          });

          if (saveResponse.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      } catch (error) {
        console.error('Error saving media for', match.collection.name, error);
        errorCount++;
      }
    }

    toast({
      title: 'Auto-match complete',
      description: `Successfully assigned ${successCount} videos. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
    });

    setShowAutoMatchDialog(false);
    setMediaDialogOpen(false);
  };

  const openMediaDialog = async (collection: CollectionWithMeta) => {
    setEditingCollection(collection);

    // Helper to load legacy video data
    const loadLegacyData = () => {
      const slug = getCollectionSlug(collection.name);
      const existingVideo = videoData[slug];

      if (existingVideo) {
        // Migrate legacy data to new format
        try {
          const parsed = JSON.parse(existingVideo);
          if (typeof parsed === 'object' && parsed.url) {
            const isYouTube = isYouTubeUrl(parsed.url);
            return {
              mediaType: isYouTube ? 'youtube' : 'mp4',
              ...(isYouTube ? {
                youtubeUrl: parsed.url,
                youtubeStartTime: parsed.startTime,
                youtubeEndTime: parsed.endTime,
              } : {
                mp4Url: parsed.url,
                mp4StartTime: parsed.startTime,
                mp4EndTime: parsed.endTime,
              }),
            } as CollectionMedia;
          } else {
            const isYouTube = isYouTubeUrl(existingVideo);
            return {
              mediaType: isYouTube ? 'youtube' : 'mp4',
              ...(isYouTube ? { youtubeUrl: existingVideo } : { mp4Url: existingVideo }),
            } as CollectionMedia;
          }
        } catch {
          const isYouTube = isYouTubeUrl(existingVideo);
          return {
            mediaType: isYouTube ? 'youtube' : 'mp4',
            ...(isYouTube ? { youtubeUrl: existingVideo } : { mp4Url: existingVideo }),
          } as CollectionMedia;
        }
      }
      return null;
    };

    // Load media config from API
    try {
      const response = await fetch(
        `/api/rep/collection-media?vendor=${encodeURIComponent(collection.vendor)}&collection=${encodeURIComponent(collection.name)}`
      );
      const data = await response.json();

      // Check if API has valid media config (not just 'none')
      const hasValidApiConfig = data.mediaConfig &&
        data.mediaConfig.mediaType !== 'none' &&
        (data.mediaConfig.youtubeUrl || data.mediaConfig.mp4Url ||
         (data.mediaConfig.photos && data.mediaConfig.photos.length > 0));

      if (hasValidApiConfig) {
        setMediaConfig(data.mediaConfig);
      } else {
        // Check legacy video data
        const legacyConfig = loadLegacyData();
        if (legacyConfig) {
          setMediaConfig(legacyConfig);
        } else {
          setMediaConfig({ mediaType: 'none' });
        }
      }
    } catch (error) {
      console.error('Error loading media config:', error);
      // Try legacy data on API error
      const legacyConfig = loadLegacyData();
      if (legacyConfig) {
        setMediaConfig(legacyConfig);
      } else {
        setMediaConfig({ mediaType: 'none' });
      }
    }

    setMediaDialogOpen(true);
  };

  const handleSaveMedia = async () => {
    if (!editingCollection) return;

    try {
      const response = await fetch('/api/rep/collection-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: editingCollection.vendor,
          collection: editingCollection.name,
          mediaConfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save media configuration');
      }

      // Update local state to reflect the saved media
      setCollectionMediaData(prev => ({
        ...prev,
        [editingCollection.vendor]: {
          ...prev[editingCollection.vendor],
          [editingCollection.name]: mediaConfig,
        },
      }));

      toast({
        title: 'Success',
        description: `Media saved for ${editingCollection.name}`,
      });

      setMediaDialogOpen(false);
    } catch (error) {
      console.error('Error saving media:', error);
      toast({
        title: 'Error',
        description: 'Failed to save media configuration',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMedia = async (collection: CollectionWithMeta) => {
    try {
      const response = await fetch('/api/rep/collection-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: collection.vendor,
          collection: collection.name,
          mediaConfig: { mediaType: 'none' },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete media');
      }

      // Update local state to remove the media
      setCollectionMediaData(prev => ({
        ...prev,
        [collection.vendor]: {
          ...prev[collection.vendor],
          [collection.name]: { mediaType: 'none' },
        },
      }));

      toast({
        title: 'Success',
        description: `Media deleted for ${collection.name}`,
      });
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete media',
        variant: 'destructive',
      });
    }
  };

  const getMediaDisplay = (collection: CollectionWithMeta) => {
    // This would need to be loaded from the API in a production implementation
    // For now, just check legacy data
    const slug = getCollectionSlug(collection.name);
    const video = videoData[slug];
    if (!video) return null;

    try {
      const parsed = JSON.parse(video);
      if (typeof parsed === 'object' && parsed.url) {
        const timeRange = parsed.startTime || parsed.endTime
          ? ` (${parsed.startTime ? secondsToTimeFormat(parsed.startTime) : '0:00'} - ${parsed.endTime ? secondsToTimeFormat(parsed.endTime) : 'end'})`
          : '';
        return `${parsed.url}${timeRange}`;
      }
    } catch {
      return video;
    }
    return video;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Collection Media Manager</CardTitle>
          <CardDescription>
            Manage media (videos and photos) for collections. Media is applied globally and persists across data updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {allVendors.map((vendor) => (
                  <SelectItem key={vendor} value={vendor}>
                    {vendorNames[vendor] || vendor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {allYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Batch Auto-Match Section */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Paste YouTube URL to auto-match filtered collections..."
                value={batchVideoUrl}
                onChange={(e) => setBatchVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleBatchAutoMatch}
                disabled={isProcessingBatch || vendorFilter === 'all' || !batchVideoUrl}
                variant="default"
              >
                {isProcessingBatch ? 'Processing...' : 'Auto-Match'}
              </Button>
            </div>
          </div>

          {/* Collections Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No collections found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCollections.map((collection) => {
                    const slug = getCollectionSlug(collection.name);
                    // Check both new collection media and legacy video data
                    const collectionMedia = collectionMediaData[collection.vendor]?.[collection.name];
                    const hasCollectionMedia = collectionMedia?.mediaType && collectionMedia.mediaType !== 'none';
                    const hasLegacyMedia = !!videoData[slug];
                    const hasMedia = hasCollectionMedia || hasLegacyMedia;

                    // Determine media type for icon
                    let mediaType: string = 'none';
                    if (hasCollectionMedia && collectionMedia) {
                      mediaType = collectionMedia.mediaType;
                    } else if (hasLegacyMedia) {
                      // Legacy is always video
                      mediaType = 'video';
                    }

                    // Generate thumbnail URL - use first photo if available, otherwise video thumbnail
                    const getThumbnailUrl = () => {
                      // If collection has photos, use the first one
                      if (collectionMedia?.photos && collectionMedia.photos.length > 0) {
                        return collectionMedia.photos[0].url;
                      }

                      // If collection has YouTube video in new format, use YouTube thumbnail
                      if (collectionMedia?.mediaType === 'youtube' && collectionMedia.youtubeUrl) {
                        const videoId = collectionMedia.youtubeUrl.replace('youtube:', '');
                        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                      }

                      // For MP4 or other video types, use a generic video placeholder
                      if (collectionMedia?.mediaType === 'mp4' || collectionMedia?.mediaType === 'video') {
                        // Use data URI for a simple video icon placeholder
                        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiMyMjIyMjIiLz4KICA8cGF0aCBkPSJNMjQgMjBMMjQgNDRMNDQgMzJMMjQgMjBaIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo=';
                      }

                      // Check legacy video data
                      const legacyVideo = videoData[slug];
                      if (legacyVideo) {
                        // Parse if it's a JSON string (format with startTime/endTime)
                        try {
                          const parsed = JSON.parse(legacyVideo);
                          if (parsed.url && parsed.url.startsWith('youtube:')) {
                            const videoId = parsed.url.replace('youtube:', '');
                            return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                          }
                        } catch {
                          // Not JSON, check if it's a direct youtube: URL
                          if (legacyVideo.startsWith('youtube:')) {
                            const videoId = legacyVideo.replace('youtube:', '');
                            return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                          }
                          // Otherwise it's an MP4 URL
                          return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiMyMjIyMjIiLz4KICA8cGF0aCBkPSJNMjQgMjBMMjQgNDRMNDQgMzJMMjQgMjBaIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo=';
                        }
                      }

                      // Otherwise try collection-specific images
                      const collectionSlug = collection.name.toLowerCase().replace(/\s+/g, '-');
                      switch (collection.vendor) {
                        case 'lib-and-co':
                          return `/images/collections/lib-and-co/${collectionSlug}.jpg`;
                        case 'hubbardton-forge':
                          return `/images/collections/hubbardton-forge/${collectionSlug}.jpg`;
                        case 'savoy-house':
                          return `/images/collections/savoy-house/${collectionSlug}.jpg`;
                        default:
                          // Elegant empty state - subtle gradient background
                          return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmM2Y0ZjY7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6I2U1ZTdlYjtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0idXJsKCNncmFkKSIvPgo8L3N2Zz4K';
                      }
                    };

                    return (
                      <TableRow key={slug}>
                        <TableCell>
                          <div className="w-16 h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                            <img
                              src={getThumbnailUrl()}
                              alt={collection.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to elegant gradient if image doesn't exist
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmM2Y0ZjY7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6I2U1ZTdlYjtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0idXJsKCNncmFkKSIvPgo8L3N2Zz4K';
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{collection.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {vendorNames[collection.vendor] || collection.vendor}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{collection.itemCount}</TableCell>
                        <TableCell className="max-w-md">
                          {hasMedia ? (
                            <div className="flex items-center gap-2">
                              {(mediaType === 'youtube' || mediaType === 'mp4' || mediaType === 'video') ? (
                                <VideoIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (mediaType === 'photos' || mediaType === 'immersive' || mediaType === 'immersive-slideshow') ? (
                                <ImageIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <VideoIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No media</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant={hasMedia ? 'outline' : 'default'}
                              onClick={() => openMediaDialog(collection)}
                            >
                              {hasMedia ? <Edit className="h-4 w-4" /> : <PlusCircleIcon className="h-4 w-4" />}
                              {hasMedia ? 'Edit' : 'Add Media'}
                            </Button>
                            {hasMedia && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteMedia(collection)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Media Configuration Dialog */}
      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collection Media Configuration</DialogTitle>
            <DialogDescription>
              {editingCollection && (
                <>
                  Managing media for <strong>{editingCollection.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Media Type Selector */}
            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select
                value={mediaConfig.mediaType}
                onValueChange={(value: MediaType) => {
                  setMediaConfig({
                    mediaType: value,
                    ...(value === 'youtube' && { youtubeUrl: '' }),
                    ...(value === 'mp4' && { mp4Url: '' }),
                    ...(value === 'photos' && { photos: [], slideDuration: 5, photoLayoutMode: 'auto' as const }),
                    ...(value === 'immersive-slideshow' && {
                      photos: [],
                      immersive: {
                        slideDurationSec: 8,
                        fadeDurationSec: 0.8,
                        kbIntensity: 'subtle' as const,
                        motionSeed: 'auto' as const,
                        order: 'as-uploaded' as const,
                        reduceMotionOnMobile: true,
                        showProgressDots: true,
                        globalFocalPoint: 'center' as const,
                      },
                    }),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="youtube">YouTube Video</SelectItem>
                  <SelectItem value="mp4">MP4 Video</SelectItem>
                  <SelectItem value="photos">Photo Slideshow</SelectItem>
                  <SelectItem value="immersive-slideshow">Immersive Slideshow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* YouTube Configuration */}
            {mediaConfig.mediaType === 'youtube' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input
                    value={mediaConfig.youtubeUrl || ''}
                    onChange={(e) => setMediaConfig({ ...mediaConfig, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                {/* YouTube Chapters Dropdown */}
                {videoId && chapters.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="chapter-select" className="text-sm font-medium">
                      Video Chapters {loadingChapters && '(Loading...)'}
                    </Label>
                    <Select value={selectedChapter} onValueChange={handleChapterSelect}>
                      <SelectTrigger id="chapter-select">
                        <SelectValue placeholder="Select a chapter to set time range..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map((chapter, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {secondsToTimeFormat(chapter.startTime)} - {chapter.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecting a chapter will automatically set the start and end times to match that chapter&apos;s duration
                    </p>
                  </div>
                )}

                {/* YouTube Player Preview */}
                {videoId && (
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm font-medium">Video Preview & Scrubber</Label>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <div id="youtube-player"></div>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={togglePlayPause}
                        disabled={!duration}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => seekTo(Math.max(0, currentTime - 5))}
                        disabled={!duration}
                      >
                        <SkipBack className="h-4 w-4" />
                        5s
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => seekTo(Math.min(duration, currentTime + 5))}
                        disabled={!duration}
                      >
                        <SkipForward className="h-4 w-4" />
                        5s
                      </Button>
                      <span className="text-sm text-muted-foreground ml-2">
                        {secondsToTimeFormat(Math.floor(currentTime))} / {secondsToTimeFormat(Math.floor(duration))}
                      </span>
                    </div>

                    {/* Large Timeline Scrubber */}
                    <div className="space-y-2">
                      <Label className="text-xs">Timeline - Drag to scrub through video</Label>
                      <Slider
                        value={[currentTime]}
                        onValueChange={(value) => seekTo(value[0])}
                        max={duration || 100}
                        step={0.1}
                        className="w-full"
                        disabled={!duration}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0:00</span>
                        <span>{secondsToTimeFormat(Math.floor(duration))}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time Range Configuration */}
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label className="text-sm font-medium">Video Time Range (Optional)</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {videoId
                        ? 'Use the player above to find your desired start and end points, then click the buttons below to set them'
                        : 'Enter a YouTube URL first to enable video scrubbing'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="start-time" className="text-xs">
                          Start Time (seconds)
                        </Label>
                        {videoId && duration > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={setStartTimeFromPlayer}
                            className="h-6 text-xs"
                          >
                            Set from player
                          </Button>
                        )}
                      </div>
                      <Input
                        id="start-time"
                        type="number"
                        value={mediaConfig.youtubeStartTime || ''}
                        onChange={(e) => setMediaConfig({ ...mediaConfig, youtubeStartTime: parseInt(e.target.value) || undefined })}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="end-time" className="text-xs">
                          End Time (seconds)
                        </Label>
                        {videoId && duration > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={setEndTimeFromPlayer}
                            className="h-6 text-xs"
                          >
                            Set from player
                          </Button>
                        )}
                      </div>
                      <Input
                        id="end-time"
                        type="number"
                        value={mediaConfig.youtubeEndTime || ''}
                        onChange={(e) => setMediaConfig({ ...mediaConfig, youtubeEndTime: parseInt(e.target.value) || undefined })}
                        placeholder="Leave empty for end"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MP4 Configuration */}
            {mediaConfig.mediaType === 'mp4' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>MP4 Video URL</Label>
                  <Input
                    value={mediaConfig.mp4Url || ''}
                    onChange={(e) => setMediaConfig({ ...mediaConfig, mp4Url: e.target.value })}
                    placeholder="https://cdn.example.com/video.mp4"
                  />
                </div>

                {/* Video Preview and Scrubber */}
                {mediaConfig.mp4Url && editingCollection && (
                  <VideoScrubber
                    videoUrl={mediaConfig.mp4Url}
                    startTime={mediaConfig.mp4StartTime}
                    endTime={mediaConfig.mp4EndTime}
                    vendor={editingCollection.vendor}
                    collectionName={editingCollection.name}
                    mediaConfig={mediaConfig}
                    onTimeRangeChange={(start, end) => {
                      setMediaConfig({
                        ...mediaConfig,
                        mp4StartTime: start,
                        mp4EndTime: end,
                      });
                    }}
                  />
                )}
              </div>
            )}

            {/* Photo Slideshow Configuration */}
            {mediaConfig.mediaType === 'photos' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Slide Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={mediaConfig.slideDuration || 5}
                    onChange={(e) => setMediaConfig({ ...mediaConfig, slideDuration: parseInt(e.target.value) || 5 })}
                    min="1"
                    max="30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Photo Layout Mode</Label>
                  <Select
                    value={mediaConfig.photoLayoutMode || 'auto'}
                    onValueChange={(value: 'auto' | 'single-fit' | 'single-fill' | 'pair-portraits' | 'manual') => {
                      setMediaConfig({ ...mediaConfig, photoLayoutMode: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Recommended)</SelectItem>
                      <SelectItem value="single-fit">Single - Fit</SelectItem>
                      <SelectItem value="single-fill">Single - Fill (Smart Crop)</SelectItem>
                      <SelectItem value="pair-portraits">Pair Portraits</SelectItem>
                      <SelectItem value="manual">Manual (Ken Burns Editor)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Auto mode smartly handles portrait and landscape photos for best presentation.
                  </p>
                </div>

                {/* Add Photo URL */}
                <div className="space-y-2">
                  <Label>Add Photo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://cdn.example.com/photo.jpg"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          const url = input.value.trim();
                          if (url) {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                              const aspect = img.width / img.height;
                              let aspectClass: 'landscape' | 'portrait' | 'square' = 'square';
                              if (aspect >= 1.2) aspectClass = 'landscape';
                              else if (aspect <= 0.85) aspectClass = 'portrait';

                              const newPhoto = {
                                url,
                                order: mediaConfig.photos?.length || 0,
                                width: img.width,
                                height: img.height,
                                aspect,
                                aspectClass,
                              };
                              setMediaConfig({
                                ...mediaConfig,
                                photos: [...(mediaConfig.photos || []), newPhoto],
                              });
                              input.value = '';
                            };
                            img.onerror = () => {
                              const newPhoto = {
                                url,
                                order: mediaConfig.photos?.length || 0,
                              };
                              setMediaConfig({
                                ...mediaConfig,
                                photos: [...(mediaConfig.photos || []), newPhoto],
                              });
                              input.value = '';
                            };
                            img.src = url;
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a URL and press Enter to add a photo
                  </p>
                </div>

                {/* Collection Image Gallery */}
                {editingCollection && (
                  <CollectionImageGallery
                    collectionName={editingCollection.name}
                    vendor={editingCollection.vendor}
                    onSelectImages={(urls) => {
                      const currentPhotos = mediaConfig.photos || [];
                      const nextOrder = currentPhotos.length;
                      const newPhotos = urls.map((url, idx) => ({
                        url,
                        order: nextOrder + idx,
                      }));
                      setMediaConfig({
                        ...mediaConfig,
                        photos: [...currentPhotos, ...newPhotos],
                      });
                    }}
                  />
                )}

                {/* Photo List */}
                {mediaConfig.photos && mediaConfig.photos.length > 0 && (
                  <div className="space-y-2">
                    <Label>Photos ({mediaConfig.photos.length})</Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {mediaConfig.photos
                        .sort((a, b) => a.order - b.order)
                        .map((photo, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                            <img src={photo.url} alt="" className="w-16 h-16 object-cover rounded" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Photo {idx + 1}</span>
                                {photo.aspectClass && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                    photo.aspectClass === 'landscape' ? 'bg-blue-100 text-blue-700' :
                                    photo.aspectClass === 'portrait' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {photo.aspectClass === 'landscape' ? 'L' : photo.aspectClass === 'portrait' ? 'P' : 'S'}
                                  </span>
                                )}
                              </div>
                              {photo.aspect && (
                                <p className="text-xs text-muted-foreground">
                                  {photo.width}×{photo.height} ({photo.aspect.toFixed(2)})
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPhotos = mediaConfig.photos!.filter((_, i) => i !== idx);
                                setMediaConfig({
                                  ...mediaConfig,
                                  photos: newPhotos.map((p, i) => ({ ...p, order: i })),
                                });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Immersive Slideshow Configuration */}
            {mediaConfig.mediaType === 'immersive-slideshow' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Slide Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={mediaConfig.immersive?.slideDurationSec || 8}
                    onChange={(e) => {
                      setMediaConfig({
                        ...mediaConfig,
                        immersive: {
                          ...mediaConfig.immersive!,
                          slideDurationSec: parseFloat(e.target.value) || 8,
                        },
                      });
                    }}
                    min="5"
                    max="15"
                    step="0.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    How long each slide displays (5-15 seconds)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cross-fade Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={mediaConfig.immersive?.fadeDurationSec || 0.8}
                    onChange={(e) => {
                      setMediaConfig({
                        ...mediaConfig,
                        immersive: {
                          ...mediaConfig.immersive!,
                          fadeDurationSec: parseFloat(e.target.value) || 0.8,
                        },
                      });
                    }}
                    min="0.3"
                    max="2.0"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Transition time between slides (0.3-2.0 seconds)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Ken Burns Intensity</Label>
                  <Select
                    value={mediaConfig.immersive?.kbIntensity || 'subtle'}
                    onValueChange={(value: 'subtle' | 'medium' | 'strong') => {
                      setMediaConfig({
                        ...mediaConfig,
                        immersive: {
                          ...mediaConfig.immersive!,
                          kbIntensity: value,
                        },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Subtle (~6% zoom)</SelectItem>
                      <SelectItem value="medium">Medium (~10% zoom)</SelectItem>
                      <SelectItem value="strong">Strong (~14% zoom)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Amount of subtle zoom/pan motion
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Motion Direction</Label>
                  <Select
                    value={mediaConfig.immersive?.motionSeed || 'auto'}
                    onValueChange={(value: 'auto' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out') => {
                      setMediaConfig({
                        ...mediaConfig,
                        immersive: {
                          ...mediaConfig.immersive!,
                          motionSeed: value,
                        },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Random)</SelectItem>
                      <SelectItem value="zoom-in">Zoom In</SelectItem>
                      <SelectItem value="zoom-out">Zoom Out</SelectItem>
                      <SelectItem value="pan-left">Pan Left</SelectItem>
                      <SelectItem value="pan-right">Pan Right</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Direction of Ken Burns motion
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Slide Order</Label>
                  <Select
                    value={mediaConfig.immersive?.order || 'as-uploaded'}
                    onValueChange={(value: 'as-uploaded' | 'shuffle') => {
                      setMediaConfig({
                        ...mediaConfig,
                        immersive: {
                          ...mediaConfig.immersive!,
                          order: value,
                        },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="as-uploaded">As Uploaded</SelectItem>
                      <SelectItem value="shuffle">Shuffle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>Progress Indicators</Label>
                    <p className="text-xs text-muted-foreground">
                      Show dots or counter (1/6)
                    </p>
                  </div>
                  <Switch
                    checked={mediaConfig.immersive?.showProgressDots ?? true}
                    onCheckedChange={(checked) => {
                      setMediaConfig({
                        ...mediaConfig,
                        immersive: {
                          ...mediaConfig.immersive!,
                          showProgressDots: checked,
                        },
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>Reduce Motion on Mobile</Label>
                    <p className="text-xs text-muted-foreground">
                      Lower intensity for mobile/low-power devices
                    </p>
                  </div>
                  <Switch
                    checked={mediaConfig.immersive?.reduceMotionOnMobile ?? true}
                    onCheckedChange={(checked) => {
                      setMediaConfig({
                        ...mediaConfig,
                        immersive: {
                          ...mediaConfig.immersive!,
                          reduceMotionOnMobile: checked,
                        },
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Default Focal Point</Label>
                  <Select
                    value={mediaConfig.immersive?.globalFocalPoint || 'center'}
                    onValueChange={(value: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
                      setMediaConfig({
                        ...mediaConfig,
                        immersive: {
                          ...mediaConfig.immersive!,
                          globalFocalPoint: value,
                        },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Center (Default)</SelectItem>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Which part of each image to focus on when cropping
                  </p>
                </div>

                {/* Add Photo URL */}
                <div className="space-y-2">
                  <Label>Add Photo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://cdn.example.com/photo.jpg"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          const url = input.value.trim();
                          if (url) {
                            const newPhoto = {
                              url,
                              order: mediaConfig.photos?.length || 0,
                            };
                            setMediaConfig({
                              ...mediaConfig,
                              photos: [...(mediaConfig.photos || []), newPhoto],
                            });
                            input.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter or click Add to include a photo
                  </p>
                </div>

                {/* Collection Image Gallery */}
                {editingCollection && (
                  <CollectionImageGallery
                    collectionName={editingCollection.name}
                    vendor={editingCollection.vendor}
                    onSelectImages={(urls) => {
                      const currentPhotos = mediaConfig.photos || [];
                      const nextOrder = currentPhotos.length;
                      const newPhotos = urls.map((url, idx) => ({
                        url,
                        order: nextOrder + idx,
                      }));
                      setMediaConfig({
                        ...mediaConfig,
                        photos: [...currentPhotos, ...newPhotos],
                      });
                    }}
                  />
                )}

                {/* Photo List */}
                {mediaConfig.photos && mediaConfig.photos.length > 0 && (
                  <div className="space-y-2">
                    <Label>Photos ({mediaConfig.photos.length})</Label>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {mediaConfig.photos
                        .sort((a, b) => a.order - b.order)
                        .map((photo, idx) => {
                          const getFocalPointPreset = () => {
                            if (!photo.focalPoint) return 'center';
                            const { x, y } = photo.focalPoint;
                            if (x === 0.5 && y === 0.5) return 'center';
                            if (x === 0.5 && y === 0) return 'top';
                            if (x === 0.5 && y === 1) return 'bottom';
                            if (x === 0 && y === 0.5) return 'left';
                            if (x === 1 && y === 0.5) return 'right';
                            if (x === 0 && y === 0) return 'top-left';
                            if (x === 1 && y === 0) return 'top-right';
                            if (x === 0 && y === 1) return 'bottom-left';
                            if (x === 1 && y === 1) return 'bottom-right';
                            return 'center';
                          };

                          const presetToCoords = (preset: string) => {
                            const map: Record<string, { x: number; y: number }> = {
                              'center': { x: 0.5, y: 0.5 },
                              'top': { x: 0.5, y: 0 },
                              'bottom': { x: 0.5, y: 1 },
                              'left': { x: 0, y: 0.5 },
                              'right': { x: 1, y: 0.5 },
                              'top-left': { x: 0, y: 0 },
                              'top-right': { x: 1, y: 0 },
                              'bottom-left': { x: 0, y: 1 },
                              'bottom-right': { x: 1, y: 1 },
                            };
                            return map[preset] || map.center;
                          };

                          return (
                            <div key={idx} className="p-3 border rounded space-y-2">
                              <div className="flex items-center gap-2">
                                <img src={photo.url} alt="" className="w-16 h-16 object-cover rounded" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">Photo {idx + 1}</p>
                                  {photo.aspectClass && (
                                    <p className="text-xs text-muted-foreground capitalize">{photo.aspectClass}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = mediaConfig.photos!.filter((_, i) => i !== idx);
                                    setMediaConfig({
                                      ...mediaConfig,
                                      photos: updated.map((p, i) => ({ ...p, order: i })),
                                    });
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>

                              {/* Focal Point for this photo */}
                              <div className="space-y-1">
                                <Label className="text-xs">Focal Point</Label>
                                <Select
                                  value={getFocalPointPreset()}
                                  onValueChange={(value) => {
                                    const coords = presetToCoords(value);
                                    const updatedPhotos = [...mediaConfig.photos!];
                                    updatedPhotos[idx] = {
                                      ...updatedPhotos[idx],
                                      focalPoint: coords,
                                    };
                                    setMediaConfig({
                                      ...mediaConfig,
                                      photos: updatedPhotos,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="center">Center (Default)</SelectItem>
                                    <SelectItem value="top">Top</SelectItem>
                                    <SelectItem value="bottom">Bottom</SelectItem>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                    <SelectItem value="top-left">Top Left</SelectItem>
                                    <SelectItem value="top-right">Top Right</SelectItem>
                                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Which part to focus on when cropped
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1">
              {videoId && chapters.length > 0 && mediaConfig.mediaType === 'youtube' && (
                <Button
                  variant="secondary"
                  onClick={handleAutoMatch}
                  className="w-full sm:w-auto"
                >
                  Auto-Match Collections
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMediaDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveMedia}>
                Save Media
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Match Preview Dialog */}
      <Dialog open={showAutoMatchDialog} onOpenChange={setShowAutoMatchDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Auto-Match Collections to Chapters</DialogTitle>
            <DialogDescription>
              Review the matched collections below. The system will create media entries for all matched collections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {matchedCollections.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No matches found</p>
            ) : (
              matchedCollections.map((match, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    match.collection
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        Chapter: {match.chapter.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Time: {secondsToTimeFormat(match.chapter.startTime)}
                        {chapters[index + 1] && ` - ${secondsToTimeFormat(chapters[index + 1].startTime)}`}
                      </div>
                      {match.collection ? (
                        <>
                          <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                            → Matched to: <strong>{match.collection.name}</strong>
                          </div>
                          {match.videoUrl && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Video: {match.videoUrl}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          → No match found
                        </div>
                      )}
                    </div>
                    {match.collection && (
                      <Badge variant={match.confidence >= 80 ? 'default' : 'secondary'}>
                        {match.confidence}% match
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <div className="text-sm text-muted-foreground">
              {matchedCollections.filter(m => m.collection).length} of {matchedCollections.length} chapters matched
            </div>
            <Button variant="outline" onClick={() => setShowAutoMatchDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyAutoMatch}
              disabled={matchedCollections.filter(m => m.collection).length === 0}
            >
              Apply Matches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
