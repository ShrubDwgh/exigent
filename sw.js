// Service Worker — Emergency Card
// Strategi: HTML network-first (biar update cepat), asset cache-first

const VERSION = 'v1.0.3';
const STATIC_CACHE = 'exigent-static-' + VERSION;
const RUNTIME_CACHE = 'exigent-runtime-' + VERSION;

const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/icons/favicon.ico',
  '/icons/apple-touch-icon.png',
];

// ---------- Install ----------
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then((c) => Promise.all(PRECACHE.map((p) => c.add(p).catch(() => {}))))
  );
  self.skipWaiting();
});

// ---------- Activate ----------
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((k) => (k !== STATIC_CACHE && k !== RUNTIME_CACHE) ? caches.delete(k) : null)
      ))
      .then(() => self.clients.claim())
  );
});

// ---------- Fetch ----------
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Hanya handle GET ke origin sendiri
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Jangan cache request Supabase / API / auth
  if (url.pathname.startsWith('/api/')) return;

  // HTML: network-first (selalu coba ambil versi terbaru dari server)
  const isHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHtml) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/index.html')))
    );
    return;
  }

  // Asset (CSS/JS/gambar): cache-first, update di background
  e.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          // Hanya cache response yang OK
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// ---------- Message dari client ----------
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'GET_VERSION') {
    e.source && e.source.postMessage({ type: 'VERSION', version: VERSION });
  }
});
