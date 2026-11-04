/**
 * Skeleton Loading Component
 * 
 * Provides animated placeholder elements while content is loading.
 * Follows Shadcn UI patterns with Tailwind CSS animations.
 * 
 * @example
 * ```tsx
 * // Simple skeleton
 * <Skeleton className="h-4 w-48" />
 * 
 * // Custom skeleton
 * <Skeleton className="h-32 w-full rounded-lg" />
 * ```
 */

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Custom className for skeleton styling
   * Use Tailwind classes for height, width, border-radius, etc.
   */
  className?: string;
}

/**
 * Animated skeleton placeholder component
 * 
 * Displays a pulsing gray rectangle to indicate loading content.
 * Fully customizable via className prop.
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/50 ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton variant with shimmer effect (premium loading animation)
 * 
 * Provides a more sophisticated loading effect with a subtle shine animation.
 */
export function SkeletonShimmer({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-muted/50 ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
