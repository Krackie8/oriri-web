/**
 * Error Messages Dictionary
 * 
 * Centralized, user-friendly error messages for the Oriri podcast app.
 * Maps error types to helpful messages with actionable guidance.
 * 
 * Design Philosophy:
 * - Clear, non-technical language
 * - Actionable suggestions
 * - Appropriate tone (empathetic, not alarming)
 * - Platform-specific context where helpful
 */

import { 
  WifiOff, 
  AlertCircle, 
  Inbox, 
  Search, 
  Crown, 
  VideoOff, 
  Music,
  ServerCrash,
  LucideIcon
} from 'lucide-react';

export interface ErrorConfig {
  /** User-facing error title */
  title: string;
  /** Detailed error message with helpful context */
  message: string;
  /** Primary action button text */
  action: string;
  /** Secondary action button text (optional) */
  secondaryAction?: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Severity level for styling */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Error message configurations
 * 
 * Each error type has a unique configuration with:
 * - title: Short, clear heading
 * - message: Helpful explanation
 * - action: Primary CTA
 * - icon: Visual indicator
 * - severity: Controls styling
 */
export const ERROR_MESSAGES: Record<string, ErrorConfig> = {
  // Network and connectivity errors
  NETWORK_ERROR: {
    title: "Can't Connect",
    message: "Check your internet connection and try again. Your saved episodes are still available offline.",
    action: "Retry",
    secondaryAction: "View Offline",
    icon: WifiOff,
    severity: 'error'
  },

  // General API errors
  API_ERROR: {
    title: "Something Went Wrong",
    message: "We couldn't load the content right now. Don't worry, we're looking into it!",
    action: "Try Again",
    secondaryAction: "Report Issue",
    icon: AlertCircle,
    severity: 'error'
  },

  // Server errors
  SERVER_ERROR: {
    title: "Server Unavailable",
    message: "Our servers are taking a quick break. Please try again in a few moments.",
    action: "Retry",
    icon: ServerCrash,
    severity: 'error'
  },

  // Empty states (not errors, but handled similarly)
  NO_EPISODES: {
    title: "No Episodes Yet",
    message: "New content is coming soon! Check back later or explore our other platforms.",
    action: "Refresh",
    secondaryAction: "Browse All",
    icon: Inbox,
    severity: 'info'
  },

  // Search empty states
  NO_SEARCH_RESULTS: {
    title: "No Results Found",
    message: "Try different keywords or browse episodes from another platform.",
    action: "Clear Search",
    secondaryAction: "Browse All",
    icon: Search,
    severity: 'info'
  },

  // Platform-specific errors
  SPOTIFY_ERROR: {
    title: "Spotify Unavailable",
    message: "We can't load Spotify episodes right now. YouTube and exclusive content are still available!",
    action: "Try Again",
    secondaryAction: "View YouTube",
    icon: Music,
    severity: 'warning'
  },

  YOUTUBE_ERROR: {
    title: "YouTube Unavailable",
    message: "We can't load YouTube episodes right now. Spotify and exclusive content are still available!",
    action: "Try Again",
    secondaryAction: "View Spotify",
    icon: VideoOff,
    severity: 'warning'
  },

  EXCLUSIVE_ERROR: {
    title: "Exclusive Content Unavailable",
    message: "We can't load exclusive episodes right now. Public content is still available!",
    action: "Try Again",
    secondaryAction: "Browse Public",
    icon: Crown,
    severity: 'warning'
  },

  // VIP/Auth related
  VIP_REQUIRED: {
    title: "VIP Members Only",
    message: "Subscribe for AED 20/month to unlock exclusive content and premium features.",
    action: "Become a Member",
    secondaryAction: "Learn More",
    icon: Crown,
    severity: 'info'
  },

  AUTH_REQUIRED: {
    title: "Sign In Required",
    message: "Create a free account to save your progress and access personalized features.",
    action: "Sign In",
    secondaryAction: "Browse as Guest",
    icon: Crown,
    severity: 'info'
  },

  // All platforms failed (worst case)
  ALL_PLATFORMS_ERROR: {
    title: "Unable to Load Episodes",
    message: "We're having trouble connecting to our content sources. Please check your internet connection and try again.",
    action: "Retry All",
    secondaryAction: "Check Status",
    icon: AlertCircle,
    severity: 'error'
  }
};

/**
 * Helper function to get error config
 * 
 * @param errorType - The error type key
 * @returns Error configuration object
 */
export function getErrorConfig(errorType: string): ErrorConfig {
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.API_ERROR;
}

/**
 * Determine error type from error object
 * 
 * Analyzes error to return appropriate error type key.
 * Useful for automatic error handling.
 * 
 * @param error - Error object or message
 * @returns Error type key
 */
export function getErrorType(error: any): string {
  if (!error) return 'API_ERROR';

  const errorMessage = typeof error === 'string' ? error : error.message || '';
  const errorMessageLower = errorMessage.toLowerCase();

  // Network errors
  if (
    errorMessageLower.includes('network') ||
    errorMessageLower.includes('fetch') ||
    errorMessageLower.includes('connection') ||
    error.name === 'NetworkError'
  ) {
    return 'NETWORK_ERROR';
  }

  // Server errors
  if (
    errorMessageLower.includes('server') ||
    errorMessageLower.includes('500') ||
    errorMessageLower.includes('503')
  ) {
    return 'SERVER_ERROR';
  }

  // Platform-specific errors
  if (errorMessageLower.includes('spotify')) {
    return 'SPOTIFY_ERROR';
  }

  if (errorMessageLower.includes('youtube')) {
    return 'YOUTUBE_ERROR';
  }

  if (errorMessageLower.includes('exclusive')) {
    return 'EXCLUSIVE_ERROR';
  }

  // Default to generic API error
  return 'API_ERROR';
}

/**
 * Format error for display
 * 
 * Converts technical errors into user-friendly messages.
 * 
 * @param error - Raw error object
 * @returns Formatted error object
 */
export function formatError(error: any): {
  type: string;
  config: ErrorConfig;
  technicalDetails?: string;
} {
  const type = getErrorType(error);
  const config = getErrorConfig(type);
  
  return {
    type,
    config,
    technicalDetails: error?.message || String(error)
  };
}
