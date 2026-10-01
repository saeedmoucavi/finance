// Offline support: every file of the app is cached on install, so it opens
// without internet. Bump VERSION on each release so phones fetch the new files.
const VERSION = 'pfd-v2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/app.js', 'js/db.js', 'js/core.js', 'js/jalali.js', 'js/strings.js', 'js/icons.js', 'js/export.js',
  'vendor/sql-wasm.js', 'vendor/sql-wasm.wasm',
  'fonts/Vazirmatn-Regular.ttf', 'fonts/Vazirmatn-Medium.ttf', 'fonts/Vazirmatn-Bold.ttf',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// cache first; the network is only used for anything not cached yet
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
