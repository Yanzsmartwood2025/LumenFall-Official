const CACHE_NAME = 'lumenfall-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './assets/imagenes/LUMENFALL-JUEGO-192x192.png',
  './assets/imagenes/LUMENFALL-JUEGO-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
