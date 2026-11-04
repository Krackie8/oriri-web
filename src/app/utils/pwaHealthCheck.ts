/**
 * PWA Health Check Utility
 * 
 * Comprehensive diagnostic tool for Progressive Web App functionality.
 * Checks service worker registration, manifest validity, caching status,
 * offline capabilities, installation state, and notification permissions.
 * 
 * Features:
 * - Multi-dimensional health scoring (0-100 scale)
 * - Detailed issue reporting with actionable insights
 * - Cache size tracking for static assets, audio, and API responses
 * - Installation state detection (browser vs standalone)
 * - Network connection type detection
 * - Human-readable diagnostic report generation
 * - Global console debug function (window.checkPWAHealth())
 * 
 * Health Score Breakdown:
 * - Service Worker: 40 points (10 supported + 15 registered + 15 active)
 * - Manifest: 20 points (10 loaded + 10 valid)
 * - Caching: 20 points (10 supported + 10 has cached content)
 * - Offline Support: 10 points
 * - Installation: 10 points (5 installable, 10 installed)
 * 
 * @example
 * ```typescript
 * import { pwaHealthCheck } from './utils/pwaHealthCheck';
 * 
 * // Run full diagnostic
 * const status = await pwaHealthCheck.runFullDiagnostic();
 * console.log(`PWA Health: ${status.overall.score}/100`);
 * 
 * // Generate text report
 * const report = await pwaHealthCheck.generateReport();
 * console.log(report);
 * 
 * // Test offline functionality
 * const offlineTest = await pwaHealthCheck.testOfflineFunctionality();
 * if (offlineTest.success) {
 *   console.log('Offline mode is ready!');
 * }
 * 
 * // From browser console
 * window.checkPWAHealth(); // Auto-logs full report
 * ```
 */

/**
 * Complete PWA health status object with all diagnostic results
 */
export interface PWAHealthStatus {
  serviceWorker: {
    supported: boolean;
    registered: boolean;
    active: boolean;
    waiting: boolean;
    scope: string | null;
    updateAvailable: boolean;
  };
  manifest: {
    loaded: boolean;
    valid: boolean;
    appName: string | null;
  };
  caching: {
    supported: boolean;
    staticCacheSize: number;
    audioCacheSize: number;
    apiCacheSize: number;
  };
  offline: {
    supported: boolean;
    status: 'online' | 'offline';
    effectiveType: string | null;
  };
  installation: {
    installable: boolean;
    installed: boolean;
    displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
  };
  notifications: {
    supported: boolean;
    permission: NotificationPermission;
  };
  overall: {
    healthy: boolean;
    score: number; // 0-100
    issues: string[];
  };
}

class PWAHealthCheck {
  /**
   * Run comprehensive PWA diagnostics
   * 
   * Performs all health checks in parallel and calculates an overall
   * health score with actionable issues list.
   * 
   * @returns Promise resolving to complete PWA health status
   * 
   * @example
   * ```typescript
   * const status = await pwaHealthCheck.runFullDiagnostic();
   * 
   * if (status.overall.healthy) {
   *   console.log('✅ PWA is healthy');
   * } else {
   *   console.warn('⚠️ Issues found:', status.overall.issues);
   * }
   * 
   * // Check specific aspects
   * if (!status.serviceWorker.active) {
   *   console.error('Service worker is not active');
   * }
   * ```
   */
  async runFullDiagnostic(): Promise<PWAHealthStatus> {
    console.log('[PWA Health Check] Running comprehensive diagnostics...');
    
    const status: PWAHealthStatus = {
      serviceWorker: await this.checkServiceWorker(),
      manifest: await this.checkManifest(),
      caching: await this.checkCaching(),
      offline: this.checkOfflineSupport(),
      installation: this.checkInstallation(),
      notifications: this.checkNotifications(),
      overall: {
        healthy: true,
        score: 0,
        issues: [],
      },
    };

    // Calculate overall health score
    status.overall = this.calculateOverallHealth(status);

    console.log('[PWA Health Check] Diagnostics complete:', status);
    return status;
  }

