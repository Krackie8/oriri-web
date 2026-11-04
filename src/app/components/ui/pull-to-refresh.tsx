/**
 * Pull-to-Refresh Component
 * 
 * Native-feeling pull-to-refresh gesture for mobile web.
 * Wraps scrollable content and triggers refresh callback when user pulls down.
 * 
 * Features:
 * - Smooth animations matching native apps (iOS/Android)
 * - Visual feedback with spinner and text
 * - Threshold-based triggering (pull far enough to activate)
 * - Automatic reset after refresh completes
 * - Works with existing scroll containers
 * - Touch-optimized (no interference with normal scrolling)
 * 
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={loadData}>
 *   <div className="content">
 *     Your scrollable content here
 *   </div>
 * </PullToRefresh>
 * ```
 */

import React, { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

export interface PullToRefreshProps {
  /** Content to wrap with pull-to-refresh */
  children: ReactNode;
  /** Async callback to trigger on refresh */
  onRefresh: () => Promise<void> | void;
  /** Disabled state (prevents pull-to-refresh) */
  disabled?: boolean;
  /** Custom threshold in pixels to trigger refresh (default: 80) */
  threshold?: number;
  /** Custom max pull distance in pixels (default: 120) */
  maxPullDistance?: number;
  /** Additional CSS classes for wrapper */
  className?: string;
}

/**
 * Pull-to-refresh wrapper component
 * 
 * Detects pull-down gestures and triggers refresh callback.
 * Provides visual feedback during pull and refresh states.
 */
export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  maxPullDistance = 120,
  className = ''
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldTrigger, setShouldTrigger] = useState(false);
  
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle touch start - Record initial Y position
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only start pull if we're at the top of the scroll container
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [disabled, isRefreshing]);

  /**
   * Handle touch move - Update pull distance
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || touchStartY.current === 0) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      // User scrolled down, cancel pull
      touchStartY.current = 0;
      setPullDistance(0);
      setShouldTrigger(false);
      return;
    }

    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;
    
    // Only allow pulling down (positive distance)
    if (distance > 0) {
      // Apply resistance effect (gets harder to pull as distance increases)
      const resistanceFactor = 0.5;
      const adjustedDistance = Math.min(
        distance * resistanceFactor,
        maxPullDistance
      );
      
      setPullDistance(adjustedDistance);
      setShouldTrigger(adjustedDistance >= threshold);
      
      // Prevent default scrolling while pulling
      if (adjustedDistance > 10) {
        e.preventDefault();
      }
    }
  }, [disabled, isRefreshing, threshold, maxPullDistance]);

  /**
   * Handle touch end - Trigger refresh if threshold met
   */
  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || touchStartY.current === 0) return;
    
    touchStartY.current = 0;
    
    if (shouldTrigger) {
      // Trigger refresh
      setIsRefreshing(true);
      setShouldTrigger(false);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('[PullToRefresh] Refresh failed:', error);
      } finally {
        // Smooth reset animation
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      // Reset without triggering
      setPullDistance(0);
      setShouldTrigger(false);
    }
  }, [disabled, isRefreshing, shouldTrigger, onRefresh]);

  // Calculate visual states
  const isActive = pullDistance > 0 || isRefreshing;
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = isRefreshing ? 360 : progress * 180;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-y-auto overflow-x-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        height: '100%',
        WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 pointer-events-none z-50"
        style={{
          height: isActive ? '60px' : '0px',
          opacity: isActive ? 1 : 0,
          transform: `translateY(${isRefreshing ? '0' : `-${60 - pullDistance}px`})`
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {/* Spinner icon */}
          <RefreshCw
            className={`w-5 h-5 text-muted-foreground transition-all duration-200 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${rotation}deg)`
            }}
          />
          
          {/* Status text */}
          <span className="text-xs text-muted-foreground font-medium">
            {isRefreshing 
              ? 'Refreshing...' 
              : shouldTrigger 
                ? 'Release to refresh' 
                : 'Pull to refresh'
            }
          </span>
        </div>
      </div>

      {/* Content with push-down effect during pull */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${isActive ? pullDistance : 0}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Simpler pull-to-refresh hook for custom implementations
 * 
 * @example
 * ```tsx
 * const { isPulling, isRefreshing, bind } = usePullToRefresh({
 *   onRefresh: loadData
 * });
 * 
 * return <div {...bind}>{content}</div>
 * ```
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false
}: {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    touchStartY.current = e.touches[0].clientY;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || touchStartY.current === 0) return;
    
    const distance = e.touches[0].clientY - touchStartY.current;
    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 120));
    }
  }, [disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || touchStartY.current === 0) return;
    
    touchStartY.current = 0;
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  return {
    isPulling: pullDistance > 0,
    isRefreshing,
    pullDistance,
    bind: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}
