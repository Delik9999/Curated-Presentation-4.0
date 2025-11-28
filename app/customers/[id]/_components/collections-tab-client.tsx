'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ProductCard } from '@/components/ui/product-card-modern';
import { SelectionPanel, SelectionItem } from '@/components/ui/selection-panel';
import { ProductWithVariants } from '@/lib/catalog/groupVariants';
import { useToast } from '@/components/ui/use-toast';
import { BadgeDisplay } from '@/components/ui/badge-display';
import { Badge } from '@/lib/selections/types';
import collectionVideos from '@/data/collection-videos.json';
import ImmersiveSlideshow from '@/components/ui/immersive-slideshow';
import { VideoAudioToggle } from '@/components/ui/video-audio-toggle';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

import type { CustomerPresentationData } from '@/lib/presentation/types';

interface CollectionsTabClientProps {
  customerId: string;
  authorizedVendors: string[];
  selectedVendor?: string;
  presentationData: CustomerPresentationData;

  // Legacy props (for backward compatibility during migration)
  sortedCollections?: [string, ProductWithVariants[]][];
  collectionBadges?: Record<string, Badge[]>;
  skuBadges?: Record<string, Record<string, Badge[]>>;
  collectionMedia?: Record<string, any>;
}

// Priority levels for video loading
enum LoadPriority {
  IMMEDIATE = 0, // First 2 videos - load right away
  HIGH = 1,      // In viewport
  MEDIUM = 2,    // Within 300px
  LOW = 3,       // Further away
}

// Global video load queue manager
class VideoLoadQueue {
  private static instance: VideoLoadQueue;
  private queue: Array<{ priority: LoadPriority; load: () => void; id: string }> = [];
  private loading = new Set<string>();
  private maxConcurrent = 2;

  static getInstance() {
    if (!VideoLoadQueue.instance) {
      VideoLoadQueue.instance = new VideoLoadQueue();
    }
    return VideoLoadQueue.instance;
  }

  enqueue(id: string, priority: LoadPriority, load: () => void) {
    // Remove existing entry for this ID if present
    this.queue = this.queue.filter((item) => item.id !== id);

    // Add to queue
    this.queue.push({ priority, load, id });

    // Sort by priority (lower number = higher priority)
    this.queue.sort((a, b) => a.priority - b.priority);

    this.processQueue();
  }

  private processQueue() {
    while (this.loading.size < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (item && !this.loading.has(item.id)) {
        this.loading.add(item.id);
        item.load();
        // Remove from loading set after a delay
        setTimeout(() => this.loading.delete(item.id), 1000);
      }
    }
  }

  updatePriority(id: string, newPriority: LoadPriority) {
    const item = this.queue.find((i) => i.id === id);
    if (item) {
      item.priority = newPriority;
      this.queue.sort((a, b) => a.priority - b.priority);
      this.processQueue();
    }
  }
}

