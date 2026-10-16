/* QRG service worker: after the first visit the app opens instantly from the device and never waits for the network.
   Strategy: cache first. Updates: the browser re-checks this file on its own; every build changes the version below,
   so a new build installs in the background and replaces the old cache (the new version shows up on the next open).
   GENERATED copy: edit src/pwa/sw.js. */
const CACHE = 'qrg-542d1f995a';
const FILES = ["./","index.php","e.html","manifest.webmanifest","icon-192.png","icon-512.png"];

self.addEventListener('install', e => {
  // e.html and vendor/ are optional on the server, so a missing file must not break the install;
  // 'reload' skips the HTTP cache so a new version never installs old files
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true })
      .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.php').then(h => h || caches.match('./')) : undefined))
      .then(hit => hit || fetch(req))
  );
});
