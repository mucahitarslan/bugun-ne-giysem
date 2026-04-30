const CACHE_NAME = 'negiysem-cache-v2'; // Önbelleği yenilemek için v2 yaptık
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon-192.png',
  './icon-512.png'
];

// Yükleme (Install)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Yeni versiyona hemen geçiş yap
});

// Eski önbellekleri temizleme (Activate)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Eski cache silinir
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch (Ağ İsteklerini Yönetme)
self.addEventListener('fetch', event => {
  // EĞER İSTEK DIŞ API'YE GİDİYORSA SERVICE WORKER ARAYA GİRMESİN
  if (event.request.url.includes('api.open-meteo.com')) {
    return; // Doğrudan internetten çekmesine izin ver
  }

  // Diğer dosyalarımız için önbelleği (cache) kullan
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});