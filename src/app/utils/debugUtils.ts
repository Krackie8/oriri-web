// Debug utilities for Oriri app
export class DebugUtils {
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private static isInitialized = false;
  
  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
    this.ensureInitialized();
  }
  
  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      // Set up immediate error capturing without blocking
      this.setupErrorCapture();
    }
  }
  
  private static setupErrorCapture() {
    try {
      // Set up error capture without blocking main thread
      setTimeout(() => {
        // Use requestIdleCallback if available, otherwise setTimeout
        const captureErrors = () => {
          // This runs async and doesn't block startup
        };
        
        if ('requestIdleCallback' in window) {
          requestIdleCallback(captureErrors);
        } else {
          setTimeout(captureErrors, 0);
        }
      }, 0);
    } catch (e) {
      // Silently fail if error capture setup fails
    }
  }
  
  static debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG ${new Date().toISOString()}]`, message, ...args);
    }
  }
  
  static info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(`[INFO ${new Date().toISOString()}]`, message, ...args);
    }
  }
  
  static warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN ${new Date().toISOString()}]`, message, ...args);
    }
  }
  
  static error(message: string, error?: any, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR ${new Date().toISOString()}]`, message, error, ...args);
    }
    
    // Save to localStorage async without blocking
    this.saveErrorAsync(message, error, ...args);
  }
  
  private static saveErrorAsync(message: string, error?: any, ...args: any[]) {
    // Use setTimeout to make this non-blocking
    setTimeout(() => {
      try {
        const errorLog = {
          timestamp: new Date().toISOString(),
          message,
          error: error?.toString(),
          stack: error?.stack,
          args
        };
        
        const existingLogs = JSON.parse(localStorage.getItem('oriri-debug-logs') || '[]');
        existingLogs.push(errorLog);
        
        // Keep only last 50 logs
        const recentLogs = existingLogs.slice(-50);
        localStorage.setItem('oriri-debug-logs', JSON.stringify(recentLogs));
      } catch (e) {
        // Silently fail if localStorage is not available
      }
    }, 0);
  }
  
  private static shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const requestedIndex = levels.indexOf(level);
    return requestedIndex >= currentIndex;
  }
  
  static getStoredErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem('oriri-errors') || '[]');
    } catch (e) {
      return [];
    }
  }
  
  static getStoredLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem('oriri-debug-logs') || '[]');
    } catch (e) {
      return [];
    }
  }
  
  static clearStoredData() {
    try {
      localStorage.removeItem('oriri-errors');
      localStorage.removeItem('oriri-debug-logs');
      console.log('Cleared stored debug data');
    } catch (e) {
      console.warn('Failed to clear stored data:', e);
    }
  }
  
  static createDebugReport(): string {
    try {
      const errors = this.getStoredErrors();
      const logs = this.getStoredLogs();
      const timestamp = new Date().toISOString();
      
      const report = {
        timestamp,
        userAgent: navigator.userAgent,
        url: window.location.href,
        errors,
        logs,
        localStorage: this.getLocalStorageInfo(),
        context: {
          online: navigator.onLine,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled
        }
      };
      
      return JSON.stringify(report, null, 2);
    } catch (e) {
      return JSON.stringify({ error: 'Failed to create debug report', details: e.toString() }, null, 2);
    }
  }
  
  private static getLocalStorageInfo(): any {
    try {
      const info: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('oriri-')) {
          const value = localStorage.getItem(key);
          info[key] = value ? `${value.length} characters` : 'null';
        }
      }
      return info;
    } catch (e) {
      return { error: 'Failed to read localStorage' };
    }
  }
  
  static downloadDebugReport() {
    try {
      const report = this.createDebugReport();
      const blob = new Blob([report], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `oriri-debug-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Debug report downloaded');
    } catch (e) {
      console.error('Failed to download debug report:', e);
    }
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).OririDebug = DebugUtils;
}

export default DebugUtils;