/**
 * Error State Component
 * 
 * Displays user-friendly error messages with recovery actions.
 * Replaces blank screens or confusing technical errors with helpful UI.
 * 
 * Design Features:
 * - Clear visual hierarchy (icon → title → message → actions)
 * - Actionable CTAs (primary and secondary actions)
 * - Severity-based styling (error, warning, info)
 * - Support link for additional help
 * - Optional technical details (for debugging)
 * 
 * @example
 * ```tsx
 * // Simple error
 * <ErrorState 
 *   type="NETWORK_ERROR"
 *   onRetry={() => loadData()}
 * />
 * 
 * // With secondary action
 * <ErrorState 
 *   type="SPOTIFY_ERROR"
 *   onRetry={() => loadSpotify()}
 *   onSecondaryAction={() => navigate('/episodes?tab=youtube')}
 * />
 * 
 * // Custom message
 * <ErrorState 
 *   type="API_ERROR"
 *   customMessage="Failed to load your personalized recommendations."
 *   onRetry={() => loadRecommendations()}
 * />
 * ```
 */

import React, { useState } from 'react';
import { Button } from './button';
import { getErrorConfig, ERROR_MESSAGES } from '../../utils/errorMessages';

export interface ErrorStateProps {
  /** Error type key from errorMessages.ts */
  type: keyof typeof ERROR_MESSAGES;
  /** Primary action callback (e.g., retry) */
  onRetry?: () => void;
  /** Secondary action callback (e.g., navigate elsewhere) */
  onSecondaryAction?: () => void;
  /** Override the default message */
  customMessage?: string;
  /** Override the default title */
  customTitle?: string;
  /** Show technical error details (for debugging) */
  technicalDetails?: string;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode (smaller, inline errors) */
  compact?: boolean;
}

/**
 * Error state component with user-friendly messaging
 * 
 * Displays errors in a helpful, actionable way instead of blank screens.
 * Automatically styles based on error severity.
 */
export function ErrorState({
  type,
  onRetry,
  onSecondaryAction,
  customMessage,
  customTitle,
  technicalDetails,
  className = '',
  compact = false
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const config = getErrorConfig(type);
  const Icon = config.icon;

  // Severity-based styling
  const severityStyles = {
    error: 'text-destructive',
    warning: 'text-orange-500',
    info: 'text-blue-500'
  };

  const iconBgStyles = {
    error: 'bg-destructive/10',
    warning: 'bg-orange-500/10',
    info: 'bg-blue-500/10'
  };

  if (compact) {
    // Compact inline error
    return (
      <div className={`rounded-lg border p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${iconBgStyles[config.severity]}`}>
            <Icon className={`w-4 h-4 ${severityStyles[config.severity]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">
              {customTitle || config.title}
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              {customMessage || config.message}
            </p>
            {(onRetry || onSecondaryAction) && (
              <div className="flex items-center gap-2">
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    {config.action}
                  </Button>
                )}
                {onSecondaryAction && config.secondaryAction && (
                  <Button
                    onClick={onSecondaryAction}
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                  >
                    {config.secondaryAction}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full-screen error state
  return (
    <div className={`flex-1 flex items-center justify-center p-6 ${className}`}>
      <div className="text-center max-w-md space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className={`rounded-full p-6 ${iconBgStyles[config.severity]}`}>
            <Icon className={`w-12 h-12 ${severityStyles[config.severity]}`} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">
            {customTitle || config.title}
          </h2>
          
          {/* Message */}
          <p className="text-muted-foreground">
            {customMessage || config.message}
          </p>
        </div>

        {/* Actions */}
        {(onRetry || onSecondaryAction) && (
          <div className="flex flex-col gap-2 pt-2">
            {onRetry && (
              <Button onClick={onRetry} size="lg" className="w-full">
                {config.action}
              </Button>
            )}
            
            {onSecondaryAction && config.secondaryAction && (
              <Button 
                onClick={onSecondaryAction} 
                variant="outline" 
                size="lg"
                className="w-full"
              >
                {config.secondaryAction}
              </Button>
            )}
          </div>
        )}

        {/* Support link */}
        <div className="pt-4">
          <button 
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              // Could open a support modal or navigate to help page
              console.log('Support requested for error:', type);
            }}
          >
            Need help? Contact support
          </button>
        </div>

        {/* Technical details (for debugging) */}
        {technicalDetails && (
          <div className="pt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showDetails ? 'Hide' : 'Show'} technical details
            </button>
            
            {showDetails && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md text-left">
                <code className="text-xs text-muted-foreground break-all">
                  {technicalDetails}
                </code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Quick error state presets for common scenarios
 */
export const ErrorStatePresets = {
  Network: (onRetry: () => void) => (
    <ErrorState type="NETWORK_ERROR" onRetry={onRetry} />
  ),
  
  NoEpisodes: (onRefresh: () => void) => (
    <ErrorState type="NO_EPISODES" onRetry={onRefresh} />
  ),
  
  NoSearchResults: (onClearSearch: () => void, onBrowseAll?: () => void) => (
    <ErrorState 
      type="NO_SEARCH_RESULTS" 
      onRetry={onClearSearch}
      onSecondaryAction={onBrowseAll}
    />
  ),
  
  VIPRequired: (onUpgrade: () => void, onLearnMore?: () => void) => (
    <ErrorState 
      type="VIP_REQUIRED" 
      onRetry={onUpgrade}
      onSecondaryAction={onLearnMore}
    />
  )
};
