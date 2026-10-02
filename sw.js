// Offline support: every file of the app is cached on install, so it opens
// without internet. Bump VERSION on each release so phones fetch the new files.
const VERSION = 'pfd-v2';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/print.css',
  'css/tokens.css',
  'js/actions.js',
  'js/core.js',
  'js/db.js',
  'js/export.js',
  'js/icons.js',
  'js/jalali.js',
  'js/main.js',
  'js/strings.js',
  'js/theme.js',
  'js/features/backup.js',
  'js/features/lock.js',
  'js/screens/assets.js',
  'js/screens/debts.js',
  'js/screens/home.js',
  'js/screens/index.js',
  'js/screens/lists.js',
  'js/screens/loans.js',
  'js/screens/more.js',
  'js/screens/reports.js',
  'js/screens/settings.js',
  'js/screens/transactions.js',
  'js/sheets/add.js',
  'js/sheets/asset.js',
  'js/sheets/debt.js',
  'js/sheets/loan.js',
  'js/sheets/pay.js',
  'js/ui/kit.js',
  'js/ui/layers.js',
  'js/ui/shell.js',
  'js/ui/state.js',
  'vendor/sql-wasm.js',
  'vendor/sql-wasm.wasm',
  'fonts/Vazirmatn-Bold.ttf',
  'fonts/Vazirmatn-Medium.ttf',
  'fonts/Vazirmatn-Regular.ttf',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
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
