// Clean-up worker. An older version of oriri.me may have installed a service
// worker that keeps showing the old site from its cache. Browsers re-check
// /sw.js, get this file, and it removes all caches, unregisters itself and
// reloads open tabs so visitors see the current site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const tabs = await self.clients.matchAll({ type: 'window' });
      tabs.forEach((tab) => tab.navigate(tab.url));
    })(),
  );
});
