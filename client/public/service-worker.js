/* eslint-disable no-restricted-globals */

// Simple service worker for public directory
// This will be replaced by the build process but provides a fallback

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean all caches on activation
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
      // Take control of all clients
      await clients.claim();
    })()
  );
});

// Don't cache any navigation requests in development
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return a basic offline message
        return new Response(
          '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
  }
});