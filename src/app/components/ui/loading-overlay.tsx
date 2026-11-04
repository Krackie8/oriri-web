import React from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { cn } from './utils';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  fullScreen?: boolean;
  backdrop?: boolean;
  showRetry?: boolean;
  onRetry?: () => void;
  error?: boolean;
  offline?: boolean;
}

export function LoadingOverlay({
  isVisible,
  message = 'Loading...',
  type = 'spinner',
  fullScreen = false,
  backdrop = true,
  showRetry = false,
  onRetry,
  error = false,
  offline = false
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  const LoadingIndicator = () => {
    switch (type) {
      case 'spinner':
        return <Loader2 className="w-8 h-8 animate-spin text-primary" />;
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        );
      case 'pulse':
        return (
          <div className="w-12 h-12 bg-primary/20 rounded-full animate-ping" />
        );
      case 'skeleton':
        return (
          <div className="space-y-3 w-48">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        );
      default:
        return <Loader2 className="w-8 h-8 animate-spin text-primary" />;
    }
  };

  const StatusIcon = () => {
    if (error) return <WifiOff className="w-8 h-8 text-destructive" />;
    if (offline) return <WifiOff className="w-8 h-8 text-muted-foreground" />;
    return null;
  };

  const getStatusMessage = () => {
    if (error) return 'Something went wrong';
    if (offline) return 'No internet connection';
    return message;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center z-50',
        fullScreen ? 'fixed inset-0' : 'absolute inset-0',
        backdrop && 'bg-background/80 backdrop-blur-sm'
      )}
    >
      <div className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-card/90 backdrop-blur border shadow-lg">
        {error || offline ? <StatusIcon /> : <LoadingIndicator />}
        
        <div className="text-center space-y-2">
          <p className="text-foreground font-medium">{getStatusMessage()}</p>
          
          {showRetry && (error || offline) && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors touch-manipulation min-h-[44px]"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline loading component for smaller areas
export function InlineLoading({
  message = 'Loading...',
  size = 'sm',
  className
}: {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn('flex items-center space-x-2 text-muted-foreground', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// Progress loading component
export function ProgressLoading({
  progress,
  message = 'Loading...',
  showPercentage = true
}: {
  progress: number;
  message?: string;
  showPercentage?: boolean;
}) {
  return (
    <div className="space-y-3 w-full max-w-sm">
      <div className="flex justify-between items-center">
        <span className="text-sm text-foreground">{message}</span>
        {showPercentage && (
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

// Button loading state
export function ButtonLoading({
  loading,
  children,
  loadingText = 'Loading...'
}: {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}) {
  return (
    <>
      {loading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </>
  );
}