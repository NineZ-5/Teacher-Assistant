const CACHE_NAME = 'quran-reports-v5';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './manifest.json',
  './icon.svg',
  './src/utils.js',
  './src/idb.js',
  './src/timezone.js',
  './src/storage.js',
  './src/sync.js',
  './src/calendar.js',
  './src/reports.js',
  './src/browser.js',
  './src/i18n.js',
  './src/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isNetworkFirst = /\.(js|html|css)$/i.test(url.pathname) || e.request.mode === 'navigate';

  if (isNetworkFirst) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => {
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') {
            return caches.match('/') || caches.match('./index.html');
          }
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('/') || caches.match('./index.html');
        }
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'OPEN_LESSON_FROM_NOTIF', data: notifData });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./index.html');
      }
    })
  );
});