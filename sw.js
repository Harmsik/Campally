// Campally Service Worker - Cache-Busting & Automatic Self-Cleaning
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Purge EVERY cache in the browser so no stale assets are ever served
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Unregister self so future requests go directly to network
      if (self.registration && typeof self.registration.unregister === "function") {
        return self.registration.unregister();
      }
    })
  );
});

// Always pass through directly to network, no caching
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});