// Service worker: кешує всі файли програми, щоб вона працювала без інтернету.
// Додав файл у src/ — допиши його в PRECACHE і підніми CACHE_VERSION.

const CACHE_VERSION = 2;
const CACHE_NAME = `trainer-log-v${CACHE_VERSION}`;

const PRECACHE = [
  './',
  'index.html',
  'app.css',
  'css/screens.css',
  'css/schemes.css',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'src/app.js',
  'src/store.js',
  'src/core/model.js',
  'src/core/catalog.js',
  'src/ui/dom.js',
  'src/ui/start.js',
  'src/ui/settings.js',
  'src/ui/clients.js',
  'src/ui/client.js',
  'src/ui/exercise.js',
  'src/ui/equipment.js',
  'src/schemes/index.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('trainer-log-') && k !== CACHE_NAME).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// Спершу кеш (офлайн), потім мережа; навігація без мережі — index.html.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') {
        const index = await cache.match('index.html');
        if (index) return index;
      }
      throw err;
    }
  })());
});
