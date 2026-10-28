'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  Activity,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Sparkles,
} from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  category?: string;
  aspectRatio?: string;
  sizes?: string;
  priority?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  category,
  aspectRatio = 'aspect-[4/3]',
  priority = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(src));

  const getCategoryIcon = () => {
    switch (category?.toLowerCase()) {
      case 'mobility':
        return <Activity className="text-teal-600" size={36} />;
      case 'respiratory':
        return <HeartPulse className="text-blue-600" size={36} />;
      case 'monitoring_diagnostics':
        return <Stethoscope className="text-indigo-600" size={36} />;
      case 'fall_prevention':
        return <ShieldCheck className="text-amber-600" size={36} />;
      default:
        return <ShoppingBag className="text-slate-400" size={36} />;
    }
  };

  const showPlaceholder = !src || hasError;

  return (
    <div
      className={`relative ${aspectRatio} bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 overflow-hidden flex items-center justify-center`}
    >
      {/* Loading Skeleton */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse z-10" />
      )}

      {/* Actual Product Image */}
      {!showPlaceholder && (
        <img
          src={src}
          alt={alt || 'VivoQuest Certified Medical Equipment'}
          className={`${className} transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}

      {/* Clean, Verified Fallback Placeholder when image is unavailable */}
      {showPlaceholder && (
        <div
          role="img"
          aria-label={alt ? `Image for ${alt}` : 'Medical Equipment Placeholder'}
          className="w-full h-full p-4 flex flex-col items-center justify-center text-center select-none"
        >
          {/* Subtle medical grid background */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:12px_12px]" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mb-2.5">
              {getCategoryIcon()}
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-navy">
              VivoQuest Medical
            </span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {category ? category.replace('_', ' ').toUpperCase() : 'CERTIFIED EQUIPMENT'}
            </span>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[9px] font-bold">
              <Sparkles size={10} />
              <span>Biomedical Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
