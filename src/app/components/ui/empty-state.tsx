/**
 * Empty State Component
 * 
 * Displays friendly messages when there's no content to show.
 * Different from error states - these are expected, valid states.
 * 
 * Use Cases:
 * - No search results
 * - No episodes in a category
 * - Empty user library
 * - Fresh account with no data
 * 
 * @example
 * ```tsx
 * // Simple empty state
 * <EmptyState 
 *   title="No Episodes Yet"
 *   message="New content is coming soon!"
 *   icon={Inbox}
 * />
 * 
 * // With action
 * <EmptyState 
 *   title="No Search Results"
 *   message="Try different keywords"
 *   icon={Search}
 *   action="Clear Search"
 *   onAction={() => setSearch('')}
 * />
 * 
 * // With illustration
 * <EmptyState 
 *   title="Your Library is Empty"
 *   message="Save episodes to listen later"
 *   icon={Bookmark}
 *   illustration="/empty-library.svg"
 *   action="Browse Episodes"
 *   onAction={() => navigate('/episodes')}
 * />
 * ```
 */

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './button';

export interface EmptyStateProps {
  /** Main heading */
  title: string;
  /** Supporting message */
  message: string;
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Optional illustration image URL */
  illustration?: string;
  /** Primary action button text */
  action?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action button text */
  secondaryAction?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode (smaller, for inline use) */
  compact?: boolean;
}

/**
 * Empty state component for no-content scenarios
 * 
 * Displays friendly, helpful messaging when there's nothing to show.
 * Not an error - this is an expected, valid state.
 */
export function EmptyState({
  title,
  message,
  icon: Icon = Inbox,
  illustration,
  action,
  onAction,
  secondaryAction,
  onSecondaryAction,
  className = '',
  compact = false
}: EmptyStateProps) {
  
  if (compact) {
    // Compact inline empty state
    return (
      <div className={`text-center py-8 px-4 ${className}`}>
        {Icon && (
          <div className="flex justify-center mb-3">
            <div className="rounded-full p-3 bg-muted/50">
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        )}
        
        <h4 className="font-medium text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground mb-3">{message}</p>
        
        {(action || secondaryAction) && (
          <div className="flex items-center justify-center gap-2">
            {action && onAction && (
              <Button onClick={onAction} size="sm" variant="outline">
                {action}
              </Button>
            )}
            {secondaryAction && onSecondaryAction && (
              <Button onClick={onSecondaryAction} size="sm" variant="ghost">
                {secondaryAction}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full empty state
  return (
    <div className={`flex-1 flex items-center justify-center p-6 ${className}`}>
      <div className="text-center max-w-md space-y-6">
        {/* Illustration or Icon */}
        {illustration ? (
          <div className="flex justify-center mb-6">
            <img 
              src={illustration} 
              alt={title}
              className="w-48 h-48 object-contain opacity-60"
            />
          </div>
        ) : Icon ? (
          <div className="flex justify-center">
            <div className="rounded-full p-8 bg-muted/30">
              <Icon className="w-16 h-16 text-muted-foreground/60" />
            </div>
          </div>
        ) : null}

        {/* Content */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col gap-2 pt-4">
            {action && onAction && (
              <Button onClick={onAction} size="lg" className="w-full">
                {action}
              </Button>
            )}
            {secondaryAction && onSecondaryAction && (
              <Button 
                onClick={onSecondaryAction} 
                variant="outline" 
                size="lg"
                className="w-full"
              >
                {secondaryAction}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Pre-configured empty state variants for common scenarios
 */
export const EmptyStateVariants = {
  NoEpisodes: ({ onRefresh, onBrowse }: { onRefresh?: () => void; onBrowse?: () => void }) => (
    <EmptyState
      title="No Episodes Yet"
      message="New content is coming soon! Check back later."
      icon={Inbox}
      action={onRefresh ? "Refresh" : undefined}
      onAction={onRefresh}
      secondaryAction={onBrowse ? "Browse All" : undefined}
      onSecondaryAction={onBrowse}
    />
  ),

  NoSearchResults: ({ 
    searchQuery, 
    onClear, 
    onBrowse 
  }: { 
    searchQuery: string; 
    onClear: () => void; 
    onBrowse?: () => void;
  }) => (
    <EmptyState
      title="No Results Found"
      message={`No episodes found for "${searchQuery}". Try different keywords.`}
      action="Clear Search"
      onAction={onClear}
      secondaryAction={onBrowse ? "Browse All" : undefined}
      onSecondaryAction={onBrowse}
    />
  ),

  EmptyLibrary: ({ onBrowse }: { onBrowse: () => void }) => (
    <EmptyState
      title="Your Library is Empty"
      message="Save episodes to build your personal collection."
      action="Browse Episodes"
      onAction={onBrowse}
    />
  ),

  NoPlatformContent: ({ 
    platform, 
    onRetry, 
    onSwitchPlatform 
  }: { 
    platform: string; 
    onRetry: () => void;
    onSwitchPlatform?: () => void;
  }) => (
    <EmptyState
      title={`No ${platform} Episodes`}
      message={`We couldn't find any ${platform} episodes. Other platforms are still available!`}
      action="Retry"
      onAction={onRetry}
      secondaryAction={onSwitchPlatform ? "Switch Platform" : undefined}
      onSecondaryAction={onSwitchPlatform}
    />
  )
};
