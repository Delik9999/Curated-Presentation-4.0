'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { PhotoSlide, ImmersiveSlideshowConfig, FocalPointPreset } from '@/lib/selections/types';

interface ImmersiveSlideshowProps {
  photos: PhotoSlide[];
  config: ImmersiveSlideshowConfig;
}

// Map focal point preset to CSS object-position values
function focalPointToPosition(preset: FocalPointPreset): string {
  const map: Record<FocalPointPreset, string> = {
    'center': '50% 50%',
    'top': '50% 0%',
    'bottom': '50% 100%',
    'left': '0% 50%',
    'right': '100% 50%',
    'top-left': '0% 0%',
    'top-right': '100% 0%',
    'bottom-left': '0% 100%',
    'bottom-right': '100% 100%',
  };
  return map[preset] || map.center;
}

// Map Ken Burns intensity to scale delta
function intensityToScale(intensity: 'subtle' | 'medium' | 'strong'): number {
  const map = {
    subtle: 1.06,  // ~6% zoom
    medium: 1.10,  // ~10% zoom
    strong: 1.14,  // ~14% zoom
  };
  return map[intensity] || map.subtle;
}

// Generate Ken Burns animation for a slide
function generateKenBurnsMotion(
  motionSeed: 'auto' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out',
  scale: number,
  slideIndex: number
): { from: string; to: string } {
  let motion = motionSeed;

  // Auto mode: alternate between motions
  if (motion === 'auto') {
    const motions: Array<'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right'> =
      ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'];
    motion = motions[slideIndex % motions.length];
  }

  switch (motion) {
    case 'zoom-in':
      return {
        from: 'scale(1) translate(0, 0)',
        to: `scale(${scale}) translate(0, 0)`,
      };
    case 'zoom-out':
      return {
        from: `scale(${scale}) translate(0, 0)`,
        to: 'scale(1) translate(0, 0)',
      };
    case 'pan-left':
      return {
        from: `scale(${scale}) translate(3%, 0)`,
        to: `scale(${scale}) translate(-3%, 0)`,
      };
    case 'pan-right':
      return {
        from: `scale(${scale}) translate(-3%, 0)`,
        to: `scale(${scale}) translate(3%, 0)`,
      };
    default:
      return {
        from: 'scale(1) translate(0, 0)',
        to: `scale(${scale}) translate(0, 0)`,
      };
  }
}

export default function ImmersiveSlideshow({ photos, config }: ImmersiveSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isInView, setIsInView] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Prepare photos (shuffle if needed)
  const preparedPhotos = useMemo(() => {
    let photoList = [...photos];

    if (config.order === 'shuffle') {
      // Fisher-Yates shuffle with deterministic seed (based on photo count)
      const seed = photos.length;
      let currentIndex = photoList.length;
      let randomValue = seed;

      while (currentIndex !== 0) {
        randomValue = (randomValue * 9301 + 49297) % 233280;
        const randomIndex = Math.floor((randomValue / 233280) * currentIndex);
        currentIndex--;
        [photoList[currentIndex], photoList[randomIndex]] =
          [photoList[randomIndex], photoList[currentIndex]];
      }
    }

    return photoList;
  }, [photos, config.order]);

  // Ken Burns scale factor
  const scale = intensityToScale(config.kbIntensity);

  // Detect reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Detect mobile/low-power
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  const shouldReduceMotion = prefersReducedMotion || (isMobile && config.reduceMotionOnMobile);

  // IntersectionObserver to pause when off-screen
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Slideshow timer
  useEffect(() => {
    if (!isPlaying || !isInView || preparedPhotos.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % preparedPhotos.length);
    }, config.slideDurationSec * 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, isInView, preparedPhotos.length, config.slideDurationSec]);

  if (preparedPhotos.length === 0) {
    return (
      <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-lg">
        <p className="text-muted-foreground text-sm">No photos available</p>
      </div>
    );
  }

  const currentPhoto = preparedPhotos[currentIndex];
  const nextPhoto = preparedPhotos[(currentIndex + 1) % preparedPhotos.length];

  // Get focal point position - per-photo focal point takes priority over global default
  const getCurrentPhotoFocalPoint = (photo: typeof currentPhoto) => {
    if (photo.focalPoint) {
      return `${photo.focalPoint.x * 100}% ${photo.focalPoint.y * 100}%`;
    }
    return focalPointToPosition(config.globalFocalPoint || 'center');
  };

  const currentFocalPoint = getCurrentPhotoFocalPoint(currentPhoto);
  const nextFocalPoint = getCurrentPhotoFocalPoint(nextPhoto);

  // Ken Burns motion
  const kenBurnsMotion = generateKenBurnsMotion(
    config.motionSeed,
    shouldReduceMotion ? 1.02 : scale, // Reduce motion if needed
    currentIndex
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-lg bg-black"
      role="region"
      aria-label="Immersive photo slideshow"
    >
      {/* Current Slide */}
      <div
        key={`slide-${currentIndex}`}
        className="absolute inset-0 w-full h-full"
        style={{
          animation: shouldReduceMotion
            ? 'none'
            : `kenBurnsSlide ${config.slideDurationSec}s ease-in-out forwards`,
          willChange: 'transform',
        }}
      >
        <img
          src={currentPhoto.url}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{
            objectPosition: currentFocalPoint,
            transform: kenBurnsMotion.from,
          }}
        />
        <style jsx>{`
          @keyframes kenBurnsSlide {
            0% {
              transform: ${kenBurnsMotion.from};
            }
            100% {
              transform: ${kenBurnsMotion.to};
            }
          }
        `}</style>
      </div>

      {/* Next Slide (Preloaded, cross-fading in) */}
      <div
        key={`slide-next-${(currentIndex + 1) % preparedPhotos.length}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          animation: `crossFade ${config.fadeDurationSec}s ease-in-out ${
            config.slideDurationSec - config.fadeDurationSec
          }s forwards`,
          opacity: 0,
          willChange: 'opacity',
        }}
      >
        <img
          src={nextPhoto.url}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{
            objectPosition: nextFocalPoint,
          }}
        />
        <style jsx>{`
          @keyframes crossFade {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
        `}</style>
      </div>

      {/* Progress Indicators */}
      {config.showProgressDots && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 z-10 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="text-white text-xs font-medium">
              {currentIndex + 1} / {preparedPhotos.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
