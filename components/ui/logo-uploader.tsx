'use client';

import * as React from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button-modern';
import { Input } from '@/components/ui/input-modern';

export interface LogoUploaderProps {
  value?: string; // Current logo URL
  onChange: (logoUrl: string | null) => void;
  className?: string;
}

export function LogoUploader({ value, onChange, className }: LogoUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState('');
  const [isLoadingImage, setIsLoadingImage] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const hasLogo = Boolean(value && !imageError);

  // Handle file drop
  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Convert file to data URL
  const handleFileUpload = (file: File) => {
    setIsLoadingImage(true);
    setImageError(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onChange(dataUrl);
      setIsLoadingImage(false);
    };
    reader.onerror = () => {
      setIsLoadingImage(false);
      setImageError(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle URL input
  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      setImageError(false);
      onChange(urlInput.trim());
      setUrlInput('');
    }
  };

  // Handle URL input on Enter key
  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  // Handle logo removal
  const handleRemove = () => {
    onChange(null);
    setImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle logo change (re-open file picker)
  const handleChange = () => {
    fileInputRef.current?.click();
  };

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  if (hasLogo) {
    // State B: Logo uploaded - show preview with change/remove options
    return (
      <div className={cn('space-y-3', className)}>
        <div className="relative w-full aspect-[2/1] max-w-md mx-auto rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
          <img
            src={value}
            alt="Customer logo"
            onError={handleImageError}
            className="w-full h-full object-contain p-4"
          />
        </div>
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            onClick={handleChange}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Change Logo
          </button>
          <span className="text-neutral-400">•</span>
          <button
            onClick={handleRemove}
            className="text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            Remove Logo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  // State A: No logo - show upload interface
  return (
    <div className={cn('space-y-4', className)}>
      {/* File dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative w-full aspect-[2/1] max-w-md mx-auto rounded-lg border-2 border-dashed transition-colors cursor-pointer',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600'
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
          {isLoadingImage ? (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-blue-600" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Upload className="h-8 w-8 text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Drag & drop logo file, or click to upload
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                  PNG, JPG, or SVG up to 10MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* URL input */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Input
            type="url"
            placeholder="Or paste image URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            className="pr-20"
          />
          {urlInput && (
            <Button
              onClick={handleUrlSubmit}
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
            >
              Use URL
            </Button>
          )}
        </div>
      </div>

      {imageError && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          Failed to load image. Please try a different file or URL.
        </p>
      )}
    </div>
  );
}
