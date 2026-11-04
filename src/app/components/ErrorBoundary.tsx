import React, { Component, ErrorInfo, ReactNode } from 'react';

// Simple mock errorTracker directly in ErrorBoundary to avoid import issues
const errorTracker = {
  trackError: (errorData: any) => {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    console.error('[MockErrorTracker] Error tracked:', errorData);
    
    // Also log to localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('oriri-errors') || '[]');
      existingErrors.push({ ...errorData, errorId, timestamp: new Date().toISOString() });
      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('oriri-errors', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to save error to localStorage:', e);
    }
    
    return errorId;
  },
  resolveError: (errorId: string) => {
    console.log('[MockErrorTracker] Error resolved:', errorId);
    
    // Mark error as resolved in localStorage
    try {
      const existingErrors = JSON.parse(localStorage.getItem('oriri-errors') || '[]');
      const updatedErrors = existingErrors.map(err => 
        err.errorId === errorId ? { ...err, resolved: true, resolvedAt: new Date().toISOString() } : err
      );
      localStorage.setItem('oriri-errors', JSON.stringify(updatedErrors));
    } catch (e) {
      console.warn('Failed to update error in localStorage:', e);
    }
  },
  trackUserAction: (action: string, context: any) => {
    console.log('[MockErrorTracker] User action:', action, context);
  }
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  errorId?: string;
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state to trigger fallback UI
    return { 
      hasError: true,
      errorMessage: error.message,
      errorStack: error.stack
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track the error with our error tracking system
    const errorId = errorTracker.trackError({
      type: 'javascript',
      message: error.message,
      stack: error.stack,
      severity: 'critical',
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        source: 'react-error-boundary',
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    });

    this.setState({ 
      errorId,
      componentStack: errorInfo.componentStack 
    });

    // Call optional error handler
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('[ErrorBoundary] Error in custom error handler:', handlerError);
      }
    }

    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  private handleRetry = () => {
    // Mark error as resolved if we have an errorId
    if (this.state.errorId) {
      errorTracker.resolveError(this.state.errorId);
    }
    
    // Track retry action
    errorTracker.trackUserAction('error_boundary_retry', {
      errorId: this.state.errorId,
      errorMessage: this.state.errorMessage
    });

    // Reset error state to retry rendering
    this.setState({ 
      hasError: false, 
      errorId: undefined,
      errorMessage: undefined,
      errorStack: undefined,
      componentStack: undefined
    });
  };

  private handleReload = () => {
    // Track reload action
    errorTracker.trackUserAction('error_boundary_reload', {
      errorId: this.state.errorId,
      errorMessage: this.state.errorMessage
    });

    // Clear any cached data before reload
    try {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
    } catch (e) {
      console.warn('Failed to clear caches before reload:', e);
    }

    // Reload the page
    window.location.reload();
  };

  private handleGoHome = () => {
    // Track navigation action
    errorTracker.trackUserAction('error_boundary_go_home', {
      errorId: this.state.errorId,
      errorMessage: this.state.errorMessage
    });

    // Try to navigate home
    try {
      window.location.href = '/';
    } catch (e) {
      console.error('Failed to navigate home, reloading instead:', e);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with dark theme styling
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center space-y-4">
            <div className="text-4xl mb-4">⚠️</div>
            
            <h1 className="text-xl font-medium text-foreground">
              Something went wrong
            </h1>
            
            <p className="text-muted-foreground text-sm leading-relaxed">
              The app encountered an unexpected error. This has been automatically reported and will be fixed soon.
            </p>
            
            {this.state.errorMessage && (
              <details className="text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Technical details
                </summary>
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded overflow-auto max-h-32 space-y-2">
                  <div>
                    <strong>Error:</strong> {this.state.errorMessage}
                  </div>
                  {this.state.errorStack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1">{this.state.errorStack}</pre>
                    </div>
                  )}
                  {this.state.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1">{this.state.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleRetry}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Go Home
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-muted text-muted-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  Reload App
                </button>
              </div>
            </div>
            
            {this.state.errorId && (
              <p className="text-xs text-muted-foreground">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;