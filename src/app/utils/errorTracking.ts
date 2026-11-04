// Comprehensive error tracking and monitoring for Oriri podcast app

interface ErrorEvent {
  id: string;
  timestamp: number;
  type: 'javascript' | 'promise' | 'audio' | 'network' | 'user';
  message: string;
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

interface PerformanceMetrics {
  timestamp: number;
  loadTime: number;
  audioLoadTime?: number;
  renderTime?: number;
  memoryUsage?: number;
  audioErrors: number;
  networkErrors: number;
}

interface UserSession {
  sessionId: string;
  startTime: number;
  userId?: string;
  userAgent: string;
  viewport: string;
  errors: ErrorEvent[];
  performance: PerformanceMetrics[];
}

class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private session: UserSession;
  private maxErrors = 100; // Max errors to store locally
  private errorListeners: Array<(error: ErrorEvent) => void> = [];
  private isInitialized = false;

  constructor() {
    this.session = this.createSession();
    this.init();
  }

  private createSession(): UserSession {
    return {
      sessionId: this.generateId(),
      startTime: Date.now(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      errors: [],
      performance: []
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Initialize error tracking
  private init(): void {
    if (this.isInitialized) return;

    // Global JavaScript error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        severity: 'high',
        context: {
          source: 'window.onerror'
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        severity: 'medium',
        context: {
          reason: event.reason,
          source: 'unhandledrejection'
        }
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        const src = (target as any).src || (target as any).href;
        
        // Skip tracking external image failures - these are often expected
        if (target.tagName === 'IMG' && src) {
          // Skip external images from known services that might be blocked
          const isExternalImage = src.includes('unsplash.com') || 
                                 src.includes('pexels.com') || 
                                 src.includes('pixabay.com') ||
                                 src.includes('picsum.photos') ||
                                 src.includes('images.unsplash.com') ||
                                 src.includes('source.unsplash.com') ||
                                 src.startsWith('https://images.') ||
                                 !src.startsWith(window.location.origin);
          
          if (isExternalImage) {
            // Only log in development for debugging
            if (process.env.NODE_ENV === 'development') {
              console.debug('[ErrorTracker] External image failed to load (expected in some environments):', src);
            }
            return; // Don't track external image failures
          }
        }
        
        // Skip tracking script and style errors from external sources
        if ((target.tagName === 'SCRIPT' || target.tagName === 'LINK') && src) {
          const isExternalResource = !src.startsWith(window.location.origin) && 
                                    !src.startsWith('/') && 
                                    !src.startsWith('./');
          if (isExternalResource) {
            if (process.env.NODE_ENV === 'development') {
              console.debug('[ErrorTracker] External resource failed to load (expected):', src);
            }
            return;
          }
        }
        
        // Track other resource loading errors (only internal resources)
        this.trackError({
          type: 'network',
          message: `Failed to load resource: ${target.tagName}`,
          url: src,
          severity: target.tagName === 'IMG' ? 'low' : 'medium', // Images are less critical
          context: {
            resourceType: target.tagName,
            source: 'resource-load-error'
          }
        });
      }
    }, true);

    // Performance monitoring
    this.setupPerformanceMonitoring();

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushErrors();
      }
    });

    // Before page unload
    window.addEventListener('beforeunload', () => {
      this.flushErrors();
    });

    this.isInitialized = true;
    console.log('[ErrorTracker] Error tracking initialized');
  }

  // Track a specific error
  trackError(errorData: Partial<ErrorEvent>): string {
    // FINAL SAFETY CHECK: Block external image errors at the tracking level
    if (errorData.type === 'network' && 
        errorData.context?.resourceType === 'IMG' && 
        errorData.url) {
      const isExternalImage = errorData.url.includes('unsplash.com') ||
                             errorData.url.includes('images.unsplash.com') ||
                             errorData.url.includes('pexels.com') ||
                             errorData.url.includes('pixabay.com') ||
                             errorData.url.startsWith('https://images.') ||
                             !errorData.url.startsWith(window.location.origin);
      
      if (isExternalImage) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ErrorTracker] Blocked external image error at tracking level:', errorData.url);
        }
        return 'blocked-external-image'; // Return a dummy ID
      }
    }

    const error: ErrorEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      type: errorData.type || 'javascript',
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      url: errorData.url,
      lineNumber: errorData.lineNumber,
      columnNumber: errorData.columnNumber,
      userAgent: navigator.userAgent,
      userId: this.session.userId,
      sessionId: this.session.sessionId,
      context: errorData.context || {},
      severity: errorData.severity || 'medium',
      resolved: false
    };

    // Add to local storage
    this.errors.push(error);
    this.session.errors.push(error);

    // Maintain max error limit
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('[ErrorTracker] Error in listener:', listenerError);
      }
    });

    // Log to console for development
    console.error('[ErrorTracker] Error tracked:', error);

    // Auto-flush critical errors
    if (error.severity === 'critical') {
      this.flushErrors();
    }

    return error.id;
  }

  // Track audio-specific errors
  trackAudioError(audioData: {
    episodeId?: string;
    audioUrl?: string;
    errorCode?: number;
    errorMessage?: string;
    currentTime?: number;
    duration?: number;
  }): string {
    return this.trackError({
      type: 'audio',
      message: `Audio error: ${audioData.errorMessage || 'Unknown audio error'}`,
      severity: 'high',
      context: {
        ...audioData,
        source: 'audio-player'
      }
    });
  }

  // Track network errors
  trackNetworkError(networkData: {
    url: string;
    method?: string;
    status?: number;
    statusText?: string;
    timeout?: boolean;
  }): string {
    return this.trackError({
      type: 'network',
      message: `Network error: ${networkData.statusText || networkData.status || 'Unknown'}`,
      url: networkData.url,
      severity: networkData.status === 0 || networkData.timeout ? 'high' : 'medium',
      context: {
        ...networkData,
        source: 'network-request'
      }
    });
  }

  // Track user actions that might lead to errors
  trackUserAction(action: string, context: Record<string, any> = {}): void {
    // Don't log user actions as errors - just store them for analytics
    const userAction = {
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'user' as const,
      message: `User action: ${action}`,
      userAgent: navigator.userAgent,
      userId: this.session.userId,
      sessionId: this.session.sessionId,
      context: {
        action,
        ...context,
        source: 'user-action'
      },
      severity: 'low' as const,
      resolved: false
    };

    // Add to session for analytics but don't add to errors array
    this.session.errors.push(userAction);
    
    // Only log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[UserAction]', action, context);
    }
  }

  // Set user ID for tracking
  setUserId(userId: string): void {
    this.session.userId = userId;
  }

  // Get all errors
  getErrors(): ErrorEvent[] {
    return [...this.errors];
  }

  // Get errors by type
  getErrorsByType(type: ErrorEvent['type']): ErrorEvent[] {
    return this.errors.filter(error => error.type === type);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorEvent['severity']): ErrorEvent[] {
    return this.errors.filter(error => error.severity === severity);
  }

  // Get session information
  getSession(): UserSession {
    return { ...this.session };
  }

  // Clear all errors
  clearErrors(): void {
    this.errors = [];
    this.session.errors = [];
    console.log('[ErrorTracker] All errors cleared');
  }

  // Mark error as resolved
  resolveError(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      return true;
    }
    return false;
  }

  // Subscribe to error events
  onError(listener: (error: ErrorEvent) => void): () => void {
    this.errorListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // Setup performance monitoring
  private setupPerformanceMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const metrics: PerformanceMetrics = {
          timestamp: Date.now(),
          loadTime: perfData.loadEventEnd - perfData.fetchStart,
          renderTime: perfData.domContentLoadedEventEnd - perfData.fetchStart,
          audioErrors: this.getErrorsByType('audio').length,
          networkErrors: this.getErrorsByType('network').length
        };

        // Add memory usage if available
        if ((performance as any).memory) {
          metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
        }

        this.session.performance.push(metrics);
      }, 0);
    });

    // Monitor audio loading performance
    this.onError((error) => {
      if (error.type === 'audio' && error.context.audioUrl) {
        const audioLoadStart = performance.now();
        // This would be integrated with your audio loading system
      }
    });
  }

  // Flush errors to remote service (implement based on your backend)
  private async flushErrors(): Promise<boolean> {
    if (this.errors.length === 0) return true;

    try {
      const errorData = {
        session: this.session,
        errors: this.errors.filter(error => !error.resolved),
        timestamp: Date.now()
      };

      // Store in localStorage as backup
      try {
        localStorage.setItem('oriri-error-backup', JSON.stringify(errorData));
      } catch (storageError) {
        console.warn('[ErrorTracker] Failed to backup errors:', storageError);
      }

      // In a real implementation, you would send this to your error tracking service
      // Example: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) });
      
      console.log('[ErrorTracker] Error data ready for transmission:', errorData);
      return true;

    } catch (error) {
      console.error('[ErrorTracker] Failed to flush errors:', error);
      return false;
    }
  }

  // Export error data for debugging
  exportErrorData(): string {
    const exportData = {
      session: this.session,
      errors: this.errors,
      exportTime: Date.now(),
      version: '1.0.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Import error data (for debugging)
  importErrorData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.errors && Array.isArray(data.errors)) {
        this.errors = data.errors;
        console.log('[ErrorTracker] Error data imported successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ErrorTracker] Failed to import error data:', error);
      return false;
    }
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    unresolved: number;
  } {
    const stats = {
      total: this.errors.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      resolved: 0,
      unresolved: 0
    };

    this.errors.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count resolved/unresolved
      if (error.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }
    });

    return stats;
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// Helper function to wrap async functions with error tracking
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorTracker.trackError({
        type: 'javascript',
        message: `Error in ${context}: ${error.message}`,
        stack: error.stack,
        severity: 'medium',
        context: {
          functionContext: context,
          arguments: args
        }
      });
      throw error;
    }
  }) as T;
}

// Helper function to wrap sync functions with error tracking
export function withSyncErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  context: string
): T {
  return ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (error) {
      errorTracker.trackError({
        type: 'javascript',
        message: `Error in ${context}: ${error.message}`,
        stack: error.stack,
        severity: 'medium',
        context: {
          functionContext: context,
          arguments: args
        }
      });
      throw error;
    }
  }) as T;
}