/**
 * Home Screen Skeleton Components
 * 
 * Skeleton loaders for various sections of the home screen.
 * Matches the actual home screen layout for seamless loading experience.
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

/**
 * Featured episode card skeleton (horizontal layout)
 */
export function FeaturedEpisodeSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Image Skeleton - Square thumbnail */}
          <Skeleton className="w-24 h-24 flex-shrink-0 rounded-md" />
          
          {/* Content Skeleton */}
          <div className="flex-1 space-y-2">
            {/* Title */}
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            
            {/* Description */}
            <Skeleton className="h-3 w-full" />
            
            {/* Metadata */}
            <div className="flex gap-4 pt-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Stats card skeleton (for podcast stats section)
 */
export function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Label */}
          <Skeleton className="h-3 w-24" />
          
          {/* Value */}
          <Skeleton className="h-8 w-16" />
          
          {/* Progress bar (optional) */}
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Welcome banner skeleton
 */
export function WelcomeBannerSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Greeting */}
          <Skeleton className="h-6 w-48" />
          
          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          {/* CTA Button */}
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Complete home screen skeleton
 * Shows skeleton for all major sections while data loads
 */
export function HomeScreenSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-4 space-y-6 pb-24">
        {/* Welcome Banner Skeleton */}
        <WelcomeBannerSkeleton />
        
        {/* Stats Section Skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        
        {/* Featured Episodes Section */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
          
          {/* Featured Episodes List */}
          <div className="space-y-3">
            <FeaturedEpisodeSkeleton />
            <FeaturedEpisodeSkeleton />
            <FeaturedEpisodeSkeleton />
          </div>
        </div>
        
        {/* Latest Episodes Section */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
          
          {/* Latest Episodes Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-0">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
