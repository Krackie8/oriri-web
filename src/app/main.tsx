// Immediate image error suppression - MUST be first import
import './utils/imageErrorHandler';
// Suppress console.log/debug/info in production builds
import './utils/logSuppressor';

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // Back to main app
import '../styles/globals.css';

// Import and register service worker
import { serviceWorkerManager } from './utils/serviceWorker';

// Import PWA health check utility
import { pwaHealthCheck } from './utils/pwaHealthCheck';

console.log('[main.tsx] Starting Oriri app initialization...');

try {
  const container = document.getElementById('root');
  if (!container) throw new Error('Root container missing in index.html');

  console.log('[main.tsx] Found root container, creating React root...');
  const root = createRoot(container);
  
  console.log('[main.tsx] Rendering app...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('[main.tsx] App render initiated successfully');
  
  // Register service worker after app loads (already auto-registers via serviceWorker.ts)
  // Log service worker status for debugging
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      console.log('[PWA] Service Worker ready:', {
        scope: registration.scope,
        active: !!registration.active,
        waiting: !!registration.waiting,
        installing: !!registration.installing
      });
    });
    
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        console.log('[PWA] Service Worker registered:', registration);
      } else {
        console.log('[PWA] Service Worker not yet registered (this is normal in preview environments)');
      }
    });
  } else {
    console.log('[PWA] Service Worker not supported in this environment');
  }
  
  // Perform PWA health check (run asynchronously, don't wait)
  setTimeout(() => {
    pwaHealthCheck.runFullDiagnostic().then(status => {
      console.log('[PWA] Health check complete:', {
        healthy: status.overall.healthy,
        score: status.overall.score,
        issues: status.overall.issues
      });
    });
  }, 3000); // Run after app has settled
} catch (error) {
  console.error('[main.tsx] Critical error during app initialization:', error);
  
  // Show emergency fallback UI
  const container = document.getElementById('root');
  if (container) {
    container.innerHTML = `
      <div style="min-height: 100vh; background: #030213; color: white; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif;">
        <div style="text-align: center; max-width: 400px; padding: 20px;">
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Loading Error</h1>
          <p style="margin-bottom: 1rem;">The app failed to start. Please check the console for details.</p>
          <button onclick="window.location.reload()" style="background: #ffffff; color: #030213; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Reload App
          </button>
          <pre style="margin-top: 1rem; font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; text-align: left; overflow: auto; max-height: 200px;">
            ${error.message}
          </pre>
        </div>
      </div>
    `;
  }
}