// Priority-based lazy video component
function PriorityVideo({
  videoUrl,
  collectionName,
  index
}: {
  videoUrl: string;
  collectionName: string;
  index: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const loadQueue = React.useMemo(() => VideoLoadQueue.getInstance(), []);
  const videoId = React.useMemo(() => `${collectionName}-${index}`, [collectionName, index]);

  // Parse video URL - it might be a JSON object with time parameters
  const videoConfig = React.useMemo(() => {
    try {
      const parsed = JSON.parse(videoUrl);
      if (typeof parsed === 'object' && parsed.url) {
        return {
          url: parsed.url,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
        };
      }
    } catch {
      // Not JSON, treat as plain URL
    }
    return { url: videoUrl };
  }, [videoUrl]);

  // Check if this is a YouTube video and extract the ID
  const extractYouTubeId = (url: string): string | null => {
    // Handle youtube: prefix format
    if (url.startsWith('youtube:')) {
      return url.replace('youtube:', '');
    }

    // Handle full YouTube URLs
    try {
      const urlObj = new URL(url);
      // youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v');
      }
      // youtu.be/VIDEO_ID
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
    } catch {
      // Not a valid URL, might be just the video ID
      return null;
    }

    return null;
  };

  const youtubeId = extractYouTubeId(videoConfig.url);
  const isYouTube = youtubeId !== null;

  // Determine initial priority based on index
  const initialPriority = index < 2 ? LoadPriority.IMMEDIATE : LoadPriority.LOW;

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // For immediate priority videos, load right away
    if (initialPriority === LoadPriority.IMMEDIATE) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio;

          if (ratio > 0.5) {
            // Video is mostly visible - high priority
            loadQueue.enqueue(videoId, LoadPriority.HIGH, () => {
              setShouldLoad(true);
              setIsPlaying(true);
            });
          } else if (entry.isIntersecting) {
            // Video is partially visible - medium priority
            loadQueue.enqueue(videoId, LoadPriority.MEDIUM, () => {
              setShouldLoad(true);
            });
          } else if (entry.boundingClientRect.top < window.innerHeight + 300 &&
                     entry.boundingClientRect.top > -300) {
            // Video is within 300px - low priority
            loadQueue.enqueue(videoId, LoadPriority.LOW, () => {
              setShouldLoad(true);
            });
          } else {
            // Video scrolled out of range, pause if playing (only for HTML5 video)
            if (!isYouTube && videoRef.current?.src) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      {
        rootMargin: '300px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [initialPriority, loadQueue, videoId, isYouTube]);

  // Auto-play when in viewport (only for HTML5 video)
  React.useEffect(() => {
    if (isYouTube) return; // YouTube handles autoplay via iframe params

    const videoElement = videoRef.current;
    if (!videoElement || !shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            videoElement.play().catch(() => {
              // Ignore play errors (e.g., user hasn't interacted yet)
            });
            setIsPlaying(true);
          } else {
            videoElement.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: [0.1],
      }
    );

    observer.observe(videoElement);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad, isYouTube]);

  // YouTube player refs (must be at top level, not in conditional)
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const playerRef = React.useRef<any>(null);
  const checkIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Audio control state (Pillar 1: Default muted)
  const [isMuted, setIsMuted] = React.useState(true);
  const [isContainerHovered, setIsContainerHovered] = React.useState(false);

  // Smart-Fade Volume Control (Pillar 2 & 3)
  const targetVolumeRef = React.useRef(0); // Target volume based on visibility
  const animationFrameRef = React.useRef<number | null>(null);
  const wasFullyOffScreenRef = React.useRef(true); // Track if video was off-screen

  // Track if user has manually muted (persists across all videos in session)
  const userMutedRef = React.useRef(
    typeof window !== 'undefined' && sessionStorage.getItem('userMutedVideos') === 'true'
  );

  // Pillar 1: Visibility Detector with 100-step threshold array
  React.useEffect(() => {
    if (!isYouTube || !containerRef.current) return;

    // Create 100 threshold steps (0.00, 0.01, 0.02, ... 0.99, 1.00)
    const thresholds = Array(100)
      .fill(0)
      .map((_, i) => i / 100);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Calculate how much of the video's HEIGHT is visible
          const rect = entry.boundingClientRect;
          const videoHeight = rect.height;

          // Calculate visible height based on viewport position
          const viewportHeight = window.innerHeight;
          const topOverlap = Math.max(0, -rect.top); // How much is cut off at top
          const bottomOverlap = Math.max(0, rect.bottom - viewportHeight); // How much is cut off at bottom
          const visibleHeight = videoHeight - topOverlap - bottomOverlap;

          // Calculate percentage of video height that's visible (0.0 to 1.0)
          const heightVisibilityRatio = Math.max(0, Math.min(1, visibleHeight / videoHeight));

          // Apply 20% threshold: below 20% visible = 0% volume
          let volumeRatio = 0;
          if (heightVisibilityRatio > 0.2) {
            // Map 20% - 100% visible to 0% - 100% volume
            volumeRatio = (heightVisibilityRatio - 0.2) / 0.8;
          }

          const targetVolume = Math.round(volumeRatio * 100);
          targetVolumeRef.current = targetVolume;

          // Auto-unmute when video becomes visible (crosses 20% threshold)
          // BUT only if user hasn't manually muted
          if (heightVisibilityRatio > 0.2 && playerRef.current && !userMutedRef.current) {
            if (playerRef.current.isMuted && playerRef.current.isMuted()) {
              playerRef.current.unMute();
              setIsMuted(false);
            }
          }

          // Pause optimization: Pause when fully off-screen
          if (heightVisibilityRatio <= 0 && !wasFullyOffScreenRef.current) {
            // Video just went off-screen
            wasFullyOffScreenRef.current = true;
            if (playerRef.current && playerRef.current.pauseVideo) {
              playerRef.current.pauseVideo();
            }
          } else if (heightVisibilityRatio > 0 && wasFullyOffScreenRef.current) {
            // Video just came back on-screen
            wasFullyOffScreenRef.current = false;
            if (playerRef.current && playerRef.current.playVideo) {
              playerRef.current.playVideo();
            }
          }
        });
      },
      {
        threshold: thresholds,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isYouTube]);

  // Pillar 3: Smooth Fade Engine using requestAnimationFrame
  React.useEffect(() => {
    if (!isYouTube || !playerRef.current || isMuted) return;

    const smoothFadeVolume = () => {
      if (!playerRef.current) return;

      try {
        const currentVolume = playerRef.current.getVolume() || 0;
        const targetVolume = targetVolumeRef.current;

        // Calculate the difference
        const diff = targetVolume - currentVolume;

        // If we're close enough (within 1%), snap to target
        if (Math.abs(diff) < 1) {
          playerRef.current.setVolume(targetVolume);
        } else {
          // Smooth transition: move 10% of the way toward target each frame
          // This creates an easing effect (fast at first, slows as it approaches target)
          const step = diff * 0.1;
          const newVolume = currentVolume + step;
          playerRef.current.setVolume(Math.max(0, Math.min(100, newVolume)));
        }
      } catch (error) {
        // Player might not be ready yet, ignore
      }

      // Continue the animation loop
      animationFrameRef.current = requestAnimationFrame(smoothFadeVolume);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(smoothFadeVolume);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isYouTube, isMuted]);

  // Mute/unmute toggle handler (Pillar 3: Technical Implementation)
  // This broadcasts to ALL video instances via custom event
  const handleMuteToggle = React.useCallback(() => {
    if (!isYouTube || !playerRef.current) return;

    const player = playerRef.current;
    const currentlyMuted = player.isMuted();

    if (currentlyMuted) {
      // User is unmuting - broadcast to ALL videos
      player.unMute();
      setIsMuted(false);
      userMutedRef.current = false;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('userMutedVideos');
        // Broadcast unmute event to all other video instances
        window.dispatchEvent(new CustomEvent('globalVideoUnmute'));
      }
    } else {
      // User is muting - broadcast to ALL videos
      player.mute();
      setIsMuted(true);
      userMutedRef.current = true;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userMutedVideos', 'true');
        // Broadcast mute event to all other video instances
        window.dispatchEvent(new CustomEvent('globalVideoMute'));
      }
    }
  }, [isYouTube]);

  // Global audio control: Listen for mute/unmute events from other video instances
  React.useEffect(() => {
    if (!isYouTube) return;

    const handleGlobalMute = () => {
      // Another video was muted - mute this one too
      if (playerRef.current && !playerRef.current.isMuted()) {
        playerRef.current.mute();
        setIsMuted(true);
        userMutedRef.current = true;
      }
    };

    const handleGlobalUnmute = () => {
      // Another video was unmuted - unmute this one too
      if (playerRef.current && playerRef.current.isMuted()) {
        playerRef.current.unMute();
        setIsMuted(false);
        userMutedRef.current = false;
      }
    };

    window.addEventListener('globalVideoMute', handleGlobalMute);
    window.addEventListener('globalVideoUnmute', handleGlobalUnmute);

    return () => {
      window.removeEventListener('globalVideoMute', handleGlobalMute);
      window.removeEventListener('globalVideoUnmute', handleGlobalUnmute);
    };
  }, [isYouTube]);

  // Keyboard accessibility (Pillar 4: "M" key toggle)
  React.useEffect(() => {
    if (!isYouTube) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if M key is pressed (case-insensitive)
      if (event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Check if user is typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        event.preventDefault();
        handleMuteToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isYouTube, handleMuteToggle]);

  // YouTube IFrame API setup
  React.useEffect(() => {
    if (!isYouTube || !youtubeId || !shouldLoad || !iframeRef.current) return;

    // Load YouTube IFrame API if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) return;

      playerRef.current = new (window as any).YT.Player(iframeRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          start: videoConfig.startTime || 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();

            // Initialize volume for smart-fade (start at 0, will be controlled by IntersectionObserver)
            event.target.setVolume(0);

            // If we have an end time, set up a timer to check current time
            if (videoConfig.endTime !== undefined) {
              checkIntervalRef.current = setInterval(() => {
                const currentTime = event.target.getCurrentTime();
                if (currentTime >= videoConfig.endTime!) {
                  event.target.seekTo(videoConfig.startTime || 0, true);
                }
              }, 100); // Check every 100ms
            }
          },
          onStateChange: (event: any) => {
            // If video ended, restart from start time
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              event.target.seekTo(videoConfig.startTime || 0, true);
              event.target.playVideo();
            }
          },
        },
      });
    };

    // Wait for YT API to be ready
    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      // Use a queue to handle multiple videos waiting for API
      if (!(window as any).__ytPlayerInitQueue) {
        (window as any).__ytPlayerInitQueue = [];
        (window as any).onYouTubeIframeAPIReady = () => {
          const queue = (window as any).__ytPlayerInitQueue;
          while (queue.length > 0) {
            const init = queue.shift();
            init();
          }
        };
      }
      (window as any).__ytPlayerInitQueue.push(initPlayer);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isYouTube, youtubeId, shouldLoad, videoConfig.startTime, videoConfig.endTime]);

  // Render YouTube player with audio control
  if (isYouTube && youtubeId) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full overflow-hidden"
        onMouseEnter={() => setIsContainerHovered(true)}
        onMouseLeave={() => setIsContainerHovered(false)}
        style={{
          // Smooth opacity transition for button on hover
          transition: 'all 0.3s ease-in-out',
        }}
      >
        {shouldLoad && (
          <>
            <div
              ref={iframeRef as any}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                // Force 16:9 aspect ratio to cover full width
                // Calculate height to cover viewport at 16:9 ratio
                width: '100vw',
                height: '56.25vw', // 16:9 ratio (9/16 = 56.25%)
                minHeight: '100%',
                minWidth: '177.78vh', // Ensure width covers when height is limiting (16/9 = 177.78%)
              }}
            />

            {/* Pillar 2: Audio Toggle Button with micro-interactions */}
            <div
              style={{
                // Dynamic opacity based on hover state
                // Button component handles its own internal opacity states
                opacity: isContainerHovered ? 1 : 1, // Container controls button via props
                transition: 'opacity 0.3s ease-in-out',
              }}
            >
              <VideoAudioToggle
                isMuted={isMuted}
                onToggle={handleMuteToggle}
                isVisible={shouldLoad}
                isContainerHovered={isContainerHovered}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Track when video has seeked to start position (to prevent flash of first frame)
  const [isVideoReady, setIsVideoReady] = React.useState(false);

  // Regular MP4 video with time-based looping support
  React.useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !shouldLoad) return;

    // If we have start/end times, implement custom looping
    if (videoConfig.startTime !== undefined || videoConfig.endTime !== undefined) {
      const handleTimeUpdate = () => {
        const currentTime = videoElement.currentTime;

        // If we have an end time and current time exceeds it, loop back to start
        if (videoConfig.endTime !== undefined && currentTime >= videoConfig.endTime) {
          videoElement.currentTime = videoConfig.startTime || 0;
        }
      };

      const handleLoadedMetadata = () => {
        // Set initial start time when video loads
        if (videoConfig.startTime !== undefined) {
          videoElement.currentTime = videoConfig.startTime;
        } else {
          // No start time, video is ready immediately
          setIsVideoReady(true);
        }
      };

      const handleSeeked = () => {
        // Video has seeked to start position, now safe to show
        setIsVideoReady(true);
      };

      // Handle natural video end - loop back to start time
      const handleEnded = () => {
        videoElement.currentTime = videoConfig.startTime || 0;
        videoElement.play().catch(() => {});
      };

      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('seeked', handleSeeked);
      videoElement.addEventListener('ended', handleEnded);

      return () => {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('seeked', handleSeeked);
        videoElement.removeEventListener('ended', handleEnded);
      };
    } else {
      // No custom times, video is ready immediately when it can play
      const handleCanPlay = () => setIsVideoReady(true);
      videoElement.addEventListener('canplay', handleCanPlay);
      return () => videoElement.removeEventListener('canplay', handleCanPlay);
    }
  }, [shouldLoad, videoConfig.startTime, videoConfig.endTime]);

  // Determine if video should be visible
  // If no start time specified, show immediately; otherwise wait for seek
  const hasCustomStartTime = videoConfig.startTime !== undefined && videoConfig.startTime > 0;
  const showVideo = hasCustomStartTime ? isVideoReady : true;

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <video
        ref={videoRef}
        loop={videoConfig.startTime === undefined && videoConfig.endTime === undefined} // Only use native loop if no custom times
        muted
        playsInline
        preload={initialPriority === LoadPriority.IMMEDIATE ? 'auto' : 'metadata'}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        style={{ opacity: showVideo ? 1 : 0 }}
      >
        {shouldLoad && <source src={videoConfig.url} type="video/mp4" />}
      </video>
    </div>
  );
}

