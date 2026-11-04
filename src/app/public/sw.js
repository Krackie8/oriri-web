// Oriri Podcast App Service Worker
// Provides offline support, audio caching, and PWA functionality

const CACHE_NAME = 'oriri-podcast-v1.3.0';
const STATIC_CACHE_NAME = 'oriri-static-v1.3.0';
const AUDIO_CACHE_NAME = 'oriri-audio-v1.3.0';
const API_CACHE_NAME = 'oriri-api-v1.3.0';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/App.tsx',
  '/main.tsx',
  '/styles/globals.css',
  '/manifest.json',
  // Add core app files that should be available offline
];

// Audio cache configuration
const AUDIO_CACHE_MAX_SIZE = 100 * 1024 * 1024; // 100MB max for audio cache
const AUDIO_CACHE_MAX_ENTRIES = 50; // Max 50 audio files

// API endpoints to cache
const CACHEABLE_API_ROUTES = [
  '/supabase/functions/v1/make-server-a278ea32/episodes',
  '/supabase/functions/v1/make-server-a278ea32/live-sessions',
  '/supabase/functions/v1/make-server-a278ea32/store',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),
      
      // Initialize other caches
      caches.open(AUDIO_CACHE_NAME),
      caches.open(API_CACHE_NAME),
      caches.open(CACHE_NAME)
    ]).then(() => {
      console.log('[ServiceWorker] Installation complete');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    }).catch((error) => {
      console.error('[ServiceWorker] Installation failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== AUDIO_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[ServiceWorker] Activation complete');
    }).catch((error) => {
      console.error('[ServiceWorker] Activation failed:', error);
    })
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (isAudioRequest(event.request)) {
    event.respondWith(handleAudioRequest(event.request));
  } else if (isApiRequest(event.request)) {
    event.respondWith(handleApiRequest(event.request));
  } else if (isStaticAsset(event.request)) {
    event.respondWith(handleStaticAssetRequest(event.request));
  } else {
    event.respondWith(handleGenericRequest(event.request));
  }
});

