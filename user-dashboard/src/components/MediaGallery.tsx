import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ImageIcon, Play, Video } from 'lucide-react';
import { applyImageFallback, normalizeImageUrl } from '@/lib/image';
import { cn } from '@/lib/utils';

export interface MediaGalleryItem {
  type: 'image' | 'video';
  src: string;
  alt?: string;
  poster?: string;
}

interface MediaGalleryProps {
  items: MediaGalleryItem[];
  className?: string;
  aspectClassName?: string;
  overlay?: ReactNode;
  emptyState?: ReactNode;
}

const normalizeVideoUrl = (rawUrl?: string): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const value = rawUrl.trim();
  if (!value) return null;
  if (value.startsWith('/') || value.startsWith('blob:') || value.startsWith('data:')) return value;

  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
};

const MediaGallery = ({
  items,
  className,
  aspectClassName = 'aspect-video',
  overlay,
  emptyState,
}: MediaGalleryProps) => {
  const normalizedItems = useMemo(
    () =>
      items
        .map((item) => {
          const src = item.type === 'image' ? normalizeImageUrl(item.src) : normalizeVideoUrl(item.src);
          if (!src) return null;
          return {
            ...item,
            src,
            poster: item.poster ? normalizeImageUrl(item.poster) : undefined,
          };
        })
        .filter((item): item is MediaGalleryItem => Boolean(item)),
    [items]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = normalizedItems[activeIndex];
  const mediaSignature = useMemo(
    () => normalizedItems.map((item) => `${item.type}:${item.src}:${item.poster || ''}`).join('|'),
    [normalizedItems]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [mediaSignature]);

  return (
    <div className={className}>
      <div className={cn('relative overflow-hidden rounded-xl border border-border bg-muted', aspectClassName)}>
        {activeItem ? (
          activeItem.type === 'video' ? (
            <video
              src={activeItem.src}
              controls
              poster={activeItem.poster}
              preload="metadata"
              className="h-full w-full object-cover bg-black"
            />
          ) : (
            <img
              src={activeItem.src}
              alt={activeItem.alt || 'Media item'}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={applyImageFallback}
            />
          )
        ) : (
          emptyState || (
            <div className="h-full w-full flex items-center justify-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )
        )}

        {overlay}
      </div>

      {normalizedItems.length > 1 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {normalizedItems.map((item, index) => (
            <button
              key={`${item.type}-${item.src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                'group relative overflow-hidden rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                activeIndex === index ? 'border-primary ring-1 ring-primary/50' : 'border-border hover:border-primary/40'
              )}
              aria-label={`Show ${item.type} ${index + 1}`}
              aria-pressed={activeIndex === index}
            >
              <div className="relative aspect-video bg-muted">
                {item.type === 'video' ? (
                  item.poster ? (
                    <img
                      src={item.poster}
                      alt={`Video thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={applyImageFallback}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-black/80">
                      <Video className="h-6 w-6 text-white/80" />
                    </div>
                  )
                ) : (
                  <img
                    src={item.src}
                    alt={item.alt || `Image ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={applyImageFallback}
                  />
                )}

                {item.type === 'video' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="rounded-full bg-white/90 p-2 shadow-sm">
                      <Play className="h-4 w-4 text-black fill-black" />
                    </span>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
