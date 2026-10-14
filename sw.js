const CACHE_NAME = "campally-v2";

self.addEventListener("install", (event) => {
  // Activate immediately without waiting for previous tabs to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Invalidate and delete all older cache versions
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Never intercept API endpoints, external APIs, or Supabase queries
  if (
    event.request.method !== "GET" ||
    url.includes("/api/") ||
    url.includes("supabase.co") ||
    url.includes("paystack.co")
  ) {
    return;
  }

  // Network-First with Cache Fallback:
  // Always fetch fresh version from server so updates apply immediately on refresh!
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request);
      })
  );
});