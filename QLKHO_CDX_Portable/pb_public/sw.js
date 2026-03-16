/* Service Worker - PWA CDX Quản lý kho */
var CACHE_NAME = 'qlkho-cdx-v15';

/* Danh sách file PHẢI cache khi install để chạy offline */
var PRE_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon-512.jpg',
  './assets/main-CN2Yh9G3.css',
  './assets/main-DcvyMAqH.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/pocketbase@latest/dist/pocketbase.umd.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'
];

/* Install: pre-cache tất cả file quan trọng */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Pre-caching critical assets...');
      return Promise.allSettled(
        PRE_CACHE.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Failed to cache:', url, err.message);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* Activate: xóa cache cũ */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) {
        if (n !== CACHE_NAME) return caches.delete(n);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

/* Fetch: Network-first cho HTML/JS/CSS, cache fallback khi offline */
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;

  /* Bỏ qua API calls (PocketBase) - để app xử lý offline bằng IDB */
  if (url.includes('/api/') || url.includes('/_/')) return;

  /* Navigation request (HTML pages): network-first, fallback cached index.html */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* Static assets: network-first, cache fallback */
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res.ok) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
