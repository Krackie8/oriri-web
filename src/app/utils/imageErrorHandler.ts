/**
 * Unified Image Error Handler for Oriri
 * 
 * Consolidates all image error suppression logic into a single, efficient utility.
 * Handles external image sources (Unsplash, Pexels, etc.) gracefully without polluting console.
 */

// Global state
let isInitialized = false;
let suppressionActive = false;

// Configuration
const CONFIG = {
  // External domains to suppress errors for
  externalDomains: [
    'unsplash.com',
    'images.unsplash.com',
    'source.unsplash.com',
    'pexels.com',
    'images.pexels.com',
    'pixabay.com',
    'picsum.photos',
    'placeholder.com',
    'via.placeholder.com',
    'dummyimage.com',
    'ui-avatars.io',
  ],
  
  // Logging level: 'none' | 'errors' | 'debug'
  logLevel: 'errors' as 'none' | 'errors' | 'debug',
  
  // Whether to suppress all external image errors
  suppressExternalErrors: true,
};

/**
 * Check if a URL is from an external image source
 */
export function isExternalImageSource(src: string): boolean {
  if (!src) return false;
  
  try {
    // Check against known external domains
    const isKnownExternal = CONFIG.externalDomains.some(domain => src.includes(domain));
    if (isKnownExternal) return true;
    
    // Check if it's a different origin
    if (src.startsWith('http') && typeof window !== 'undefined') {
      return !src.startsWith(window.location.origin);
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Log helper that respects log level configuration
 */
function log(level: 'error' | 'debug', message: string, ...args: any[]) {
  if (CONFIG.logLevel === 'none') return;
  if (CONFIG.logLevel === 'errors' && level === 'debug') return;
  
  const prefix = '[ImageErrorHandler]';
  if (level === 'error') {
    console.error(prefix, message, ...args);
  } else {
    console.debug(prefix, message, ...args);
  }
}

/**
 * Main initialization - sets up global error suppression
 * This runs immediately when the module is imported
 */
export function initializeImageErrorHandler() {
  if (typeof window === 'undefined' || isInitialized) return;
  
  isInitialized = true;
  log('debug', 'Initializing image error handler...');
  
  // Method 1: Global window.onerror override (catches early errors)
  setupWindowErrorHandler();
  
  // Method 2: Document-level error event listener (catches most errors)
  setupDocumentErrorListener();
  
  log('debug', 'Image error handler initialized successfully');
}

/**
 * Setup window.onerror handler (catches errors during page load)
 */
function setupWindowErrorHandler() {
  if (typeof window === 'undefined') return;
  
  const originalWindowError = window.onerror;
  
  window.onerror = function(message, source, lineno, colno, error) {
    // Check if this is an image loading error from external source
    if (
      typeof message === 'string' && 
      message.includes('Failed to load resource') &&
      typeof source === 'string' &&
      isExternalImageSource(source)
    ) {
      log('debug', 'Suppressed image load error via window.onerror:', source);
      return true; // Prevent default error handling
    }
    
    // Call original handler for other errors
    if (originalWindowError) {
      return originalWindowError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
}

/**
 * Setup document-level error event listener (catches runtime errors)
 */
function setupDocumentErrorListener() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  // Wait for DOM to be ready
  const addListener = () => {
    document.addEventListener('error', (event) => {
      if (event.target instanceof HTMLImageElement) {
        const img = event.target;
        const src = img.src || img.getAttribute('src') || '';
        
        if (CONFIG.suppressExternalErrors && isExternalImageSource(src)) {
          log('debug', 'Suppressed image error via document listener:', src);
          event.preventDefault();
          event.stopPropagation();
          
          // Optionally add a fallback class for styling
          img.classList.add('image-load-failed');
          
          return false;
        }
      }
    }, true); // Use capture phase to catch errors early
  };
  
  if (document.body) {
    addListener();
  } else {
    document.addEventListener('DOMContentLoaded', addListener);
  }
}

/**
 * Enhanced image error suppression
 * Call this on specific image elements that need guaranteed error suppression
 */
export function suppressImageError(img: HTMLImageElement): void {
  if (!img) return;
  
  const src = img.src || img.getAttribute('src') || '';
  
  if (isExternalImageSource(src)) {
    // Add error handler with both capture and bubble phases
    const errorHandler = (event: Event) => {
      log('debug', 'Suppressed image error via direct handler:', src);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      img.classList.add('image-load-failed');
      return false;
    };
    
    img.addEventListener('error', errorHandler, { capture: true, passive: false });
    img.addEventListener('error', errorHandler, { capture: false, passive: false });
  }
}

/**
 * Apply error suppression to all existing images in the document
 * Useful for dynamically loaded content
 */
export function suppressAllImageErrors(): void {
  if (typeof document === 'undefined') return;
  
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img instanceof HTMLImageElement) {
      suppressImageError(img);
    }
  });
  
  log('debug', `Applied error suppression to ${images.length} images`);
}

/**
 * Create a safe image element with built-in error handling
 */
export function createSafeImage(src: string, alt?: string): HTMLImageElement {
  const img = document.createElement('img');
  if (alt) img.alt = alt;
  
  // Add error suppression before setting src
  if (isExternalImageSource(src)) {
    suppressImageError(img);
  }
  
  img.src = src;
  return img;
}

/**
 * Update configuration
 */
export function configureImageErrorHandler(config: Partial<typeof CONFIG>): void {
  Object.assign(CONFIG, config);
  log('debug', 'Configuration updated:', CONFIG);
}

/**
 * Get current configuration
 */
export function getImageErrorHandlerConfig(): typeof CONFIG {
  return { ...CONFIG };
}

/**
 * Setup advanced error suppression (for complex scenarios)
 * This adds MutationObserver to catch dynamically added images
 */
export function setupAdvancedSuppression(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (suppressionActive) return;
  
  suppressionActive = true;
  log('debug', 'Setting up advanced error suppression with MutationObserver...');
  
  // Observe DOM changes and apply suppression to new images
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          suppressImageError(node);
        } else if (node instanceof Element) {
          const images = node.querySelectorAll('img');
          images.forEach(img => {
            if (img instanceof HTMLImageElement) {
              suppressImageError(img);
            }
          });
        }
      });
    });
  });
  
  // Start observing when DOM is ready
  const startObserving = () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    log('debug', 'MutationObserver started');
  };
  
  if (document.body) {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving);
  }
  
  // Also suppress errors on all existing images
  suppressAllImageErrors();
}

// Auto-initialize when module is imported
if (typeof window !== 'undefined') {
  // Run initialization immediately
  initializeImageErrorHandler();
  
  // Make utilities available globally for debugging
  (window as any).imageErrorHandler = {
    isExternalImageSource,
    suppressImageError,
    suppressAllImageErrors,
    configureImageErrorHandler,
    getConfig: getImageErrorHandlerConfig,
    setupAdvancedSuppression,
  };
  
  log('debug', 'Global debugging tools available at window.imageErrorHandler');
}

// Export everything
export default {
  initializeImageErrorHandler,
  isExternalImageSource,
  suppressImageError,
  suppressAllImageErrors,
  createSafeImage,
  configureImageErrorHandler,
  getImageErrorHandlerConfig,
  setupAdvancedSuppression,
};
