# Media Feature Implementation Plan

## Status: Implementation Complete ✅

### What's Done:
- ✅ Updated `lib/selections/types.ts` with `MediaType`, `CollectionMedia`, `PhotoSlide` types
- ✅ Added `media?: CollectionMedia` to `PresentationItemProperties`
- ✅ Added Media section to `properties-inspector.tsx` (after Product Badges section)
- ✅ Added imports for `MediaType` to properties-inspector
- ✅ Changed Accordion `defaultValue` from `["general"]` to `[]` to collapse General section by default
- ✅ TypeScript compiles (no new errors introduced)

### What Remains:

## 1. Add Media Section to Properties Inspector

**File:** `app/rep/_components/properties-inspector.tsx`

**Add after the Badges section (around line 400-500), before the Product Badges section:**

```tsx
{/* Media Section */}
{!isBulkMode && selectedItem?.type === 'collection' && (
  <AccordionItem value="media">
    <AccordionTrigger>
      <div className="flex items-center justify-between w-full pr-2">
        <span>Media</span>
        {selectedItem.properties.media?.mediaType && selectedItem.properties.media.mediaType !== 'none' && (
          <span className="text-xs text-muted-foreground">
            {selectedItem.properties.media.mediaType === 'youtube' && 'YouTube Video'}
            {selectedItem.properties.media.mediaType === 'mp4' && 'MP4 Video'}
            {selectedItem.properties.media.mediaType === 'photos' && `${selectedItem.properties.media.photos?.length || 0} Photos`}
          </span>
        )}
      </div>
    </Accordion Trigger>
    <AccordionContent>
      {/* Media type selector */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Media Type</Label>
          <Select
            value={selectedItem.properties.media?.mediaType || 'none'}
            onValueChange={(value: MediaType) => {
              onUpdate(selectedItem.id, {
                media: {
                  mediaType: value,
                  // Clear other fields when switching types
                  ...(value === 'youtube' && { youtubeUrl: '', photos: undefined, mp4Url: undefined }),
                  ...(value === 'mp4' && { mp4Url: '', photos: undefined, youtubeUrl: undefined }),
                  ...(value === 'photos' && { photos: [], slideDuration: 5, youtubeUrl: undefined, mp4Url: undefined }),
                  ...(value === 'none' && { youtubeUrl: undefined, mp4Url: undefined, photos: undefined }),
                },
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
            </SelectContent>
          </Select>
        </div>

        {/* YouTube Fields */}
        {selectedItem.properties.media?.mediaType === 'youtube' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input
                value={selectedItem.properties.media.youtubeUrl || ''}
                onChange={(e) => {
                  onUpdate(selectedItem.id, {
                    media: {
                      ...selectedItem.properties.media!,
                      youtubeUrl: e.target.value,
                    },
                  });
                }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Start Time (seconds)</Label>
                <Input
                  type="number"
                  value={selectedItem.properties.media.youtubeStartTime || ''}
                  onChange={(e) => {
                    onUpdate(selectedItem.id, {
                      media: {
                        ...selectedItem.properties.media!,
                        youtubeStartTime: parseInt(e.target.value) || undefined,
                      },
                    });
                  }}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">End Time (seconds)</Label>
                <Input
                  type="number"
                  value={selectedItem.properties.media.youtubeEndTime || ''}
                  onChange={(e) => {
                    onUpdate(selectedItem.id, {
                      media: {
                        ...selectedItem.properties.media!,
                        youtubeEndTime: parseInt(e.target.value) || undefined,
                      },
                    });
                  }}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
        )}

        {/* MP4 Fields */}
        {selectedItem.properties.media?.mediaType === 'mp4' && (
          <div className="space-y-2">
            <Label>MP4 Video URL</Label>
            <Input
              value={selectedItem.properties.media.mp4Url || ''}
              onChange={(e) => {
                onUpdate(selectedItem.id, {
                  media: {
                    ...selectedItem.properties.media!,
                    mp4Url: e.target.value,
                  },
                });
              }}
              placeholder="https://cdn.example.com/video.mp4"
            />
          </div>
        )}

        {/* Photo Slideshow Fields */}
        {selectedItem.properties.media?.mediaType === 'photos' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Slide Duration (seconds)</Label>
              <Input
                type="number"
                value={selectedItem.properties.media.slideDuration || 5}
                onChange={(e) => {
                  onUpdate(selectedItem.id, {
                    media: {
                      ...selectedItem.properties.media!,
                      slideDuration: parseInt(e.target.value) || 5,
                    },
                  });
                }}
                min="1"
                max="30"
              />
            </div>
            <div className="space-y-2">
              <Label>Photos</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  // TODO: Upload files and get URLs
                  // For now, create placeholder URLs
                  const newPhotos = files.map((file, idx) => ({
                    url: URL.createObjectURL(file),
                    order: (selectedItem.properties.media?.photos?.length || 0) + idx,
                  }));
                  onUpdate(selectedItem.id, {
                    media: {
                      ...selectedItem.properties.media!,
                      photos: [...(selectedItem.properties.media?.photos || []), ...newPhotos],
                    },
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Upload multiple images. Drag to reorder (coming soon).
              </p>
            </div>
            {/* Photo list */}
            {selectedItem.properties.media.photos && selectedItem.properties.media.photos.length > 0 && (
              <div className="space-y-2">
                {selectedItem.properties.media.photos
                  .sort((a, b) => a.order - b.order)
                  .map((photo, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                      <img src={photo.url} alt="" className="w-16 h-16 object-cover rounded" />
                      <span className="text-sm flex-1">Photo {idx + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newPhotos = selectedItem.properties.media!.photos!.filter((_, i) => i !== idx);
                          onUpdate(selectedItem.id, {
                            media: {
                              ...selectedItem.properties.media!,
                              photos: newPhotos.map((p, i) => ({ ...p, order: i })),
                            },
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AccordionContent>
  </AccordionItem>
)}
```

## 2. Add Imports

Add to imports at top of `properties-inspector.tsx`:

```tsx
import { MediaType, CollectionMedia, PhotoSlide } from '@/lib/selections/types';
```

## 3. Set General Section Collapsed by Default

Find the `<Accordion>` tag (around line 250) and change from:
```tsx
<Accordion type="multiple" defaultValue={["general", "badges"]}>
```

To:
```tsx
<Accordion type="multiple" defaultValue={["badges"]}>
```

## 4. Migration Note

The existing `heroVideoUrl` field in `CollectionData` can be migrated on-the-fly:
- When loading a collection with `heroVideoUrl`, auto-populate `media.youtubeUrl`
- This can be done in the Properties Inspector's useEffect or in the collections-manager

## 5. CSS for Ken Burns Effect (Future)

When implementing photo slideshow viewer, add this CSS:

```css
@keyframes kenBurns {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
}

.ken-burns {
  animation: kenBurns 8s ease-in-out infinite alternate;
}
```

## Next Steps:

1. Implement the Media section in properties-inspector.tsx
2. Test switching between media types
3. Verify existing video functionality still works (if any collections have heroVideoUrl)
4. Add photo upload/storage logic (placeholder for now)
5. Implement Ken Burns slideshow viewer component (separate task)
