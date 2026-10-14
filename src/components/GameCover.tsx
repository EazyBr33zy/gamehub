import React, { useState } from 'react';
import { PlatformIcon } from './PlatformIcon';
import { Gamepad2 } from 'lucide-react';

export interface GameCoverProps {
  src?: string | null;
  title: string;
  consoleName?: string | null;
  className?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero' | 'card' | 'thumb';
  priority?: boolean;
  grayscale?: boolean;
}

// Helper to get initials from title (e.g., "Silent Hill 2" -> "SH2", "Hades" -> "HA")
function getTitleInitials(title: string): string {
  if (!title) return 'GH';
  const clean = title.replace(/\.m[db]$/i, '').replace(/[^\w\s]/gi, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'GH';
}

// Optimize IGDB cover URLs based on display size
export function optimizeCoverUrl(url: string | null | undefined, size: 'sm' | 'md' | 'lg' | 'hero' | 'card' | 'thumb'): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  let cleanUrl = url.trim();

  // If it's the old hardcoded default placeholder co3i89, treat as null so neutral fallback is rendered
  if (cleanUrl.includes('co3i89.jpg')) {
    return null;
  }

  // IGDB URL optimization
  if (cleanUrl.includes('images.igdb.com')) {
    if (size === 'hero' || size === 'lg') {
      cleanUrl = cleanUrl.replace(/t_[a-z0-9_]+/i, 't_cover_big_2x');
    } else if (size === 'sm' || size === 'thumb') {
      cleanUrl = cleanUrl.replace(/t_[a-z0-9_]+/i, 't_cover_small');
    } else {
      cleanUrl = cleanUrl.replace(/t_[a-z0-9_]+/i, 't_cover_big');
    }
  }

  return cleanUrl;
}

export const GameCover: React.FC<GameCoverProps> = ({
  src,
  title,
  consoleName,
  className = '',
  alt,
  size = 'md',
  priority = false,
  grayscale = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const optimizedSrc = optimizeCoverUrl(src, size);
  const initials = getTitleInitials(title);
  const accessibleAlt = alt || `Capa do jogo ${title}`;

  if (!optimizedSrc || hasError) {
    return (
      <div 
        className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-surface-2 flex flex-col items-center justify-between p-3 select-none ${className}`}
        aria-label={accessibleAlt}
      >
        <div className="w-full flex justify-end">
          <span className="rounded bg-black/40 p-1 text-text-muted">
            <PlatformIcon consoleName={consoleName} size={16} className="h-4 w-4 text-accent" />
          </span>
        </div>

        <div className="flex flex-col items-center justify-center my-auto text-center px-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-accent font-heading text-lg font-black tracking-wider shadow-inner">
            {initials}
          </div>
          <span className="mt-2 text-xs font-bold text-text-muted line-clamp-2 px-1 text-center leading-tight">
            {title}
          </span>
        </div>

        <div className="w-full text-center">
          <span className="text-xs uppercase font-mono font-bold text-text-muted/60 tracking-wider">
            {consoleName || 'GameHub'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-surface ${grayscale ? 'grayscale contrast-125 opacity-75' : ''} ${className}`}>
      {/* Skeleton while image is loading */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface to-surface-2 flex items-center justify-center">
          <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
            <Gamepad2 className="h-4 w-4 text-text-muted animate-pulse" aria-hidden="true" />
          </div>
        </div>
      )}

      <img
        src={optimizedSrc}
        alt={accessibleAlt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${grayscale ? 'grayscale' : ''} ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
