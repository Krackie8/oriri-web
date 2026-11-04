/**
 * Episode Card Skeleton Component
 * 
 * Displays an animated placeholder that matches the actual episode card layout.
 * Used while episode data is loading to improve perceived performance.
 * 
 * Design matches the real episode card from SimpleRSSEpisodesScreen:
 * - Square aspect ratio image placeholder
 * - Title and description lines
 * - Metadata (date, duration)
 * - Social metrics (views, likes)
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface EpisodeSkeletonProps {
  /**
   * Number of skeleton cards to render
   * @default 1
   */
  count?: number;
}

/**
 * Single episode card skeleton
 */
function SingleEpisodeSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Image Skeleton - Square aspect ratio to match real episode cards */}
        <Skeleton className="aspect-square w-full" />
        
        {/* Episode Info Skeleton */}
        <div className="p-4 space-y-3">
          {/* Title Skeleton - 2 lines */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          
          {/* Description Skeleton - 3 lines */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          
          {/* Metadata Skeleton - Date and Duration */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          
          {/* Social Metrics Skeleton - Views, Likes */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Episode card skeleton loader
 * 
 * Renders one or more skeleton cards in a responsive grid layout.
 * Automatically handles count prop to show multiple skeletons.
 * 
 * @example
 * ```tsx
 * // Single skeleton
 * <EpisodeSkeleton />
 * 
 * // Grid of 6 skeletons
 * <EpisodeSkeleton count={6} />
 * ```
 */
export function EpisodeSkeleton({ count = 1 }: EpisodeSkeletonProps) {
  if (count === 1) {
    return <SingleEpisodeSkeleton />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SingleEpisodeSkeleton key={index} />
      ))}
    </>
  );
}

/**
 * Episode grid skeleton
 * 
 * Pre-configured skeleton grid matching the actual episode layout.
 * Shows 6 cards in a responsive grid (1 col mobile, 2 col tablet, 3 col desktop).
 */
export function EpisodeGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <EpisodeSkeleton count={6} />
    </div>
  );
}
