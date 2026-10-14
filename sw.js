const CACHE_NAME = "campally-v7";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/seller.css",
  "/campuses.js",
  "/signup.html",
  "/login.html",
  "/reset-password.html",
  "/update-password.html",
  "/settings.html",
  "/privacy-policy.html",
  "/home.html",
  "/home.js",
  "/listing.html",
  "/listing.js",
  "/post-listing.html",
  "/post-listing.js",
  "/my-listings.html",
  "/my-listings.js",
  "/seller.html",
  "/seller.js",
  "/profile.html",
  "/profile.js",
  "/nav.js"
];

// Force immediate activation
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => console.log("Cache addAll error:", err));
    })
  );
});

// Purge any older cache versions immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy: Always fetch fresh version from server, fallback to cache when offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});