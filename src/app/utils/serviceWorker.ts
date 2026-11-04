// Service Worker registration and management for Oriri podcast app

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
}

class ServiceWorkerManager {
  private state: ServiceWorkerState = {
    isSupported: false,
    isRegistered: false,
    registration: null,
    updateAvailable: false
  };

  private updateListeners: Array<(state: ServiceWorkerState) => void> = [];
  private offlineListeners: Array<(isOffline: boolean) => void> = [];

  constructor() {
    this.state.isSupported = 'serviceWorker' in navigator;
    this.setupOfflineDetection();
  }

  // Check if we should register the service worker
  private shouldRegister(): boolean {
    // Don't register in these environments
    if (typeof window === 'undefined') return false;
    if (!this.state.isSupported) return false;
    
    // Don't register in Figma preview or similar iframe environments
    if (window !== window.top) return false;
    
    // Don't register on localhost in development (optional)
    if (location.hostname === 'localhost' && process.env.NODE_ENV === 'development') {
      console.log('[ServiceWorker] Skipping registration on localhost in development');
      return false;
    }
    
    // Don't register if not served over HTTPS (except localhost)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.log('[ServiceWorker] Skipping registration - HTTPS required');
      return false;
    }
    
    return true;
  }

  // Register service worker and set up update handling
  async register(): Promise<boolean> {
    if (!this.shouldRegister()) {
      console.log('[ServiceWorker] Registration skipped - environment not suitable');
      return false;
    }

    try {
      console.log('[ServiceWorker] Attempting to register service worker...');
      
      // Check if SW file exists first
      const swResponse = await fetch('/sw.js', { method: 'HEAD' });
      if (!swResponse.ok) {
        console.log('[ServiceWorker] Service worker file not found, skipping registration');
        return false;
      }
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.state.registration = registration;
      this.state.isRegistered = true;

      // Set up update handling
      this.setupUpdateHandling(registration);

      // Set up messaging
      this.setupMessaging();

      console.log('[ServiceWorker] Registration successful:', registration);
      this.notifyStateChange();

      return true;

    } catch (error) {
      console.warn('[ServiceWorker] Registration failed (this is normal in some environments):', error.message);
      return false;
    }
  }

  // Set up service worker update detection and handling
  private setupUpdateHandling(registration: ServiceWorkerRegistration): void {
    // Check for updates immediately
    registration.update();

    // Listen for new service worker installations
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('[ServiceWorker] New service worker installing...');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New update available
          console.log('[ServiceWorker] Update available');
          this.state.updateAvailable = true;
          this.notifyStateChange();
        }
      });
    });

    // Handle controller changes (when new SW takes control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[ServiceWorker] Controller changed - reloading page');
      window.location.reload();
    });

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute
  }

  // Set up messaging between app and service worker
  private setupMessaging(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'AUDIO_CACHED':
          console.log('[ServiceWorker] Audio cached:', payload.url);
          break;
        case 'CACHE_UPDATE':
          console.log('[ServiceWorker] Cache updated:', payload);
          break;
        case 'OFFLINE_STATUS':
          this.handleOfflineStatus(payload.isOffline);
          break;
        default:
          console.log('[ServiceWorker] Unknown message:', event.data);
      }
    });
  }

  // Apply available update
  async applyUpdate(): Promise<boolean> {
    if (!this.state.registration || !this.state.updateAvailable) {
      console.warn('No update available to apply');
      return false;
    }

    try {
      const waitingWorker = this.state.registration.waiting;
      if (waitingWorker) {
        // Tell the waiting service worker to skip waiting and become active
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ServiceWorker] Failed to apply update:', error);
      return false;
    }
  }

  // Get current state
  getState(): ServiceWorkerState {
    return { ...this.state };
  }

  // Subscribe to state changes
  onStateChange(listener: (state: ServiceWorkerState) => void): () => void {
    this.updateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.updateListeners.indexOf(listener);
      if (index > -1) {
        this.updateListeners.splice(index, 1);
      }
    };
  }

  // Subscribe to offline status changes
  onOfflineChange(listener: (isOffline: boolean) => void): () => void {
    this.offlineListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.offlineListeners.indexOf(listener);
      if (index > -1) {
        this.offlineListeners.splice(index, 1);
      }
    };
  }

  // Send message to service worker
  async postMessage(message: any): Promise<void> {
    if (!this.state.registration || !navigator.serviceWorker.controller) {
      console.warn('No active service worker to message');
      return;
    }

    try {
      navigator.serviceWorker.controller.postMessage(message);
    } catch (error) {
      console.error('[ServiceWorker] Failed to send message:', error);
    }
  }

  // Cache audio file for offline use
  async cacheAudio(url: string, episodeId: string): Promise<boolean> {
    try {
      await this.postMessage({
        type: 'CACHE_AUDIO',
        payload: { url, episodeId }
      });
      return true;
    } catch (error) {
      console.error('[ServiceWorker] Failed to cache audio:', error);
      return false;
    }
  }

  // Check if audio is cached
  async isAudioCached(url: string): Promise<boolean> {
    if (!this.state.isSupported) return false;

    try {
      const cache = await caches.open('oriri-audio-v1.2.1');
      const response = await cache.match(url);
      return !!response;
    } catch (error) {
      console.error('[ServiceWorker] Failed to check audio cache:', error);
      return false;
    }
  }

  // Get offline status
  isOffline(): boolean {
    return !navigator.onLine;
  }

  // Set up offline/online detection
  private setupOfflineDetection(): void {
    const handleOnline = () => {
      console.log('[ServiceWorker] Back online');
      this.handleOfflineStatus(false);
    };

    const handleOffline = () => {
      console.log('[ServiceWorker] Gone offline');
      this.handleOfflineStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status
    this.handleOfflineStatus(!navigator.onLine);
  }

  // Handle offline status changes
  private handleOfflineStatus(isOffline: boolean): void {
    this.offlineListeners.forEach(listener => {
      try {
        listener(isOffline);
      } catch (error) {
        console.error('[ServiceWorker] Error in offline listener:', error);
      }
    });
  }

  // Notify all listeners of state changes
  private notifyStateChange(): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('[ServiceWorker] Error in state listener:', error);
      }
    });
  }

  // Clear all caches (for debugging)
  async clearAllCaches(): Promise<boolean> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[ServiceWorker] All caches cleared');
      return true;
    } catch (error) {
      console.error('[ServiceWorker] Failed to clear caches:', error);
      return false;
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[ServiceWorker] Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('[ServiceWorker] Failed to request notification permission:', error);
      return false;
    }
  }

  // Show notification (for testing)
  async showNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
    if (!this.state.registration) {
      console.warn('No service worker registration for notifications');
      return false;
    }

    try {
      await this.state.registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options
      });
      return true;
    } catch (error) {
      console.error('[ServiceWorker] Failed to show notification:', error);
      return false;
    }
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Conditionally auto-register when imported
if (typeof window !== 'undefined') {
  // Wait for app to load before attempting registration
  window.addEventListener('load', () => {
    serviceWorkerManager.register().catch(error => {
      // Silently fail - this is expected in development and preview environments
      console.debug('[ServiceWorker] Auto-registration failed:', error.message);
    });
  });
}