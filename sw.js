const CACHE_NAME = "campally-v1";
const urlsToCache = [
  "index.html",
  "style.css",
  "signup.html",
  "login.html",
  "home.html",
  "home.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});