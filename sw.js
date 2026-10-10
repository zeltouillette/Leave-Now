/**
 * Service worker : garde les fichiers de l'application en cache pour qu'elle s'ouvre
 * vite et hors ligne. Les données de l'API ne passent jamais par ce cache.
 *
 * Stratégie : on sert la version en cache, puis on la met à jour en arrière-plan.
 * Après une modification du code, la nouvelle version s'affiche donc au 2e rechargement.
 * Si vous ajoutez ou retirez un fichier : mettez à jour FILES et changez le numéro de CACHE.
 */
const CACHE = 'leave-now-v1';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'core/api.js',
  'core/config.js',
  'core/departures.js',
  'core/scheduler.js',
  'ui/app.js',
  'ui/board.js',
  'ui/settings.js',
  'ui/storage.js',
  'i18n/index.js',
  'i18n/fr.js',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

// Supprime les anciennes versions du cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // API (autre domaine) : réseau direct, jamais de cache
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request, { ignoreSearch: true });
    const fresh = fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });
    if (!cached) return fresh;
    event.waitUntil(fresh.catch(() => {})); // mise à jour en arrière-plan (hors ligne : on garde l'ancienne)
    return cached;
  }));
});