  /**
   * Check service worker registration and status
   * 
   * Verifies:
   * - Browser support for service workers
   * - Registration status
   * - Active worker presence
   * - Pending updates (waiting worker)
   * 
   * @returns Service worker health status
   * @private
   */
  private async checkServiceWorker(): Promise<PWAHealthStatus['serviceWorker']> {
    const supported = 'serviceWorker' in navigator;
    
    if (!supported) {
      return {
        supported: false,
        registered: false,
        active: false,
        waiting: false,
        scope: null,
        updateAvailable: false,
      };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      return {
        supported: true,
        registered: !!registration,
        active: !!registration?.active,
        waiting: !!registration?.waiting,
        scope: registration?.scope || null,
        updateAvailable: !!registration?.waiting,
      };
    } catch (error) {
      console.error('[PWA Health Check] Service Worker check failed:', error);
      return {
        supported: true,
        registered: false,
        active: false,
        waiting: false,
        scope: null,
        updateAvailable: false,
      };
    }
  }

  /**
   * Check web app manifest file
   * 
   * Fetches and validates the manifest.json file.
   * A valid manifest must have at least:
   * - name or short_name
   * - start_url
   * 
   * @returns Manifest health status
   * @private
   */
  private async checkManifest(): Promise<PWAHealthStatus['manifest']> {
    try {
      const response = await fetch('/manifest.json');
      if (!response.ok) {
        return {
          loaded: false,
          valid: false,
          appName: null,
        };
      }

      const manifest = await response.json();
      return {
        loaded: true,
        valid: !!(manifest.name && manifest.start_url),
        appName: manifest.name || manifest.short_name || null,
      };
    } catch (error) {
      console.error('[PWA Health Check] Manifest check failed:', error);
      return {
        loaded: false,
        valid: false,
        appName: null,
      };
    }
  }

  /**
   * Check Cache API status and measure cache sizes
   * 
   * Identifies and measures different cache types:
   * - Static cache (HTML, CSS, JS assets)
   * - Audio cache (episode audio files)
   * - API cache (backend responses)
   * 
   * @returns Caching health status with item counts per cache
   * @private
   */
  private async checkCaching(): Promise<PWAHealthStatus['caching']> {
    const supported = 'caches' in window;
    
    if (!supported) {
      return {
        supported: false,
        staticCacheSize: 0,
        audioCacheSize: 0,
        apiCacheSize: 0,
      };
    }

    try {
      const cacheNames = await caches.keys();
      
      const staticCache = cacheNames.find(name => name.includes('static'));
      const audioCache = cacheNames.find(name => name.includes('audio'));
      const apiCache = cacheNames.find(name => name.includes('api'));

      const [staticSize, audioSize, apiSize] = await Promise.all([
        staticCache ? this.getCacheSize(staticCache) : 0,
        audioCache ? this.getCacheSize(audioCache) : 0,
        apiCache ? this.getCacheSize(apiCache) : 0,
      ]);

      return {
        supported: true,
        staticCacheSize: staticSize,
        audioCacheSize: audioSize,
        apiCacheSize: apiSize,
      };
    } catch (error) {
      console.error('[PWA Health Check] Caching check failed:', error);
      return {
        supported: true,
        staticCacheSize: 0,
        audioCacheSize: 0,
        apiCacheSize: 0,
      };
    }
  }

