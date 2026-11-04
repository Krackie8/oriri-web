import React from 'react';
import { Skeleton } from './skeleton';

// Episode card skeleton
export function EpisodeCardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      <div className="flex space-x-3">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

// Episode list skeleton
export function EpisodeListSkeleton({ count = 3, horizontal = false, compact = false }: { count?: number; horizontal?: boolean; compact?: boolean }) {
  if (horizontal) {
    if (compact) {
      return (
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="min-w-[140px] bg-card rounded-lg overflow-hidden">
              <Skeleton className="w-full h-24 rounded-t-lg" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-2 w-8" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                  <Skeleton className="h-1 w-full rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="min-w-[280px] bg-card rounded-lg overflow-hidden">
            <Skeleton className="w-full h-36" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <EpisodeCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Live session card skeleton
export function LiveSessionSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      <div className="flex items-center space-x-2">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <div className="flex items-center space-x-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

// Community post skeleton
export function CommunityPostSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      <div className="flex items-center space-x-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex space-x-4">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

// Store product skeleton
export function ProductCardSkeleton({ count = 1 }: { count?: number }) {
  if (count === 1) {
    return (
      <div className="bg-card rounded-lg overflow-hidden">
        <Skeleton className="w-full h-48" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-lg overflow-hidden">
          <Skeleton className="w-full h-28" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Profile section skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

// Audio player skeleton
export function AudioPlayerSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-1 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="flex items-center justify-center space-x-4">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    </div>
  );
}

// Generic content skeleton
export function ContentSkeleton({ 
  lines = 3, 
  showAvatar = false,
  showButton = false 
}: { 
  lines?: number;
  showAvatar?: boolean;
  showButton?: boolean;
}) {
  return (
    <div className="space-y-3">
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={`h-4 ${
              i === lines - 1 ? 'w-2/3' : 'w-full'
            }`} 
          />
        ))}
      </div>
      {showButton && (
        <Skeleton className="h-8 w-24 rounded-full" />
      )}
    </div>
  );
}

// Page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <EpisodeListSkeleton count={2} />
      </div>
    </div>
  );
}