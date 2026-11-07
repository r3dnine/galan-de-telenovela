/* Galán de Telenovela service worker: works offline once loaded. Bump VERSION when the game changes. */
const VERSION = 'galan-v2-1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    try {
      const r = await fetch('audio/index.json', { cache: 'no-cache' });
      const keys = await r.json();
      await c.put('audio/index.json', new Response(JSON.stringify(keys), { headers: { 'Content-Type': 'application/json' } }));
      for (let i = 0; i < keys.length; i += 24) {
        await Promise.all(keys.slice(i, i + 24).map(function (k) { return c.add('audio/' + k + '.mp3').catch(function () { /* skip */ }); }));
      }
    } catch (err) { /* audio is optional */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const names = await caches.keys();
    await Promise.all(names.filter(function (n) { return n !== VERSION; }).map(function (n) { return caches.delete(n); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  e.respondWith((async function () {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(function () { return null; });
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || new Response('Offline', { status: 503 });
  })());
});