// Photo Slideshow Component with Ken Burns effect and smart layout
function PhotoSlideshow({
  photos,
  slideDuration,
  layoutMode = 'auto',
  collectionName,
}: {
  photos: Array<{
    url: string;
    order: number;
    aspectClass?: 'landscape' | 'portrait' | 'square';
    aspect?: number;
    kb?: any;
  }>;
  slideDuration: number;
  layoutMode?: 'auto' | 'single-fit' | 'single-fill' | 'pair-portraits' | 'manual';
  collectionName: string;
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);

  // Sort and prepare slides based on layout mode
  const slides = React.useMemo(() => {
    const sorted = [...photos].sort((a, b) => a.order - b.order);

    // Auto mode: intelligently pair portraits, leave landscapes single
    if (layoutMode === 'auto') {
      const result: Array<{ type: 'single' | 'pair'; photos: typeof sorted }> = [];
      let i = 0;

      while (i < sorted.length) {
        const current = sorted[i];
        const next = sorted[i + 1];

        // If current and next are both portraits, pair them
        if (
          current.aspectClass === 'portrait' &&
          next?.aspectClass === 'portrait'
        ) {
          result.push({ type: 'pair', photos: [current, next] });
          i += 2;
        } else {
          result.push({ type: 'single', photos: [current] });
          i += 1;
        }
      }

      return result;
    }

    // Pair-portraits mode: force pairing of consecutive portraits
    if (layoutMode === 'pair-portraits') {
      const result: Array<{ type: 'single' | 'pair'; photos: typeof sorted }> = [];
      const portraits = sorted.filter(p => p.aspectClass === 'portrait');
      const others = sorted.filter(p => p.aspectClass !== 'portrait');

      // Pair portraits
      for (let i = 0; i < portraits.length; i += 2) {
        if (i + 1 < portraits.length) {
          result.push({ type: 'pair', photos: [portraits[i], portraits[i + 1]] });
        } else {
          result.push({ type: 'single', photos: [portraits[i]] });
        }
      }

      // Add others as singles
      others.forEach(photo => {
        result.push({ type: 'single', photos: [photo] });
      });

      return result;
    }

    // Default: all singles
    return sorted.map(photo => ({ type: 'single' as const, photos: [photo] }));
  }, [photos, layoutMode]);

  // Auto-advance slides
  React.useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, slideDuration * 1000);

    return () => clearInterval(interval);
  }, [slides.length, slideDuration]);

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      {slides.map((slide, slideIdx) => {
        const isActive = slideIdx === currentSlideIndex;

        return (
          <div
            key={slideIdx}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ zIndex: isActive ? 1 : 0 }}
          >
            {slide.type === 'single' ? (
              <SinglePhotoSlide
                photo={slide.photos[0]}
                layoutMode={layoutMode}
                slideDuration={slideDuration}
                collectionName={collectionName}
              />
            ) : (
              <PairedPhotosSlide
                photos={slide.photos}
                slideDuration={slideDuration}
                collectionName={collectionName}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Single photo slide with smart layout
function SinglePhotoSlide({
  photo,
  layoutMode,
  slideDuration,
  collectionName,
}: {
  photo: any;
  layoutMode: string;
  slideDuration: number;
  collectionName: string;
}) {
  const isFit = layoutMode === 'single-fit';
  const isFill = layoutMode === 'single-fill' || layoutMode === 'auto';

  return (
    <div className="relative w-full h-full">
      {/* Blurred backdrop for fit mode or portrait photos */}
      {(isFit || photo.aspectClass === 'portrait') && (
        <div
          className="absolute inset-0 w-full h-full blur-2xl opacity-40"
          style={{
            backgroundImage: `url(${photo.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Main photo */}
      <img
        src={photo.url}
        alt={`${collectionName}`}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: isFit ? 'contain' : 'cover',
          animation: `kenBurns ${slideDuration * 2}s ease-in-out infinite alternate`,
        }}
      />
    </div>
  );
}

// Paired portraits slide (side-by-side)
function PairedPhotosSlide({
  photos,
  slideDuration,
  collectionName,
}: {
  photos: any[];
  slideDuration: number;
  collectionName: string;
}) {
  return (
    <div className="relative w-full h-full flex gap-1">
      {photos.map((photo, idx) => (
        <div key={idx} className="relative flex-1 overflow-hidden">
          <img
            src={photo.url}
            alt={`${collectionName} - Photo ${idx + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              animation: `kenBurns ${slideDuration * 2}s ease-in-out infinite alternate`,
              animationDelay: `${idx * 0.5}s`, // Stagger animations
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function CollectionsTabClient({
  presentationData,
  customerId,
  authorizedVendors,
  selectedVendor,
  // Legacy props (optional during migration)
  sortedCollections: legacyCollections,
  collectionBadges: legacyBadges,
  skuBadges: legacySkuBadges,
  collectionMedia: legacyMedia
}: CollectionsTabClientProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = React.useState(false);
  const [selectionItems, setSelectionItems] = React.useState<SelectionItem[]>([]);
  const [selectionMetadata, setSelectionMetadata] = React.useState<Record<string, unknown> | null>(null);
  const [isLoadingSelection, setIsLoadingSelection] = React.useState(true);

  // **ADAPTER**: Transform presentationData into legacy format for backward compatibility
  // This allows us to reuse all existing rendering logic without rewriting everything
  const { sortedCollections, collectionBadges, skuBadges, collectionMedia } = React.useMemo(() => {
    // Helper function to convert PresentationCollection to tuple format
    const convertToTuples = (collections: typeof presentationData.allCollections): [string, ProductWithVariants[]][] => {
      return collections.map(collection => [
        collection.collectionName,
        collection.products as unknown as ProductWithVariants[]
      ] as [string, ProductWithVariants[]]);
    };

    // Helper to extract badges
    const extractCollectionBadges = (collections: typeof presentationData.allCollections) => {
      const badges: Record<string, Badge[]> = {};
      collections.forEach(collection => {
        if (collection.badges && collection.badges.length > 0) {
          badges[collection.collectionName] = collection.badges as Badge[];
        }
      });
      return badges;
    };

    // Helper to extract SKU badges
    const extractSkuBadges = (collections: typeof presentationData.allCollections) => {
      const skuBadges: Record<string, Record<string, Badge[]>> = {};
      collections.forEach(collection => {
        if (collection.skuBadges) {
          skuBadges[collection.collectionName] = collection.skuBadges as Record<string, Badge[]>;
        }
      });
      return skuBadges;
    };

    // Helper to extract media
    const extractMedia = (collections: typeof presentationData.allCollections) => {
      const media: Record<string, any> = {};
      collections.forEach(collection => {
        if (collection.media) {
          media[collection.collectionName] = collection.media;
        }
      });
      return media;
    };

    return {
      sortedCollections: convertToTuples(presentationData.allCollections),
      collectionBadges: extractCollectionBadges(presentationData.allCollections),
      skuBadges: extractSkuBadges(presentationData.allCollections),
      collectionMedia: extractMedia(presentationData.allCollections),
    };
  }, [presentationData]);

  // Refs for GSAP ScrollTrigger animations
  const heroRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const macroRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const contentRefs = React.useRef<Map<string, HTMLElement>>(new Map());

  // Create a Set of SKUs currently in selection for O(1) lookup
  const selectedSkus = React.useMemo(() => {
    return new Set(selectionItems.map(item => item.sku));
  }, [selectionItems]);

  // Create a Set of SKUs from the original market snapshot (for "Market Pick" badge)
  // These are the items that were in the Dallas market order, not items added by the customer
  const marketSnapshotSkus = React.useMemo(() => {
    if (!presentationData.activeMarketSnapshot?.items) {
      return new Set<string>();
    }
    return new Set(presentationData.activeMarketSnapshot.items.map((item: any) => item.sku));
  }, [presentationData.activeMarketSnapshot]);

  // Determine selection title based on origin and modification status
  const selectionTitle = React.useMemo(() => {
    if (!selectionMetadata) return 'My Selection';

    const { restoredFrom, wasModified } = selectionMetadata as {
      restoredFrom?: string;
      wasModified?: boolean;
    };

    // If restored from Dallas market selection AND not yet modified
    if (restoredFrom && !wasModified) {
      return 'Market Selection';
    }

    // Otherwise, default to working selection
    return 'Working Selection';
  }, [selectionMetadata]);

  // Load existing selection from API on mount and when vendor changes
  React.useEffect(() => {
    loadSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, selectedVendor]);

  // GSAP ScrollTrigger: Hero-to-Macro transitions for each collection
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const triggers: ScrollTrigger[] = [];

    sortedCollections.forEach(([collectionName]) => {
      const heroEl = heroRefs.current.get(collectionName);
      const macroEl = macroRefs.current.get(collectionName);

      if (!heroEl || !macroEl) return;

      // Create timeline for this collection's hero-to-macro transition
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroEl,
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: 0.5,
          onEnter: () => {
            // Macro shot fades in as hero scrolls out
          },
          onLeaveBack: () => {
            // Macro shot fades out when scrolling back up
          },
        },
      });

      tl.to(heroEl, { opacity: 0, duration: 1 })
        .to(macroEl, { opacity: 1, duration: 1 }, '<'); // '<' means start at same time

      if (tl.scrollTrigger) {
        triggers.push(tl.scrollTrigger);
      }
    });

    return () => {
      // Cleanup: kill all scroll triggers
      triggers.forEach((trigger) => trigger.kill());
    };
  }, [sortedCollections]);

  const loadSelection = async () => {
    try {
      // Build URL with vendor query parameter if vendor is selected
      const url = selectedVendor
        ? `/api/customers/${customerId}/selection/working?vendor=${selectedVendor}`
        : `/api/customers/${customerId}/selection/working`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.selection && data.selection.items) {
          // Convert API items to SelectionItem format
          const items: SelectionItem[] = data.selection.items.map((item: any) => ({
            sku: item.sku,
            name: item.name,
            collection: item.collection || '',
            imageUrl: item.imageUrl || `https://libandco.com/cdn/shop/files/${item.sku}.jpg`,
            quantity: item.qty || 1,
            unitPrice: item.unitList,
            configuration: item.configuration,
          }));
          setSelectionItems(items);
          // Store metadata for selection title computation
          setSelectionMetadata(data.selection.metadata || null);
        }
      }
    } catch (error) {
      console.error('Failed to load selection:', error);
    } finally {
      setIsLoadingSelection(false);
    }
  };

  // Get video URL from collection media, or fall back to old mapping file
  const getCollectionVideoUrl = (collectionName: string): string | null => {
    // First check if we have media configured for this collection
    const media = collectionMedia[collectionName];

    if (media) {
      // Check what type of media we have
      if (media.mediaType === 'youtube' && media.youtubeUrl) {
        // If we have start/end times, return as JSON string so PriorityVideo can parse it
        if (media.youtubeStartTime !== undefined || media.youtubeEndTime !== undefined) {
          return JSON.stringify({
            url: media.youtubeUrl,
            startTime: media.youtubeStartTime,
            endTime: media.youtubeEndTime,
          });
        }
        return media.youtubeUrl;
      } else if (media.mediaType === 'mp4' && media.mp4Url) {
        // If we have start/end times, return as JSON string so PriorityVideo can parse it
        if (media.mp4StartTime !== undefined || media.mp4EndTime !== undefined) {
          return JSON.stringify({
            url: media.mp4Url,
            startTime: media.mp4StartTime,
            endTime: media.mp4EndTime,
          });
        }
        return media.mp4Url;
      } else if (media.mediaType === 'photos' && media.photos && media.photos.length > 0) {
        // For photos, we'll return the first photo URL
        return media.photos[0].url;
      } else if (media.mediaType === 'immersive-slideshow' && media.photos && media.photos.length > 0) {
        // For immersive slideshow, return the first photo URL (used for conditional rendering)
        return media.photos[0].url;
      }
    }

    // Fallback to old collection-videos.json for backward compatibility
    const slug = collectionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-collection';
    return (collectionVideos as Record<string, string>)[slug] || null;
  };

  const handleAddToSelection = async (sku: string, configuration?: { baseItemCode: string; variantSku: string; options: Record<string, string>; productName: string; oldSkuToReplace?: string }) => {
    if (isAdding) return; // Prevent double-clicks

    setIsAdding(true);

    try {
      // If reconfiguring, remove the old SKU first
      if (configuration?.oldSkuToReplace) {
        console.log('[handleAddToSelection] Reconfiguring: replacing', configuration.oldSkuToReplace, 'with', sku);

        // Remove the old SKU
        const updatedItems = selectionItems.filter((item) => item.sku !== configuration.oldSkuToReplace);

        // Update API with removed item
        const removeResponse = await fetch(`/api/customers/${customerId}/selection/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: updatedItems.map(item => ({ sku: item.sku, qty: item.quantity, notes: '' })),
            vendor: selectedVendor,
          }),
        });

        if (!removeResponse.ok) {
          const error = await removeResponse.json().catch(() => ({ error: 'Failed to remove old item' }));
          throw new Error(error.error || 'Failed to remove old item during reconfiguration');
        }
      }

      // Add the new SKU
      const response = await fetch(`/api/customers/${customerId}/selection/add-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, qty: 1, configuration, vendor: selectedVendor }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add item' }));
        throw new Error(error.error || 'Failed to add item to selection');
      }

      const result = await response.json();

      // Reload selection to get updated list
      await loadSelection();

      // Invalidate React Query cache so Selection Tab gets fresh data
      queryClient.invalidateQueries({ queryKey: ['customer-working', customerId, selectedVendor] });

      // Build descriptive toast message
      const productName = configuration?.productName || sku;
      const variantDetails = configuration?.options
        ? Object.values(configuration.options).join(' / ')
        : '';

      toast({
        title: configuration?.oldSkuToReplace
          ? 'Configuration Updated'
          : `Added: ${productName}${variantDetails ? ` - ${variantDetails}` : ''}`,
        description: configuration?.oldSkuToReplace
          ? `Updated to ${variantDetails || sku}`
          : `Your selection now contains ${result.itemCount} items`,
      });
    } catch (error) {
      console.error('Failed to add to selection:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to add item to selection',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromSelection = async (sku: string) => {
    console.log('[handleRemoveFromSelection] Removing SKU:', sku);
    console.log('[handleRemoveFromSelection] Current items:', selectionItems.map(i => i.sku));

    // Calculate updated items first
    const updatedItems = selectionItems.filter((item) => item.sku !== sku);
    console.log('[handleRemoveFromSelection] Updated items after filter:', updatedItems.map(i => i.sku));

    // Optimistically update UI
    setSelectionItems(updatedItems);

    try {
      const payload = {
        items: updatedItems.map((item) => ({
          sku: item.sku,
          qty: item.quantity,
          notes: '',
        })),
        metadata: { updatedVia: 'product-card-remove' },
        vendor: selectedVendor,
      };
      console.log('[handleRemoveFromSelection] Sending payload:', JSON.stringify(payload));

      const response = await fetch(`/api/customers/${customerId}/selection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[handleRemoveFromSelection] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[handleRemoveFromSelection] Error response:', errorData);
        throw new Error('Failed to remove item from selection');
      }

      const result = await response.json();
      console.log('[handleRemoveFromSelection] Success result:', result);

      // Invalidate React Query cache so Selection Tab gets fresh data
      queryClient.invalidateQueries({ queryKey: ['customer-working', customerId, selectedVendor] });

      toast({
        title: 'Removed from selection',
        description: `${sku} has been removed from your working selection`,
      });
    } catch (error) {
      console.error('Failed to remove from selection:', error);
      // Reload to restore state on error
      await loadSelection();
      toast({
        title: 'Error',
        description: 'Failed to remove item from selection',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateQuantity = async (sku: string, quantity: number) => {
    // Optimistically update UI
    const updatedItems = selectionItems.map((item) =>
      item.sku === sku ? { ...item, quantity } : item
    );
    setSelectionItems(updatedItems);

    try {
      const response = await fetch(`/api/customers/${customerId}/selection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: updatedItems.map((item) => ({
            sku: item.sku,
            qty: item.quantity,
            notes: '',
          })),
          metadata: { updatedVia: 'collection-panel' },
          vendor: selectedVendor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      // Invalidate React Query cache so Selection Tab gets fresh data
      queryClient.invalidateQueries({ queryKey: ['customer-working', customerId, selectedVendor] });
    } catch (error) {
      console.error('Failed to update quantity:', error);
      // Reload to get correct state
      await loadSelection();
      toast({
        title: 'Error',
        description: 'Failed to update quantity',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveItem = async (sku: string) => {
    // Calculate updated items first to avoid stale state
    const updatedItems = selectionItems.filter((item) => item.sku !== sku);

    // Optimistically update UI
    setSelectionItems(updatedItems);

    try {
      const response = await fetch(`/api/customers/${customerId}/selection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: updatedItems.map((item) => ({
            sku: item.sku,
            qty: item.quantity,
            notes: '',
          })),
          metadata: { updatedVia: 'collection-panel' },
          vendor: selectedVendor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      // Invalidate React Query cache so Selection Tab gets fresh data
      queryClient.invalidateQueries({ queryKey: ['customer-working', customerId, selectedVendor] });

      toast({
        title: 'Item removed',
        description: 'Item has been removed from your selection',
      });
    } catch (error) {
      console.error('Failed to remove item:', error);
      await loadSelection();
      toast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive',
      });
    }
  };

  const handleClearAll = async () => {
    setSelectionItems([]);

    try {
      const response = await fetch(`/api/customers/${customerId}/selection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [],
          metadata: { updatedVia: 'collection-panel' },
          vendor: selectedVendor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear selection');
      }

      // Invalidate React Query cache so Selection Tab gets fresh data
      queryClient.invalidateQueries({ queryKey: ['customer-working', customerId, selectedVendor] });

      toast({
        title: 'Selection cleared',
        description: 'All items have been removed from your selection',
      });
    } catch (error) {
      console.error('Failed to clear selection:', error);
      await loadSelection();
      toast({
        title: 'Error',
        description: 'Failed to clear selection',
        variant: 'destructive',
      });
    }
  };

  const handleSaveSelection = async () => {
    // Already auto-saving, this is just for explicit user action
    await loadSelection();
    toast({
      title: 'Selection saved',
      description: 'Your selection has been saved successfully',
    });
  };

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    const url = `/api/customers/${customerId}/export/${format}?type=working`;
    window.open(url, '_blank');
    toast({
      title: 'Export started',
      description: `Your selection is being exported as ${format.toUpperCase()}`,
    });
  };

  // Helper to get macro shot image for a collection
  const getMacroShotUrl = (collectionName: string): string | null => {
    const media = collectionMedia[collectionName];

    // Check if we have explicit macro shots in media config
    if (media?.macroShots && media.macroShots.length > 0) {
      return media.macroShots[0].url;
    }

    // Fallback: use first photo if available
    if (media?.photos && media.photos.length > 0) {
      return media.photos[0].url;
    }

    return null;
  };

  // Helper to render collection sections
  const renderCollections = (collections: [string, ProductWithVariants[]][], sectionKey: string) => {
    return collections.map(([collectionName, items], index) => {
      const videoUrl = getCollectionVideoUrl(collectionName);
      const media = collectionMedia[collectionName];
      const isPhoto = media?.mediaType === 'photos';
      const isImmersive = media?.mediaType === 'immersive-slideshow';
      const macroShotUrl = getMacroShotUrl(collectionName);

      // Determine if this collection has video (YouTube or MP4) vs image-based media
      const hasVideo = media?.mediaType === 'youtube' || media?.mediaType === 'mp4' ||
        (!media && videoUrl && !isPhoto && !isImmersive);

      // For video collections: full-width 4-column grid
      // For image collections: asymmetric layout with macro shot on left
      const useFullWidthLayout = hasVideo;

      return (
        <section key={`${sectionKey}-${collectionName}`} className="relative">
              {/* Full-Bleed Hero */}
              <div
                ref={(el) => {
                  if (el) heroRefs.current.set(collectionName, el);
                }}
                className="hero-full-bleed w-screen relative left-[50%] right-[50%] -mx-[50vw] bg-black"
              >
                <div className="relative w-full h-[100vh] overflow-hidden">
                  {/* Video/Photo Background or Fallback */}
                  {videoUrl ? (
                    isImmersive && media?.photos && media?.immersive ? (
                      <ImmersiveSlideshow
                        photos={media.photos}
                        config={media.immersive}
                      />
                    ) : isPhoto && media?.photos ? (
                      <PhotoSlideshow
                        photos={media.photos}
                        slideDuration={media.slideDuration || 5}
                        layoutMode={media.photoLayoutMode || 'auto'}
                        collectionName={collectionName}
                      />
                    ) : (
                      <PriorityVideo videoUrl={videoUrl} collectionName={collectionName} index={index} />
                    )
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
                  )}

                  {/* Gradient overlay for better text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Bottom-left cluster: Title & Badges */}
                  <div className="absolute bottom-8 left-8 flex items-center">
                    <h2 className="text-[2.25rem] font-semibold text-white m-0">{collectionName}</h2>
                    {collectionBadges[collectionName]?.map((badge) => (
                      <div key={badge.id} className="ml-4">
                        <BadgeDisplay badge={badge} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Grid Section - Layout varies based on media type */}
              {useFullWidthLayout ? (
                /* VIDEO LAYOUT: Full-width 4-column grid below video */
                <div className="w-screen relative left-[50%] right-[50%] -mx-[50vw] min-h-screen py-12 px-8 bg-black dark:bg-black">
                  <div className="max-w-[1800px] mx-auto">
                    <div
                      className="video-layout-grid grid gap-6 w-full"
                      style={{ gridTemplateColumns: 'repeat(4, minmax(200px, 1fr))' }}
                    >
                      {items.map((product, itemIndex) => {
                        // Get badges for this product's SKU from the current collection
                        let productBadges = skuBadges[collectionName]?.[product.baseSku] || [];

                        // If no badges found for baseSku, check each variant SKU
                        if (productBadges.length === 0 && skuBadges[collectionName]) {
                          for (const variant of product.variants) {
                            const variantBadges = skuBadges[collectionName][variant.sku];
                            if (variantBadges && variantBadges.length > 0) {
                              productBadges = variantBadges;
                              break;
                            }
                          }
                        }

                        return (
                          <ProductCard
                            key={product.baseSku}
                            productWithVariants={product}
                            index={itemIndex}
                            onAddToSelection={handleAddToSelection}
                            onRemoveFromSelection={handleRemoveFromSelection}
                            productBadges={productBadges}
                            selectedSkus={selectedSkus}
                            marketSnapshotSkus={marketSnapshotSkus}
                            marketSnapshotItems={presentationData.activeMarketSnapshot?.items || []}
                            selectionItems={selectionItems}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* IMAGE LAYOUT: Three-Lane Grid with Sticky Macro + Scrolling Products */
                <div className="immersive-page-grid min-h-screen py-12 bg-black dark:bg-black">
                  {/* Sticky Macro Shot Column */}
                  {macroShotUrl && (
                    <aside
                      ref={(el) => {
                        if (el) macroRefs.current.set(collectionName, el);
                      }}
                      className="macro-shot-column"
                    >
                      <img
                        src={macroShotUrl}
                        alt={`${collectionName} detail`}
                        className="w-full h-auto object-cover"
                      />
                    </aside>
                  )}

                  {/* Product Grid (Scrolling Content) */}
                  <main
                    ref={(el) => {
                      if (el) contentRefs.current.set(collectionName, el);
                    }}
                    className="product-grid-asymmetrical bg-black dark:bg-black"
                  >
                    <div className="grid grid-cols-2 gap-8 w-full" style={{ gridTemplateColumns: 'repeat(2, minmax(224px, 1fr))' }}>
                      {items.map((product, itemIndex) => {
                        // Get badges for this product's SKU from the current collection
                        let productBadges = skuBadges[collectionName]?.[product.baseSku] || [];

                        // If no badges found for baseSku, check each variant SKU
                        if (productBadges.length === 0 && skuBadges[collectionName]) {
                          for (const variant of product.variants) {
                            const variantBadges = skuBadges[collectionName][variant.sku];
                            if (variantBadges && variantBadges.length > 0) {
                              productBadges = variantBadges;
                              break;
                            }
                          }
                        }

                        return (
                          <ProductCard
                            key={product.baseSku}
                            productWithVariants={product}
                            index={itemIndex}
                            onAddToSelection={handleAddToSelection}
                            onRemoveFromSelection={handleRemoveFromSelection}
                            productBadges={productBadges}
                            selectedSkus={selectedSkus}
                            marketSnapshotSkus={marketSnapshotSkus}
                            marketSnapshotItems={presentationData.activeMarketSnapshot?.items || []}
                            selectionItems={selectionItems}
                          />
                        );
                      })}
                    </div>
                  </main>
                </div>
              )}
            </section>
          );
        });
  };

  // Fetch alignment data
  const [alignmentReport, setAlignmentReport] = React.useState<any>(null);

  React.useEffect(() => {
    async function fetchAlignment() {
      try {
        const vendorId = selectedVendor || 'lib-and-co';
        const response = await fetch(`/api/alignment/v1/${customerId}?vendorId=${vendorId}`);
        if (response.ok) {
          const data = await response.json();
          setAlignmentReport(data);
        }
      } catch (err) {
        console.error('Failed to fetch alignment data:', err);
      }
    }
    fetchAlignment();
  }, [customerId, selectedVendor]);

  // Prepare collections for two-section rendering
  const selectedCollectionsTuples = React.useMemo(() => {
    return presentationData.selectedCollections.map(collection => [
      collection.collectionName,
      collection.products as unknown as ProductWithVariants[]
    ] as [string, ProductWithVariants[]]);
  }, [presentationData.selectedCollections]);

  // Extract recommended collection names from alignment suggestions
  const recommendedCollectionNames = React.useMemo(() => {
    if (!alignmentReport?.suggestions?.add) return new Set<string>();
    return new Set(alignmentReport.suggestions.add.map((s: any) => s.collectionName));
  }, [alignmentReport]);

  // Split other collections into recommended and remaining
  const recommendedCollectionsTuples = React.useMemo(() => {
    return presentationData.otherCollections
      .filter(collection => recommendedCollectionNames.has(collection.collectionName))
      .map(collection => [
        collection.collectionName,
        collection.products as unknown as ProductWithVariants[]
      ] as [string, ProductWithVariants[]]);
  }, [presentationData.otherCollections, recommendedCollectionNames]);

  const otherCollectionsTuples = React.useMemo(() => {
    return presentationData.otherCollections
      .filter(collection => !recommendedCollectionNames.has(collection.collectionName))
      .map(collection => [
        collection.collectionName,
        collection.products as unknown as ProductWithVariants[]
      ] as [string, ProductWithVariants[]]);
  }, [presentationData.otherCollections, recommendedCollectionNames]);

  // Territory Best Sellers collections (from actual sales data)
  const bestSellerCollectionsTuples = React.useMemo(() => {
    if (!presentationData.bestSellerCollections) return [];
    return presentationData.bestSellerCollections.map(collection => [
      collection.collectionName,
      collection.products as unknown as ProductWithVariants[]
    ] as [string, ProductWithVariants[]]);
  }, [presentationData.bestSellerCollections]);

  // Map best seller rankings for display
  const bestSellerRankingMap = React.useMemo(() => {
    if (!presentationData.bestSellerRankings) return new Map<string, { rank: number; revenue: number; customerCount: number }>();
    const map = new Map<string, { rank: number; revenue: number; customerCount: number }>();
    presentationData.bestSellerRankings.forEach(r => {
      map.set(r.collectionName, { rank: r.rank, revenue: r.totalRevenue, customerCount: r.customerCount });
    });
    return map;
  }, [presentationData.bestSellerRankings]);

  // Section config for sticky headers (CSS-only approach)
  type SectionId = 'market-selection' | 'recommended' | 'best-sellers' | 'all-collections';

  const sectionConfig: Record<SectionId, { label: string; color: string; bgColor: string; borderColor: string }> = {
    'market-selection': {
      label: 'Your Market Selection',
      color: 'text-white',
      bgColor: 'bg-slate-900/95',
      borderColor: 'border-slate-700',
    },
    'recommended': {
      label: 'Recommended For You',
      color: 'text-emerald-300',
      bgColor: 'bg-emerald-950/95',
      borderColor: 'border-emerald-800',
    },
    'best-sellers': {
      label: 'Territory Best Sellers',
      color: 'text-amber-300',
      bgColor: 'bg-amber-950/95',
      borderColor: 'border-amber-800',
    },
    'all-collections': {
      label: 'All Collections',
      color: 'text-gray-300',
      bgColor: 'bg-slate-900/95',
      borderColor: 'border-slate-700',
    },
  };

  // Collection Hero - Large centered title block for first section
  // Shows on initial load, fades out as you scroll
  // The Glass Coin header appears when this fades out
  const CollectionHero = ({
    title,
    description,
    onVisibilityChange
  }: {
    title: string;
    description: string;
    onVisibilityChange: (isVisible: boolean) => void;
  }) => {
    const heroRef = React.useRef<HTMLDivElement>(null);
    const [heroOpacity, setHeroOpacity] = React.useState(1);

    React.useEffect(() => {
      const heroElement = heroRef.current;
      if (!heroElement) return;

      const handleScroll = () => {
        const rect = heroElement.getBoundingClientRect();
        const threshold = 100; // Pixel point where transition happens

        // Calculate opacity based on how much hero has scrolled
        // Fade starts when hero top reaches threshold, completes when hero is 100px above
        const fadeStart = threshold;
        const fadeEnd = -50; // Hero top position when fully faded
        const heroTop = rect.top;

        if (heroTop > fadeStart) {
          // Hero fully visible
          setHeroOpacity(1);
          onVisibilityChange(true);
        } else if (heroTop < fadeEnd) {
          // Hero fully scrolled away
          setHeroOpacity(0);
          onVisibilityChange(false);
        } else {
          // Interpolate opacity
          const progress = (fadeStart - heroTop) / (fadeStart - fadeEnd);
          setHeroOpacity(1 - progress);
          onVisibilityChange(progress < 0.5);
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Initial check

      return () => window.removeEventListener('scroll', handleScroll);
    }, [onVisibilityChange]);

    return (
      <div
        ref={heroRef}
        className="collection-hero"
        style={{
          textAlign: 'center',
          padding: '80px 20px 60px',
          maxWidth: '800px',
          margin: '0 auto',
          position: 'relative',
          opacity: heroOpacity,
          transition: 'opacity 0.3s ease',
        }}
      >
        <h1
          style={{
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: '24px',
            // Gradient text effect
            background: 'linear-gradient(to bottom, #fff, #aaa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: '1.1rem',
            fontWeight: 300,
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>
    );
  };

  // Glass Coin/Capsule Header - Fixed at top-center
  // Appears when hero scrolls away, feels like text gets "captured" into the glass coin
  const GlassCoinHeader = ({
    title,
    isVisible,
  }: {
    title: string;
    isVisible: boolean;
  }) => {
    const easeOutExpo = 'cubic-bezier(0.16, 1, 0.3, 1)';

    return (
      <div
        style={{
          position: 'fixed',
          top: '110px', // Below the main header
          left: '50%',
          transform: isVisible
            ? 'translateX(-50%) translateY(0) scale(1)'
            : 'translateX(-50%) translateY(-20px) scale(0.9)',
          zIndex: 1000,

          // Glassmorphism styles
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',

          // Pill/capsule shape
          padding: '12px 30px',
          borderRadius: '50px',

          // Typography
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.9)',
          whiteSpace: 'nowrap',

          // Visibility transition
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          transition: `all 0.4s ${easeOutExpo}`,
        }}
      >
        {title}
      </div>
    );
  };

  // Dark Frost Left-Edge Tab with Card Stack + Lock-In Animation
  // Implements sophisticated visual transition with dynamic accent colors
  // Used for sections 2+ (Recommended, Best Sellers, All Collections)
  const SectionStickyHeader = ({
    sectionId,
    badge,
    sectionIndex = 0,
  }: {
    sectionId: SectionId;
    badge?: { label: string; color: string };
    sectionIndex?: number;
  }) => {
    const stickyRef = React.useRef<HTMLDivElement>(null);
    const [isActive, setIsActive] = React.useState(false);

    // Dynamic accent color based on section type
    const accentColor = sectionId === 'recommended'
      ? '#6ee7b7' // Emerald for Market Aligned
      : sectionId === 'best-sellers'
        ? '#fcd34d' // Amber for Territory Sales
        : '#94a3b8'; // Slate for default

    // IntersectionObserver to detect "stuck" state
    React.useEffect(() => {
      const stickyElement = stickyRef.current;
      if (!stickyElement) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          const rect = stickyElement.getBoundingClientRect();

          // When element is at or near stuck position (top: 100px)
          if (!entry.isIntersecting && rect.top <= 105) {
            setIsActive(true);
          } else if (entry.isIntersecting && entry.intersectionRatio > 0.9) {
            setIsActive(false);
          }
        },
        {
          threshold: [0, 0.5, 0.9, 1],
          rootMargin: '-100px 0px 0px 0px',
        }
      );

      observer.observe(stickyElement);
      return () => observer.disconnect();
    }, []);

    // Base z-index increases with section index for "card stack" effect
    const baseZIndex = 500 + (sectionIndex * 10);

    // Ease-Out-Expo curve for snappy start, luxurious finish
    const easeOutExpo = 'cubic-bezier(0.16, 1, 0.3, 1)';

    return (
      <div
        ref={stickyRef}
        className="sticky top-[100px]"
        style={{
          height: 0,
          marginLeft: 'calc(-50vw + 50%)',
          width: '100vw',
          zIndex: baseZIndex,
          // CSS variable for dynamic accent color
          ['--accent-color' as string]: accentColor,
          // Pointer events none (wrapper has no clickable content)
          pointerEvents: 'none',
        }}
      >
        <div
          className="inline-flex items-center gap-2"
          style={{
            // Tab shape & position
            padding: '12px 28px 12px 20px',
            marginLeft: 0,
            borderRadius: '0 50px 50px 0',

            // Dark Frost styling - darker when active to block background noise
            background: isActive
              ? 'rgba(15, 15, 15, 0.95)'
              : 'rgba(20, 20, 20, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',

            // Glass borders with "glint" on active
            borderTop: isActive
              ? '1px solid rgba(255, 255, 255, 0.5)'
              : '1px solid rgba(255, 255, 255, 0.15)',
            borderRight: isActive
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            borderBottom: isActive
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.04)',
            borderLeft: 'none',

            // "Lift" shadow with colored glow on active
            boxShadow: isActive
              ? `0 15px 40px -5px rgba(0, 0, 0, 0.5), 0 0 25px -10px ${accentColor}`
              : '5px 5px 20px rgba(0, 0, 0, 0.4)',

            // Font
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

            // Lock-in animation: grayscale inactive, full color when stuck
            opacity: isActive ? 1 : 0.7,

            filter: isActive ? 'grayscale(0)' : 'grayscale(0.8)',

            // Smooth transition for all state changes
            transition: `all 0.6s ${easeOutExpo}`,

            transformOrigin: 'left center',
          }}
        >
          {/* Accent Label (e.g., "MARKET ALIGNED") with glow effect */}
          {badge && (
            <span
              className="accent-text"
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                // Active: accent color with text bloom glow
                color: isActive ? accentColor : 'rgba(148, 163, 184, 0.7)',
                textShadow: isActive ? `0 0 10px ${accentColor}` : 'none',
                transition: `all 0.6s ${easeOutExpo}`,
              }}
            >
              {badge.label}
            </span>
          )}

          {/* Separator dot */}
          {badge && (
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.3)',
                fontSize: '0.8rem',
                opacity: isActive ? 1 : 0.4,
                transition: `opacity 0.6s ${easeOutExpo}`,
              }}
            >
              •
            </span>
          )}

          {/* Main Title - white when active */}
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 500,
              color: isActive ? '#ffffff' : 'rgba(240, 240, 240, 0.8)',
              letterSpacing: '0.01em',
              transition: `color 0.6s ${easeOutExpo}`,
            }}
          >
            {sectionConfig[sectionId].label}
          </span>

          {/* Subtitle with slide-in animation (The "Pulse") */}
          {badge && (
            <span
              className="banner-subtitle"
              style={{
                fontSize: '0.7rem',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.5)',
                marginLeft: '8px',
                // Hidden and offset when inactive, slides in when active
                opacity: isActive ? 0.7 : 0,
                transform: isActive ? 'translateX(0)' : 'translateX(-15px)',
                // Slight delay for staggered reveal effect
                transition: `all 0.5s 0.1s ease`,
              }}
            >
              {sectionId === 'recommended' && '• Curated picks based on market data'}
              {sectionId === 'best-sellers' && '• Top performers in your territory'}
            </span>
          )}
        </div>
      </div>
    );
  };

  // State for first section hero-to-dock handoff
  // Start with hero visible = true, so the tab starts hidden
  const [isFirstSectionHeroVisible, setIsFirstSectionHeroVisible] = React.useState(true);

  // Memoize the callback to prevent unnecessary re-renders
  const handleHeroVisibilityChange = React.useCallback((isVisible: boolean) => {
    setIsFirstSectionHeroVisible(isVisible);
  }, []);

  return (
    <>
      <div className="bg-black dark:bg-black">
        {/* Glass Coin Header - Fixed at top-center, appears when hero scrolls away */}
        {presentationData.hasMarketSelection && selectedCollectionsTuples.length > 0 && (
          <GlassCoinHeader
            title="Your Market Selection"
            isVisible={!isFirstSectionHeroVisible}
          />
        )}

        {/* SECTION 1: "Your Market Selection" (only if customer has market selection) */}
        {/* Hero fades out on scroll, Glass Coin appears - feels like text gets "captured" */}
        {presentationData.hasMarketSelection && selectedCollectionsTuples.length > 0 && (
          <section className="relative first-collection" style={{ zIndex: 10 }}>
            {/* Hero Block - Large centered title, fades out on scroll */}
            <CollectionHero
              title="Your Market Selection"
              description="Curated based on territory sales data and regional alignment. These styles represent your top opportunities."
              onVisibilityChange={handleHeroVisibilityChange}
            />

            {/* Render selected collections */}
            {renderCollections(selectedCollectionsTuples, 'selected')}
          </section>
        )}

        {/* SECTION 1.5: "Recommended For You" (alignment suggestions) */}
        {presentationData.hasMarketSelection && recommendedCollectionsTuples.length > 0 && (
          <section className="relative" style={{ zIndex: 20 }}>
            {/* Sticky Section Header with badge */}
            <SectionStickyHeader
              sectionId="recommended"
              badge={{ label: 'Market Aligned', color: 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' }}
              sectionIndex={1}
            />

            {/* Render recommended collections */}
            {renderCollections(recommendedCollectionsTuples, 'recommended')}
          </section>
        )}

        {/* SECTION 1.75: "Territory Best Sellers" (from actual sales data) */}
        {presentationData.hasMarketSelection && bestSellerCollectionsTuples.length > 0 && (
          <section className="relative" style={{ zIndex: 30 }}>
            {/* Sticky Section Header with badge */}
            <SectionStickyHeader
              sectionId="best-sellers"
              badge={{ label: 'Territory Sales', color: 'bg-amber-500/20 border border-amber-500/30 text-amber-300' }}
              sectionIndex={2}
            />

            {/* Render best seller collections */}
            {renderCollections(bestSellerCollectionsTuples, 'bestsellers')}
          </section>
        )}

        {/* SECTION 2: "All Collections" */}
        {presentationData.hasMarketSelection && otherCollectionsTuples.length > 0 && (
          <section className="relative" style={{ zIndex: 40 }}>
            {/* Sticky Section Header */}
            <SectionStickyHeader sectionId="all-collections" sectionIndex={3} />

            {/* Render other collections */}
            {renderCollections(otherCollectionsTuples, 'other')}
          </section>
        )}

        {/* Default Presentation (no market selection) */}
        {!presentationData.hasMarketSelection && (
          renderCollections(sortedCollections, 'all')
        )}
      </div>

      {/* Persistent Selection Panel */}
      <SelectionPanel
        items={selectionItems}
        customerId={customerId}
        title={selectionTitle}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearAll={handleClearAll}
        onSaveSelection={handleSaveSelection}
        onExport={handleExport}
      />
    </>
  );
}