  /**
   * Get number of items in a specific cache
   * 
   * @param cacheName - Name of the cache to measure
   * @returns Number of cached items (0 if cache doesn't exist or error)
   * @private
   */
  private async getCacheSize(cacheName: string): Promise<number> {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      return keys.length;
    } catch {
      return 0;
    }
  }

  /**
   * Check offline support and network status
   * 
   * Detects:
   * - Browser support for online/offline events
   * - Current connection status (online/offline)
   * - Effective connection type (4g, 3g, 2g, slow-2g)
   * 
   * @returns Offline support health status
   * @private
   */
  private checkOfflineSupport(): PWAHealthStatus['offline'] {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      supported: 'onLine' in navigator,
      status: navigator.onLine ? 'online' : 'offline',
      effectiveType: connection?.effectiveType || null,
    };
  }

  /**
   * Check PWA installation status
   * 
   * Determines:
   * - Whether app is installable (BeforeInstallPrompt event available)
   * - Whether app is already installed (display mode check)
   * - Current display mode (standalone, browser, minimal-ui, fullscreen)
   * 
   * @returns Installation health status
   * @private
   */
  private checkInstallation(): PWAHealthStatus['installation'] {
    const displayMode = window.matchMedia('(display-mode: standalone)').matches ? 'standalone'
      : window.matchMedia('(display-mode: fullscreen)').matches ? 'fullscreen'
      : window.matchMedia('(display-mode: minimal-ui)').matches ? 'minimal-ui'
      : 'browser';

    return {
      installable: 'BeforeInstallPromptEvent' in window || (window as any).deferredPrompt !== undefined,
      installed: displayMode !== 'browser',
      displayMode,
    };
  }

  /**
   * Check notification API support and permission status
   * 
   * @returns Notification health status
   * @private
   */
  private checkNotifications(): PWAHealthStatus['notifications'] {
    return {
      supported: 'Notification' in window,
      permission: 'Notification' in window ? Notification.permission : 'default',
    };
  }

  /**
   * Calculate overall health score from individual check results
   * 
   * Scoring system:
   * - Service Worker: 40 points max
   * - Manifest: 20 points max
   * - Caching: 20 points max
   * - Offline Support: 10 points max
   * - Installation: 10 points max
   * Total: 100 points
   * 
   * App is considered "healthy" if:
   * - Score >= 60/100
   * - No critical issues (non-expected issues)
   * 
   * @param status - Complete PWA health status from all checks
   * @returns Overall health summary with score and issues list
   * @private
   */
  private calculateOverallHealth(status: PWAHealthStatus): PWAHealthStatus['overall'] {
    let score = 0;
    const issues: string[] = [];
    const maxScore = 100;

    // Service Worker (40 points)
    if (status.serviceWorker.supported) {
      score += 10;
      if (status.serviceWorker.registered) {
        score += 15;
        if (status.serviceWorker.active) {
          score += 15;
        } else {
          issues.push('Service Worker registered but not active');
        }
      } else {
        issues.push('Service Worker not registered (expected in preview environments)');
      }
    } else {
      issues.push('Service Worker not supported in this browser');
    }

    // Manifest (20 points)
    if (status.manifest.loaded) {
      score += 10;
      if (status.manifest.valid) {
        score += 10;
      } else {
        issues.push('Manifest file is invalid');
      }
    } else {
      issues.push('Manifest file not loaded');
    }

    // Caching (20 points)
    if (status.caching.supported) {
      score += 10;
      if (status.caching.staticCacheSize > 0 || status.caching.audioCacheSize > 0) {
        score += 10;
      } else {
        // This is normal if SW just registered or in development
        console.debug('Caches are empty (normal in development)');
      }
    } else {
      issues.push('Cache API not supported');
    }

    // Offline Support (10 points)
    if (status.offline.supported) {
      score += 10;
    } else {
      issues.push('Offline detection not supported');
    }

    // Installation (10 points)
    if (status.installation.installed) {
      score += 10;
    } else if (status.installation.installable) {
      score += 5;
    }

    const healthy = score >= 60 && issues.filter(i => !i.includes('expected')).length === 0;

    return {
      healthy,
      score: Math.min(score, maxScore),
      issues,
    };
  }

  /**
   * Test offline functionality by checking service worker and caches
   * 
   * Useful for verifying that offline mode will work before
   * actually going offline.
   * 
   * @returns Test result with success flag and message
   * 
   * @example
   * ```typescript
   * const test = await pwaHealthCheck.testOfflineFunctionality();
   * if (test.success) {
   *   console.log('✅', test.message);
   *   // Safe to enable offline mode UI
   * } else {
   *   console.warn('⚠️', test.message);
   * }
   * ```
   */
  async testOfflineFunctionality(): Promise<{ success: boolean; message: string }> {
    console.log('[PWA Health Check] Testing offline functionality...');

    if (!('serviceWorker' in navigator)) {
      return {
        success: false,
        message: 'Service Worker not supported',
      };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration || !registration.active) {
        return {
          success: false,
          message: 'Service Worker not active',
        };
      }

      // Test cache availability
      const cacheNames = await caches.keys();
      if (cacheNames.length === 0) {
        return {
          success: true,
          message: 'Service Worker active but caches are empty (normal in development)',
        };
      }

      return {
        success: true,
        message: `Offline functionality ready with ${cacheNames.length} cache(s)`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error.message}`,
      };
    }
  }

  /**
   * Generate human-readable diagnostic report
   * 
   * Creates a formatted text report with:
   * - Overall health summary
   * - Detailed status for each check
   * - List of issues found
   * 
   * @returns Multi-line text report string
   * 
   * @example
   * ```typescript
   * const report = await pwaHealthCheck.generateReport();
   * console.log(report);
   * // Or save to file:
   * downloadTextFile('pwa-health-report.txt', report);
   * ```
   */
  async generateReport(): Promise<string> {
    const status = await this.runFullDiagnostic();
    
    let report = '=== PWA HEALTH CHECK REPORT ===\n\n';
    
    report += `Overall Health: ${status.overall.healthy ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}\n`;
    report += `Health Score: ${status.overall.score}/100\n\n`;
    
    report += '--- Service Worker ---\n';
    report += `Supported: ${status.serviceWorker.supported ? '✅' : '❌'}\n`;
    report += `Registered: ${status.serviceWorker.registered ? '✅' : '❌'}\n`;
    report += `Active: ${status.serviceWorker.active ? '✅' : '❌'}\n`;
    report += `Scope: ${status.serviceWorker.scope || 'N/A'}\n`;
    report += `Update Available: ${status.serviceWorker.updateAvailable ? '⚠️ Yes' : 'No'}\n\n`;
    
    report += '--- Manifest ---\n';
    report += `Loaded: ${status.manifest.loaded ? '✅' : '❌'}\n`;
    report += `Valid: ${status.manifest.valid ? '✅' : '❌'}\n`;
    report += `App Name: ${status.manifest.appName || 'N/A'}\n\n`;
    
    report += '--- Caching ---\n';
    report += `Supported: ${status.caching.supported ? '✅' : '❌'}\n`;
    report += `Static Cache: ${status.caching.staticCacheSize} items\n`;
    report += `Audio Cache: ${status.caching.audioCacheSize} items\n`;
    report += `API Cache: ${status.caching.apiCacheSize} items\n\n`;
    
    report += '--- Offline Support ---\n';
    report += `Supported: ${status.offline.supported ? '✅' : '❌'}\n`;
    report += `Current Status: ${status.offline.status}\n`;
    report += `Connection Type: ${status.offline.effectiveType || 'Unknown'}\n\n`;
    
    report += '--- Installation ---\n';
    report += `Installable: ${status.installation.installable ? '✅' : '❌'}\n`;
    report += `Installed: ${status.installation.installed ? '✅' : '❌'}\n`;
    report += `Display Mode: ${status.installation.displayMode}\n\n`;
    
    report += '--- Notifications ---\n';
    report += `Supported: ${status.notifications.supported ? '✅' : '❌'}\n`;
    report += `Permission: ${status.notifications.permission}\n\n`;
    
    if (status.overall.issues.length > 0) {
      report += '--- Issues ---\n';
      status.overall.issues.forEach(issue => {
        report += `⚠️ ${issue}\n`;
      });
      report += '\n';
    }
    
    report += '=== END OF REPORT ===';
    
    return report;
  }
}

// Export singleton instance
export const pwaHealthCheck = new PWAHealthCheck();

// Add global diagnostic function for console debugging
if (typeof window !== 'undefined') {
  (window as any).checkPWAHealth = async () => {
    const report = await pwaHealthCheck.generateReport();
    console.log(report);
    return pwaHealthCheck.runFullDiagnostic();
  };
  
  console.log('[PWA Health Check] Diagnostic tool ready. Run window.checkPWAHealth() to check PWA status.');
}