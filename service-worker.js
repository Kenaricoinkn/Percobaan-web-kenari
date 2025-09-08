const CACHE_NAME = "kenaricoin-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/img/logo-192.png",
  "/img/logo-512.png"
  // Tambahkan file lain kalau perlu, misalnya css/js custom
];

// Install Service Worker & simpan cache awal
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch: ambil dari cache dulu, kalau tidak ada ambil dari network
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});

// Update cache saat versi baru service worker di-deploy
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
});
