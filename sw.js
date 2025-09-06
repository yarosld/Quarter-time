// Service Worker для PWA: precache App Shell, offline-first
const CACHE_NAME = 'fractal-planner-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/fractal-circle.js',
  '/db.js',
  '/sync.js',
  '/right-panel.js',
  '/quick-note.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Background sync for outbox (trigger on sync event)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil(processOutboxFromSW());
  }
});

// Функція для processOutbox (викликається з app.js або тут)
async function processOutboxFromSW() {
  // Тут викличте processOutbox з sync.js (імпортуйте або дублюйте логіку)
  // Для простоти, припустимо доступ до DB і token з shared worker або message
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'process-outbox' }));
  });
}