// Handle audio file requests with intelligent caching
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  
  try {
    // Try cache first for audio files
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[ServiceWorker] Audio served from cache:', request.url);
      return cachedResponse;
    }
    
    // Fetch from network
    console.log('[ServiceWorker] Fetching audio from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone response for caching
      const responseToCache = networkResponse.clone();
      
      // Check cache size before adding
      await manageCacheSize(cache, AUDIO_CACHE_MAX_SIZE, AUDIO_CACHE_MAX_ENTRIES);
      
      // Cache the audio file
      cache.put(request, responseToCache);
      console.log('[ServiceWorker] Audio cached:', request.url);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('[ServiceWorker] Audio request failed:', error);
    
    // Return cached version if available
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response('Audio temporarily unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle API requests with cache-first strategy for performance
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // For cacheable API routes, try cache first
    if (CACHEABLE_API_ROUTES.some(route => request.url.includes(route))) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        console.log('[ServiceWorker] API served from cache:', request.url);
        
        // Update cache in background
        fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
        }).catch(() => {
          // Ignore background update errors
        });
        
        return cachedResponse;
      }
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && CACHEABLE_API_ROUTES.some(route => request.url.includes(route))) {
      // Cache successful API responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('[ServiceWorker] API request failed:', error);
    
    // Try to return cached version
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline message for API failures
    return new Response(JSON.stringify({
      error: 'You are currently offline. Some features may not be available.',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static asset requests
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  try {
    // Try cache first for static assets
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // For navigation requests, return cached index.html
    if (request.mode === 'navigate') {
      const cachedIndex = await cache.match('/');
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    
    return new Response('Asset temporarily unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle generic requests (network first, cache fallback)
async function handleGenericRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Try cache fallback
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Oriri - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem;
              background: #000;
              color: #fff;
            }
            .container { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { margin-bottom: 1rem; }
            p { opacity: 0.8; line-height: 1.6; }
            button { 
              background: #fff; 
              color: #000; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; 
              font-weight: 500;
              margin-top: 1rem;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📻</div>
            <h1>You're Offline</h1>
            <p>Check your internet connection and try again. Your downloaded episodes are still available.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Temporarily unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Utility functions
function isAudioRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('.mp3') || 
         url.pathname.includes('.m4a') || 
         url.pathname.includes('.wav') ||
         url.pathname.includes('.ogg') ||
         request.headers.get('Accept')?.includes('audio/') ||
         url.hostname.includes('freesound.org') ||
         url.hostname.includes('archive.org');
}

function isApiRequest(request) {
  return request.url.includes('/supabase/functions/') ||
         request.url.includes('/api/');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.includes('.js') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.png') ||
         url.pathname.includes('.jpg') ||
         url.pathname.includes('.svg') ||
         url.pathname.includes('.ico') ||
         url.pathname.includes('.webp');
}

// Manage cache size to prevent unlimited growth
async function manageCacheSize(cache, maxSize, maxEntries) {
  try {
    const keys = await cache.keys();
    
    // Check entry count first
    if (keys.length >= maxEntries) {
      console.log('[ServiceWorker] Cache entry limit reached, cleaning up...');
      const keysToDelete = keys.slice(0, Math.floor(maxEntries * 0.3)); // Remove 30%
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
    
    // Estimate cache size (simplified)
    const responses = await Promise.all(
      keys.slice(0, 10).map(async (key) => {
        try {
          const response = await cache.match(key);
          return response ? await response.blob() : { size: 0 };
        } catch {
          return { size: 0 };
        }
      })
    );
    
    const avgSize = responses.reduce((sum, blob) => sum + blob.size, 0) / responses.length;
    const estimatedSize = avgSize * keys.length;
    
    if (estimatedSize > maxSize) {
      console.log('[ServiceWorker] Cache size limit reached, cleaning up...');
      const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.3)); // Remove 30%
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
    
  } catch (error) {
    console.error('[ServiceWorker] Cache management error:', error);
  }
}

// Handle background sync for audio downloads
self.addEventListener('sync', (event) => {
  if (event.tag === 'download-audio') {
    event.waitUntil(handleAudioDownloadSync());
  }
});

async function handleAudioDownloadSync() {
  try {
    // Get pending downloads from IndexedDB or another storage mechanism
    // This would integrate with your download queue system
    console.log('[ServiceWorker] Processing background audio downloads');
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Oriri Podcast';
  const options = {
    body: data.body || 'New episode available!',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'oriri-update',
    requireInteraction: false,
    // Stash the deep-link URL so notificationclick can route to it.
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks — focus an existing tab or open the deep link.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Reuse an open Oriri window if one exists.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  console.log('[ServiceWorker] Message received:', type, payload);
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'CACHE_AUDIO') {
    // Cache specific audio file
    handleCacheAudioRequest(payload.url, payload.episodeId);
  } else if (type === 'CLEAR_CACHE') {
    // Clear all caches
    handleClearCacheRequest();
  } else if (type === 'PING') {
    // Health check
    event.ports[0].postMessage({ type: 'PONG', healthy: true });
  }
});

// Handle caching audio file from message
async function handleCacheAudioRequest(url, episodeId) {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await fetch(url);
    
    if (response.ok) {
      await cache.put(url, response);
      console.log('[ServiceWorker] Audio cached via message:', url);
      
      // Notify all clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'AUDIO_CACHED',
          payload: { url, episodeId }
        });
      });
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to cache audio:', error);
  }
}

// Handle clearing all caches
async function handleClearCacheRequest() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[ServiceWorker] All caches cleared');
  } catch (error) {
    console.error('[ServiceWorker] Failed to clear caches:', error);
  }
}

console.log('[ServiceWorker] Service Worker loaded successfully');